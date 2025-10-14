// usePresence Hook - Track and manage user presence
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';
import { 
  setUserOnline, 
  setUserOffline, 
  subscribeToPresence, 
  removeUserPresence,
  updateLastSeen
} from '../services/presence';
import { 
  generateUserColor, 
  getCurrentUserColor, 
  generateDisplayNameFromEmail
} from '../utils/helpers';

/**
 * Custom hook for managing user presence
 * @returns {object} - Presence data and management functions
 */
export const usePresence = () => {
  const { currentUser } = useAuth();
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isOnline, setIsOnline] = useState(false);
  
  const unsubscribeRef = useRef(null);
  const heartbeatIntervalRef = useRef(null);
  const prevUserRef = useRef(currentUser); // Track previous user state
  
  // Get user info for presence display
  const getUserDisplayName = useCallback(() => {
    if (currentUser?.displayName) {
      return currentUser.displayName;
    }
    if (currentUser?.email) {
      return generateDisplayNameFromEmail(currentUser.email);
    }
    return 'Anonymous';
  }, [currentUser]);
  
  const getUserColor = useCallback(() => {
    return getCurrentUserColor();
  }, []);
  
  // Subscribe to presence changes
  useEffect(() => {
    console.log('🔌 Setting up presence subscription');
    
    const unsubscribe = subscribeToPresence((users) => {
      // Only log when user count changes to reduce noise
      if (users.length !== onlineUsers.length) {
        console.log('📊 usePresence received update:', {
          userCount: users.length,
          users: users.map(u => ({ id: u.id, name: u.displayName, isCurrent: u.isCurrentUser }))
        });
      }
      setOnlineUsers(users);
    });
    
    unsubscribeRef.current = unsubscribe;
    
    return () => {
      if (unsubscribe) {
        console.log('🔌 Cleaning up presence subscription');
        unsubscribe();
      }
    };
  }, []);
  
  // Set up presence and heartbeat when user is authenticated
  useEffect(() => {
    const prevUser = prevUserRef.current;
    
    if (currentUser) {
      // User is logged in - set them online
      const displayName = getUserDisplayName();
      const color = getUserColor();
      
      setUserOnline(displayName, color)
        .then(() => {
          setIsOnline(true);
          console.log('User presence set online:', displayName);
        })
        .catch((error) => {
          console.error('Failed to set user online:', error);
        });
      
      // Set up heartbeat to update last seen every 30 seconds
      heartbeatIntervalRef.current = setInterval(() => {
        updateLastSeen();
      }, 30000);
      
    } else {
      // User logged out - cursor system will handle RTDB cleanup
      // Just update local state here
      if (prevUser && isOnline) {
        console.log('User logged out, presence will be cleaned up by cursor system');
      }
      setIsOnline(false);
      
      // Clear heartbeat
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
    }
    
    // Update the previous user ref
    prevUserRef.current = currentUser;
    
    // Cleanup on unmount
    return () => {
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      if (currentUser) {
        setUserOffline();
      }
    };
  }, [currentUser, getUserDisplayName, getUserColor, isOnline]);
  
  // Handle page visibility changes for better presence tracking
  useEffect(() => {
    const handleVisibilityChange = () => {
      // Only handle page becoming visible again to restore presence if needed
      // Don't aggressively set offline when page is hidden (user might just be switching tabs)
      if (!document.hidden && currentUser && !isOnline) {
        // Page is visible and user is logged in but marked offline - restore online status
        console.log('Page became visible, restoring user online status');
        const displayName = getUserDisplayName();
        const color = getUserColor();
        setUserOnline(displayName, color)
          .then(() => setIsOnline(true))
          .catch(error => console.error('Failed to restore online status:', error));
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [currentUser, isOnline, getUserDisplayName, getUserColor]);
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      // Don't remove presence here - cursor system handles RTDB cleanup
    };
  }, []);
  
  // Get current user info
  const currentUserInfo = onlineUsers.find(user => user.isCurrentUser) || null;
  const otherUsers = onlineUsers.filter(user => !user.isCurrentUser);
  const totalUsers = onlineUsers.length;
  
  return {
    onlineUsers,
    currentUserInfo,
    otherUsers,
    totalUsers,
    isOnline,
    currentUserDisplayName: getUserDisplayName(),
    currentUserColor: getUserColor()
  };
};
