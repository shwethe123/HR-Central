
'use client';

import type { ReactNode } from 'react';
import { createContext, useContext, useEffect, useState } from 'react';
import { 
  onAuthStateChanged, 
  signInWithPopup, 
  signOut, 
  type User 
} from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { useRouter, usePathname } from 'next/navigation'; 

interface AuthContextType {
  user: User | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true); // Start with loading true
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      if (!currentUser && pathname !== '/login') {
        router.push('/login'); 
      } else if (currentUser && pathname === '/login') {
        router.push('/dashboard');
      }
    });
    return () => unsubscribe();
  }, [router, pathname]);

  const loginWithGoogle = async () => {
    setLoading(true); 
    try {
      await signInWithPopup(auth, googleProvider);
      // onAuthStateChanged will handle setting user and redirecting
    } catch (error) {
      console.error("Error signing in with Google:", error);
      setLoading(false); 
    }
  };

  const logout = async () => {
    setLoading(true); 
    try {
      await signOut(auth);
      // onAuthStateChanged will handle setting user to null and redirecting to /login
    } catch (error) {
      console.error("Error signing out:", error);
      setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, loginWithGoogle, logout }}>
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
