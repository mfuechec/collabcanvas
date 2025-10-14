// Presence Service - Firebase Realtime Database operations for user presence tracking
import { ref, set, onValue, off, onDisconnect, serverTimestamp } from 'firebase/database';
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
  if (auth.currentUser) {
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
 * Set user as online with presence data
 * @param {string} displayName - User's display name
 * @param {string} cursorColor - User's cursor color
 * @returns {Promise<void>}
 */
export const setUserOnline = async (displayName, cursorColor) => {
  try {
    const userId = getCurrentUserId();
    const userPresenceRef = ref(rtdb, `${SESSIONS_PATH}/${CANVAS_SESSION_ID}/${userId}`);
    
    const presenceData = {
      displayName: displayName || 'Anonymous',
      cursorColor: cursorColor || '#3B82F6',
      cursorX: 0,
      cursorY: 0,
      lastSeen: serverTimestamp(),
      isOnline: true
    };
    
    await set(userPresenceRef, presenceData);
    
    console.log('User set online:', userId, displayName);
  } catch (error) {
    console.error('Error setting user online:', error);
    throw new Error('Failed to set user online status');
  }
};

/**
 * Set user as offline
 * @returns {Promise<void>}
 */
export const setUserOffline = async () => {
  try {
    const userId = getCurrentUserId();
    const userPresenceRef = ref(rtdb, `${SESSIONS_PATH}/${CANVAS_SESSION_ID}/${userId}`);
    
    await set(userPresenceRef, {
      isOnline: false,
      lastSeen: serverTimestamp()
    });
    
    console.log('User set offline:', userId);
  } catch (error) {
    console.error('Error setting user offline:', error);
    // Don't throw - offline status should be non-blocking
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
      
      // Reduced logging - only log when there are significant changes
      const userCount = Object.keys(allUsers).length;
      if (userCount !== handlePresenceUpdates.lastUserCount) {
        console.log('🔄 Presence update received:', {
          totalEntries: userCount,
          timestamp: new Date().toISOString()
        });
        handlePresenceUpdates.lastUserCount = userCount;
      }
      
      // Filter and process online users
      // Users are considered online if:
      // 1. Their data exists (not null/undefined)
      // 2. They have a displayName (active session)
      // 3. isOnline is explicitly true (stricter filtering)
      const onlineUsers = [];
      Object.keys(allUsers).forEach(userId => {
        const userData = allUsers[userId];
        const shouldInclude = userData && 
                             userData.displayName && 
                             userData.isOnline === true; // ✅ Stricter: must be explicitly true
        
        // Only log users that should be included to reduce noise
        if (shouldInclude || !userData?.displayName) {
          console.log(`👤 Processing user ${userId}:`, {
            exists: !!userData,
            hasDisplayName: !!userData?.displayName,
            isOnline: userData?.isOnline,
            shouldInclude
          });
        }
        
        if (shouldInclude) {
          onlineUsers.push({
            id: userId,
            displayName: userData.displayName,
            cursorColor: userData.cursorColor || '#3B82F6',
            lastSeen: userData.lastSeen,
            isCurrentUser: userId === currentUserId
          });
        }
      });
      
      console.log('✅ Final online users:', onlineUsers.map(u => ({ id: u.id, name: u.displayName })));
      callback(onlineUsers);
    };
    
    // Listen for presence updates
    onValue(sessionRef, handlePresenceUpdates);
    
    // Return unsubscribe function
    return () => {
      off(sessionRef, 'value', handlePresenceUpdates);
    };
  } catch (error) {
    console.error('Error subscribing to presence:', error);
    return () => {}; // Return empty unsubscribe function
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
    console.log('User presence removed:', userId);
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
