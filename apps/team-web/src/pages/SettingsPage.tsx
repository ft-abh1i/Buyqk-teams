import React from 'react';
import { useAuth } from '../context/AuthContext';
import { Settings, Shield, Bell, Moon, Lock, User, LogOut } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const SettingsPage: React.FC = () => {
  const { profile, currentUser, logout, isSuperAdmin } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex-1 flex flex-col gap-6 p-6 font-sans overflow-y-auto">
      
      {/* Top Banner */}
      <div className="bg-slate-900/50 border border-blue-900/20 rounded-3xl p-6 shadow-premium flex items-center gap-3">
        <Settings className="w-6 h-6 text-yellow-500" />
        <div>
          <h1 className="text-xl sm:text-2xl font-black text-white">Teams Workspace Settings</h1>
          <p className="text-xs text-slate-400">Account security, notifications & workspace preferences.</p>
        </div>
      </div>

      {/* Settings Options */}
      <div className="max-w-2xl w-full flex flex-col gap-4">
        
        {/* Account Info */}
        <div className="bg-slate-900/50 border border-blue-900/20 rounded-3xl p-5 shadow-premium flex flex-col gap-3">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <User className="w-4 h-4 text-yellow-500" />
            <h3 className="text-xs font-extrabold uppercase text-slate-200 tracking-wider">Account Overview</h3>
          </div>

          <div className="flex items-center justify-between text-xs py-1">
            <span className="text-slate-400 font-medium">Logged In Email</span>
            <span className="font-mono text-white font-bold">{currentUser?.email}</span>
          </div>

          <div className="flex items-center justify-between text-xs py-1">
            <span className="text-slate-400 font-medium">Employee ID</span>
            <span className="font-mono text-yellow-400 font-bold">#{profile?.employeeId || '089'}</span>
          </div>

          <div className="flex items-center justify-between text-xs py-1">
            <span className="text-slate-400 font-medium">System Role</span>
            <span className="font-mono text-purple-400 font-bold">{isSuperAdmin ? 'Super Admin' : 'Employee'}</span>
          </div>
        </div>

        {/* Preferences */}
        <div className="bg-slate-900/50 border border-blue-900/20 rounded-3xl p-5 shadow-premium flex flex-col gap-3">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Moon className="w-4 h-4 text-blue-400" />
            <h3 className="text-xs font-extrabold uppercase text-slate-200 tracking-wider">Theme & Visuals</h3>
          </div>

          <div className="flex items-center justify-between text-xs py-1">
            <span className="text-slate-400 font-medium">Appearance Theme</span>
            <span className="font-bold text-yellow-500 bg-yellow-500/10 border border-yellow-500/20 px-2.5 py-1 rounded-xl">Dark Glassmorphism</span>
          </div>
        </div>

        {/* Security & Actions */}
        <div className="bg-slate-900/50 border border-blue-900/20 rounded-3xl p-5 shadow-premium flex flex-col gap-3">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Lock className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-extrabold uppercase text-slate-200 tracking-wider">Security & Actions</h3>
          </div>

          <button
            onClick={() => navigate('/teams/register')}
            className="w-full flex items-center justify-between p-3 rounded-2xl bg-slate-950/80 hover:bg-slate-900 border border-slate-800 text-xs font-bold text-slate-200 transition-all"
          >
            <span>Update Employee Profile</span>
            <span className="text-yellow-500">&rarr;</span>
          </button>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 font-bold text-xs py-3 rounded-2xl transition-all cursor-pointer mt-2"
          >
            <LogOut className="w-4 h-4" /> Sign Out of BuyQK Teams
          </button>
        </div>

      </div>

    </div>
  );
};
