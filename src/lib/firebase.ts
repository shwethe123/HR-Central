
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

if (typeof window !== 'undefined') {
  console.log(
    '%cFirebase Config Initialization in firebase.ts (Attempting to use for project ' + (currentProjectId || 'UNKNOWN (from .env.local)') + '):',
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
  } else if (currentProjectId !== 'form-e0205') { 
     console.warn(
        `%cFirebase Config Alert: Your .env.local is configured for project '${currentProjectId}', BUT the target project ID should be 'form-e0205'. Please ensure NEXT_PUBLIC_FIREBASE_PROJECT_ID in .env.local is 'form-e0205'.`, 'color: #FF8C00; font-weight: bold; background-color: #FFFBEA;' // DarkOrange, LightYellow BG
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
        "Firebase Initialization Error: Firebase configuration is incomplete. Critical values (apiKey, projectId, authDomain) are missing from environment variables when constructing firebaseConfig. Check .env.local and restart server."
    );
    // Consider throwing an error here to halt execution if config is critically missing and prevent misleading behavior.
    // For example: throw new Error("Firebase configuration is critically incomplete. App cannot initialize.");
  }
  try {
    app = initializeApp(firebaseConfig);
    if (typeof window !== 'undefined') {
        console.log('%cFirebase App Initialized Successfully. Using actual config: Project ID ->', 'color: green; font-weight: bold;', app.options.projectId, '; Auth Domain ->', app.options.authDomain);
    }
  } catch (e: any) { // Catch specific error type if possible
    console.error("CRITICAL Firebase Initialization Error in firebase.ts:", e.message || e);
    console.error("Firebase config object used for initialization attempt:", firebaseConfig); // Log the config that failed
    throw e; 
  }
} else {
  app = getApps()[0];
   if (typeof window !== 'undefined') {
        console.log('%cFirebase App Already Initialized (using existing instance). Actual config: Project ID ->', 'color: blue; font-weight: bold;', app.options.projectId, '; Auth Domain ->', app.options.authDomain);
    }
}

authInstance = getAuth(app);
const googleProvider = new GoogleAuthProvider();
dbInstance = getFirestore(app);
storageInstance = getStorage(app);

export { app, authInstance as auth, googleProvider, dbInstance as db, storageInstance as storage };
