
'use client';

import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signOut,
  type User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  type AuthError,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useRouter, usePathname } from 'next/navigation';

interface AuthResult {
  success: boolean;
  error?: AuthError | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  loginWithEmailPassword: (email: string, password: string) => Promise<AuthResult>;
  signUpWithEmailPassword: (email: string, password: string) => Promise<AuthResult>;
  loginWithGoogle: () => Promise<AuthResult>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      if (!currentUser && pathname !== '/login' && !pathname.startsWith('/_next/')) { // Added /_next/ check for HMR
        router.push('/login');
      } else if (currentUser && pathname === '/login') {
        router.push('/dashboard');
      }
    });
    return () => unsubscribe();
  }, [router, pathname]);

  const loginWithEmailPassword = async (email: string, password: string): Promise<AuthResult> => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      setLoading(false);
      return { success: true };
    } catch (error) {
      console.error("Error signing in with Email/Password:", error);
      setLoading(false);
      return { success: false, error: error as AuthError };
    }
  };

  const signUpWithEmailPassword = async (email: string, password: string): Promise<AuthResult> => {
    setLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      setLoading(false);
      return { success: true };
    } catch (error) {
      console.error("Error signing up with Email/Password:", error);
      setLoading(false);
      return { success: false, error: error as AuthError };
    }
  };

  const loginWithGoogle = async (): Promise<AuthResult> => {
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      setLoading(false);
      return { success: true };
    } catch (error) {
      console.error("Error signing in with Google:", error);
      setLoading(false);
      return { success: false, error: error as AuthError };
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      // onAuthStateChanged will handle redirect to /login
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      setLoading(false); // Ensure loading is set to false even if signOut fails to prevent UI lock
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginWithEmailPassword, signUpWithEmailPassword, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
