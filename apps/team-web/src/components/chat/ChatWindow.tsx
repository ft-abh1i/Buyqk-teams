import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { ChatMessage, ChatGroup, EmployeeProfile } from '../../types';
import { MessageBubble } from './MessageBubble';
import { 
  Send, Paperclip, Smile, Image as ImageIcon, Search, 
  X, Pin, ShieldCheck, Phone, Video, MoreVertical, RefreshCw 
} from 'lucide-react';
import { rtdb, storageService } from '@buyqk/firebase';
import { ref, push, set, onValue, remove, update } from 'firebase/database';

import { useCall } from '../../context/CallContext';

interface Props {
  chatId: string;
  chatName: string;
  chatAvatar?: string;
  isGroup?: boolean;
  groupObj?: ChatGroup;
  recipientObj?: EmployeeProfile;
}

const EMOJI_LIST = ['👍', '❤️', '🔥', '🚀', '🎉', '😂', '🙌', '👏', '💯', '✅', '💡', '✨'];

export const ChatWindow: React.FC<Props> = ({
  chatId,
  chatName,
  chatAvatar,
  isGroup,
  groupObj,
  recipientObj
}) => {
  const { profile, currentUser } = useAuth();
  const { startCall } = useCall();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState<string>('');
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [editingMessage, setEditingMessage] = useState<ChatMessage | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [isTyping, setIsTyping] = useState<boolean>(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const [uploadingFile, setUploadingFile] = useState<boolean>(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<any>(null);

  // 1. Subscribe to Realtime Database Messages for this chatId
  useEffect(() => {
    if (!chatId) return;

    const messagesRef = ref(rtdb, `messages/${chatId}`);
    const unsubscribe = onValue(messagesRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const msgList: ChatMessage[] = Object.keys(data).map(key => ({
          id: key,
          ...data[key]
        }));
        msgList.sort((a, b) => a.timestamp - b.timestamp);
        setMessages(msgList);
      } else {
        setMessages([]);
      }
    });

    // 2. Subscribe to Typing Indicators
    const typingRef = ref(rtdb, `typing/${chatId}`);
    const unsubscribeTyping = onValue(typingRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const typers = Object.keys(data).filter(uid => uid !== currentUser?.uid && data[uid]?.isTyping === true);
        setTypingUsers(typers);
      } else {
        setTypingUsers([]);
      }
    });

    return () => {
      unsubscribe();
      unsubscribeTyping();
    };
  }, [chatId, currentUser?.uid]);

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Handle Typing indicator trigger
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputText(e.target.value);
    
    if (!currentUser || !chatId) return;
    const userTypingRef = ref(rtdb, `typing/${chatId}/${currentUser.uid}`);

    if (!isTyping) {
      setIsTyping(true);
      set(userTypingRef, { isTyping: true, timestamp: Date.now() });
    }

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
      remove(userTypingRef);
    }, 2000);
  };

  // Send Message handler
  const handleSendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim() || !currentUser || !chatId) return;

    const textToSend = inputText.trim();
    setInputText('');

    if (editingMessage) {
      // Edit mode
      try {
        const msgRef = ref(rtdb, `messages/${chatId}/${editingMessage.id}`);
        await update(msgRef, {
          text: textToSend,
          edited: true
        });
      } catch (err) {
        console.error("Failed editing message:", err);
      }
      setEditingMessage(null);
      return;
    }

    // New Message
    try {
      const messagesRef = ref(rtdb, `messages/${chatId}`);
      const newMsgRef = push(messagesRef);

      const senderName = profile?.fullName || currentUser.displayName || 'Team Member';
      const senderAvatar = profile?.photoUrl || currentUser.photoURL || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150';

      const newMsgObj: Record<string, any> = {
        senderId: currentUser.uid,
        senderName: senderName,
        senderAvatar: senderAvatar,
        text: textToSend,
        timestamp: Date.now()
      };

      if (replyingTo) {
        newMsgObj.replyTo = {
          id: replyingTo.id || '',
          senderName: replyingTo.senderName || 'Team Member',
          text: replyingTo.text || ''
        };
        setReplyingTo(null);
      }

      // Ensure no undefined values are sent to RTDB
      const sanitized = JSON.parse(JSON.stringify(newMsgObj));
      await set(newMsgRef, sanitized);

      // Clear typing state
      const userTypingRef = ref(rtdb, `typing/${chatId}/${currentUser.uid}`);
      remove(userTypingRef).catch(() => {});
    } catch (err: any) {
      console.error("Failed sending message to RTDB:", err);
    }
  };

  // File / Image Attachment Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !currentUser || !chatId) return;

    setUploadingFile(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = event.target?.result as string;
        const isImg = file.type.startsWith('image/');
        const filePath = `chat_attachments/${chatId}/${Date.now()}_${file.name}`;
        const downloadUrl = await storageService.uploadBase64(filePath, base64);

        const messagesRef = ref(rtdb, `messages/${chatId}`);
        const newMsgRef = push(messagesRef);

        await set(newMsgRef, {
          senderId: currentUser.uid,
          senderName: profile?.fullName || currentUser.displayName || 'Team Member',
          senderAvatar: profile?.photoUrl || currentUser.photoURL || '',
          text: isImg ? `Shared photo: ${file.name}` : `Shared file: ${file.name}`,
          mediaUrl: downloadUrl,
          mediaType: isImg ? 'image' : 'file',
          timestamp: Date.now()
        });

        setUploadingFile(false);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error("Chat attachment error:", err);
      setUploadingFile(false);
    }
  };

  const handleDeleteMessage = async (msgId: string) => {
    if (!chatId) return;
    const msgRef = ref(rtdb, `messages/${chatId}/${msgId}`);
    await remove(msgRef);
  };

  const handlePinMessage = async (msg: ChatMessage) => {
    if (!chatId) return;
    const msgRef = ref(rtdb, `messages/${chatId}/${msg.id}`);
    await update(msgRef, { pinned: !msg.pinned });
  };

  const filteredMessages = searchQuery
    ? messages.filter(m => m.text.toLowerCase().includes(searchQuery.toLowerCase()))
    : messages;

  const pinnedMessages = messages.filter(m => m.pinned);

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950/40 border border-blue-900/20 rounded-2xl overflow-hidden font-sans shadow-2xl">
      
      {/* Top Header */}
      <div className="bg-slate-900/80 border-b border-blue-900/30 p-3.5 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden border border-yellow-500/40 bg-slate-800 shrink-0 flex items-center justify-center font-black text-sm text-yellow-400">
            {chatAvatar ? (
              <img 
                src={chatAvatar} 
                alt={chatName} 
                className="w-full h-full object-cover"
              />
            ) : (
              <span>{(chatName || '?').charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-extrabold text-white text-sm tracking-wide">{chatName}</h3>
              {isGroup && (
                <span className="text-[9px] font-bold uppercase bg-yellow-500/10 text-yellow-500 border border-yellow-500/20 px-2 py-0.5 rounded-full">
                  Group Channel
                </span>
              )}
            </div>
            <p className="text-[10px] text-slate-400 font-semibold truncate">
              {typingUsers.length > 0 ? (
                <span className="text-yellow-400 font-bold animate-pulse">Typing...</span>
              ) : isGroup ? (
                `${Object.keys(groupObj?.members || {}).length || 1} Members`
              ) : (
                recipientObj?.designation || 'BuyQK Teammate'
              )}
            </p>
          </div>
        </div>

        {/* Top Header Controls */}
        <div className="flex items-center gap-2">
          {isSearching ? (
            <div className="flex items-center gap-1.5 bg-slate-950 border border-yellow-500/40 px-2.5 py-1 rounded-xl">
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Filter messages..."
                className="bg-transparent text-xs text-white placeholder-slate-500 focus:outline-none w-36"
                autoFocus
              />
              <button onClick={() => { setIsSearching(false); setSearchQuery(''); }} className="text-slate-400 hover:text-white">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button 
              onClick={() => setIsSearching(true)} 
              className="p-2 rounded-xl bg-slate-950/60 text-slate-400 hover:text-white border border-slate-800 transition-all"
              title="Search Messages"
            >
              <Search className="w-4 h-4" />
            </button>
          )}

          {/* Audio Call Button */}
          <button
            onClick={() => startCall(recipientObj?.uid || (isGroup ? 'general' : 'general'), chatName, chatAvatar || '', 'audio', isGroup ? 'Group Channel' : recipientObj?.designation, chatId)}
            className="p-2 rounded-xl bg-slate-950/60 text-slate-400 hover:text-yellow-500 hover:border-yellow-500/40 border border-slate-800 transition-all"
            title="Start Audio Call"
          >
            <Phone className="w-4 h-4" />
          </button>

          {/* Video Call Button */}
          <button
            onClick={() => startCall(recipientObj?.uid || (isGroup ? 'general' : 'general'), chatName, chatAvatar || '', 'video', isGroup ? 'Group Channel' : recipientObj?.designation, chatId)}
            className="p-2 rounded-xl bg-slate-950/60 text-slate-400 hover:text-yellow-500 hover:border-yellow-500/40 border border-slate-800 transition-all"
            title="Start Video Call"
          >
            <Video className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Pinned Messages Bar */}
      {pinnedMessages.length > 0 && (
        <div className="bg-yellow-500/10 border-b border-yellow-500/20 px-4 py-2 flex items-center justify-between text-xs text-yellow-400">
          <div className="flex items-center gap-2 truncate">
            <Pin className="w-3.5 h-3.5 shrink-0" />
            <span className="font-bold">Pinned:</span>
            <span className="truncate italic text-slate-300">{pinnedMessages[pinnedMessages.length - 1].text}</span>
          </div>
        </div>
      )}

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3.5 scrollbar-thin">
        {filteredMessages.length === 0 ? (
          <div className="flex flex-col items-center justify-center my-auto gap-2 text-slate-500">
            <Smile className="w-8 h-8 text-slate-600" />
            <p className="text-xs font-semibold">No messages in this workspace yet. Start the conversation!</p>
          </div>
        ) : (
          filteredMessages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isOwn={msg.senderId === currentUser?.uid}
              onReply={setReplyingTo}
              onEdit={(m) => {
                setEditingMessage(m);
                setInputText(m.text);
              }}
              onDelete={handleDeleteMessage}
              onPin={handlePinMessage}
            />
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Reply / Edit Banner */}
      {(replyingTo || editingMessage) && (
        <div className="bg-slate-900 border-t border-blue-900/30 px-4 py-2 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 truncate">
            <span className="font-bold text-yellow-400">
              {editingMessage ? 'Editing message:' : `Replying to ${replyingTo?.senderName}:`}
            </span>
            <span className="truncate italic text-slate-300">{editingMessage?.text || replyingTo?.text}</span>
          </div>
          <button onClick={() => { setReplyingTo(null); setEditingMessage(null); setInputText(''); }} className="text-slate-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Attachment Upload Progress */}
      {uploadingFile && (
        <div className="bg-yellow-500/10 border-t border-yellow-500/20 p-2 flex items-center justify-center gap-2 text-xs font-bold text-yellow-400">
          <RefreshCw className="w-4 h-4 animate-spin" /> Uploading media attachment...
        </div>
      )}

      {/* Bottom Input Controls */}
      <form onSubmit={handleSendMessage} className="bg-slate-900/90 border-t border-blue-900/30 p-3 flex items-center gap-2 relative">
        
        {/* Emoji Selector Trigger */}
        <button
          type="button"
          onClick={() => setShowEmojiPicker(!showEmojiPicker)}
          className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-yellow-400 transition-all"
        >
          <Smile className="w-4 h-4" />
        </button>

        {showEmojiPicker && (
          <div className="absolute bottom-16 left-3 bg-slate-950 border border-blue-900/40 rounded-2xl p-3 shadow-2xl grid grid-cols-4 gap-2 z-50">
            {EMOJI_LIST.map((emoji) => (
              <button
                key={emoji}
                type="button"
                onClick={() => {
                  setInputText(prev => prev + emoji);
                  setShowEmojiPicker(false);
                }}
                className="text-lg p-2 rounded-xl hover:bg-slate-900 transition-all"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        {/* Attachment Upload */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 hover:text-yellow-400 transition-all"
        >
          <Paperclip className="w-4 h-4" />
          <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
        </button>

        {/* Main Text Input */}
        <input
          type="text"
          value={inputText}
          onChange={handleInputChange}
          placeholder={`Message #${chatName}...`}
          className="flex-1 bg-slate-950 border border-blue-900/30 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-yellow-500/60 font-sans"
        />

        {/* Send Button */}
        <button
          type="submit"
          disabled={!inputText.trim()}
          className="bg-yellow-500 hover:bg-yellow-400 disabled:opacity-40 text-slate-950 font-extrabold p-2.5 rounded-xl shadow-gold-glow transition-all cursor-pointer"
        >
          <Send className="w-4 h-4" />
        </button>

      </form>

    </div>
  );
};
