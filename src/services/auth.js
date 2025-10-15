// Authentication Service - Firebase Auth Operations
import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut,
  updateProfile
} from 'firebase/auth';
import { auth } from './firebase';

// Create Google Auth Provider
const googleProvider = new GoogleAuthProvider();

// Helper function to extract display name from email
const getDisplayNameFromEmail = (email) => {
  if (!email) return '';
  const username = email.split('@')[0];
  // Capitalize first letter and truncate to 20 chars
  return username.charAt(0).toUpperCase() + username.slice(1).toLowerCase().substring(0, 19);
};

// Truncate display name to 20 characters if too long
const truncateDisplayName = (name) => {
  return name && name.length > 20 ? name.substring(0, 20) : name;
};

// Convert Firebase error codes to user-friendly messages
const getAuthErrorMessage = (error) => {
  if (!error?.code) return error?.message || 'An unexpected error occurred.';
  
  switch (error.code) {
    case 'auth/email-already-in-use':
      return 'An account with this email already exists.';
    case 'auth/weak-password':
      return 'Password should be at least 6 characters.';
    case 'auth/invalid-email':
      return 'Please enter a valid email address.';
    case 'auth/user-disabled':
      return 'This account has been disabled.';
    case 'auth/user-not-found':
      return 'No account found with this email address.';
    case 'auth/wrong-password':
      return 'Incorrect password.';
    case 'auth/too-many-requests':
      return 'Too many failed attempts. Please try again later.';
    case 'auth/popup-closed-by-user':
      return 'Sign-in cancelled.';
    case 'auth/popup-blocked':
      return 'Sign-in popup was blocked. Please allow popups and try again.';
    case 'auth/cancelled-popup-request':
      return 'Sign-in cancelled.';
    case 'auth/network-request-failed':
      return 'Network error. Please check your connection and try again.';
    default:
      return error.message || 'An error occurred during authentication.';
  }
};

// Enhanced error handling wrapper
const handleAuthError = (error, operation) => {
  const userMessage = getAuthErrorMessage(error);
  console.error(`Auth ${operation} error:`, {
    code: error.code,
    message: error.message,
    userMessage
  });
  
  // Create a new error with user-friendly message but preserve original code
  const enhancedError = new Error(userMessage);
  enhancedError.code = error.code;
  enhancedError.originalError = error;
  
  throw enhancedError;
};

// Sign up with email and password
export const signUp = async (email, password, displayName) => {
  try {
    if (!email || !password) {
      throw new Error('Email and password are required.');
    }
    
    const result = await createUserWithEmailAndPassword(auth, email, password);
    
    // Set display name (use provided name or extract from email)
    const finalDisplayName = displayName || getDisplayNameFromEmail(email);
    const truncatedName = truncateDisplayName(finalDisplayName);
    
    // Update user profile with display name
    await updateProfile(result.user, {
      displayName: truncatedName
    });
    
    return {
      user: result.user,
      displayName: truncatedName
    };
  } catch (error) {
    handleAuthError(error, 'signup');
  }
};

// Sign in with email and password
export const signIn = async (email, password) => {
  try {
    if (!email || !password) {
      throw new Error('Email and password are required.');
    }
    
    const result = await signInWithEmailAndPassword(auth, email, password);
    return result.user;
  } catch (error) {
    handleAuthError(error, 'signin');
  }
};

// Sign in with Google
export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    
    // Get display name from Google profile or email
    let displayName = result.user.displayName || getDisplayNameFromEmail(result.user.email);
    displayName = truncateDisplayName(displayName);
    
    // Update profile if display name was truncated or missing
    if (!result.user.displayName || result.user.displayName !== displayName) {
      await updateProfile(result.user, {
        displayName: displayName
      });
    }
    
    return {
      user: result.user,
      displayName: displayName
    };
  } catch (error) {
    handleAuthError(error, 'Google signin');
  }
};

// Sign out
export const signOutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    handleAuthError(error, 'signout');
  }
};

// Get user display name (with fallback logic)
export const getUserDisplayName = (user) => {
  if (!user) return '';
  
  return user.displayName || getDisplayNameFromEmail(user.email);
};
