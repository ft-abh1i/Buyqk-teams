import React, { useState, useEffect } from 'react';
import { EmployeeProfile } from '../../types';
import { MessageSquare, Github, Linkedin, ExternalLink, ShieldCheck, Mail, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { rtdb } from '@buyqk/firebase';
import { ref, onValue } from 'firebase/database';

interface Props {
  member: EmployeeProfile;
  onQuickChat: (member: EmployeeProfile) => void;
}

export const EmployeeCard: React.FC<Props> = ({ member, onQuickChat }) => {
  const navigate = useNavigate();
  const [isOnline, setIsOnline] = useState<boolean>(false);

  useEffect(() => {
    const presenceRef = ref(rtdb, `presence/${member.uid}`);
    const unsubscribe = onValue(presenceRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        setIsOnline(data?.online === true);
      } else {
        setIsOnline(false);
      }
    });

    return () => unsubscribe();
  }, [member.uid]);

  return (
    <div className="bg-slate-900/50 hover:bg-slate-900/80 border border-blue-900/20 hover:border-yellow-500/40 rounded-2xl p-4 flex flex-col justify-between gap-4 transition-all duration-300 shadow-premium hover:shadow-gold-glow/20 group font-sans">
      
      {/* Top Header & Avatar */}
      <div className="flex items-start gap-3.5">
        <div className="relative shrink-0">
          <div className="w-14 h-14 rounded-2xl overflow-hidden border border-yellow-500/40 bg-slate-800 shadow-md flex items-center justify-center font-black text-xl text-yellow-400">
            {member.photoUrl ? (
              <img 
                src={member.photoUrl} 
                alt={member.fullName} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              />
            ) : (
              <span>{(member.fullName || '?').charAt(0).toUpperCase()}</span>
            )}
          </div>
          <span 
            className={`absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-slate-950 ${
              isOnline ? 'bg-emerald-500 shadow-emerald-glow animate-pulse' : 'bg-slate-600'
            }`} 
            title={isOnline ? 'Online Now' : 'Offline'}
          />
        </div>

        <div className="flex flex-col text-left overflow-hidden flex-1">
          <div className="flex items-center gap-1.5">
            <h3 
              onClick={() => navigate(`/teams/profile?uid=${member.uid}`)}
              className="text-sm font-extrabold text-slate-100 truncate hover:text-yellow-400 cursor-pointer transition-colors"
            >
              {member.fullName}
            </h3>
            {member.isSuperAdmin && (
              <span title="Super Admin"><ShieldCheck className="w-3.5 h-3.5 text-purple-400 shrink-0" /></span>
            )}
          </div>
          <p className="text-xs font-bold text-yellow-500 truncate">{member.designation}</p>
          <span className="text-[10px] text-slate-400 font-semibold truncate uppercase tracking-wider">{member.department}</span>
        </div>
      </div>

      {/* Details Row */}
      <div className="grid grid-cols-2 gap-2 bg-slate-950/60 p-2.5 rounded-xl border border-blue-900/10 text-[10px] font-mono">
        <div className="flex flex-col">
          <span className="text-slate-500 uppercase">EMP ID</span>
          <span className="font-bold text-yellow-400">{member.employeeId ? `#${member.employeeId}` : '-'}</span>
        </div>
        <div className="flex flex-col truncate">
          <span className="text-slate-500 uppercase">LOCATION</span>
          <span className="font-bold text-slate-300 truncate">{member.city ? `${member.city}, ${member.state}` : 'Remote'}</span>
        </div>
      </div>

      {/* Skills tags preview */}
      {member.skills && member.skills.length > 0 && (
        <div className="flex flex-wrap gap-1 max-h-12 overflow-hidden">
          {member.skills.slice(0, 3).map((sk, idx) => (
            <span key={idx} className="text-[9px] font-bold px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-slate-700">
              {sk}
            </span>
          ))}
          {member.skills.length > 3 && (
            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-yellow-500/10 text-yellow-500">
              +{member.skills.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
        <div className="flex items-center gap-1.5 text-slate-400">
          {member.github && (
            <a href={member.github} target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
              <Github className="w-3.5 h-3.5" />
            </a>
          )}
          {member.linkedin && (
            <a href={member.linkedin} target="_blank" rel="noopener noreferrer" className="hover:text-blue-400 transition-colors">
              <Linkedin className="w-3.5 h-3.5" />
            </a>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/teams/profile?uid=${member.uid}`)}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all"
          >
            Profile
          </button>

          <button
            onClick={() => onQuickChat(member)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-slate-950 text-xs font-extrabold shadow-gold-glow transition-all"
          >
            <MessageSquare className="w-3.5 h-3.5" /> Chat
          </button>
        </div>
      </div>

    </div>
  );
};
