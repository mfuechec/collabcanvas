// usePresence Hook - Track and manage user presence
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';
import { 
  setUserOnline, 
  subscribeToPresence, 
  sendPresenceHeartbeat,
  updateUserActivity
} from '../services/presence';
import { 
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
  const activityTimeoutRef = useRef(null);
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
  
  // Track user activity
  const markActivity = useCallback(() => {
    // Clear existing timeout
    if (activityTimeoutRef.current) {
      clearTimeout(activityTimeoutRef.current);
    }
    
    // Update activity in Firebase
    updateUserActivity(true);
    
    // Set timeout to mark as inactive after 2 minutes
    activityTimeoutRef.current = setTimeout(() => {
      updateUserActivity(false);
    }, 2 * 60 * 1000);
  }, []);
  
  // Setup activity listeners
  useEffect(() => {
    if (!currentUser) return;
    
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart'];
    
    // Throttle activity updates to once per minute maximum
    let lastActivityUpdate = 0;
    const throttledMarkActivity = () => {
      const now = Date.now();
      if (now - lastActivityUpdate > 60000) { // 1 minute throttle
        markActivity();
        lastActivityUpdate = now;
      }
    };
    
    events.forEach(event => {
      document.addEventListener(event, throttledMarkActivity, { passive: true });
    });
    
    // Mark initial activity
    markActivity();
    
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, throttledMarkActivity);
      });
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current);
      }
    };
  }, [currentUser, markActivity]);
  
  // Subscribe to presence changes
  useEffect(() => {
    const unsubscribe = subscribeToPresence((users) => {
      setOnlineUsers(users);
    });
    
    unsubscribeRef.current = unsubscribe;
    
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);
  
  // Handle user login/logout and presence setup
  useEffect(() => {
    const prevUser = prevUserRef.current;
    
    
    if (currentUser) {
      // User is logged in - set them online
      const displayName = getUserDisplayName();
      const color = getUserColor();

      setUserOnline(displayName, color)
        .then(() => {
          setIsOnline(true);
        })
        .catch((error) => {
          console.error('❌ [PRESENCE] Failed to set user online:', error);
        });
      
      // Set up independent heartbeat to maintain online status every 30 seconds
      heartbeatIntervalRef.current = setInterval(() => {
        if (currentUser && !document.hidden) {
          const displayName = getUserDisplayName();
          const color = getUserColor();
          sendPresenceHeartbeat(displayName, color);
        }
      }, 30000);
      
    } else {
      // User logged out - rely on Firebase onDisconnect for cleanup
      setIsOnline(false);
      
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
      // Don't manually set offline on unmount - Firebase onDisconnect will handle it
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
  
  // Get total user count
  const totalUsers = onlineUsers.length;
  
  return {
    onlineUsers,
    totalUsers
  };
};
