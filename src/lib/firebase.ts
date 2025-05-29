
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
// import { getAnalytics } from "firebase/analytics"; // Uncomment if you add MEASUREMENT_ID and use Analytics

// Log environment variables during development to help debug loading issues.
// This logging helps verify if .env.local is being read correctly.
if (process.env.NODE_ENV === 'development') {
  const currentProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const currentAuthDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;

  console.log(`Firebase Config Initialization (targeting project: ${currentProjectId || 'NOT_FOUND_IN_ENV'}):`);
  console.log("API Key:", process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? "Loaded" : "MISSING_OR_NOT_LOADED");
  console.log(`Auth Domain (using): ${currentAuthDomain || 'MISSING_OR_NOT_LOADED'}`);
  console.log(`Project ID (using): ${currentProjectId || 'MISSING_OR_NOT_LOADED'}`);
  console.log("Storage Bucket:", process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ? "Loaded" : "MISSING_OR_NOT_LOADED");
  console.log("Messaging Sender ID:", process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ? "Loaded" : "MISSING_OR_NOT_LOADED");
  console.log("App ID:", process.env.NEXT_PUBLIC_FIREBASE_APP_ID ? "Loaded" : "MISSING_OR_NOT_LOADED");
  console.log("Measurement ID:", process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ? "Loaded (optional)" : "MISSING_OR_NOT_LOADED (optional)");

  if (!currentProjectId || !currentAuthDomain || !process.env.NEXT_PUBLIC_FIREBASE_API_KEY) {
    console.error(
      "CRITICAL: One or more core Firebase configuration variables (Project ID, Auth Domain, API Key) are missing from your .env.local file or not being loaded. Please check and ensure they are correctly set for the target Firebase project and that you have restarted your Next.js server."
    );
  } else if (currentProjectId !== "form-e0205") {
    console.warn(
      `WARNING: Your .env.local seems to be configured for project '${currentProjectId}', but you might be expecting to target 'form-e0205'. Please verify your .env.local file.`
    );
  }
}

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

let app: FirebaseApp;

if (!getApps().length) {
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.authDomain) {
    if (process.env.NODE_ENV !== 'development') { // Avoid redundant logging if dev logs already showed it
      console.error(
        "Firebase configuration is incomplete. Check your environment variables."
      );
    }
    // Potentially throw an error or handle gracefully, especially in production
  }
  try {
    app = initializeApp(firebaseConfig);
  } catch (e) {
    console.error("Error initializing Firebase app:", e);
    throw e; // Rethrow to make it clear initialization failed
  }
} else {
  app = getApps()[0];
}

const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
const db = getFirestore(app);
const storage = getStorage(app);
// const analytics = typeof window !== 'undefined' && firebaseConfig.measurementId ? getAnalytics(app) : undefined;

export { app, auth, googleProvider, db, storage };
