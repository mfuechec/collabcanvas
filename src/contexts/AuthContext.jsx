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
      
      // Add a timeout to handle popup cancellation more quickly
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('POPUP_TIMEOUT')), 3000); // 3 second timeout
      });
      
      const result = await Promise.race([
        signInWithGoogle(),
        timeoutPromise
      ]);
      
      return result;
    } catch (error) {
      // Handle popup cancellation or timeout quickly
      if (error.code === 'auth/popup-closed-by-user' || 
          error.code === 'auth/cancelled-popup-request' ||
          error.message === 'POPUP_TIMEOUT') {
        // Clear loading immediately for cancellation
        setLoading(false);
        return; // Don't set error for user cancellation
      }
      
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
      
      // CRITICAL: Clean up presence BEFORE auth state changes
      if (currentUserId) {
        try {
          console.log('🚪 [AUTH] Manually cleaning up presence during logout:', currentUserId);
          
          // Import dynamically to avoid circular dependencies
          const presenceModule = await import('../services/presence');
          const cursorsModule = await import('../services/cursors');
          
          // Set offline and remove cursor while still authenticated
          await Promise.allSettled([
            presenceModule.setUserOffline(currentUserId),
            cursorsModule.removeCursor(currentUserId)
          ]);
          
          console.log('✅ [AUTH] Presence cleanup completed during logout');
        } catch (cleanupError) {
          console.error('❌ [AUTH] Error during logout cleanup:', cleanupError);
          // Continue with logout even if cleanup fails
        }
      }
      
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
