import React, {
  createContext, useContext, useState, useEffect, useRef, useCallback
} from 'react';
import { useAuth } from './AuthContext';
import { rtdb } from '@buyqk/firebase';
import {
  ref, set, onValue, off, remove, push, onChildAdded
} from 'firebase/database';
import { ActiveCallState } from '../types';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface IncomingCall {
  callId: string;
  callerUid: string;
  callerName: string;
  callerAvatar: string;
  type: 'audio' | 'video';
  chatId?: string;
  offer: RTCSessionDescriptionInit;
}

interface CallContextType {
  activeCall: ActiveCallState | null;
  incomingCall: IncomingCall | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  audioVolume: number;
  permissionError: string;
  startCall: (
    recipientUid: string, name: string, avatar: string,
    type: 'audio' | 'video', role?: string, chatId?: string
  ) => Promise<void>;
  acceptCall: () => Promise<void>;
  declineCall: () => void;
  endCall: () => void;
  toggleMute: () => void;
  toggleVideo: () => Promise<void>;
  toggleMinimize: () => void;
  clearPermissionError: () => void;
}

// ─── ICE config: STUN + free TURN for cross-network NAT ──────────────────────

const RTC_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    {
      urls: [
        'turn:a.relay.metered.ca:80',
        'turn:a.relay.metered.ca:443',
        'turn:a.relay.metered.ca:443?transport=tcp'
      ],
      username: 'openrelayproject',
      credential: 'openrelayproject'
    }
  ],
  iceCandidatePoolSize: 10
};

// ─── Context ──────────────────────────────────────────────────────────────────

const CallContext = createContext<CallContextType | undefined>(undefined);

// ─── Provider ─────────────────────────────────────────────────────────────────

export const CallProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, profile } = useAuth();

  const [activeCall, setActiveCall]       = useState<ActiveCallState | null>(null);
  const [incomingCall, setIncomingCall]   = useState<IncomingCall | null>(null);
  const [localStream, setLocalStream]     = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream]   = useState<MediaStream | null>(null);
  const [audioVolume, setAudioVolume]     = useState(0);
  const [permissionError, setPermissionError] = useState('');

  // ── Refs (never trigger re-renders, safe in closures) ──
  const pcRef            = useRef<RTCPeerConnection | null>(null);
  const localStreamRef   = useRef<MediaStream | null>(null);
  // Stable MediaStream object — we add/remove tracks in-place
  // so any <video>/<audio> with srcObject pointing to this never goes stale
  const remoteStreamRef  = useRef<MediaStream>(new MediaStream());
  const activeCallRef    = useRef<ActiveCallState | null>(null);
  const audioCtxRef      = useRef<AudioContext | null>(null);
  const rafRef           = useRef<number>(0);
  const ringerRef        = useRef<ReturnType<typeof setInterval> | null>(null);
  const durationRef      = useRef<ReturnType<typeof setInterval> | null>(null);
  const answeredRef      = useRef(false); // guard double-fire of onValue answer listener
  const endedRef         = useRef(false); // guard double call-end

  useEffect(() => { activeCallRef.current = activeCall; }, [activeCall]);

  // Protect active calls against accidental browser refresh (Cmd+R / F5 / Tab close)
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (activeCallRef.current) {
        e.preventDefault();
        e.returnValue = 'You have an active video call in progress. Are you sure you want to leave?';
        return e.returnValue;
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // ─── Incoming call listener ────────────────────────────────────────────────
  useEffect(() => {
    if (!currentUser?.uid) return;
    const incRef = ref(rtdb, `calls/incoming/${currentUser.uid}`);
    const handler = onValue(incRef, snap => {
      if (snap.exists()) {
        const d = snap.val() as IncomingCall;
        if (d.callerUid !== currentUser.uid) setIncomingCall(d);
      } else {
        setIncomingCall(null);
      }
    });
    return () => off(incRef, 'value', handler);
  }, [currentUser?.uid]);

  // ─── Ringtone ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!incomingCall || activeCall) return;
    const beep = () => {
      try {
        const AC = window.AudioContext || (window as any).webkitAudioContext;
        const ctx = new AC();
        const now = ctx.currentTime;
        [440, 520].forEach(freq => {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.type = 'sine';
          o.frequency.value = freq;
          g.gain.setValueAtTime(0.06, now);
          g.gain.exponentialRampToValueAtTime(0.001, now + 1.0);
          o.connect(g); g.connect(ctx.destination);
          o.start(now); o.stop(now + 1.0);
        });
      } catch (_) {}
    };
    beep();
    ringerRef.current = setInterval(beep, 2500);
    return () => { clearInterval(ringerRef.current!); ringerRef.current = null; };
  }, [!!incomingCall, !!activeCall]);

  // ─── Audio analyzer ───────────────────────────────────────────────────────
  const startAnalyzer = (stream: MediaStream) => {
    try {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AC();
      const src = ctx.createMediaStreamSource(stream);
      const an  = ctx.createAnalyser();
      an.fftSize = 64;
      src.connect(an);
      audioCtxRef.current = ctx;
      const buf = new Uint8Array(an.frequencyBinCount);
      const tick = () => {
        an.getByteFrequencyData(buf);
        const avg = buf.reduce((a, v) => a + v, 0) / buf.length;
        setAudioVolume(Math.round(Math.min(100, avg / 128 * 100)));
        rafRef.current = requestAnimationFrame(tick);
      };
      tick();
    } catch (_) {}
  };

  // ─── Full cleanup ─────────────────────────────────────────────────────────
  const cleanup = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    clearInterval(durationRef.current!); durationRef.current = null;
    try { audioCtxRef.current?.close(); } catch (_) {}
    audioCtxRef.current = null;
    if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }
    const ls = localStreamRef.current;
    if (ls) { ls.getTracks().forEach(t => t.stop()); }
    localStreamRef.current = null;
    setLocalStream(null);
    // Clear stable remote stream tracks
    remoteStreamRef.current.getTracks().forEach(t => remoteStreamRef.current.removeTrack(t));
    setRemoteStream(null);
    setAudioVolume(0);
    answeredRef.current = false;
    endedRef.current = false;
  }, []);

  // ─── Duration ticker ──────────────────────────────────────────────────────
  const startTimer = () => {
    clearInterval(durationRef.current!);
    durationRef.current = setInterval(() => {
      setActiveCall(prev => prev ? { ...prev, durationSeconds: prev.durationSeconds + 1 } : null);
    }, 1000);
  };

  // ─── Build RTCPeerConnection ───────────────────────────────────────────────
  const buildPC = (callId: string, role: 'caller' | 'callee') => {
    const pc = new RTCPeerConnection(RTC_CONFIG);
    pcRef.current = pc;

    // Expose the STABLE remote stream immediately so <audio> srcObject is set
    setRemoteStream(remoteStreamRef.current);

    pc.ontrack = ev => {
      const track = ev.track;
      if (!remoteStreamRef.current.getTrackById(track.id)) {
        remoteStreamRef.current.addTrack(track);
        // Clone to trigger React state update while keeping same underlying tracks
        setRemoteStream(
          new MediaStream(remoteStreamRef.current.getTracks())
        );
      }
    };

    const candPath = role === 'caller' ? 'callerCandidates' : 'calleeCandidates';
    pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        const r = push(ref(rtdb, `calls/signaling/${callId}/${candPath}`));
        set(r, candidate.toJSON());
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        setActiveCall(prev => prev ? { ...prev, status: 'connected' } : null);
        startTimer();
      }
      if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed') {
        doEndCall();
      }
    };

    return pc;
  };

  // ─── Watch for remote call-end ─────────────────────────────────────────────
  const watchCallEnd = (callId: string) => {
    const statusRef = ref(rtdb, `calls/signaling/${callId}/status`);
    onValue(statusRef, snap => {
      if (!snap.exists() || snap.val() === 'ended') {
        doEndCall();
      }
    });
  };

  // ─── Internal end (no signaling write — used when remote ends) ────────────
  const doEndCall = useCallback(() => {
    if (endedRef.current) return;
    endedRef.current = true;
    const call = activeCallRef.current;
    cleanup();
    setActiveCall(null);

    // Post call-ended message in chat
    if (call?.chatId && currentUser) {
      const dur = call.durationSeconds || 0;
      const ds  = `${Math.floor(dur / 60).toString().padStart(2, '0')}:${(dur % 60).toString().padStart(2, '0')}`;
      const msgRef = push(ref(rtdb, `messages/${call.chatId}`));
      set(msgRef, {
        senderId:    currentUser.uid,
        senderName:  profile?.fullName || currentUser.displayName || 'Team Member',
        senderAvatar: profile?.photoUrl || currentUser.photoURL || '',
        text:        `📞 ${call.type === 'video' ? 'Video' : 'Voice'} Call ended • ${ds}`,
        timestamp:   Date.now(),
        isCallRecord: true
      }).catch(() => {});
    }
  }, [cleanup, currentUser, profile]);

  // ─── Get media stream ─────────────────────────────────────────────────────
  const getStream = async (type: 'audio' | 'video') => {
    // Step 1: Try the ideal config (audio + optional video)
    // NOTE: Do NOT use sampleRate constraint — it causes OverconstrainedError on many
    // devices that don't support that exact rate, which kills the mic along with the camera.
    try {
      return await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
        video: type === 'video'
          ? { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
          : false
      });
    } catch (firstErr: any) {
      // Step 2: For video calls where the camera failed for ANY reason,
      // always attempt audio-only fallback before giving up.
      if (type === 'video') {
        try {
          const audioOnly = await navigator.mediaDevices.getUserMedia({ audio: true });
          setPermissionError('Camera unavailable — joined with audio only. Tap 📷 to enable camera.');
          return audioOnly;
        } catch (audioErr: any) {
          // Neither camera nor mic is available — surface the mic error
          throw audioErr;
        }
      }
      // Audio-only call failed completely
      throw firstErr;
    }
  };

  // ─── Start outgoing call ──────────────────────────────────────────────────
  const startCall = async (
    recipientUid: string, name: string, avatar: string,
    type: 'audio' | 'video', role?: string, chatId?: string
  ) => {
    if (!currentUser) return;
    cleanup();
    setPermissionError('');

    const callId = `call_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    setActiveCall({
      callId,
      chatId: chatId || `direct_${recipientUid}`,
      type,
      recipientName:   name   || 'Teammate',
      recipientAvatar: avatar || '',
      recipientRole:   role   || 'BuyQK Employee',
      status:          'calling',
      isMuted:         false,
      isVideoOff:      type === 'audio',
      isScreenSharing: false,
      durationSeconds: 0,
      isMinimized:     false
    });

    try {
      const stream = await getStream(type);
      // Ensure audio track is explicitly enabled when call is initiated
      stream.getAudioTracks().forEach(t => { t.enabled = true; });
      if (type === 'video') {
        stream.getVideoTracks().forEach(t => { t.enabled = true; });
      }
      setLocalStream(stream);
      localStreamRef.current = stream;
      startAnalyzer(stream);

      const pc = buildPC(callId, 'caller');
      stream.getTracks().forEach(t => pc.addTrack(t, stream));

      const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: type === 'video' });
      await pc.setLocalDescription(offer);

      // Write offer + status (children of signaling node, never overwrites candidates)
      await set(ref(rtdb, `calls/signaling/${callId}/offer`),  { type: offer.type, sdp: offer.sdp });
      await set(ref(rtdb, `calls/signaling/${callId}/status`), 'calling');

      // Notify recipient
      const incPath = recipientUid && recipientUid !== 'general'
        ? `calls/incoming/${recipientUid}`
        : `calls/incoming/general`;
      await set(ref(rtdb, incPath), {
        callId,
        callerUid:    currentUser.uid,
        callerName:   profile?.fullName  || currentUser.displayName || 'Teammate',
        callerAvatar: profile?.photoUrl  || currentUser.photoURL    || '',
        type,
        chatId: chatId || `direct_${recipientUid}`,
        offer:  { type: offer.type, sdp: offer.sdp }
      });

      // Listen for SDP answer from callee
      answeredRef.current = false;
      onValue(ref(rtdb, `calls/signaling/${callId}/answer`), async snap => {
        if (!snap.exists() || answeredRef.current) return;
        const cur = pcRef.current;
        if (!cur || cur.signalingState === 'closed') return;
        if (cur.currentRemoteDescription) return;
        answeredRef.current = true;
        try {
          await cur.setRemoteDescription(new RTCSessionDescription(snap.val()));
          setActiveCall(prev => prev ? { ...prev, status: 'connected' } : null);
          startTimer();
        } catch (_) {}
      });

      // Listen for callee ICE candidates
      onChildAdded(ref(rtdb, `calls/signaling/${callId}/calleeCandidates`), snap => {
        if (snap.exists() && pcRef.current) {
          pcRef.current.addIceCandidate(new RTCIceCandidate(snap.val())).catch(() => {});
        }
      });

      watchCallEnd(callId);

    } catch (err: any) {
      console.error('[startCall]', err);
      if (err.name === 'NotAllowedError') {
        setPermissionError('Mic/Camera permission blocked. Click the 🔒 lock icon in your URL bar to allow, then try again.');
      }
      cleanup();
      setActiveCall(null);
    }
  };

  // ─── Accept incoming call ─────────────────────────────────────────────────
  const acceptCall = async () => {
    if (!incomingCall || !currentUser) return;
    const { callId, callerName, callerAvatar, type, offer, chatId } = incomingCall;

    setIncomingCall(null);
    remove(ref(rtdb, `calls/incoming/${currentUser.uid}`));
    remove(ref(rtdb, `calls/incoming/general`));
    setPermissionError('');

    setActiveCall({
      callId,
      chatId: chatId || `direct_${incomingCall.callerUid}`,
      type,
      recipientName:   callerName   || 'Teammate',
      recipientAvatar: callerAvatar || '',
      recipientRole:   'BuyQK Employee',
      status:          'connected',
      isMuted:         false,
      isVideoOff:      type === 'audio',
      isScreenSharing: false,
      durationSeconds: 0,
      isMinimized:     false
    });

    try {
      const stream = await getStream(type);
      // Ensure audio track is explicitly enabled when call is accepted
      stream.getAudioTracks().forEach(t => { t.enabled = true; });
      if (type === 'video') {
        stream.getVideoTracks().forEach(t => { t.enabled = true; });
      }
      setLocalStream(stream);
      localStreamRef.current = stream;
      startAnalyzer(stream);

      const pc = buildPC(callId, 'callee');
      stream.getTracks().forEach(t => pc.addTrack(t, stream));

      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      await set(ref(rtdb, `calls/signaling/${callId}/answer`), { type: answer.type, sdp: answer.sdp });
      await set(ref(rtdb, `calls/signaling/${callId}/status`), 'connected');

      startTimer();

      // Listen for caller ICE candidates
      onChildAdded(ref(rtdb, `calls/signaling/${callId}/callerCandidates`), snap => {
        if (snap.exists() && pcRef.current) {
          pcRef.current.addIceCandidate(new RTCIceCandidate(snap.val())).catch(() => {});
        }
      });

      watchCallEnd(callId);

    } catch (err: any) {
      console.error('[acceptCall]', err);
      if (err.name === 'NotAllowedError') {
        setPermissionError('Mic/Camera permission blocked. Allow access in browser settings to join the call.');
      }
      cleanup();
      setActiveCall(null);
    }
  };

  const declineCall = () => {
    if (!incomingCall || !currentUser) return;
    remove(ref(rtdb, `calls/incoming/${currentUser.uid}`));
    remove(ref(rtdb, `calls/incoming/general`));
    setIncomingCall(null);
  };

  // ─── End call (local action) ───────────────────────────────────────────────
  const endCall = () => {
    const call = activeCallRef.current;
    // Signal ended BEFORE cleanup so remote sees it
    if (call?.callId) {
      set(ref(rtdb, `calls/signaling/${call.callId}/status`), 'ended').catch(() => {});
      setTimeout(() => remove(ref(rtdb, `calls/signaling/${call.callId}`)).catch(() => {}), 1200);
    }
    if (currentUser) {
      remove(ref(rtdb, `calls/incoming/${currentUser.uid}`)).catch(() => {});
      remove(ref(rtdb, `calls/incoming/general`)).catch(() => {});
    }
    doEndCall();
  };

  // ─── Mute / video toggles ─────────────────────────────────────────────────
  const toggleMute = () => {
    setActiveCall(prev => {
      if (!prev) return null;
      const nextMuted = !prev.isMuted;
      const enableAudio = !nextMuted; // unmuting means nextMuted is false -> enableAudio is true!

      const ls = localStreamRef.current;
      if (ls) {
        ls.getAudioTracks().forEach(t => {
          t.enabled = enableAudio;
        });
      }

      if (pcRef.current) {
        pcRef.current.getSenders().forEach(sender => {
          if (sender.track && sender.track.kind === 'audio') {
            sender.track.enabled = enableAudio;
          }
        });
      }

      return { ...prev, isMuted: nextMuted };
    });
  };

  const toggleVideo = async () => {
    setPermissionError('');
    const ls = localStreamRef.current;
    if (!ls) return;

    const vt = ls.getVideoTracks()[0];
    if (vt) {
      setActiveCall(prev => {
        if (!prev) return null;
        const nextVideoOff = !prev.isVideoOff;
        const enableVideo = !nextVideoOff;

        ls.getVideoTracks().forEach(t => {
          t.enabled = enableVideo;
        });

        if (pcRef.current) {
          pcRef.current.getSenders().forEach(sender => {
            if (sender.track && sender.track.kind === 'video') {
              sender.track.enabled = enableVideo;
            }
          });
        }

        return { ...prev, isVideoOff: nextVideoOff };
      });
    } else {
      try {
        const vs = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' }
        });
        const nt = vs.getVideoTracks()[0];
        if (!nt) return;
        nt.enabled = true;
        ls.addTrack(nt);
        const pc = pcRef.current;
        if (pc) {
          const sender = pc.getSenders().find(s => s.track?.kind === 'video');
          if (sender) await sender.replaceTrack(nt);
          else pc.addTrack(nt, ls);
        }
        setLocalStream(new MediaStream(ls.getTracks()));
        setActiveCall(prev => prev ? { ...prev, isVideoOff: false } : null);
      } catch (err: any) {
        if (err.name === 'NotAllowedError') {
          setPermissionError('Camera blocked. Click 🔒 in your browser URL bar → Allow Camera → tap again.');
        }
      }
    }
  };

  const toggleMinimize = () =>
    setActiveCall(prev => prev ? { ...prev, isMinimized: !prev.isMinimized } : null);

  const clearPermissionError = () => setPermissionError('');

  return (
    <CallContext.Provider value={{
      activeCall, incomingCall, localStream, remoteStream,
      audioVolume, permissionError,
      startCall, acceptCall, declineCall, endCall,
      toggleMute, toggleVideo, toggleMinimize,
      clearPermissionError
    }}>
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error('useCall must be used within a CallProvider');
  return ctx;
};
