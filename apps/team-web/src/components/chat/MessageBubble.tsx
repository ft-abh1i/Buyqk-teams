import React, { useState } from 'react';
import { ChatMessage } from '../../types';
import { Reply, Edit2, Trash2, Pin, Copy, Check, FileText, Image as ImageIcon, Phone } from 'lucide-react';

interface Props {
  message: ChatMessage;
  isOwn: boolean;
  onReply: (msg: ChatMessage) => void;
  onEdit: (msg: ChatMessage) => void;
  onDelete: (msgId: string) => void;
  onPin: (msg: ChatMessage) => void;
}

export const MessageBubble: React.FC<Props> = ({ message, isOwn, onReply, onEdit, onDelete, onPin }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(message.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Stylized Call Summary Record Badge in Chat Timeline
  if (message.isCallRecord || message.text?.startsWith('📞') || message.text?.startsWith('📹')) {
    return (
      <div className="flex items-center justify-center my-3 w-full font-sans">
        <div className="bg-slate-900/90 border border-yellow-500/30 px-4 py-2 rounded-2xl flex items-center gap-2.5 shadow-lg">
          <Phone className="w-4 h-4 text-yellow-500 shrink-0" />
          <span className="text-xs font-bold text-slate-200">{message.text}</span>
          <span className="text-[9px] font-mono text-slate-500">
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex flex-col gap-1 group font-sans ${isOwn ? 'items-end' : 'items-start'}`}>
      
      {/* Sender Header if not own */}
      {!isOwn && (
        <div className="flex items-center gap-2 px-1">
          <span className="text-[10px] font-bold text-slate-400">{message.senderName}</span>
          <span className="text-[9px] text-slate-500 font-mono">
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      )}

      <div className="relative flex items-center gap-2 max-w-[85%] sm:max-w-[70%]">
        
        {/* Hover Action Bar */}
        <div className={`hidden group-hover:flex items-center gap-1 bg-slate-900 border border-slate-700 px-2 py-1 rounded-xl shadow-lg z-10 ${isOwn ? 'order-first' : 'order-last'}`}>
          <button onClick={() => onReply(message)} className="text-slate-400 hover:text-white p-1" title="Reply">
            <Reply className="w-3 h-3" />
          </button>
          <button onClick={handleCopy} className="text-slate-400 hover:text-white p-1" title="Copy text">
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
          </button>
          <button onClick={() => onPin(message)} className="text-slate-400 hover:text-yellow-400 p-1" title="Pin message">
            <Pin className="w-3 h-3" />
          </button>
          {isOwn && (
            <>
              <button onClick={() => onEdit(message)} className="text-slate-400 hover:text-yellow-400 p-1" title="Edit message">
                <Edit2 className="w-3 h-3" />
              </button>
              <button onClick={() => onDelete(message.id)} className="text-slate-400 hover:text-red-400 p-1" title="Delete message">
                <Trash2 className="w-3 h-3" />
              </button>
            </>
          )}
        </div>

        {/* Message Bubble Body */}
        <div className={`p-3.5 rounded-2xl flex flex-col gap-1.5 shadow-md ${
          isOwn 
            ? 'bg-gradient-to-tr from-yellow-500 to-amber-400 text-slate-950 rounded-tr-none font-medium' 
            : 'bg-slate-900 border border-blue-900/30 text-slate-100 rounded-tl-none'
        }`}>
          
          {/* Reply Reference if exists */}
          {message.replyTo && (
            <div className={`p-2 rounded-xl text-xs border-l-2 mb-1 ${
              isOwn ? 'bg-slate-950/15 border-slate-950 text-slate-900' : 'bg-slate-950/60 border-yellow-500 text-slate-300'
            }`}>
              <span className="font-bold text-[10px] block">{message.replyTo.senderName}</span>
              <p className="italic truncate">{message.replyTo.text}</p>
            </div>
          )}

          {/* Media Attachment if exists */}
          {message.mediaUrl && (
            <div className="rounded-xl overflow-hidden my-1">
              {message.mediaType === 'image' ? (
                <img src={message.mediaUrl} alt="Attachment" className="max-h-60 rounded-xl object-cover w-full" />
              ) : (
                <a 
                  href={message.mediaUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-bold ${
                    isOwn ? 'bg-slate-950/20 text-slate-950 border-slate-950/30' : 'bg-slate-950 text-yellow-400 border-slate-800'
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>Download File Attachment</span>
                </a>
              )}
            </div>
          )}

          {/* Text Content */}
          <p className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed select-text">
            {message.text}
          </p>

          {/* Footer Metadata */}
          <div className={`flex items-center justify-end gap-1.5 text-[9px] font-mono mt-0.5 ${
            isOwn ? 'text-slate-900/70' : 'text-slate-500'
          }`}>
            {message.pinned && <Pin className="w-2.5 h-2.5 text-yellow-500" />}
            {message.edited && <span>(edited)</span>}
            <span>{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>

        </div>

      </div>

    </div>
  );
};
