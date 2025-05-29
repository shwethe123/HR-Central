
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
// import { getAnalytics } from "firebase/analytics"; // Uncomment if you add MEASUREMENT_ID and use Analytics

// Log environment variables during development to help debug loading issues.
// This logging helps verify if .env.local is being read correctly.

const currentApiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const currentAuthDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
const currentProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const currentStorageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
const currentMessagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
const currentAppId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
const currentMeasurementId = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID;

if (process.env.NODE_ENV === 'development') {
  console.log(`%cFirebase Config Initialization in firebase.ts (Attempting to use):`, 'color: orange; font-weight: bold;');
  console.log("API Key (raw):", currentApiKey ? currentApiKey.substring(0, 5) + "..." : "MISSING_OR_NOT_LOADED_IN_ENV");
  console.log("Auth Domain (raw):", currentAuthDomain || "MISSING_OR_NOT_LOADED_IN_ENV");
  console.log("Project ID (raw):", currentProjectId || "MISSING_OR_NOT_LOADED_IN_ENV");
  console.log("Storage Bucket (raw):", currentStorageBucket || "MISSING_OR_NOT_LOADED_IN_ENV");
  console.log("Messaging Sender ID (raw):", currentMessagingSenderId || "MISSING_OR_NOT_LOADED_IN_ENV");
  console.log("App ID (raw):", currentAppId || "MISSING_OR_NOT_LOADED_IN_ENV");
  console.log("Measurement ID (raw):", currentMeasurementId || "MISSING_OR_NOT_LOADED_IN_ENV (optional)");

  if (!currentApiKey || !currentProjectId || !currentAuthDomain) {
    console.error(
      "CRITICAL: One or more core Firebase configuration variables (API Key, Project ID, Auth Domain) are missing or not being loaded from your .env.local file. Please check and ensure they are correctly set for the target Firebase project and that you have restarted your Next.js server."
    );
  } else if (currentProjectId !== "form-e0205") { 
    console.warn(
      `WARNING: Your .env.local seems to be configured for project '${currentProjectId}', but you might be intending to target 'form-e0205'. Please verify your .env.local file if this is not intended.`
    );
  }
}

const firebaseConfig = {
  apiKey: currentApiKey,
  authDomain: currentAuthDomain,
  projectId: currentProjectId,
  storageBucket: currentStorageBucket,
  messagingSenderId: currentMessagingSenderId,
  appId: currentAppId,
  measurementId: currentMeasurementId,
};

let app: FirebaseApp;

if (!getApps().length) {
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.authDomain) {
    // This check might be redundant due to the earlier log, but kept for safety.
    console.error(
        "Firebase configuration is incomplete. Check your environment variables passed to firebaseConfig."
    );
  }
  try {
    app = initializeApp(firebaseConfig);
  } catch (e) {
    console.error("Error initializing Firebase app in firebase.ts:", e);
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
