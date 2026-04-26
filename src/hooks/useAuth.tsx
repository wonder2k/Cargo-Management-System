import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  User, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword
} from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { UserProfile, Role, UserStatus } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  loginWithEmail: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchProfile = async (uid: string) => {
    const profileDoc = await getDoc(doc(db, 'users', uid));
    if (profileDoc.exists()) {
      let data = profileDoc.data() as UserProfile;
      const isInitialAdmin = data.email === 'wonder2k@gmail.com';
      
      // Healing: If profile exists but missing fields due to schema update
      if (!data.status || !data.role) {
        let updates: any = {};
        if (!data.status) {
          data.status = isInitialAdmin ? 'approved' : 'pending';
          updates.status = data.status;
        }
        if (!data.role) {
          data.role = isInitialAdmin ? 'admin' : 'operation';
          updates.role = data.role;
        }
        await updateDoc(doc(db, 'users', uid), updates);
      }
      setProfile(data);
    }
    return profileDoc.exists();
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        const exists = await fetchProfile(user.uid);
        if (!exists) {
          // This handles Google login for the first time if not created via register()
          const isInitialAdmin = user.email === 'wonder2k@gmail.com';
          const newProfile: UserProfile = {
            uid: user.uid,
            email: user.email!,
            displayName: user.displayName || 'User',
            role: isInitialAdmin ? 'admin' : 'operation',
            status: isInitialAdmin ? 'approved' : 'pending',
            createdAt: new Date().toISOString(),
            regions: isInitialAdmin ? ['AsiaPacific', 'MESA', 'North Americas', 'LATAM', 'Europe', 'Africa'] : []
          };
          await setDoc(doc(db, 'users', user.uid), newProfile);
          setProfile(newProfile);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const loginWithGoogle = async () => {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  };

  const loginWithEmail = async (email: string, pass: string) => {
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const register = async (email: string, pass: string, name: string) => {
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    const isInitialAdmin = email === 'wonder2k@gmail.com';
    const newProfile: UserProfile = {
      uid: cred.user.uid,
      email: email,
      displayName: name,
      role: isInitialAdmin ? 'admin' : 'operation',
      status: isInitialAdmin ? 'approved' : 'pending',
      createdAt: new Date().toISOString(),
    };
    await setDoc(doc(db, 'users', cred.user.uid), newProfile);
    setProfile(newProfile);
  };

  const logout = async () => {
    await signOut(auth);
  };

  const refreshProfile = async () => {
    if (user) await fetchProfile(user.uid);
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      profile, 
      loading, 
      loginWithGoogle, 
      loginWithEmail, 
      register, 
      logout,
      refreshProfile
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
