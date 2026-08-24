import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
  Users, MessageSquare, FolderKanban, Sparkles,
  UserCheck, Building2, ArrowRight, Zap, Bell,
  Activity, Calendar
} from 'lucide-react';
import { db, rtdb } from '@buyqk/firebase';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { ref, onValue } from 'firebase/database';
import { EmployeeProfile, Announcement, ChatGroup } from '../types';

export const DashboardPage: React.FC = () => {
  const { profile, currentUser } = useAuth();
  const navigate = useNavigate();

  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [onlineUids, setOnlineUids] = useState<Set<string>>(new Set());
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [groups, setGroups] = useState<ChatGroup[]>([]);

  // Derived counts — all real
  const totalEmployees = employees.length;
  const onlineCount    = onlineUids.size;
  const deptSet        = new Set(employees.map(e => e.department).filter(Boolean));
  const departmentCount = deptSet.size;
  const groupCount      = groups.length;

  // Teammates shown on card grid (exclude self)
  const recentTeammates = employees
    .filter(e => e.uid !== currentUser?.uid && e.fullName)
    .slice(0, 6);

  // Online employees (avatars for the stat card)
  const onlineEmployees = employees.filter(e => onlineUids.has(e.uid)).slice(0, 3);

  // Upcoming work anniversaries (joining date within ±7 days of today)
  const today = new Date();
  const anniversaries = employees.filter(e => {
    if (!e.joiningDate || !e.fullName) return false;
    try {
      const d = new Date(e.joiningDate);
      const thisYear = new Date(today.getFullYear(), d.getMonth(), d.getDate());
      const diff = Math.abs(today.getTime() - thisYear.getTime()) / (1000 * 60 * 60 * 24);
      return diff <= 7;
    } catch { return false; }
  }).slice(0, 3);

  useEffect(() => {
    // 1. Real-time employees
    const unsubEmps = onSnapshot(collection(db, 'users'), snap => {
      const list: EmployeeProfile[] = [];
      snap.forEach(d => {
        const data = d.data() as EmployeeProfile;
        if (data.fullName) list.push({ ...data, uid: d.id });
      });
      setEmployees(list);
    });

    // 2. Real-time presence
    const unsubPresence = onValue(ref(rtdb, 'presence'), snap => {
      const uids = new Set<string>();
      if (snap.exists()) {
        Object.entries(snap.val()).forEach(([uid, v]: [string, any]) => {
          if (v?.online === true) uids.add(uid);
        });
      }
      setOnlineUids(uids);
    });

    // 3. Real-time announcements
    const qAnn = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'), limit(5));
    const unsubAnn = onSnapshot(qAnn, snap => {
      const list: Announcement[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as Announcement));
      setAnnouncements(list);
    });

    // 4. Real-time groups
    const unsubGroups = onSnapshot(collection(db, 'groups'), snap => {
      const list: ChatGroup[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as ChatGroup));
      setGroups(list);
    });

    return () => {
      unsubEmps();
      unsubPresence();
      unsubAnn();
      unsubGroups();
    };
  }, []);

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  const timeAgo = (ts: number) => {
    const diff = (Date.now() - ts) / 1000;
    if (diff < 60)  return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div className="flex-1 flex flex-col gap-6 p-6 font-sans overflow-y-auto bg-slate-950 select-none">

      {/* ── Hero Banner ── */}
      <div className="relative rounded-3xl bg-gradient-to-r from-[#090d16] via-[#101728] to-[#0d1322] border border-yellow-500/30 p-6 sm:p-8 shadow-2xl overflow-hidden">
        <div className="absolute w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl -top-20 -right-20 pointer-events-none" />
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#f59e0b_1px,transparent_1px)] [background-size:16px_16px] pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex flex-col gap-2 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-[10px] font-black uppercase tracking-widest w-fit">
              <Sparkles className="w-3.5 h-3.5" />
              {greeting()}, {profile?.fullName?.split(' ')[0] || 'Welcome'}
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              {greeting()}, {profile?.fullName?.split(' ')[0] || 'Team Member'}! 👋
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 font-medium">
              {profile?.designation && profile?.department
                ? `${profile.designation} · ${profile.department}`
                : 'BuyQK Internal Platform'}
            </p>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto z-10">
            <button
              onClick={() => navigate('/teams/chat')}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-black text-xs px-6 py-3 rounded-2xl shadow-gold-glow transition-all hover:scale-105 cursor-pointer"
            >
              <MessageSquare className="w-4 h-4" /> Open Chat
            </button>
            <button
              onClick={() => navigate('/teams/employees')}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold text-xs px-6 py-3 rounded-2xl transition-all cursor-pointer"
            >
              <Users className="w-4 h-4" /> Directory
            </button>
          </div>
        </div>
      </div>

      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">

        <div className="bg-slate-900/60 border border-blue-900/30 rounded-2xl p-4 flex items-center justify-between shadow-premium">
          <div className="flex flex-col">
            <span className="text-2xl font-black text-white">{totalEmployees}</span>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">TOTAL TEAMMATES</p>
            <span className="text-[10px] font-medium text-slate-500 mt-1">
              {deptSet.size > 0 ? `${deptSet.size} department${deptSet.size > 1 ? 's' : ''}` : 'No departments yet'}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
            <Users className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900/60 border border-emerald-500/30 rounded-2xl p-4 flex items-center justify-between shadow-premium">
          <div className="flex flex-col">
            <span className="text-2xl font-black text-white">{onlineCount}</span>
            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mt-0.5">ONLINE NOW</p>
            <div className="flex items-center -space-x-2 mt-2">
              {onlineEmployees.length > 0 ? (
                <>
                  {onlineEmployees.map(e => (
                    <div key={e.uid} className="w-6 h-6 rounded-full border-2 border-slate-950 bg-slate-800 flex items-center justify-center text-[9px] font-black text-white overflow-hidden shrink-0">
                      {e.photoUrl
                        ? <img src={e.photoUrl} alt={e.fullName} className="w-full h-full object-cover" />
                        : e.fullName.charAt(0)
                      }
                    </div>
                  ))}
                  {onlineCount > 3 && (
                    <span className="w-6 h-6 rounded-full border-2 border-slate-950 bg-slate-700 text-[9px] font-bold text-slate-300 flex items-center justify-center">
                      +{onlineCount - 3}
                    </span>
                  )}
                </>
              ) : (
                <span className="text-[10px] text-slate-500">No one online yet</span>
              )}
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
            <UserCheck className="w-6 h-6 animate-pulse" />
          </div>
        </div>

        <div className="bg-slate-900/60 border border-blue-900/30 rounded-2xl p-4 flex items-center justify-between shadow-premium">
          <div className="flex flex-col">
            <span className="text-2xl font-black text-white">{departmentCount}</span>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">DEPARTMENTS</p>
            {departmentCount > 0 ? (
              <span className="text-[9px] font-mono text-yellow-500 mt-2 bg-yellow-500/10 px-2 py-0.5 rounded-md border border-yellow-500/20 w-fit truncate max-w-[100px]">
                {[...deptSet][0]}
              </span>
            ) : (
              <span className="text-[9px] text-slate-500 mt-2">Filling up…</span>
            )}
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
            <Building2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-slate-900/60 border border-purple-500/30 rounded-2xl p-4 flex items-center justify-between shadow-premium">
          <div className="flex flex-col">
            <span className="text-2xl font-black text-white">{groupCount}</span>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-0.5">ACTIVE CHANNELS</p>
            <span className="text-[9px] text-slate-500 mt-2">
              {groupCount === 0 ? 'Create your first channel' : `${groupCount} group${groupCount > 1 ? 's' : ''}`}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
            <FolderKanban className="w-6 h-6" />
          </div>
        </div>

      </div>

      {/* ── Main Grid ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left 2 cols */}
        <div className="lg:col-span-2 flex flex-col gap-6">

          {/* Teammates */}
          <div className="bg-slate-900/60 border border-blue-900/30 rounded-3xl p-5 shadow-premium flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-yellow-500" />
                <h3 className="text-xs font-black uppercase text-slate-200 tracking-wider">BUYQK TEAMMATES</h3>
              </div>
              <button onClick={() => navigate('/teams/employees')} className="text-xs font-bold text-yellow-500 hover:underline flex items-center gap-1 cursor-pointer">
                View All →
              </button>
            </div>

            {recentTeammates.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 gap-3 text-slate-600">
                <Users className="w-8 h-8" />
                <p className="text-xs text-slate-500">No teammates yet — be the first to sign up!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {recentTeammates.map(m => (
                  <div key={m.uid} className="bg-slate-950/80 p-3 rounded-2xl border border-blue-900/20 flex items-center gap-3 hover:border-yellow-500/40 transition-all group">
                    <div className="w-10 h-10 rounded-xl border border-yellow-500/30 bg-slate-800 shrink-0 overflow-hidden flex items-center justify-center text-sm font-black text-white">
                      {m.photoUrl
                        ? <img src={m.photoUrl} alt={m.fullName} className="w-full h-full object-cover" />
                        : m.fullName.charAt(0)
                      }
                    </div>
                    <div className="overflow-hidden flex-1 text-left">
                      <p className="text-xs font-extrabold text-slate-100 truncate group-hover:text-yellow-400 transition-colors">{m.fullName}</p>
                      <p className="text-[10px] text-yellow-500 font-bold truncate">{m.designation || m.department || 'BuyQK Employee'}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {onlineUids.has(m.uid) && (
                        <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" title="Online" />
                      )}
                      <button onClick={() => navigate(`/teams/chat?uid=${m.uid}`)} className="p-2 rounded-xl bg-slate-900 hover:bg-yellow-500 hover:text-slate-950 text-slate-400 transition-all cursor-pointer">
                        <MessageSquare className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Company Broadcasts */}
          <div className="bg-slate-900/60 border border-blue-900/30 rounded-3xl p-5 shadow-premium flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-yellow-500" />
              <h3 className="text-xs font-black uppercase text-slate-200 tracking-wider">COMPANY BROADCASTS</h3>
            </div>

            {announcements.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-8 gap-3 text-slate-600">
                <Bell className="w-8 h-8" />
                <p className="text-xs text-slate-500">No announcements yet. Admins can post broadcasts here.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {announcements.map(ann => (
                  <div key={ann.id} className="bg-slate-950/80 p-4 rounded-2xl border border-blue-900/20 flex flex-col gap-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-yellow-400">{ann.title}</span>
                      <span className="text-[10px] text-slate-500 font-mono">{timeAgo(ann.createdAt)}</span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">{ann.content}</p>
                    {ann.author && (
                      <p className="text-[10px] text-slate-500">— {ann.author}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* Right col */}
        <div className="flex flex-col gap-6">

          {/* Quick Actions */}
          <div className="bg-slate-900/60 border border-blue-900/30 rounded-3xl p-5 shadow-premium flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-500" />
              <h3 className="text-xs font-black uppercase text-slate-200 tracking-wider">QUICK ACTIONS</h3>
            </div>
            <div className="flex flex-col gap-2.5">
              <button onClick={() => navigate('/teams/chat')} className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-950/80 hover:bg-slate-900 border border-slate-800 text-xs font-bold text-slate-200 transition-all cursor-pointer group">
                <span className="flex items-center gap-2.5"><MessageSquare className="w-4 h-4 text-yellow-500" /> Open Realtime Chat</span>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:translate-x-1 transition-transform" />
              </button>
              <button onClick={() => navigate('/teams/employees')} className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-950/80 hover:bg-slate-900 border border-slate-800 text-xs font-bold text-slate-200 transition-all cursor-pointer group">
                <span className="flex items-center gap-2.5"><Users className="w-4 h-4 text-blue-400" /> Employee Directory</span>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:translate-x-1 transition-transform" />
              </button>
              <button onClick={() => navigate('/teams/groups')} className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-950/80 hover:bg-slate-900 border border-slate-800 text-xs font-bold text-slate-200 transition-all cursor-pointer group">
                <span className="flex items-center gap-2.5"><FolderKanban className="w-4 h-4 text-purple-400" /> Group Channels</span>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
          </div>

          {/* Work Anniversaries — real from Firestore */}
          <div className="bg-gradient-to-br from-slate-900/80 to-slate-950 border border-yellow-500/20 rounded-3xl p-5 shadow-premium flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-yellow-500" />
              <h3 className="text-xs font-black uppercase text-slate-200 tracking-wider">WORK ANNIVERSARIES</h3>
            </div>

            {anniversaries.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 gap-2 text-slate-600">
                <Calendar className="w-7 h-7" />
                <p className="text-[11px] text-slate-500 text-center">No upcoming anniversaries this week.</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {anniversaries.map(e => {
                  const d = new Date(e.joiningDate);
                  const years = today.getFullYear() - d.getFullYear();
                  return (
                    <div key={e.uid} className="bg-slate-950/80 p-3 rounded-2xl border border-slate-900 flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-slate-800 border border-yellow-500/30 flex items-center justify-center text-sm font-black text-white overflow-hidden">
                          {e.photoUrl
                            ? <img src={e.photoUrl} alt={e.fullName} className="w-full h-full object-cover" />
                            : e.fullName.charAt(0)
                          }
                        </div>
                        <div className="text-left">
                          <p className="text-xs font-bold text-white">{e.fullName}</p>
                          <p className="text-[10px] text-slate-400">Work Anniversary</p>
                        </div>
                      </div>
                      <span className="text-[9px] font-extrabold bg-yellow-500/10 text-yellow-500 px-2 py-0.5 rounded-md border border-yellow-500/20">
                        {years > 0 ? `${years}yr${years > 1 ? 's' : ''}` : 'Day 1!'}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Groups */}
          <div className="bg-slate-900/60 border border-blue-900/30 rounded-3xl p-5 shadow-premium flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-purple-400" />
                <h3 className="text-xs font-black uppercase text-slate-200 tracking-wider">CHANNELS</h3>
              </div>
              <button onClick={() => navigate('/teams/groups')} className="text-[10px] text-purple-400 font-bold hover:underline cursor-pointer">View All →</button>
            </div>

            {groups.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-6 gap-2 text-slate-600">
                <FolderKanban className="w-7 h-7" />
                <p className="text-[11px] text-slate-500 text-center">No channels yet. Create one in Groups!</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {groups.slice(0, 4).map(g => (
                  <button
                    key={g.id}
                    onClick={() => navigate(`/teams/groups?gid=${g.id}`)}
                    className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-950/70 hover:bg-slate-900 border border-slate-900 hover:border-purple-500/30 transition-all text-left cursor-pointer"
                  >
                    <span className="text-lg leading-none">{g.icon || '💬'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-200 truncate">{g.name}</p>
                      <p className="text-[10px] text-slate-500 truncate">{g.department || 'General'}</p>
                    </div>
                    <span className="text-[10px] text-slate-600 font-mono">{Object.keys(g.members || {}).length} members</span>
                  </button>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
