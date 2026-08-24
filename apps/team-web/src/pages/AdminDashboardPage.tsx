import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { EmployeeProfile, Announcement } from '../types';
import { 
  ShieldCheck, Users, Megaphone, UserCheck, Ban, 
  Sparkles, CheckCircle2, AlertCircle, Plus, Trash2, Shield 
} from 'lucide-react';
import { db, rtdb } from '@buyqk/firebase';
import { collection, onSnapshot, doc, updateDoc, setDoc, deleteDoc } from 'firebase/firestore';
import { ref, onValue } from 'firebase/database';

export const AdminDashboardPage: React.FC = () => {
  const { isAdmin, isSuperAdmin, currentUser } = useAuth();
  const navigate = useNavigate();

  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [onlineCount, setOnlineCount] = useState<number>(1);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  // Announcement Form
  const [annTitle, setAnnTitle] = useState<string>('');
  const [annContent, setAnnContent] = useState<string>('');

  useEffect(() => {
    if (!isAdmin) {
      navigate('/teams/dashboard');
      return;
    }

    // Listen to all employees (filter out invalid/dummy records)
    const unsubscribeEmployees = onSnapshot(collection(db, 'users'), (snap) => {
      const list: EmployeeProfile[] = [];
      snap.forEach(d => {
        const data = d.data() as EmployeeProfile;
        if (data && data.fullName && data.fullName.trim().length > 0) {
          list.push({ ...data, uid: d.id });
        }
      });
      setEmployees(list);
    });

    // Realtime presence
    const presenceRef = ref(rtdb, 'presence');
    const unsubscribePresence = onValue(presenceRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val();
        const onlineUsers = Object.values(data).filter((p: any) => p?.online === true);
        setOnlineCount(onlineUsers.length || 1);
      }
    });

    // Announcements
    const unsubscribeAnn = onSnapshot(collection(db, 'announcements'), (snap) => {
      const list: Announcement[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as Announcement));
      setAnnouncements(list);
    });

    return () => {
      unsubscribeEmployees();
      unsubscribePresence();
      unsubscribeAnn();
    };
  }, [isSuperAdmin, navigate]);

  const handlePublishAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!annTitle.trim() || !annContent.trim()) return;

    try {
      const annId = Math.random().toString(36).substring(2, 9);
      const newAnn: Announcement = {
        id: annId,
        title: annTitle.trim(),
        content: annContent.trim(),
        author: 'Super Admin (Akshat)',
        authorAvatar: '',
        createdAt: Date.now()
      };
      await setDoc(doc(db, 'announcements', annId), newAnn);
      setAnnTitle('');
      setAnnContent('');
    } catch (err: any) {
      alert("Error publishing announcement: " + err.message);
    }
  };

  const handleDeleteAnnouncement = async (annId: string) => {
    try {
      await deleteDoc(doc(db, 'announcements', annId));
    } catch (err: any) {
      alert("Error deleting announcement: " + err.message);
    }
  };

  const handleToggleAdminRole = async (emp: EmployeeProfile) => {
    try {
      await updateDoc(doc(db, 'users', emp.uid), {
        isAdmin: !emp.isAdmin
      });
    } catch (err: any) {
      alert("Error updating admin role: " + err.message);
    }
  };

  const handleToggleDisableAccount = async (emp: EmployeeProfile) => {
    const newStatus = emp.status === 'disabled' ? 'approved' : 'disabled';
    try {
      await updateDoc(doc(db, 'users', emp.uid), {
        status: newStatus
      });
    } catch (err: any) {
      alert("Error updating account status: " + err.message);
    }
  };

  if (!isAdmin) return null;

  return (
    <div className="flex-1 flex flex-col gap-6 p-6 font-sans overflow-y-auto">
      
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-gradient-to-r from-purple-950 via-slate-900 to-slate-950 border border-purple-500/40 rounded-3xl p-6 shadow-2xl">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-purple-400" />
            <h1 className="text-xl sm:text-2xl font-black text-white">
              {isSuperAdmin ? 'Super Admin Control Center' : 'Admin Control Center'}
            </h1>
          </div>
          <p className="text-xs text-purple-300">
            {isSuperAdmin
              ? 'Super Admin Privileges — Manage employee roles, status & broadcasts'
              : 'Admin Privileges — Promote team members & post broadcasts'}
          </p>
        </div>

        <span className="text-xs font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 px-3 py-1.5 rounded-xl">
          {isSuperAdmin ? 'Super Admin Active' : 'Admin Active'}
        </span>
      </div>

      {/* Analytics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900/50 border border-purple-500/20 rounded-2xl p-4 flex items-center gap-4 shadow-premium">
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center font-black text-xl shrink-0">
            {employees.length}
          </div>
          <div>
            <span className="text-xs font-bold text-slate-200 block">Total Employees</span>
            <span className="text-[10px] text-slate-500 uppercase font-mono">Registered</span>
          </div>
        </div>

        <div className="bg-slate-900/50 border border-emerald-500/20 rounded-2xl p-4 flex items-center gap-4 shadow-premium">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-black text-xl shrink-0">
            {onlineCount}
          </div>
          <div>
            <span className="text-xs font-bold text-slate-200 block">Online Now</span>
            <span className="text-[10px] text-emerald-400 uppercase font-mono">Live RTDB</span>
          </div>
        </div>

        <div className="bg-slate-900/50 border border-yellow-500/20 rounded-2xl p-4 flex items-center gap-4 shadow-premium">
          <div className="w-12 h-12 rounded-xl bg-yellow-500/10 text-yellow-500 flex items-center justify-center font-black text-xl shrink-0">
            {announcements.length}
          </div>
          <div>
            <span className="text-xs font-bold text-slate-200 block">Broadcasts</span>
            <span className="text-[10px] text-yellow-500 uppercase font-mono">Company Wide</span>
          </div>
        </div>

        <div className="bg-slate-900/50 border border-blue-900/20 rounded-2xl p-4 flex items-center gap-4 shadow-premium">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center font-black text-xl shrink-0">
            {employees.filter(e => e.isAdmin).length}
          </div>
          <div>
            <span className="text-xs font-bold text-slate-200 block">Admins</span>
            <span className="text-[10px] text-slate-500 uppercase font-mono">Promoted</span>
          </div>
        </div>
      </div>

      {/* Main Split Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Employee Management */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="bg-slate-900/50 border border-blue-900/20 rounded-3xl p-6 shadow-premium flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Users className="w-4 h-4 text-purple-400" />
              <h3 className="text-sm font-extrabold uppercase text-slate-200 tracking-wider">Employee Management & Privileges</h3>
            </div>

            <div className="flex flex-col gap-2 max-h-[450px] overflow-y-auto pr-1">
              {employees.map(emp => (
                <div key={emp.uid} className="bg-slate-950/80 p-3.5 rounded-2xl border border-blue-900/20 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="w-10 h-10 rounded-xl border border-purple-500/30 bg-slate-800 shrink-0 overflow-hidden flex items-center justify-center text-sm font-black text-purple-300">
                      {emp.photoUrl
                        ? <img src={emp.photoUrl} alt={emp.fullName} className="w-full h-full object-cover" />
                        : (emp.fullName || '?').charAt(0).toUpperCase()
                      }
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-xs font-extrabold text-white truncate">{emp.fullName}</p>
                      <p className="text-[10px] text-slate-400 truncate">{emp.email} &bull; <span className="text-yellow-400">ID #{emp.employeeId || ''}</span></p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleToggleAdminRole(emp)}
                      className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold transition-all ${
                        emp.isAdmin 
                          ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' 
                          : 'bg-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {emp.isAdmin ? 'Admin' : 'Make Admin'}
                    </button>

                    <button
                      onClick={() => handleToggleDisableAccount(emp)}
                      className={`px-2.5 py-1.5 rounded-xl text-[10px] font-bold transition-all ${
                        emp.status === 'disabled' 
                          ? 'bg-red-500 text-white shadow-lg' 
                          : 'bg-slate-800 text-red-400 hover:bg-red-500/10'
                      }`}
                    >
                      {emp.status === 'disabled' ? 'Disabled' : 'Disable'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right 1 Col: Broadcast Announcements */}
        <div className="flex flex-col gap-6">
          <div className="bg-slate-900/50 border border-blue-900/20 rounded-3xl p-6 shadow-premium flex flex-col gap-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Megaphone className="w-4 h-4 text-yellow-500" />
              <h3 className="text-sm font-extrabold uppercase text-slate-200 tracking-wider">Broadcast Announcement</h3>
            </div>

            <form onSubmit={handlePublishAnnouncement} className="flex flex-col gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Headline Title</label>
                <input
                  type="text"
                  required
                  value={annTitle}
                  onChange={e => setAnnTitle(e.target.value)}
                  placeholder="e.g. Q3 Townhall Meeting Scheduled"
                  className="bg-slate-950 border border-blue-900/30 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-yellow-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Content</label>
                <textarea
                  rows={3}
                  required
                  value={annContent}
                  onChange={e => setAnnContent(e.target.value)}
                  placeholder="Full announcement details..."
                  className="bg-slate-950 border border-blue-900/30 rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none focus:border-yellow-500 resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-black text-xs py-2.5 rounded-xl shadow-gold-glow transition-all cursor-pointer"
              >
                Publish Broadcast
              </button>
            </form>

            <div className="flex flex-col gap-2 mt-2">
              <span className="text-[10px] font-bold uppercase text-slate-500">Published Broadcasts</span>
              {announcements.map(ann => (
                <div key={ann.id} className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                  <span className="truncate font-bold text-slate-200">{ann.title}</span>
                  <button onClick={() => handleDeleteAnnouncement(ann.id)} className="text-slate-500 hover:text-red-400 p-1">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
