import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  firebaseAuth, db, rtdb 
} from '@buyqk/firebase';
import { 
  GoogleAuthProvider, signInWithPopup, signOut as firebaseSignOut, User 
} from 'firebase/auth';
import { 
  doc, getDoc, setDoc, onSnapshot 
} from 'firebase/firestore';
import { 
  ref, set, onDisconnect, serverTimestamp 
} from 'firebase/database';
import { EmployeeProfile } from '../types';

export const SUPER_ADMIN_EMAIL = 'akshat.srivastava098@gmail.com';

export const isAllowedEmail = (email: string | null | undefined): boolean => {
  if (!email) return false;
  const cleanEmail = email.toLowerCase().trim();
  if (cleanEmail === SUPER_ADMIN_EMAIL.toLowerCase()) return true;
  if (cleanEmail === 'buyq.maxalwani@gmail.com') return true;
  return /^buyq(k)?.*@gmail\.com$/.test(cleanEmail);
};

interface AuthContextType {
  currentUser: User | null;
  profile: EmployeeProfile | null;
  loading: boolean;
  isAccessRestricted: boolean;
  unauthorizedEmail: string;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<EmployeeProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [isAccessRestricted, setIsAccessRestricted] = useState<boolean>(false);
  const [unauthorizedEmail, setUnauthorizedEmail] = useState<string>('');

  const isSuperAdmin = currentUser?.email?.toLowerCase() === SUPER_ADMIN_EMAIL.toLowerCase() || profile?.isSuperAdmin === true;
  const isAdmin = isSuperAdmin || profile?.isAdmin === true;

  // Realtime Presence Setup
  const setupPresence = (uid: string) => {
    try {
      const userPresenceRef = ref(rtdb, `presence/${uid}`);
      set(userPresenceRef, {
        online: true,
        lastSeen: Date.now()
      });
      onDisconnect(userPresenceRef).set({
        online: false,
        lastSeen: serverTimestamp()
      });
    } catch (err) {
      console.warn("Presence setup warning:", err);
    }
  };

  useEffect(() => {
    const unsubscribe = firebaseAuth.onAuthStateChanged(async (user) => {
      if (user) {
        const userEmail = user.email || '';
        if (!isAllowedEmail(userEmail)) {
          setUnauthorizedEmail(userEmail);
          setIsAccessRestricted(true);
          setCurrentUser(user);
          setProfile(null);
          setLoading(false);
          return;
        }

        setIsAccessRestricted(false);
        setUnauthorizedEmail('');
        setCurrentUser(user);
        setupPresence(user.uid);

        // Fetch or subscribe to user profile in Firestore
        const userDocRef = doc(db, 'users', user.uid);
        const unsubscribeProfile = onSnapshot(userDocRef, (snap) => {
          if (snap.exists()) {
            setProfile(snap.data() as EmployeeProfile);
          } else {
            setProfile(null);
          }
          setLoading(false);
        }, (err) => {
          console.error("Profile snapshot error:", err);
          setLoading(false);
        });

        return () => unsubscribeProfile();
      } else {
        setCurrentUser(null);
        setProfile(null);
        setIsAccessRestricted(false);
        setUnauthorizedEmail('');
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const loginWithGoogle = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(firebaseAuth, provider);
      const user = result.user;
      
      if (!isAllowedEmail(user.email)) {
        setUnauthorizedEmail(user.email || '');
        setIsAccessRestricted(true);
      }
    } catch (err: any) {
      console.error("Google sign in error:", err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    if (currentUser?.uid) {
      try {
        const userPresenceRef = ref(rtdb, `presence/${currentUser.uid}`);
        await set(userPresenceRef, { online: false, lastSeen: Date.now() });
      } catch (_) {}
    }
    await firebaseSignOut(firebaseAuth);
    setCurrentUser(null);
    setProfile(null);
    setIsAccessRestricted(false);
    setUnauthorizedEmail('');
  };

  const refreshProfile = async () => {
    if (!currentUser) return;
    try {
      const userDocRef = doc(db, 'users', currentUser.uid);
      const snap = await getDoc(userDocRef);
      if (snap.exists()) {
        setProfile(snap.data() as EmployeeProfile);
      }
    } catch (e) {
      console.error("Refresh profile error:", e);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        profile,
        loading,
        isAccessRestricted,
        unauthorizedEmail,
        isSuperAdmin,
        isAdmin,
        loginWithGoogle,
        logout,
        refreshProfile
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
