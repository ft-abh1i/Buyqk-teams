import React, { useRef, useEffect, useState } from 'react';
import { useCall } from '../../context/CallContext';
import {
  PhoneOff, Mic, MicOff, Video, VideoOff,
  Maximize2, Minimize2, Volume2, PhoneCall, X, AlertTriangle,
  Users, Signal
} from 'lucide-react';

/* ─── tiny helpers ─────────────────────────────────────────────────────────── */
const fmt = (s: number) =>
  `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

/* ─── Video tile ───────────────────────────────────────────────────────────── */
interface VideoTileProps {
  stream: MediaStream | null;
  label: string;
  muted?: boolean;       // Mutes HTML video element playback (for local self-view loopback prevention)
  isMuted?: boolean;     // Controls whether the red MicOff badge icon is displayed on the tile
  avatar?: string;
  isVideoOff?: boolean;
  pip?: boolean;               // picture-in-picture self-view
}

const VideoTile: React.FC<VideoTileProps> = ({ stream, label, muted, isMuted, avatar, isVideoOff, pip }) => {
  const vidRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const el = vidRef.current;
    if (!el) return;
    if (stream && !isVideoOff) {
      el.srcObject = stream;
      el.play().catch(() => {});
    } else {
      el.srcObject = null;
    }
  }, [stream, isVideoOff]);

  const hasVideo = !!stream && !isVideoOff;

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-slate-900 flex items-center justify-center ${pip ? 'w-44 h-28 shadow-2xl border-2 border-slate-700' : 'w-full h-full border border-slate-800'}`}>
      {/* Video element — always mounted */}
      <video
        ref={vidRef}
        autoPlay
        playsInline
        muted={muted}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${hasVideo ? 'opacity-100' : 'opacity-0'}`}
      />

      {/* Avatar fallback when video is off */}
      {!hasVideo && (
        <div className="flex flex-col items-center gap-3 z-10">
          {avatar ? (
            <img src={avatar} alt={label} className="w-20 h-20 rounded-full object-cover border-4 border-slate-700 shadow-xl" />
          ) : (
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center border-4 border-slate-600">
              <span className="text-3xl font-black text-white">{label.charAt(0)}</span>
            </div>
          )}
          {!pip && <span className="text-sm font-bold text-slate-300">{label}</span>}
        </div>
      )}

      {/* Name label & mic badge */}
      <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-slate-950/70 backdrop-blur-sm px-2 py-0.5 rounded-lg">
        <span className="text-[10px] font-bold text-white truncate max-w-[100px]">{label}</span>
        {isMuted && <MicOff className="w-2.5 h-2.5 text-red-400" />}
      </div>
    </div>
  );
};

/* ─── Main CallModal ───────────────────────────────────────────────────────── */
export const CallModal: React.FC = () => {
  const {
    activeCall, incomingCall, localStream, remoteStream,
    audioVolume, permissionError,
    acceptCall, declineCall, endCall,
    toggleMute, toggleVideo, toggleMinimize,
    clearPermissionError
  } = useCall();

  // Hidden audio element to play remote audio track
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const [controlsVisible, setControlsVisible] = useState(true);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Bind remote audio stream
  useEffect(() => {
    const el = remoteAudioRef.current;
    if (!el) return;
    el.srcObject = remoteStream;
    if (remoteStream) el.play().catch(() => {});
  }, [remoteStream]);

  // Auto-hide controls after 3 s of inactivity (like Google Meet)
  const showControls = () => {
    setControlsVisible(true);
    clearTimeout(hideTimer.current!);
    hideTimer.current = setTimeout(() => setControlsVisible(false), 3500);
  };
  useEffect(() => { showControls(); return () => clearTimeout(hideTimer.current!); }, []);

  return (
    <>
      {/* Always-mounted audio element for remote voice */}
      <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: 'none' }} />

      {/* ── Permission Error Banner ── */}
      {permissionError && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[200] bg-slate-900 border border-yellow-500/60 rounded-2xl px-5 py-3.5 shadow-2xl backdrop-blur-xl flex items-center gap-3 max-w-lg w-full font-sans text-sm text-white animate-in slide-in-from-top-4 duration-200">
          <AlertTriangle className="w-5 h-5 text-yellow-400 shrink-0" />
          <p className="flex-1 text-xs leading-relaxed">{permissionError}</p>
          <button onClick={clearPermissionError} className="p-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ── Incoming call notification (bottom right) ── */}
      {incomingCall && !activeCall && (
        <div className="fixed bottom-6 right-6 z-[150] w-80 bg-slate-900 border border-slate-700 rounded-3xl shadow-[0_20px_60px_rgba(0,0,0,0.6)] backdrop-blur-2xl font-sans overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          {/* pulsing top bar */}
          <div className="h-1 w-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500 animate-pulse" />
          <div className="p-4 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="relative shrink-0">
                <div className="w-12 h-12 rounded-2xl overflow-hidden bg-slate-800 border border-slate-700">
                  {incomingCall.callerAvatar
                    ? <img src={incomingCall.callerAvatar} alt={incomingCall.callerName} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center bg-slate-700 text-xl font-black text-white">{incomingCall.callerName.charAt(0)}</div>
                  }
                </div>
                <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-slate-900 animate-pulse" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-emerald-400 mb-0.5">
                  Incoming {incomingCall.type === 'video' ? '📹 Video' : '📞 Voice'} Call
                </p>
                <p className="text-sm font-black text-white truncate">{incomingCall.callerName}</p>
                <p className="text-[10px] text-slate-500 font-medium">BuyQK Teams</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={declineCall}
                className="flex-1 py-2.5 rounded-xl bg-red-500/15 hover:bg-red-500 text-red-400 hover:text-white font-bold text-xs flex items-center justify-center gap-1.5 border border-red-500/30 hover:border-red-500 transition-all cursor-pointer"
              >
                <PhoneOff className="w-4 h-4" /> Decline
              </button>
              <button
                onClick={acceptCall}
                className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-lg"
              >
                <PhoneCall className="w-4 h-4" /> Accept
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Active call ── */}
      {activeCall && (
        activeCall.isMinimized ? (
          /* ── Minimized floating widget ── */
          <div className="fixed bottom-6 right-6 z-[150] bg-slate-900 border border-slate-700 rounded-2xl p-3 shadow-2xl backdrop-blur-2xl flex items-center gap-3 font-sans">
            <div className="relative w-9 h-9 rounded-xl overflow-hidden bg-slate-800 shrink-0">
              {activeCall.recipientAvatar
                ? <img src={activeCall.recipientAvatar} alt={activeCall.recipientName} className="w-full h-full object-cover" />
                : <div className="w-full h-full flex items-center justify-center text-sm font-black text-white">{activeCall.recipientName.charAt(0)}</div>
              }
              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-slate-900" />
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-xs font-bold text-white truncate">{activeCall.recipientName}</span>
              <span className="text-[10px] text-emerald-400 font-mono">
                {activeCall.status === 'calling' ? 'Calling…' : `🔴 ${fmt(activeCall.durationSeconds)}`}
              </span>
            </div>
            <div className="flex gap-1.5 ml-1">
              <button onClick={toggleMinimize} className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"><Maximize2 className="w-3.5 h-3.5" /></button>
              <button onClick={endCall}        className="p-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white transition-colors"><PhoneOff className="w-3.5 h-3.5" /></button>
            </div>
          </div>
        ) : (
          /* ── Full-screen Meet-style UI ── */
          <div
            className="fixed inset-0 z-[100] bg-[#1c1f23] flex flex-col font-sans select-none"
            onMouseMove={showControls}
            onTouchStart={showControls}
          >
            {/* Top bar */}
            <div className={`absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-4 bg-gradient-to-b from-black/60 to-transparent transition-opacity duration-300 ${controlsVisible ? 'opacity-100' : 'opacity-0'}`}>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-700/60 backdrop-blur-md px-3 py-1.5 rounded-full">
                  <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  <span className="text-xs font-bold text-white">BuyQK Teams</span>
                </div>
                {activeCall.status === 'connected' && (
                  <div className="flex items-center gap-1.5 bg-slate-900/80 border border-slate-700/60 backdrop-blur-md px-3 py-1.5 rounded-full">
                    <Signal className="w-3 h-3 text-emerald-400" />
                    <span className="text-xs font-mono text-emerald-400">{fmt(activeCall.durationSeconds)}</span>
                  </div>
                )}
              </div>

              {activeCall.status === 'calling' && (
                <div className="bg-slate-900/80 border border-yellow-500/30 backdrop-blur-md px-4 py-1.5 rounded-full">
                  <span className="text-xs font-bold text-yellow-400 animate-pulse">Calling {activeCall.recipientName}…</span>
                </div>
              )}

              <button onClick={toggleMinimize} className="p-2 rounded-xl bg-slate-900/80 hover:bg-slate-700 border border-slate-700/60 text-slate-300 hover:text-white transition-all backdrop-blur-md">
                <Minimize2 className="w-4 h-4" />
              </button>
            </div>

            {/* ── Video grid ── */}
            <div className="flex-1 flex items-center justify-center p-4 pt-16 pb-28 relative">

              {activeCall.type === 'video' ? (
                /* Video call: remote full-screen + PiP self-view */
                <div className="w-full h-full max-w-6xl mx-auto relative">
                  {/* Remote video tile */}
                  <VideoTile
                    stream={remoteStream}
                    label={activeCall.recipientName}
                    avatar={activeCall.recipientAvatar}
                    isVideoOff={false}
                  />

                  {/* Self PiP — bottom right */}
                  <div className="absolute bottom-3 right-3 z-10">
                    <VideoTile
                      stream={localStream}
                      label="You"
                      muted={true}
                      isMuted={activeCall.isMuted}
                      isVideoOff={activeCall.isVideoOff}
                      pip={true}
                    />
                  </div>

                  {/* Waiting overlay when no remote stream yet */}
                  {!remoteStream && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 bg-slate-900/80 rounded-2xl backdrop-blur-sm">
                      <div className="relative">
                        <div className="w-28 h-28 rounded-full overflow-hidden border-4 border-slate-700 bg-slate-800">
                          {activeCall.recipientAvatar
                            ? <img src={activeCall.recipientAvatar} alt={activeCall.recipientName} className="w-full h-full object-cover" />
                            : <div className="w-full h-full flex items-center justify-center text-5xl font-black text-white bg-gradient-to-br from-slate-700 to-slate-800">{activeCall.recipientName.charAt(0)}</div>
                          }
                        </div>
                        <span className="absolute inset-0 rounded-full border-4 border-yellow-500 animate-ping opacity-40 pointer-events-none" />
                      </div>
                      <div className="flex flex-col items-center gap-1">
                        <p className="text-xl font-black text-white">{activeCall.recipientName}</p>
                        <p className="text-sm text-slate-400">Waiting to connect…</p>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Voice call: avatar + live waveform */
                <div className="flex flex-col items-center gap-8">
                  <div className="relative">
                    <div className="w-36 h-36 rounded-full overflow-hidden border-4 border-slate-700 bg-slate-800 shadow-2xl">
                      {activeCall.recipientAvatar
                        ? <img src={activeCall.recipientAvatar} alt={activeCall.recipientName} className="w-full h-full object-cover" />
                        : <div className="w-full h-full flex items-center justify-center text-6xl font-black text-white bg-gradient-to-br from-slate-700 to-slate-600">{activeCall.recipientName.charAt(0)}</div>
                      }
                    </div>
                    {activeCall.status === 'calling' && (
                      <>
                        <span className="absolute inset-0 rounded-full border-4 border-yellow-500/60 animate-ping pointer-events-none" />
                        <span className="absolute -inset-3 rounded-full border-2 border-yellow-500/30 animate-ping pointer-events-none" style={{ animationDelay: '0.3s' }} />
                      </>
                    )}
                    {activeCall.status === 'connected' && (
                      <span className="absolute inset-0 rounded-full border-4 border-emerald-500/40 animate-pulse pointer-events-none" />
                    )}
                  </div>

                  <div className="flex flex-col items-center gap-1">
                    <h2 className="text-3xl font-black text-white">{activeCall.recipientName}</h2>
                    <p className="text-slate-500 text-sm font-medium">{activeCall.recipientRole}</p>
                  </div>

                  {/* Status / waveform */}
                  {activeCall.status === 'calling' ? (
                    <div className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 border border-slate-700 rounded-full">
                      <Volume2 className="w-4 h-4 text-yellow-400 animate-pulse" />
                      <span className="text-sm font-bold text-yellow-400">Ringing…</span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <div className="flex items-end gap-0.5 h-10 px-2">
                        {Array.from({ length: 16 }, (_, i) => {
                          const mult = [0.3, 0.5, 0.8, 0.6, 1.0, 0.7, 0.5, 0.9, 0.4, 0.6, 0.8, 0.5, 0.7, 0.4, 0.6, 0.3][i];
                          return (
                            <span
                              key={i}
                              className="w-1 rounded-full bg-gradient-to-t from-emerald-600 to-emerald-400 transition-all duration-75"
                              style={{ height: `${Math.max(4, Math.min(36, audioVolume * mult * 0.45))}px` }}
                            />
                          );
                        })}
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                        <span className="font-mono text-emerald-400 font-bold">{fmt(activeCall.durationSeconds)}</span>
                        <span className="text-slate-500">•</span>
                        <span>{activeCall.isMuted ? <span className="text-red-400">Muted</span> : 'Voice connected'}</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Bottom control dock ── */}
            <div className={`absolute bottom-0 left-0 right-0 z-20 flex items-center justify-center gap-3 pb-8 pt-4 bg-gradient-to-t from-black/70 to-transparent transition-opacity duration-300 ${controlsVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>

              {/* Participants count (decorative) */}
              <div className="mr-4 flex items-center gap-1.5 bg-slate-900/80 border border-slate-700/60 backdrop-blur-md px-3 py-2 rounded-full">
                <Users className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-xs text-slate-300 font-bold">2</span>
              </div>

              {/* Mute */}
              <button
                onClick={toggleMute}
                title={activeCall.isMuted ? 'Unmute' : 'Mute'}
                className={`flex flex-col items-center gap-1 group`}
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${activeCall.isMuted ? 'bg-red-600 hover:bg-red-500 shadow-lg shadow-red-900/40' : 'bg-slate-700 hover:bg-slate-600'}`}>
                  {activeCall.isMuted ? <MicOff className="w-5 h-5 text-white" /> : <Mic className="w-5 h-5 text-white" />}
                </div>
                <span className="text-[9px] text-slate-400 font-medium">{activeCall.isMuted ? 'Unmute' : 'Mute'}</span>
              </button>

              {/* Camera */}
              <button
                onClick={toggleVideo}
                title={activeCall.isVideoOff ? 'Turn on camera' : 'Turn off camera'}
                className="flex flex-col items-center gap-1 group"
              >
                <div className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${activeCall.isVideoOff ? 'bg-red-600 hover:bg-red-500 shadow-lg shadow-red-900/40' : 'bg-slate-700 hover:bg-slate-600'}`}>
                  {activeCall.isVideoOff ? <VideoOff className="w-5 h-5 text-white" /> : <Video className="w-5 h-5 text-white" />}
                </div>
                <span className="text-[9px] text-slate-400 font-medium">{activeCall.isVideoOff ? 'Camera' : 'Camera'}</span>
              </button>

              {/* End call */}
              <button
                onClick={endCall}
                title="Leave call"
                className="flex flex-col items-center gap-1 group mx-3"
              >
                <div className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center transition-all shadow-xl shadow-red-900/50 hover:scale-105">
                  <PhoneOff className="w-6 h-6 text-white" />
                </div>
                <span className="text-[9px] text-red-400 font-bold">Leave</span>
              </button>

            </div>
          </div>
        )
      )}
    </>
  );
};
