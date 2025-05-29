
'use client';

import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import {
  onAuthStateChanged,
  signOut,
  type User,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  type AuthError,
} from 'firebase/auth';
import { auth } from '@/lib/firebase'; // googleProvider no longer needed here
import { useRouter, usePathname } from 'next/navigation';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  // loginWithGoogle: () => Promise<void>; // Removed Google login
  loginWithEmailPassword: (email: string, password: string) => Promise<{ success: boolean; error?: AuthError | null }>;
  signUpWithEmailPassword: (email: string, password: string) => Promise<{ success: boolean; error?: AuthError | null }>;
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
      if (!currentUser && pathname !== '/login' && pathname !== '/signup') { // Allow /signup route
        router.push('/login');
      } else if (currentUser && (pathname === '/login' || pathname === '/signup')) {
        router.push('/dashboard');
      }
    });
    return () => unsubscribe();
  }, [router, pathname]);

  const loginWithEmailPassword = async (email: string, password: string): Promise<{ success: boolean; error?: AuthError | null }> => {
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will handle setting user and redirecting
      setLoading(false);
      return { success: true };
    } catch (error) {
      console.error("Error signing in with Email/Password:", error);
      setLoading(false);
      return { success: false, error: error as AuthError };
    }
  };

  const signUpWithEmailPassword = async (email: string, password: string): Promise<{ success: boolean; error?: AuthError | null }> => {
    setLoading(true);
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will handle setting user and redirecting
      setLoading(false);
      return { success: true };
    } catch (error) {
      console.error("Error signing up with Email/Password:", error);
      setLoading(false);
      return { success: false, error: error as AuthError };
    }
  };

  const logout = async () => {
    setLoading(true);
    try {
      await signOut(auth);
      // onAuthStateChanged will handle setting user to null and redirecting to /login
      router.push('/login'); // Ensure redirect after logout
    } catch (error) {
      console.error("Error signing out:", error);
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginWithEmailPassword, signUpWithEmailPassword, logout }}>
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
