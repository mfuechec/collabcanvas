// Firebase Configuration and Initialization
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, enableIndexedDbPersistence, CACHE_SIZE_UNLIMITED } from 'firebase/firestore';
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
  
  // Enable offline persistence for faster reads and writes
  enableIndexedDbPersistence(db, {
    cacheSizeBytes: CACHE_SIZE_UNLIMITED
  }).catch((err) => {
    if (err.code === 'failed-precondition') {
      // Multiple tabs open, persistence can only be enabled in one tab at a time
      console.warn('Firestore persistence failed: Multiple tabs open');
    } else if (err.code === 'unimplemented') {
      // The current browser doesn't support persistence
      console.warn('Firestore persistence not supported in this browser');
    }
  });
  
  console.log('🔥 Firebase initialized successfully');
  console.log('📍 Project:', firebaseConfig.projectId);
  console.log('🔐 Auth domain:', firebaseConfig.authDomain);
  
  // Log auth state changes for debugging
  auth.onAuthStateChanged((user) => {
    if (user) {
      console.log('✅ User authenticated:', user.email || user.uid);
    } else {
      console.warn('⚠️ No authenticated user');
    }
  });
} catch (error) {
  console.error('❌ Firebase initialization failed:', error);
  
  // In development, show more detailed error
  if (import.meta.env.DEV) {
    console.error('Firebase config:', firebaseConfig);
  } else {
    // In production, show config without sensitive data
    console.error('Project ID:', firebaseConfig.projectId);
    console.error('Auth Domain:', firebaseConfig.authDomain);
  }
  
  // Throw error to prevent app from continuing with invalid Firebase setup
  throw new Error('Failed to initialize Firebase. Please check your configuration.');
}

export { auth, db, rtdb };
