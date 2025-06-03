
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
  setUser: (user: User | null) => void; // Expose setUser for profile updates
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
  const [user, setUserState] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true); // Initialize loading to true
  const router = useRouter();
  const pathname = usePathname();

  // Custom setUser function to also update AuthProvider's internal state if needed
  const setUser = (newUser: User | null) => {
    setUserState(newUser);
    // Potentially re-fetch admin status if user object changes significantly
    // For now, direct update from Firebase Auth listener is the primary source.
  };


  useEffect(() => {
    // This effect is ONLY for Firebase auth state changes and initial load.
    // It should run once on mount and then only when Firebase signals an auth change.
    console.log("Auth Provider: Main auth listener effect setup.");
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      console.log("Auth Provider: onAuthStateChanged triggered. CurrentUser:", currentUser?.uid || null);
      if (currentUser) {
        // Check if the user state actually needs updating to prevent redundant updates
        if (user?.uid !== currentUser.uid || user?.photoURL !== currentUser.photoURL || user?.displayName !== currentUser.displayName) {
          setUserState(currentUser); // Update with the potentially new user object from Firebase
        }
        await upsertUserProfile(currentUser);

        const roleDocRef = doc(db, 'userRoles', currentUser.uid);
        try {
          const roleDocSnap = await getDoc(roleDocRef);
          if (roleDocSnap.exists() && roleDocSnap.data().role === 'admin') {
            setIsAdmin(true);
          } else {
            setIsAdmin(false);
          }
        } catch (roleError) {
          console.error("Error fetching user role for UID:", currentUser.uid, roleError);
          setIsAdmin(false);
        }
      } else {
        setUserState(null);
        setIsAdmin(null);
      }
      setLoading(false); // Set loading to false after the first auth state determination or change
    });
    return () => {
      console.log("Auth Provider: Main auth listener cleanup.");
      unsubscribe();
    }
  }, []); // Empty dependency array: runs once on mount and cleans up on unmount.

  useEffect(() => {
    // This effect handles redirection logic.
    // It runs when user, loading, pathname, or router changes.
    // console.log(`Auth Provider: Redirection check. Loading: ${loading}, User: ${user?.uid || null}, Pathname: ${pathname}`);
    if (loading) return; // Don't redirect if initial auth check is still in progress

    if (user) {
      if (pathname === '/login') {
        console.log("Auth Provider: User logged in, on /login page. Redirecting to /dashboard.");
        router.push('/dashboard');
      }
    } else {
      if (pathname !== '/login' && !pathname.startsWith('/_next/')) {
        console.log(`Auth Provider: User not logged in, not on /login page (current: ${pathname}). Redirecting to /login.`);
        router.push('/login');
      }
    }
  }, [user, loading, pathname, router]);


  const loginWithEmailPassword = async (email: string, password: string): Promise<AuthResult> => {
    setLoading(true); // Set loading true for the duration of the login attempt
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      // onAuthStateChanged will handle setting user, isAdmin, and setLoading(false)
      return { success: true, user: userCredential.user };
    } catch (error) {
      console.error("Error signing in with Email/Password:", error);
      setLoading(false); // Ensure loading is false if login fails
      return { success: false, error: error as AuthError };
    }
  };

  const signUpWithEmailPassword = async (email: string, password: string, displayName: string): Promise<AuthResult> => {
    setLoading(true); // Set loading true for the duration of the sign-up attempt
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      if (userCredential.user) {
        await updateProfile(userCredential.user, { displayName: displayName });
        // Upsert immediately with the new display name
        const updatedUserForFirestore = { 
            ...userCredential.user, 
            displayName: displayName 
        } as User; // Cast because TS might not know displayName is updated yet
        await upsertUserProfile(updatedUserForFirestore);
        // onAuthStateChanged will handle setting user, isAdmin, and setLoading(false)
      }
      return { success: true, user: userCredential.user };
    } catch (error) {
      console.error("Error signing up with Email/Password:", error);
      setLoading(false); // Ensure loading is false if sign-up fails
      return { success: false, error: error as AuthError };
    }
  };

  const loginWithGoogle = async (): Promise<AuthResult> => {
    setLoading(true); // Set loading true for the duration of the Google sign-in attempt
    const provider = new GoogleAuthProvider();
    try {
      const userCredential = await signInWithPopup(auth, provider);
      // onAuthStateChanged will handle setting user, isAdmin, and setLoading(false)
      return { success: true, user: userCredential.user };
    } catch (error) {
      console.error("Error signing in with Google:", error);
      setLoading(false); // Ensure loading is false if Google sign-in fails
      return { success: false, error: error as AuthError };
    }
  };

  const logout = async () => {
    setLoading(true); // Optionally set loading true during logout process
    try {
      await signOut(auth);
      // onAuthStateChanged will handle setting user to null, isAdmin to null, and setLoading(false)
    } catch (error) {
      console.error("Error signing out:", error);
      setLoading(false); // Ensure loading is false if logout fails unexpectedly
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAdmin, loading, loginWithEmailPassword, signUpWithEmailPassword, loginWithGoogle, logout, setUser }}>
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
