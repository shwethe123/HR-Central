
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
import { useRouter } from 'next/navigation'; 

interface AuthContextType {
  user: User | null;
  loading: boolean;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false); // Set loading to false initially
  const router = useRouter();
  // const pathname = usePathname(); // Not needed if useEffect is commented out

  /*
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
      // if (!currentUser && pathname !== '/login') { //pathname is from usePathname()
      //   router.push('/login'); 
      // } else if (currentUser && pathname === '/login') {
      //   router.push('/dashboard');
      // }
    });
    return () => unsubscribe();
  // }, [router, pathname]); // zależności usunięte pathname
  }, [router]);
  */

  const loginWithGoogle = async () => {
    // setLoading(true); // No longer relying on onAuthStateChanged to set loading
    try {
      await signInWithPopup(auth, googleProvider);
      // onAuthStateChanged would normally handle setting user and loading
      // For now, this won't update UI state as listener is off
      console.log("Login attempted. Auth listener is off for UI updates.");
    } catch (error) {
      console.error("Error signing in with Google:", error);
      // setLoading(false); 
    }
  };

  const logout = async () => {
    // setLoading(true); // No longer relying on onAuthStateChanged
    try {
      await signOut(auth);
      // setUser(null); // This would be handled by onAuthStateChanged
      console.log("Logout attempted. Auth listener is off for UI updates.");
      router.push('/login'); // Still attempt redirect on explicit logout
    } catch (error) {
      console.error("Error signing out:", error);
    } finally {
      // setLoading(false);
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

