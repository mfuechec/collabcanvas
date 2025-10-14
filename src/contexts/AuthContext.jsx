// Auth Context - Centralized Authentication State Management
import { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../services/firebase';
import { signUp, signIn, signInWithGoogle, signOutUser, getUserDisplayName } from '../services/auth';

// Create Auth Context
const AuthContext = createContext();

// Custom hook to use auth context
export const useAuthContext = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
};

// Auth Provider Component
export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      console.log('🔐 Firebase Auth state changed:', {
        from: currentUser ? { uid: currentUser.uid, email: currentUser.email } : null,
        to: user ? { uid: user.uid, email: user.email } : null,
        timestamp: new Date().toISOString()
      });
      setCurrentUser(user);
      setLoading(false);
    });

    // Cleanup subscription on unmount
    return unsubscribe;
  }, [currentUser]); // Add currentUser to see previous state

  // Login function
  const login = async (email, password) => {
    try {
      setError(null);
      setLoading(true);
      const user = await signIn(email, password);
      return user;
    } catch (error) {
      setError(getErrorMessage(error));
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Signup function
  const signup = async (email, password, displayName) => {
    try {
      setError(null);
      setLoading(true);
      const result = await signUp(email, password, displayName);
      return result;
    } catch (error) {
      setError(getErrorMessage(error));
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Google signin function
  const googleSignIn = async () => {
    try {
      setError(null);
      setLoading(true);
      const result = await signInWithGoogle();
      return result;
    } catch (error) {
      setError(getErrorMessage(error));
      throw error;
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const logout = async () => {
    try {
      setError(null);
      
      // Get current user info before signout for cleanup
      const currentUserId = currentUser?.uid;
      console.log('Logging out user:', currentUserId);
      
      await signOutUser();
      
      console.log('User signed out successfully');
    } catch (error) {
      setError(getErrorMessage(error));
      throw error;
    }
  };

  // Get user's display name
  const getDisplayName = () => {
    return getUserDisplayName(currentUser);
  };

  // Helper function to format error messages
  const getErrorMessage = (error) => {
    switch (error.code) {
      case 'auth/user-not-found':
        return 'No account found with this email address.';
      case 'auth/wrong-password':
        return 'Incorrect password.';
      case 'auth/email-already-in-use':
        return 'An account with this email already exists.';
      case 'auth/weak-password':
        return 'Password should be at least 6 characters.';
      case 'auth/invalid-email':
        return 'Invalid email address.';
      case 'auth/popup-closed-by-user':
        return 'Sign-in cancelled.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your connection.';
      default:
        return error.message || 'An error occurred during authentication.';
    }
  };

  // Context value
  const value = {
    currentUser,
    loading,
    error,
    login,
    signup,
    googleSignIn,
    logout,
    getDisplayName,
    isAuthenticated: !!currentUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
