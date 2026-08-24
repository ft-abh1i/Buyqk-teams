import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/common/Navbar';
import { Sidebar } from './components/common/Sidebar';

import { LoginPage } from './pages/LoginPage';
import { CompleteProfilePage } from './pages/CompleteProfilePage';
import { DashboardPage } from './pages/DashboardPage';
import { ChatPage } from './pages/ChatPage';
import { EmployeeDirectoryPage } from './pages/EmployeeDirectoryPage';
import { ProfilePage } from './pages/ProfilePage';
import { GroupsPage } from './pages/GroupsPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { SettingsPage } from './pages/SettingsPage';

import { CallProvider } from './context/CallContext';
import { CallModal } from './components/common/CallModal';

const ProtectedLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, profile, loading, isAccessRestricted } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-10 w-10 border-2 border-yellow-500 border-t-transparent" />
          <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Loading BuyQK Teams...</span>
        </div>
      </div>
    );
  }

  // Not logged in or unauthorized email -> redirect to login
  if (!currentUser || isAccessRestricted) {
    return <Navigate to="/teams/login" replace />;
  }

  // First Login check: if employee profile does not exist in Firestore yet, force redirect to register
  const isRegisterPage = location.pathname === '/teams/register';
  if (!profile && !isRegisterPage) {
    return <Navigate to="/teams/register" replace />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans overflow-hidden select-none relative">
      <Navbar />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto flex flex-col bg-slate-950/40">
          {children}
        </main>
      </div>
      <CallModal />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <CallProvider>
        <BrowserRouter>
          <Routes>
          {/* Public Login Route */}
          <Route path="/teams/login" element={<LoginPage />} />

          {/* Protected Routes */}
          <Route
            path="/teams/register"
            element={
              <ProtectedLayout>
                <CompleteProfilePage />
              </ProtectedLayout>
            }
          />

          <Route
            path="/teams/dashboard"
            element={
              <ProtectedLayout>
                <DashboardPage />
              </ProtectedLayout>
            }
          />

          <Route
            path="/teams/chat"
            element={
              <ProtectedLayout>
                <ChatPage />
              </ProtectedLayout>
            }
          />

          <Route
            path="/teams/employees"
            element={
              <ProtectedLayout>
                <EmployeeDirectoryPage />
              </ProtectedLayout>
            }
          />

          <Route
            path="/teams/profile"
            element={
              <ProtectedLayout>
                <ProfilePage />
              </ProtectedLayout>
            }
          />

          <Route
            path="/teams/groups"
            element={
              <ProtectedLayout>
                <GroupsPage />
              </ProtectedLayout>
            }
          />

          <Route
            path="/teams/admin"
            element={
              <ProtectedLayout>
                <AdminDashboardPage />
              </ProtectedLayout>
            }
          />

          <Route
            path="/teams/settings"
            element={
              <ProtectedLayout>
                <SettingsPage />
              </ProtectedLayout>
            }
          />

          {/* Root & Catch-all Redirects */}
          <Route path="/teams" element={<Navigate to="/teams/dashboard" replace />} />
          <Route path="/" element={<Navigate to="/teams/dashboard" replace />} />
          <Route path="*" element={<Navigate to="/teams/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </CallProvider>
  </AuthProvider>
  );
}
