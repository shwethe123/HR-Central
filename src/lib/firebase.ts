
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
// import { getAnalytics } from "firebase/analytics"; // Uncomment if you add MEASUREMENT_ID and use Analytics

// Explicitly log environment variables as they are read
const currentApiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const currentAuthDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
const currentProjectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const currentStorageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
const currentMessagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
const currentAppId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
const currentMeasurementId = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID; // Can be undefined

// THIS IS THE TARGET PROJECT ID THE APP SHOULD BE USING.
const TARGET_PROJECT_ID = "form-e0205"; // Based on user's latest confirmation

if (typeof window !== 'undefined') {
  console.log(
    `%cFirebase Config Initialization in firebase.ts (EXPECTING project: ${TARGET_PROJECT_ID}):`,
    'color: orange; font-weight: bold;'
  );
  console.log(
    'API Key (from env):',
    currentApiKey ? currentApiKey.substring(0, 5) + '...' : 'MISSING_OR_NOT_LOADED_IN_ENV'
  );
  console.log('Auth Domain (from env):', currentAuthDomain || 'MISSING_OR_NOT_LOADED_IN_ENV');
  console.log('Project ID (from env):', currentProjectId || 'MISSING_OR_NOT_LOADED_IN_ENV');
  // ... other logs ...

  if (!currentApiKey || !currentProjectId || !currentAuthDomain) {
    console.error(
      '%cCRITICAL FIREBASE CONFIG ERROR: One or more core Firebase environment variables (NEXT_PUBLIC_FIREBASE_API_KEY, NEXT_PUBLIC_FIREBASE_PROJECT_ID, NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN) are MISSING. Please verify your .env.local file and ensure your Next.js server was RESTARTED after changes.',
      'color: red; font-weight: bold; background-color: #fff0f0; padding: 5px; border: 1px solid red;'
    );
  } else if (currentProjectId !== TARGET_PROJECT_ID) {
     console.error(
        `%cCRITICAL FIREBASE CONFIG MISMATCH: Your .env.local is configured for project ID '${currentProjectId}', BUT THE APPLICATION EXPECTS PROJECT ID '${TARGET_PROJECT_ID}'.
        ➡️➡️➡️ PLEASE ENSURE 'NEXT_PUBLIC_FIREBASE_PROJECT_ID=${TARGET_PROJECT_ID}' is in your .env.local file.
        This mismatch is very likely the cause of 'auth/unauthorized-domain' or 'PERMISSION_DENIED' errors, as authentication tokens and Firestore rules will not align.
        RESTART your Next.js server after correcting .env.local.`,
        'color: red; font-weight: bold; background-color: #fff0f0; padding: 5px; border: 1px solid red;'
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
let authInstance: Auth;
let dbInstance: Firestore;
let storageInstance: FirebaseStorage;

if (!getApps().length) {
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.authDomain) {
    console.error(
        "Firebase Initialization FAILED: Firebase configuration object is incomplete (likely due to missing env vars). Critical values (apiKey, projectId, authDomain) are missing. Firebase services will NOT be available."
    );
    // @ts-ignore
    app = undefined; 
  } else {
    try {
        app = initializeApp(firebaseConfig);
        if (typeof window !== 'undefined') {
            console.log('%cFirebase App Initialized Successfully. Using Project ID:', 'color: green; font-weight: bold;', app.options.projectId, '; Auth Domain:', app.options.authDomain);
        }
    } catch (e: any) {
        console.error("CRITICAL Firebase Initialization Error during initializeApp(firebaseConfig):", e.message || e);
        console.error("Firebase config object used for initialization attempt:", firebaseConfig);
        // @ts-ignore
        app = undefined;
    }
  }
} else {
  app = getApps()[0];
   if (typeof window !== 'undefined') {
        console.log('%cFirebase App Already Initialized (using existing instance). Using Project ID:', 'color: blue; font-weight: bold;', app.options.projectId, '; Auth Domain:', app.options.authDomain);
    }
}

// @ts-ignore
if (app && app.options && app.options.apiKey) {
  authInstance = getAuth(app);
  dbInstance = getFirestore(app);
  storageInstance = getStorage(app);
} else {
  if (typeof window !== 'undefined') { // Only log this in browser console
    console.error("Firebase app object is not properly initialized. Firebase services (Auth, Firestore, Storage) will NOT be available. Check previous errors related to .env.local or Firebase configuration.");
  }
  // @ts-ignore
  authInstance = undefined;
  // @ts-ignore
  dbInstance = undefined;
  // @ts-ignore
  storageInstance = undefined;
}

const googleProvider = new GoogleAuthProvider();

export { app, authInstance as auth, googleProvider, dbInstance as db, storageInstance as storage };
