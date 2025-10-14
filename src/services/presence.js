// Presence Service - Firebase Realtime Database operations for user presence tracking
import { ref, set, update, onValue, off, onDisconnect, serverTimestamp } from 'firebase/database';
import { rtdb } from './firebase';
import { getAuth } from 'firebase/auth';

// Session path for presence data (shared with cursor data)
const SESSIONS_PATH = 'sessions';
const CANVAS_SESSION_ID = 'global-canvas-v1';

/**
 * Get current user ID from Firebase Auth or generate session ID
 */
const getCurrentUserId = () => {
  // Try to get from Firebase Auth first
  const auth = getAuth();
  
  if (auth.currentUser?.uid) {
    return auth.currentUser.uid;
  }
  
  // Fallback to session storage for anonymous users - use same key as cursor service
  let userId = sessionStorage.getItem('cursor_user_id');
  if (!userId) {
    userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('cursor_user_id', userId);
  }
  return userId;
};

/**
 * Set user as online with presence data and activity tracking
 * @param {string} displayName - User's display name
 * @param {string} cursorColor - User's cursor color
 * @param {boolean} isActive - Whether user is currently active (recently interacted)
 * @returns {Promise<void>}
 */
export const setUserOnline = async (displayName, cursorColor, isActive = true) => {
  try {
    const userId = getCurrentUserId();
    
    const userPresenceRef = ref(rtdb, `${SESSIONS_PATH}/${CANVAS_SESSION_ID}/${userId}`);
    
    const presenceData = {
      displayName: displayName || 'Anonymous',
      cursorColor: cursorColor || '#3B82F6',
      cursorX: 0,
      cursorY: 0,
      lastSeen: serverTimestamp(),
      isOnline: true,
      isActive: isActive,
      lastActivity: isActive ? serverTimestamp() : null
    };
    
    await set(userPresenceRef, presenceData);
    
    // Set up automatic offline status on disconnect (don't remove, just mark offline)
    await onDisconnect(userPresenceRef).update({
      isOnline: false,
      lastSeen: serverTimestamp()
    });
    
  } catch (error) {
    console.error('❌ [PRESENCE-SERVICE] Error setting user online:', error);
    throw new Error('Failed to set user online status');
  }
};

/**
 * Set user as offline
 * @param {string} specificUserId - Optional: specific user ID to set offline (for logout cleanup)
 * @returns {Promise<void>}
 */
export const setUserOffline = async (specificUserId = null) => {
  try {
    const userId = specificUserId || getCurrentUserId();
    
    const userPresenceRef = ref(rtdb, `${SESSIONS_PATH}/${CANVAS_SESSION_ID}/${userId}`);
    
    await set(userPresenceRef, {
      isOnline: false,
      lastSeen: serverTimestamp()
    });
    
  } catch (error) {
    console.error('❌ [PRESENCE-SERVICE] Error setting user offline:', error);
    // Don't throw - offline status should be non-blocking
  }
};

/**
 * Update user activity status (for heartbeat and activity tracking)
 * @param {boolean} isActive - Whether user is currently active
 * @returns {Promise<void>}
 */
export const updateUserActivity = async (isActive = false) => {
  try {
    const userId = getCurrentUserId();
    const userPresenceRef = ref(rtdb, `${SESSIONS_PATH}/${CANVAS_SESSION_ID}/${userId}`);
    
    const updates = {
      lastSeen: serverTimestamp(),
      isOnline: true // Always maintain online status during heartbeat
    };
    
    if (isActive) {
      updates.isActive = true;
      updates.lastActivity = serverTimestamp();
    }
    
    await update(userPresenceRef, updates);
    
  } catch (error) {
    console.error('Error updating user activity:', error);
    // Don't throw - heartbeat should be non-blocking
  }
};

/**
 * Presence heartbeat - maintains online status regardless of activity
 * @param {string} displayName - User's display name
 * @param {string} cursorColor - User's cursor color
 * @returns {Promise<void>}
 */
export const sendPresenceHeartbeat = async (displayName, cursorColor) => {
  try {
    const userId = getCurrentUserId();
    const userPresenceRef = ref(rtdb, `${SESSIONS_PATH}/${CANVAS_SESSION_ID}/${userId}`);
    
    await update(userPresenceRef, {
      displayName: displayName || 'Anonymous',
      cursorColor: cursorColor || '#3B82F6',
      lastSeen: serverTimestamp(),
      isOnline: true
      // Don't update isActive or lastActivity - those are updated separately
    });
    
  } catch (error) {
    console.error('Error sending presence heartbeat:', error);
    // Don't throw - heartbeat should be non-blocking
  }
};

/**
 * Subscribe to presence changes of all users
 * @param {function} callback - Called with presence data updates
 * @returns {function} - Unsubscribe function
 */
export const subscribeToPresence = (callback) => {
  try {
    const currentUserId = getCurrentUserId();
    const sessionRef = ref(rtdb, `${SESSIONS_PATH}/${CANVAS_SESSION_ID}`);
    
    const handlePresenceUpdates = (snapshot) => {
      const allUsers = snapshot.val() || {};
      
      const onlineUsers = [];
      Object.keys(allUsers).forEach(userId => {
        const userData = allUsers[userId];
        const shouldInclude = userData && 
                             userData.displayName && 
                             userData.isOnline === true;
        
        if (shouldInclude) {
          // Determine activity status based on lastActivity timestamp
          const now = Date.now();
          const lastActivity = userData.lastActivity;
          const isActive = userData.isActive && lastActivity && (now - lastActivity) < (2 * 60 * 1000); // Active if within 2 minutes
          
          onlineUsers.push({
            id: userId,
            displayName: userData.displayName,
            cursorColor: userData.cursorColor || '#3B82F6',
            lastSeen: userData.lastSeen,
            lastActivity: userData.lastActivity,
            isActive: isActive,
            isCurrentUser: userId === currentUserId
          });
        }
      });
      
      callback(onlineUsers);
    };
    
    onValue(sessionRef, handlePresenceUpdates, (error) => {
      console.error('❌ [PRESENCE-SERVICE] Firebase subscription error:', error);
    });
    
    return () => {
      off(sessionRef, 'value', handlePresenceUpdates);
    };
  } catch (error) {
    console.error('❌ [PRESENCE-SERVICE] Error setting up subscription:', error);
    return () => {};
  }
};

/**
 * Update user's last seen timestamp (heartbeat)
 * @returns {Promise<void>}
 */
export const updateLastSeen = async () => {
  try {
    const userId = getCurrentUserId();
    const userPresenceRef = ref(rtdb, `${SESSIONS_PATH}/${CANVAS_SESSION_ID}/${userId}`);
    
    await set(userPresenceRef, {
      lastSeen: serverTimestamp()
    });
  } catch (error) {
    console.error('Error updating last seen:', error);
    // Don't throw - heartbeat should be non-blocking
  }
};

/**
 * Remove user presence completely (on logout)
 * @returns {Promise<void>}
 */
export const removeUserPresence = async () => {
  try {
    const userId = getCurrentUserId();
    const userPresenceRef = ref(rtdb, `${SESSIONS_PATH}/${CANVAS_SESSION_ID}/${userId}`);
    
    // Remove user data completely on manual logout
    await set(userPresenceRef, null);
  } catch (error) {
    console.error('Error removing user presence:', error);
  }
};

/**
 * Get current user's presence ID for filtering
 * @returns {string}
 */
export const getCurrentPresenceUserId = getCurrentUserId;

// Export session constants for testing
export { SESSIONS_PATH, CANVAS_SESSION_ID };
