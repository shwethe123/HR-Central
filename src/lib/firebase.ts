
import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
// import { getAnalytics } from "firebase/analytics"; // Analytics is not used in the current app features

// For debugging during setup - REMOVE or comment out in production
// console.log("Firebase Config Being Used in firebase.ts:");
// console.log("API Key:", process.env.NEXT_PUBLIC_FIREBASE_API_KEY ? "Loaded" : "MISSING_OR_NOT_LOADED");
// console.log("Auth Domain:", process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ? "Loaded" : "MISSING_OR_NOT_LOADED");
// console.log("Project ID:", process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ? "Loaded" : "MISSING_OR_NOT_LOADED");
// console.log("Storage Bucket:", process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ? "Loaded" : "MISSING_OR_NOT_LOADED");
// console.log("Messaging Sender ID:", process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ? "Loaded" : "MISSING_OR_NOT_LOADED");
// console.log("App ID:", process.env.NEXT_PUBLIC_FIREBASE_APP_ID ? "Loaded" : "MISSING_OR_NOT_LOADED");
// console.log("Measurement ID:", process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ? "Loaded" : "MISSING_OR_NOT_LOADED");


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
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    console.error("Firebase API Key or Project ID is missing. Check your .env.local file and ensure it's loaded correctly.");
    // Potentially throw an error or handle this case more gracefully
  }
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
// const analytics = getAnalytics(app); // Initialize analytics if needed

export { app, auth, googleProvider };
