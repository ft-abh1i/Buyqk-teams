import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { 
  LayoutDashboard, MessageSquare, Users, FolderKanban, 
  UserCircle, ShieldCheck, Settings, Sparkles, Rocket 
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const { isAdmin, isSuperAdmin, profile } = useAuth();

  const navItems = [
    { label: 'Dashboard', path: '/teams/dashboard', icon: LayoutDashboard },
    { label: 'Realtime Chat', path: '/teams/chat', icon: MessageSquare, badge: '3' },
    { label: 'Directory', path: '/teams/employees', icon: Users },
    { label: 'Groups', path: '/teams/groups', icon: FolderKanban },
    { label: 'My Profile', path: '/teams/profile', icon: UserCircle },
  ];

  if (isAdmin) {
    navItems.push({ label: 'Admin Panel', path: '/teams/admin', icon: ShieldCheck });
  }

  navItems.push({ label: 'Settings', path: '/teams/settings', icon: Settings });

  return (
    <aside className="no-print w-64 bg-slate-950/80 border-r border-blue-900/20 flex flex-col justify-between p-4 shrink-0 font-sans min-h-[calc(100vh-4rem)] select-none">
      <div className="flex flex-col gap-6">
        
        {/* User Quick Info */}
        <div className="bg-slate-900/60 border border-blue-900/30 rounded-2xl p-3.5 flex items-center gap-3 shadow-lg">
          <div className="w-10 h-10 rounded-xl overflow-hidden border border-yellow-500/40 shrink-0 bg-slate-800 shadow-md flex items-center justify-center font-black text-sm text-yellow-400">
            {profile?.photoUrl ? (
              <img 
                src={profile.photoUrl} 
                alt="Profile" 
                className="w-full h-full object-cover"
              />
            ) : (
              <span>{(profile?.fullName || 'User').charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="overflow-hidden">
            <p className="text-xs font-black text-slate-100 truncate">{profile?.fullName || 'Team Member'}</p>
            <p className="text-[10px] text-yellow-500 font-bold truncate">{profile?.designation || 'Employee'} &bull; {profile?.department || 'Engineering'}</p>
          </div>
        </div>

        {/* Navigation Section */}
        <div className="flex flex-col gap-1">
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 px-3 mb-1">Navigation</span>
          
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-xs font-bold transition-all ${
                    isActive
                      ? 'bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 shadow-gold-glow font-black scale-[1.02]'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-900/70'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[9px] font-black bg-blue-600 text-white px-2 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </div>

      </div>

      {/* 3D Rocket Branding Card (Matching Dashboard Design Screenshot) */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-slate-900/90 to-slate-950 border border-yellow-500/30 p-4 shadow-2xl flex flex-col gap-3 group">
        <div className="absolute w-32 h-32 bg-yellow-500/10 rounded-full blur-2xl -top-10 -right-10 pointer-events-none" />
        
        <div className="flex flex-col gap-1 z-10 text-left">
          <span className="text-xs font-black text-white leading-tight">Powering collaboration.</span>
          <span className="text-xs font-extrabold text-yellow-400 leading-tight">Delivering impact.</span>
        </div>

        <div className="flex items-center justify-between z-10 pt-1">
          <button className="px-3 py-1.5 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-slate-950 font-black text-[10px] uppercase tracking-wider shadow-gold-glow transition-all">
            BuyQK
          </button>
          <Rocket className="w-8 h-8 text-yellow-500 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
        </div>
      </div>

    </aside>
  );
};
