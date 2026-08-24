import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { EmployeeProfile } from '../types';
import { 
  User, Mail, Phone, MapPin, Calendar, Github, Linkedin, 
  Globe, FileText, Download, Edit3, ShieldCheck, Sparkles, MessageSquare, Briefcase, GraduationCap 
} from 'lucide-react';
import { db } from '@buyqk/firebase';
import { doc, getDoc } from 'firebase/firestore';

export const ProfilePage: React.FC = () => {
  const { profile: ownProfile, currentUser } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [displayedProfile, setDisplayedProfile] = useState<EmployeeProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const targetUid = searchParams.get('uid') || currentUser?.uid;
  const isOwnProfile = !searchParams.get('uid') || searchParams.get('uid') === currentUser?.uid;

  useEffect(() => {
    const fetchTargetProfile = async () => {
      setLoading(true);
      if (!targetUid) return;

      if (isOwnProfile && ownProfile) {
        setDisplayedProfile(ownProfile);
        setLoading(false);
        return;
      }

      try {
        const snap = await getDoc(doc(db, 'users', targetUid));
        if (snap.exists()) {
          setDisplayedProfile(snap.data() as EmployeeProfile);
        } else {
          setDisplayedProfile(null);
        }
      } catch (err) {
        console.error("Fetch profile error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchTargetProfile();
  }, [targetUid, ownProfile, isOwnProfile]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 text-slate-400 font-sans">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-yellow-500 border-t-transparent" />
      </div>
    );
  }

  const p = displayedProfile || ownProfile;

  if (!p) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-400 font-sans gap-3">
        <User className="w-12 h-12 text-slate-600" />
        <p className="text-sm font-bold text-slate-300">Employee Profile Not Found</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col gap-6 p-6 font-sans overflow-y-auto">
      
      {/* Banner & Avatar Container */}
      <div className="relative rounded-3xl bg-slate-900/60 border border-blue-900/30 overflow-hidden shadow-2xl">
        
        {/* Top Cover Gradient */}
        <div className="h-36 bg-gradient-to-r from-yellow-500/20 via-blue-900/40 to-slate-950 p-6 flex justify-end">
          {isOwnProfile ? (
            <button
              onClick={() => navigate('/teams/register')}
              className="flex items-center gap-1.5 bg-slate-950/80 hover:bg-slate-950 text-yellow-400 border border-yellow-500/30 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all h-fit"
            >
              <Edit3 className="w-3.5 h-3.5" /> Edit Profile
            </button>
          ) : (
            <button
              onClick={() => navigate(`/teams/chat?uid=${p.uid}`)}
              className="flex items-center gap-1.5 bg-yellow-500 hover:bg-yellow-400 text-slate-950 px-4 py-2 rounded-xl text-xs font-extrabold shadow-gold-glow transition-all h-fit"
            >
              <MessageSquare className="w-3.5 h-3.5" /> Direct Message
            </button>
          )}
        </div>

        {/* User Avatar & Name Header */}
        <div className="p-6 pt-0 flex flex-col sm:flex-row items-start sm:items-end justify-between gap-4 -mt-14">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
            <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl overflow-hidden border-4 border-slate-950 bg-slate-800 shadow-2xl shrink-0">
              <img src={p.photoUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'} alt={p.fullName} className="w-full h-full object-cover" />
            </div>

            <div className="flex flex-col gap-1 pb-1">
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-white">{p.fullName}</h1>
                {p.isSuperAdmin && (
                  <span className="text-[10px] font-mono font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Super Admin
                  </span>
                )}
              </div>
              <p className="text-sm font-bold text-yellow-500">{p.designation}</p>
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">{p.department} Department</p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-950/80 px-4 py-2 rounded-2xl border border-slate-800 text-xs font-mono">
            <span className="text-slate-500">EMP ID:</span>
            <span className="font-extrabold text-yellow-400">#{p.employeeId || '089'}</span>
          </div>
        </div>

      </div>

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Quick Info & Socials */}
        <div className="flex flex-col gap-6">
          
          {/* Quick Info Box */}
          <div className="bg-slate-900/50 border border-blue-900/20 rounded-3xl p-5 shadow-premium flex flex-col gap-3.5 text-xs text-slate-300">
            <h3 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider border-b border-slate-800 pb-2.5">
              Contact & Location
            </h3>

            <div className="flex items-center gap-2.5">
              <Mail className="w-4 h-4 text-yellow-500 shrink-0" />
              <span className="truncate">{p.email}</span>
            </div>

            <div className="flex items-center gap-2.5">
              <Phone className="w-4 h-4 text-yellow-500 shrink-0" />
              <span className="font-mono">{p.phone || '+91 98765 43210'}</span>
            </div>

            <div className="flex items-center gap-2.5">
              <MapPin className="w-4 h-4 text-yellow-500 shrink-0" />
              <span>{p.city ? `${p.city}, ${p.state}` : 'Remote / Bengaluru'}</span>
            </div>

            <div className="flex items-center gap-2.5">
              <Calendar className="w-4 h-4 text-yellow-500 shrink-0" />
              <span>Joined: {p.joiningDate || '2026-08-01'}</span>
            </div>
          </div>

          {/* Social Links */}
          <div className="bg-slate-900/50 border border-blue-900/20 rounded-3xl p-5 shadow-premium flex flex-col gap-3">
            <h3 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider border-b border-slate-800 pb-2.5">
              Social Links & Portfolio
            </h3>

            {p.linkedin ? (
              <a href={p.linkedin} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 text-xs text-slate-300 hover:text-blue-400 transition-colors">
                <Linkedin className="w-4 h-4 text-blue-400" /> <span>LinkedIn Profile</span>
              </a>
            ) : (
              <span className="text-xs text-slate-500 italic">No LinkedIn attached</span>
            )}

            {p.github ? (
              <a href={p.github} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 text-xs text-slate-300 hover:text-white transition-colors">
                <Github className="w-4 h-4 text-slate-200" /> <span>GitHub Repository</span>
              </a>
            ) : (
              <span className="text-xs text-slate-500 italic">No GitHub attached</span>
            )}

            {p.portfolio && (
              <a href={p.portfolio} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2.5 text-xs text-slate-300 hover:text-yellow-400 transition-colors">
                <Globe className="w-4 h-4 text-yellow-500" /> <span>Portfolio Website</span>
              </a>
            )}
          </div>

          {/* Resume Document Box */}
          {p.resumeUrl && (
            <div className="bg-slate-900/50 border border-blue-900/20 rounded-3xl p-5 shadow-premium flex flex-col gap-3">
              <h3 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider border-b border-slate-800 pb-2.5">
                Resume Document
              </h3>
              <a
                href={p.resumeUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between p-3 rounded-2xl bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 text-xs font-bold transition-all"
              >
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  <span>{p.resumeFileName || 'Resume Document'}</span>
                </div>
                <Download className="w-4 h-4" />
              </a>
            </div>
          )}

        </div>

        {/* Right Column: Bio, Skills, Experience, Education */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          
          {/* About / Bio */}
          <div className="bg-slate-900/50 border border-blue-900/20 rounded-3xl p-6 shadow-premium flex flex-col gap-3">
            <h3 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider border-b border-slate-800 pb-2.5">
              Professional Bio
            </h3>
            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans">
              {p.bio || 'Passionate software engineer focused on building robust scalable systems.'}
            </p>
          </div>

          {/* Skills Tags */}
          <div className="bg-slate-900/50 border border-blue-900/20 rounded-3xl p-6 shadow-premium flex flex-col gap-3">
            <h3 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider border-b border-slate-800 pb-2.5">
              Technical Skills & Competencies
            </h3>
            <div className="flex flex-wrap gap-2">
              {p.skills && p.skills.length > 0 ? (
                p.skills.map((sk, i) => (
                  <span key={i} className="text-xs font-bold px-3 py-1.5 rounded-xl bg-slate-950 text-yellow-400 border border-yellow-500/30">
                    {sk}
                  </span>
                ))
              ) : (
                <span className="text-xs text-slate-500 italic">No skills listed yet.</span>
              )}
            </div>
          </div>

          {/* Experience & Education */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            
            <div className="bg-slate-900/50 border border-blue-900/20 rounded-3xl p-6 shadow-premium flex flex-col gap-3">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2.5">
                <Briefcase className="w-4 h-4 text-yellow-500" />
                <h3 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">Experience</h3>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed">{p.experience || 'Software Engineer at BuyQK'}</p>
            </div>

            <div className="bg-slate-900/50 border border-blue-900/20 rounded-3xl p-6 shadow-premium flex flex-col gap-3">
              <div className="flex items-center gap-2 border-b border-slate-800 pb-2.5">
                <GraduationCap className="w-4 h-4 text-blue-400" />
                <h3 className="text-xs font-extrabold uppercase text-slate-400 tracking-wider">Education</h3>
              </div>
              <p className="text-xs text-slate-200 leading-relaxed">{p.education || 'B.Tech in Computer Science'}</p>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
};
