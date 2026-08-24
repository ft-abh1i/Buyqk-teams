import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ChatGroup, EmployeeProfile } from '../types';
import { 
  FolderKanban, Plus, ShieldCheck, Users, MessageSquare, 
  Trash2, Edit2, CheckCircle2, X, Sparkles 
} from 'lucide-react';
import { db, rtdb } from '@buyqk/firebase';
import { collection, onSnapshot, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { ref, set, remove, onValue } from 'firebase/database';

export const GroupsPage: React.FC = () => {
  const { isSuperAdmin, currentUser } = useAuth();
  const navigate = useNavigate();

  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [employees, setEmployees] = useState<EmployeeProfile[]>([]);
  const [showCreateModal, setShowCreateModal] = useState<boolean>(false);

  // Group Form state
  const [groupName, setGroupName] = useState<string>('');
  const [groupDesc, setGroupDesc] = useState<string>('');
  const [groupDept, setGroupDept] = useState<string>('Engineering');
  const [selectedMembers, setSelectedMembers] = useState<Record<string, boolean>>({});

  useEffect(() => {
    // Listen to groups from Firestore
    const unsubscribeGroups = onSnapshot(collection(db, 'groups'), (snap) => {
      const list: ChatGroup[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() } as ChatGroup));
      if (list.length > 0) setGroups(list);
    });

    // Listen to groups from RTDB (fallback / realtime)
    const rtdbGroupsRef = ref(rtdb, 'groups');
    const unsubRtdbGroups = onValue(rtdbGroupsRef, (snap) => {
      if (snap.exists()) {
        const data = snap.val();
        const rtdbList: ChatGroup[] = Object.entries(data).map(([id, val]: [string, any]) => ({
          id,
          ...val
        }));
        setGroups(prev => {
          const map = new Map<string, ChatGroup>();
          prev.forEach(g => map.set(g.id, g));
          rtdbList.forEach(g => map.set(g.id, g));
          return Array.from(map.values());
        });
      }
    });

    // Listen to employees for member selection (filter out dummy/empty records)
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

    return () => {
      unsubscribeGroups();
      unsubRtdbGroups();
      unsubscribeEmployees();
    };
  }, []);

  const handleToggleMember = (uid: string) => {
    setSelectedMembers(prev => ({
      ...prev,
      [uid]: !prev[uid]
    }));
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim() || !currentUser) return;

    try {
      const groupId = `grp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const membersMap = { ...selectedMembers, [currentUser.uid]: true };

      const newGroup: ChatGroup = {
        id: groupId,
        name: groupName.trim(),
        description: groupDesc.trim() || 'Internal collaboration channel',
        icon: '💬',
        themeColor: '#fabf04',
        department: groupDept,
        members: membersMap,
        createdBy: currentUser.uid,
        createdAt: Date.now()
      };

      // 1. Write to Realtime Database (guaranteed success for authenticated users)
      await set(ref(rtdb, `groups/${groupId}`), newGroup);

      // 2. Write to Firestore (best-effort)
      try {
        await setDoc(doc(db, 'groups', groupId), newGroup);
      } catch (fsErr) {
        console.warn("Firestore group write fallback to RTDB:", fsErr);
      }

      setShowCreateModal(false);
      setGroupName('');
      setGroupDesc('');
      setSelectedMembers({});
    } catch (err: any) {
      console.error("Create group error:", err);
    }
  };

  const handleDeleteGroup = async (groupId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Are you sure you want to delete this group channel?")) return;
    try {
      await remove(ref(rtdb, `groups/${groupId}`));
      await deleteDoc(doc(db, 'groups', groupId));
    } catch (err: any) {
      console.warn("Error deleting group:", err);
    }
  };

  return (
    <div className="flex-1 flex flex-col gap-6 p-6 font-sans overflow-y-auto">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-slate-900/50 border border-blue-900/20 rounded-3xl p-6 shadow-premium">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-purple-400" />
            <h1 className="text-xl sm:text-2xl font-black text-white">Department Group Channels</h1>
          </div>
          <p className="text-xs text-slate-400">Team channels for Engineering, Operations, Product, HR & Announcements.</p>
        </div>

        {isSuperAdmin && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-slate-950 px-4 py-2.5 rounded-2xl text-xs font-black shadow-gold-glow transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Create New Group
          </button>
        )}
      </div>

      {/* Groups Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups.length === 0 ? (
          <div className="col-span-full py-12 flex flex-col items-center justify-center gap-3 text-slate-500 bg-slate-900/30 rounded-3xl border border-slate-900">
            <FolderKanban className="w-10 h-10 text-slate-600" />
            <p className="text-xs font-bold text-slate-400">No group channels created yet.</p>
          </div>
        ) : (
          groups.map((grp) => {
            const memberCount = Object.keys(grp.members || {}).length;
            return (
              <div
                key={grp.id}
                onClick={() => navigate(`/teams/chat`)}
                className="bg-slate-900/50 hover:bg-slate-900/80 border border-blue-900/20 hover:border-purple-500/40 rounded-2xl p-5 flex flex-col justify-between gap-4 transition-all duration-300 shadow-premium cursor-pointer group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-2xl overflow-hidden border border-purple-500/40 bg-slate-800 shrink-0">
                      <img src={grp.icon || 'https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=150'} alt={grp.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="overflow-hidden">
                      <h3 className="text-sm font-extrabold text-white group-hover:text-purple-300 transition-colors">#{grp.name}</h3>
                      <span className="text-[10px] text-yellow-500 font-semibold uppercase">{grp.department}</span>
                    </div>
                  </div>

                  {isSuperAdmin && (
                    <button
                      onClick={(e) => handleDeleteGroup(grp.id, e)}
                      className="p-1.5 rounded-lg hover:bg-red-500/20 text-slate-500 hover:text-red-400 transition-all"
                      title="Delete Group"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>

                <p className="text-xs text-slate-300 line-clamp-2">{grp.description}</p>

                <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs font-mono">
                  <span className="text-slate-400 flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-purple-400" /> {memberCount} Members
                  </span>

                  <span className="flex items-center gap-1 font-bold text-yellow-400 group-hover:translate-x-1 transition-transform">
                    <MessageSquare className="w-3.5 h-3.5" /> Join Chat
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Super Admin Create Group Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in">
          <div className="max-w-lg w-full bg-slate-900 border border-purple-500/40 rounded-3xl p-6 shadow-2xl flex flex-col gap-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-purple-400" />
                <h3 className="text-sm font-black uppercase text-white tracking-wider">Super Admin: Create Group Channel</h3>
              </div>
              <button onClick={() => setShowCreateModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Channel Name</label>
                <input
                  type="text"
                  required
                  value={groupName}
                  onChange={e => setGroupName(e.target.value)}
                  placeholder="e.g. engineering-core or announcements"
                  className="bg-slate-950 border border-blue-900/30 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Department</label>
                <select
                  value={groupDept}
                  onChange={e => setGroupDept(e.target.value)}
                  className="bg-slate-950 border border-blue-900/30 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500"
                >
                  <option value="Engineering">Engineering</option>
                  <option value="Product">Product</option>
                  <option value="Design">Design</option>
                  <option value="Operations">Operations</option>
                  <option value="HR">HR</option>
                  <option value="All Hands">All Hands Company Wide</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase font-bold text-slate-400">Description</label>
                <textarea
                  rows={2}
                  value={groupDesc}
                  onChange={e => setGroupDesc(e.target.value)}
                  placeholder="Purpose of this group channel..."
                  className="bg-slate-950 border border-blue-900/30 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500 resize-none"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] uppercase font-bold text-slate-400">Select Initial Members</label>
                <div className="max-h-36 overflow-y-auto bg-slate-950 p-2 rounded-xl border border-slate-800 flex flex-col gap-1">
                  {employees.map(emp => (
                    <label key={emp.uid} className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-900 cursor-pointer text-xs">
                      <span className="text-slate-200 font-medium">{emp.fullName} ({emp.department})</span>
                      <input
                        type="checkbox"
                        checked={!!selectedMembers[emp.uid]}
                        onChange={() => handleToggleMember(emp.uid)}
                        className="rounded border-slate-700 text-purple-500 focus:ring-purple-400"
                      />
                    </label>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="w-full bg-purple-600 hover:bg-purple-500 text-white font-black text-xs py-3 rounded-2xl shadow-lg transition-all cursor-pointer mt-2"
              >
                Create Channel
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
