
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
    `%cFirebase Config Initialization in firebase.ts (Attempting to use for project ${TARGET_PROJECT_ID}):`,
    'color: orange; font-weight: bold;'
  );
  console.log(
    'API Key (raw from .env.local):',
    currentApiKey ? currentApiKey.substring(0, 5) + '...' : 'MISSING_OR_NOT_LOADED_IN_ENV'
  );
  console.log('Auth Domain (raw from .env.local):', currentAuthDomain || 'MISSING_OR_NOT_LOADED_IN_ENV');
  console.log('Project ID (raw from .env.local):', currentProjectId || 'MISSING_OR_NOT_LOADED_IN_ENV');
  console.log('Storage Bucket (raw from .env.local):', currentStorageBucket || 'MISSING_OR_NOT_LOADED_IN_ENV');
  console.log('Messaging Sender ID (raw from .env.local):', currentMessagingSenderId || 'MISSING_OR_NOT_LOADED_IN_ENV');
  console.log('App ID (raw from .env.local):', currentAppId || 'MISSING_OR_NOT_LOADED_IN_ENV');
  console.log('Measurement ID (raw from .env.local):', currentMeasurementId || 'MISSING_OR_NOT_LOADED_IN_ENV (optional)');

  if (!currentApiKey || !currentProjectId || !currentAuthDomain) {
    console.error(
      '%cCRITICAL Firebase Config Error: One or more core Firebase configuration variables (API Key, Project ID, Auth Domain) are MISSING or NOT LOADED from your .env.local file. Please verify your .env.local file and ensure your Next.js server was restarted after changes.',
      'color: red; font-weight: bold;'
    );
  } else if (currentProjectId !== TARGET_PROJECT_ID) {
     console.warn(
        `%cFirebase Config Alert: Your .env.local is configured for project '${currentProjectId}', BUT the target project ID should be '${TARGET_PROJECT_ID}'. Please ensure NEXT_PUBLIC_FIREBASE_PROJECT_ID in .env.local is '${TARGET_PROJECT_ID}'. This mismatch is likely the cause of 'auth/unauthorized-domain' or other auth errors if domains/OAuth are authorized for '${TARGET_PROJECT_ID}'.`, 'color: #FF8C00; font-weight: bold; background-color: #FFFBEA;'
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
  measurementId: currentMeasurementId, // Can be undefined, SDK handles it
};

let app: FirebaseApp;
let authInstance: Auth;
let dbInstance: Firestore;
let storageInstance: FirebaseStorage;

if (!getApps().length) {
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.authDomain) {
    console.error(
        "Firebase Initialization Error: Firebase configuration is incomplete in firebaseConfig object (likely due to missing env vars). Critical values (apiKey, projectId, authDomain) are missing. Check .env.local and restart server."
    );
  }
  try {
    app = initializeApp(firebaseConfig);
    if (typeof window !== 'undefined') {
        console.log('%cFirebase App Initialized Successfully. Using actual config: Project ID ->', 'color: green; font-weight: bold;', app.options.projectId, '; Auth Domain ->', app.options.authDomain);
    }
  } catch (e: any) {
    console.error("CRITICAL Firebase Initialization Error in firebase.ts during initializeApp(firebaseConfig):", e.message || e);
    console.error("Firebase config object used for initialization attempt:", firebaseConfig);
  }
} else {
  app = getApps()[0];
   if (typeof window !== 'undefined') {
        console.log('%cFirebase App Already Initialized (using existing instance). Actual config: Project ID ->', 'color: blue; font-weight: bold;', app.options.projectId, '; Auth Domain ->', app.options.authDomain);
    }
}

// Ensure app is initialized before getting other services
// @ts-ignore
if (app) {
  authInstance = getAuth(app);
  dbInstance = getFirestore(app);
  storageInstance = getStorage(app);
} else {
  console.error("Firebase app object is not initialized. Firebase services (Auth, Firestore, Storage) cannot be loaded.");
  // @ts-ignore
  authInstance = undefined; 
  // @ts-ignore
  dbInstance = undefined;
  // @ts-ignore
  storageInstance = undefined;
}

const googleProvider = new GoogleAuthProvider();

export { app, authInstance as auth, googleProvider, dbInstance as db, storageInstance as storage };
