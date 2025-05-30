
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
  updateProfile, // Import updateProfile
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
  signUpWithEmailPassword: (email: string, password: string, displayName: string) => Promise<AuthResult>; // Added displayName
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
      if (!currentUser && pathname !== '/login' && !pathname.startsWith('/_next/')) {
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
      // onAuthStateChanged will handle setting user and redirecting
      // setLoading(false) will be handled by onAuthStateChanged or error
      return { success: true };
    } catch (error) {
      console.error("Error signing in with Email/Password:", error);
      setLoading(false);
      return { success: false, error: error as AuthError };
    }
  };

  const signUpWithEmailPassword = async (email: string, password: string, displayName: string): Promise<AuthResult> => {
    setLoading(true);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      if (userCredential.user) {
        await updateProfile(userCredential.user, { displayName: displayName });
        // To ensure the user object in context gets the displayName immediately,
        // we can manually set it here or rely on onAuthStateChanged to pick it up.
        // For simplicity, onAuthStateChanged should eventually reflect this.
        // If immediate reflection is needed, consider re-fetching user or manually updating context user.
      }
      // onAuthStateChanged will handle setting user and redirecting
      // setLoading(false) will be handled by onAuthStateChanged or error
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
      // onAuthStateChanged will handle setting user and redirecting
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
      // setUser(null) is handled by onAuthStateChanged
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
       // setLoading(false) is handled by onAuthStateChanged after user becomes null
       // If user is not null due to some error, then ensure loading is false
      if (auth.currentUser) {
        setLoading(false);
      }
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
