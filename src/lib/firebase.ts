
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
// import { getAnalytics } from "firebase/analytics"; // Uncomment if you add MEASUREMENT_ID and use Analytics

// Log environment variables during development to help debug loading issues.
// This logging helps verify if .env.local is being read correctly.
if (process.env.NODE_ENV === 'development') {
  const currentApiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const currentAuthDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  const currentProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const currentStorageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  const currentMessagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
  const currentAppId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
  const currentMeasurementId = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID;

  console.log(`Firebase Config Initialization in firebase.ts (targeting project ID: ${currentProjectId || 'NOT_FOUND_IN_ENV'}):`);
  console.log("API Key (using):", currentApiKey ? currentApiKey.substring(0, 5) + "..." : "MISSING_OR_NOT_LOADED"); // Show only part of API Key for safety
  console.log("Auth Domain (using):", currentAuthDomain || "MISSING_OR_NOT_LOADED");
  console.log("Project ID (using):", currentProjectId || "MISSING_OR_NOT_LOADED");
  console.log("Storage Bucket (using):", currentStorageBucket || "MISSING_OR_NOT_LOADED");
  console.log("Messaging Sender ID (using):", currentMessagingSenderId || "MISSING_OR_NOT_LOADED");
  console.log("App ID (using):", currentAppId || "MISSING_OR_NOT_LOADED");
  console.log("Measurement ID (using):", currentMeasurementId || "MISSING_OR_NOT_LOADED (optional)");

  if (!currentApiKey || !currentProjectId || !currentAuthDomain) {
    console.error(
      "CRITICAL: One or more core Firebase configuration variables (API Key, Project ID, Auth Domain) are missing or not being loaded from your .env.local file. Please check and ensure they are correctly set for the target Firebase project and that you have restarted your Next.js server."
    );
  } else if (currentProjectId !== "form-e0205") { // Update this if your target project ID changes
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
    // For now, we proceed and let Firebase SDK throw more specific errors if config is truly unusable.
  }
  try {
    app = initializeApp(firebaseConfig);
  } catch (e) {
    console.error("Error initializing Firebase app in firebase.ts:", e);
    // It's crucial to not silently fail here.
    // If initialization fails, subsequent Firebase calls will also fail.
    // Depending on app structure, might rethrow or set a global error state.
    throw e; 
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
