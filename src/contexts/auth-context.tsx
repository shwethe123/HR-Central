
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
  updateProfile,
  type AuthError,
} from 'firebase/auth';
import { auth, db } from '@/lib/firebase'; // Import db
import { doc, setDoc, serverTimestamp, type Timestamp } from 'firebase/firestore'; // Import Firestore functions
import { useRouter, usePathname } from 'next/navigation';

interface AuthResult {
  success: boolean;
  error?: AuthError | null;
  user?: User | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  loginWithEmailPassword: (email: string, password: string) => Promise<AuthResult>;
  signUpWithEmailPassword: (email: string, password: string, displayName: string) => Promise<AuthResult>;
  loginWithGoogle: () => Promise<AuthResult>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper function to create or update user profile in Firestore
async function upsertUserProfile(authUser: User) {
  if (!authUser) return;
  const userDocRef = doc(db, 'users', authUser.uid);
  try {
    await setDoc(userDocRef, {
      uid: authUser.uid,
      displayName: authUser.displayName || authUser.email?.split('@')[0] || "Anonymous User", // Fallback for displayName
      email: authUser.email,
      photoURL: authUser.photoURL,
      lastSeen: serverTimestamp(),
    }, { merge: true });
    console.log("User profile upserted in Firestore:", authUser.uid);
  } catch (error) {
    console.error("Error upserting user profile in Firestore:", error);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        await upsertUserProfile(currentUser); // Upsert profile on auth state change
        if (pathname === '/login') {
          router.push('/dashboard');
        }
      } else {
        if (pathname !== '/login' && !pathname.startsWith('/_next/')) {
          router.push('/login');
        }
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [router, pathname]);

  const loginWithEmailPassword = async (email: string, password: string): Promise<AuthResult> => {
    setLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      if (userCredential.user) {
        await upsertUserProfile(userCredential.user);
      }
      return { success: true, user: userCredential.user };
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
        // Create a new user object with the updated display name for immediate upsert
        const updatedUser = {
            ...userCredential.user,
            displayName: displayName 
        } as User; // Cast because displayName might not be immediately reflected
        await upsertUserProfile(updatedUser); 
      }
      return { success: true, user: userCredential.user };
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
      const userCredential = await signInWithPopup(auth, provider);
      if (userCredential.user) {
        await upsertUserProfile(userCredential.user);
      }
      return { success: true, user: userCredential.user };
    } catch (error) {
      console.error("Error signing in with Google:", error);
      setLoading(false);
      return { success: false, error: error as AuthError };
    }
  };

  const logout = async () => {
    setLoading(true); // Technically, loading is true until user becomes null via onAuthStateChanged
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Error signing out:", error);
       // If sign out fails, reset loading state if user is still present
      if (auth.currentUser) {
        setLoading(false);
      }
    }
    // onAuthStateChanged will handle setting user to null and further loading state.
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
