import React, { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, Sparkles, LogOut, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const LoginPage: React.FC = () => {
  const { loginWithGoogle, isAccessRestricted, unauthorizedEmail, logout, currentUser, loading } = useAuth();
  const navigate = useNavigate();

  // Auto-redirect when already logged in with an authorized account
  useEffect(() => {
    if (!loading && currentUser && !isAccessRestricted) {
      navigate('/teams/dashboard', { replace: true });
    }
  }, [currentUser, isAccessRestricted, loading, navigate]);

  // Show full-screen spinner while auth is resolving
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-yellow-500 border-t-transparent" />
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading BuyQK Teams...</span>
        </div>
      </div>
    );
  }

  // If unauthorized email is logged in, show Access Restricted screen
  if (isAccessRestricted) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden">
        {/* Ambient Gradient Glow */}
        <div className="absolute w-96 h-96 bg-red-600/10 rounded-full blur-3xl -top-20 -left-20 pointer-events-none" />
        <div className="absolute w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl -bottom-20 -right-20 pointer-events-none" />

        <div className="max-w-md w-full bg-slate-900/60 border border-red-500/30 rounded-3xl p-8 shadow-2xl backdrop-blur-xl flex flex-col items-center text-center gap-6 relative z-10 animate-in fade-in zoom-in-95">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 shadow-lg">
            <ShieldAlert className="w-8 h-8 animate-pulse" />
          </div>

          <div>
            <span className="text-[10px] font-black uppercase tracking-widest text-red-400 bg-red-500/10 border border-red-500/20 px-3 py-1 rounded-full">
              Access Restricted
            </span>
            <h2 className="text-xl font-extrabold text-white mt-3">Unauthorized Email Account</h2>
            <p className="text-xs text-slate-300 leading-relaxed mt-2 font-medium">
              The email <span className="font-mono text-red-300 font-bold bg-slate-950 px-2 py-0.5 rounded border border-red-500/20">{unauthorizedEmail || currentUser?.email}</span> is not authorized to access the BuyQK Teams Panel.
            </p>
          </div>

          <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-2xl text-left w-full text-xs text-slate-400 space-y-1.5 font-mono">
            <p className="font-bold text-yellow-400 uppercase tracking-wider text-[10px]">Access Policy:</p>
            <p className="text-slate-300">&bull; Only official company Gmail accounts matching pattern <span className="text-yellow-400 font-bold">buyqk.*@gmail.com</span> can log in.</p>
            <p className="text-slate-300">&bull; Super Admin account: <span className="text-yellow-400 font-bold">akshat.srivastava098@gmail.com</span></p>
          </div>

          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-300 font-bold text-xs py-3 rounded-xl transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" /> Sign Out & Try Approved Account
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-between p-6 sm:p-12 font-sans relative overflow-hidden">
      
      {/* Background Animated Blobs */}
      <div className="absolute w-[500px] h-[500px] bg-yellow-500/10 rounded-full blur-[120px] top-1/4 left-1/2 -translate-x-1/2 pointer-events-none" />
      <div className="absolute w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[100px] -bottom-20 -left-20 pointer-events-none" />

      {/* Top Header */}
      <header className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <img src="/assets/logo.webp" alt="BuyQK Logo" className="h-10 sm:h-12 w-auto object-contain shrink-0 drop-shadow-md" />
          <div>
            <h1 className="font-extrabold text-white text-sm tracking-wide uppercase">BUYQK TEAMS</h1>
            <p className="text-[10px] text-yellow-500 font-semibold tracking-wider uppercase">Internal Collaboration Platform</p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Lock className="w-3.5 h-3.5 text-yellow-500" />
          <span className="font-mono">Secure Enterprise SSO</span>
        </div>
      </header>

      {/* Center Hero Box */}
      <main className="max-w-md w-full mx-auto my-auto relative z-10 flex flex-col gap-8 text-center">
        
        <div className="flex flex-col items-center gap-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-yellow-500 text-xs font-bold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 animate-spin" /> BuyQK Internal Ecosystem
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
            Connect, Collaborate & Build Hyperlocal Tech
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-sm">
            Slack + Discord + Linear + Notion style workspace for BuyQK engineering, HR, sales & operations.
          </p>
        </div>

        <div className="bg-slate-900/60 border border-blue-900/30 rounded-3xl p-6 shadow-2xl backdrop-blur-xl flex flex-col gap-4">
          <button
            onClick={loginWithGoogle}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-100 text-slate-950 font-extrabold text-sm py-3.5 rounded-2xl shadow-xl transition-all hover:scale-[1.02] cursor-pointer"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
              <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.24v3.13C3.26 21.37 7.37 24 12 24z"/>
              <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.6H1.24C.45 8.18 0 9.99 0 12s.45 3.82 1.24 5.4l4.04-3.13z"/>
              <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.37 0 3.26 2.63 1.24 6.6l4.04 3.13c.95-2.83 3.6-4.98 6.72-4.98z"/>
            </svg>
            <span>Sign In with BuyQK Google Account</span>
          </button>

          <p className="text-[11px] text-slate-400 font-medium">
            Authorized Domain Policy: Only <span className="font-mono text-yellow-400 font-bold">buyqk.*@gmail.com</span> emails are granted access.
          </p>
        </div>

      </main>

      {/* Footer */}
      <footer className="flex items-center justify-between text-[11px] text-slate-500 font-mono relative z-10">
        <span>buyQk Tech Private Limited &copy; 2026</span>
        <span>Hyperlocal Commerce Engine</span>
      </footer>

    </div>
  );
};
