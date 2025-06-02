
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
import { doc, setDoc, serverTimestamp, type Timestamp, getDoc } from 'firebase/firestore'; // Import Firestore functions
import { useRouter, usePathname } from 'next/navigation';

interface AuthResult {
  success: boolean;
  error?: AuthError | null;
  user?: User | null;
}

interface AuthContextType {
  user: User | null;
  isAdmin: boolean | null; // null if loading, true if admin, false if not
  loading: boolean;
  loginWithEmailPassword: (email: string, password: string) => Promise<AuthResult>;
  signUpWithEmailPassword: (email: string, password: string, displayName: string) => Promise<AuthResult>;
  loginWithGoogle: () => Promise<AuthResult>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Helper function to create or update user profile in Firestore "users" collection
async function upsertUserProfile(authUser: User) {
  if (!authUser) return;
  const userDocRef = doc(db, 'users', authUser.uid);
  try {
    await setDoc(userDocRef, {
      uid: authUser.uid,
      displayName: authUser.displayName || authUser.email?.split('@')[0] || "Anonymous User", // Fallback for displayName
      email: authUser.email,
      photoURL: authUser.photoURL,
      lastSeen: serverTimestamp(), // Keep track of user's last activity
    }, { merge: true }); // Use merge: true to update existing doc or create if not exists
    console.log("User profile upserted in Firestore 'users' collection:", authUser.uid);
  } catch (error) {
    console.error("Error upserting user profile in Firestore 'users' collection:", error);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true); // Set loading to true at the start of auth state change processing
      if (currentUser) {
        setUser(currentUser);
        await upsertUserProfile(currentUser);

        // Fetch role from 'userRoles' collection
        const roleDocRef = doc(db, 'userRoles', currentUser.uid);
        try {
          const roleDocSnap = await getDoc(roleDocRef);
          if (roleDocSnap.exists() && roleDocSnap.data().role === 'admin') {
            setIsAdmin(true);
            console.log(`User ${currentUser.uid} is an admin.`);
          } else {
            setIsAdmin(false);
            console.log(`User ${currentUser.uid} is not an admin or role document not found.`);
          }
        } catch (roleError) {
          console.error("Error fetching user role for UID:", currentUser.uid, roleError);
          setIsAdmin(false); // Default to non-admin on error
        }

        if (pathname === '/login') {
          router.push('/dashboard');
        }
      } else {
        setUser(null);
        setIsAdmin(null); // Reset isAdmin for logged-out user
        // Only redirect to /login if the current path is not /login and is not a Next.js internal path
        if (pathname !== '/login' && !pathname.startsWith('/_next/')) {
          router.push('/login');
        }
      }
      setLoading(false); // Set loading to false after all async operations for the auth state are done
    });
    return () => unsubscribe();
  }, [router, pathname]); // isAdmin state is managed internally, no need to add to deps

  const loginWithEmailPassword = async (email: string, password: string): Promise<AuthResult> => {
    // setLoading(true) is handled by onAuthStateChanged listener
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      // User object and isAdmin status will be updated by onAuthStateChanged
      return { success: true, user: userCredential.user };
    } catch (error) {
      console.error("Error signing in with Email/Password:", error);
      // Ensure loading state is reset if onAuthStateChanged doesn't fire or an early error occurs
      if (!auth.currentUser) setLoading(false); 
      return { success: false, error: error as AuthError };
    }
  };

  const signUpWithEmailPassword = async (email: string, password: string, displayName: string): Promise<AuthResult> => {
    // setLoading(true) is handled by onAuthStateChanged listener
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      if (userCredential.user) {
        await updateProfile(userCredential.user, { displayName: displayName });
        // User object and isAdmin status will be updated by onAuthStateChanged after profile update and upsert
        // Trigger upsert immediately for the new user with displayName
        const updatedUser = { 
            ...userCredential.user, 
            displayName: displayName,
            email: userCredential.user.email, 
            photoURL: userCredential.user.photoURL 
        } as User;
        await upsertUserProfile(updatedUser); 
        // Note: onAuthStateChanged will still run and potentially re-fetch role.
      }
      return { success: true, user: userCredential.user };
    } catch (error) {
      console.error("Error signing up with Email/Password:", error);
      if (!auth.currentUser) setLoading(false);
      return { success: false, error: error as AuthError };
    }
  };

  const loginWithGoogle = async (): Promise<AuthResult> => {
    // setLoading(true) is handled by onAuthStateChanged listener
    const provider = new GoogleAuthProvider();
    try {
      const userCredential = await signInWithPopup(auth, provider);
      // User object and isAdmin status will be updated by onAuthStateChanged
      return { success: true, user: userCredential.user };
    } catch (error) {
      console.error("Error signing in with Google:", error);
      if (!auth.currentUser) setLoading(false);
      return { success: false, error: error as AuthError };
    }
  };

  const logout = async () => {
    // setLoading(true) is handled by onAuthStateChanged when user becomes null
    try {
      await signOut(auth);
      // setUser(null) and redirect will be handled by onAuthStateChanged
    } catch (error) {
      console.error("Error signing out:", error);
      // If sign out fails, reset loading state if user is still present (though unlikely)
      if (auth.currentUser) setLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAdmin, loading, loginWithEmailPassword, signUpWithEmailPassword, loginWithGoogle, logout }}>
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
