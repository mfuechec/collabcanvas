// Firebase Configuration and Initialization
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';

// Firebase configuration from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Only include measurementId if it's properly set (for Analytics)
const measurementId = import.meta.env.VITE_FIREBASE_MEASUREMENT_ID;
if (measurementId && measurementId.trim() !== '') {
  firebaseConfig.measurementId = measurementId;
}

// Validate Firebase configuration
const validateFirebaseConfig = () => {
  const requiredKeys = ['apiKey', 'authDomain', 'projectId', 'appId'];
  const missingKeys = requiredKeys.filter(key => !firebaseConfig[key]);
  
  if (missingKeys.length > 0) {
    console.error('Missing Firebase configuration keys:', missingKeys);
    throw new Error(`Firebase configuration incomplete. Missing: ${missingKeys.join(', ')}`);
  }
};

// Initialize Firebase with error handling
let app;
let auth;
let db;
let rtdb;

try {
  validateFirebaseConfig();
  
  // Initialize Firebase
  app = initializeApp(firebaseConfig);
  
  // Initialize Firebase services
  auth = getAuth(app);
  db = getFirestore(app); // Firestore for persistent canvas state
  rtdb = getDatabase(app); // Realtime Database for cursors/presence
  
  console.log('Firebase initialized successfully');
} catch (error) {
  console.error('Firebase initialization failed:', error);
  
  // In development, show more detailed error
  if (import.meta.env.DEV) {
    console.error('Firebase config:', firebaseConfig);
  }
  
  // Throw error to prevent app from continuing with invalid Firebase setup
  throw new Error('Failed to initialize Firebase. Please check your configuration.');
}

export { auth, db, rtdb };
