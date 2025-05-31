
// Import the functions you need from the SDKs you need
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';
import { getAnalytics, type Analytics } from "firebase/analytics";

// THIS IS THE TARGET PROJECT ID THE APP SHOULD BE USING.
const TARGET_PROJECT_ID = "mobile-app-337f0"; // Updated to new project ID

// Your web app's Firebase configuration (Hardcoded as per user request)
const firebaseConfig = {
  apiKey: "AIzaSyAYYglO8-a6MOonwRBjVaXtOcT2HV82r3s",
  authDomain: "mobile-app-337f0.firebaseapp.com",
  databaseURL: "https://mobile-app-337f0-default-rtdb.firebaseio.com",
  projectId: "mobile-app-337f0",
  storageBucket: "mobile-app-337f0.appspot.com", // Corrected common typo: .appspot.com usually
  messagingSenderId: "566171676162",
  appId: "1:566171676162:web:8f1091a75f5c73b3d5811b",
  measurementId: "G-8MWB28ZYG0"
};

if (typeof window !== 'undefined') {
  console.log(
    `%cFirebase Config Initialization in firebase.ts (TARGET project: ${TARGET_PROJECT_ID}):`,
    'color: orange; font-weight: bold;'
  );
  console.log(
    'Using Hardcoded API Key:',
    firebaseConfig.apiKey ? firebaseConfig.apiKey.substring(0, 5) + '...' : 'MISSING_IN_CONFIG'
  );
  console.log('Using Hardcoded Auth Domain:', firebaseConfig.authDomain || 'MISSING_IN_CONFIG');
  console.log('Using Hardcoded Project ID:', firebaseConfig.projectId || 'MISSING_IN_CONFIG');
  
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.authDomain) {
    console.error(
      '%cCRITICAL FIREBASE CONFIG ERROR: One or more core Firebase configuration values (apiKey, projectId, authDomain) are MISSING in the hardcoded config. Firebase will not work.',
      'color: red; font-weight: bold; background-color: #fff0f0; padding: 5px; border: 1px solid red;'
    );
  } else if (firebaseConfig.projectId !== TARGET_PROJECT_ID) {
     console.error(
        `%cCRITICAL FIREBASE CONFIG MISMATCH: The hardcoded config is for project ID '${firebaseConfig.projectId}', BUT THE APPLICATION EXPECTS TARGET PROJECT ID '${TARGET_PROJECT_ID}'.
        This mismatch is very likely the cause of 'auth/unauthorized-domain' or 'PERMISSION_DENIED' errors.
        Please verify the hardcoded firebaseConfig object in src/lib/firebase.ts.`,
        'color: red; font-weight: bold; background-color: #fff0f0; padding: 5px; border: 1px solid red;'
      );
  }
}

let app: FirebaseApp;
let authInstance: Auth;
let dbInstance: Firestore;
let storageInstance: FirebaseStorage;
let analyticsInstance: Analytics;

if (!getApps().length) {
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId || !firebaseConfig.authDomain) {
    console.error(
        "Firebase Initialization FAILED: Hardcoded Firebase configuration object is incomplete. Critical values (apiKey, projectId, authDomain) are missing. Firebase services will NOT be available."
    );
    // @ts-ignore
    app = undefined; 
  } else {
    try {
        app = initializeApp(firebaseConfig);
        if (typeof window !== 'undefined') {
            console.log('%cFirebase App Initialized Successfully with hardcoded config. Using Project ID:', 'color: green; font-weight: bold;', app.options.projectId, '; Auth Domain:', app.options.authDomain);
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
  // Initialize Analytics only on the client side
  if (typeof window !== 'undefined') {
    analyticsInstance = getAnalytics(app);
  }
} else {
  if (typeof window !== 'undefined') { 
    console.error("Firebase app object is not properly initialized. Firebase services (Auth, Firestore, Storage, Analytics) will NOT be available. Check previous errors related to Firebase configuration.");
  }
  // @ts-ignore
  authInstance = undefined;
  // @ts-ignore
  dbInstance = undefined;
  // @ts-ignore
  storageInstance = undefined;
  // @ts-ignore
  analyticsInstance = undefined;
}

const googleProvider = new GoogleAuthProvider();

export { app, authInstance as auth, googleProvider, dbInstance as db, storageInstance as storage, analyticsInstance as analytics };
