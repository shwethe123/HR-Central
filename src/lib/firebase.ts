
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
// import { getAnalytics } from "firebase/analytics"; // Uncomment if you add MEASUREMENT_ID and use Analytics

const currentApiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const currentAuthDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
const currentProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const currentStorageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
const currentMessagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
const currentAppId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
const currentMeasurementId = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID; // Can be undefined

// Enhanced logging for debugging .env.local loading issues
if (typeof window !== 'undefined') { // Log only on the client-side for easier debugging
  console.log(`%cFirebase Config Initialization in firebase.ts (Attempting to use for project form-e0205):`, 'color: orange; font-weight: bold;');
  console.log("API Key (raw):", currentApiKey ? currentApiKey.substring(0, 5) + "..." : "MISSING_OR_NOT_LOADED_IN_ENV");
  console.log("Auth Domain (raw):", currentAuthDomain || "MISSING_OR_NOT_LOADED_IN_ENV");
  console.log("Project ID (raw):", currentProjectId || "MISSING_OR_NOT_LOADED_IN_ENV");
  console.log("Storage Bucket (raw):", currentStorageBucket || "MISSING_OR_NOT_LOADED_IN_ENV");
  console.log("Messaging Sender ID (raw):", currentMessagingSenderId || "MISSING_OR_NOT_LOADED_IN_ENV");
  console.log("App ID (raw):", currentAppId || "MISSING_OR_NOT_LOADED_IN_ENV");
  console.log("Measurement ID (raw):", currentMeasurementId || "MISSING_OR_NOT_LOADED_IN_ENV (optional)");

  if (!currentApiKey || !currentProjectId || !currentAuthDomain) {
    console.error(
        "%cCRITICAL Firebase Config Error: One or more core Firebase configuration variables (API Key, Project ID, Auth Domain) are MISSING or NOT LOADED from your .env.local file. Please verify your .env.local file and ensure your Next.js server was restarted after changes.", 'color: red; font-weight: bold;'
    );
  } else if (currentProjectId !== "form-e0205") {
      console.warn(
        `%cFirebase Config Warning: Your .env.local seems to be configured for project '${currentProjectId}', but you might be intending to target 'form-e0205'. Please verify your .env.local file if this is not intended.`, 'color: yellow; font-weight: bold;'
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
    console.error(
        "Firebase Initialization Error: Firebase configuration is incomplete. Check environment variables being passed to firebaseConfig in firebase.ts."
    );
    // This is a critical error, app might not function
  }
  try {
    app = initializeApp(firebaseConfig);
    if (typeof window !== 'undefined') {
        console.log('%cFirebase App Initialized Successfully. Project ID (using):', 'color: green;', firebaseConfig.projectId, 'Auth Domain (using):', firebaseConfig.authDomain);
    }
  } catch (e) {
    console.error("CRITICAL Firebase Initialization Error in firebase.ts:", e);
    // It's important to re-throw or handle this, as the app likely can't function without Firebase.
    throw e; 
  }
} else {
  app = getApps()[0];
   if (typeof window !== 'undefined') {
        console.log('%cFirebase App Already Initialized (using existing instance). Project ID (using):', 'color: blue;', app.options.projectId, 'Auth Domain (using):', app.options.authDomain);
    }
}

const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
const db = getFirestore(app);
const storage = getStorage(app);
// const analytics = typeof window !== 'undefined' && firebaseConfig.measurementId ? getAnalytics(app) : undefined;

export { app, auth, googleProvider, db, storage };
