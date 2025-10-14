// Cursor Service - Firebase Realtime Database operations for cursor tracking
import { ref, set, onValue, off, onDisconnect, serverTimestamp } from 'firebase/database';
import { rtdb } from './firebase';
import { getAuth } from 'firebase/auth';

// Session path for cursor data
const SESSIONS_PATH = 'sessions';
const CANVAS_SESSION_ID = 'global-canvas-v1';

/**
 * Get current user ID from Firebase Auth or generate session ID
 */
const getCurrentUserId = () => {
  const auth = getAuth();
  
  if (auth.currentUser?.uid) {
    return auth.currentUser.uid;
  }
  
  let userId = sessionStorage.getItem('cursor_user_id');
  if (!userId) {
    userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('cursor_user_id', userId);
  }
  return userId;
};

/**
 * Update cursor position for current user
 * @param {number} x - Canvas X coordinate
 * @param {number} y - Canvas Y coordinate
 * @param {string} displayName - User's display name
 * @param {string} cursorColor - User's cursor color
 * @returns {Promise<void>}
 */
export const updateCursorPosition = async (x, y, displayName, cursorColor) => {
  try {
    const userId = getCurrentUserId();
    const userCursorRef = ref(rtdb, `${SESSIONS_PATH}/${CANVAS_SESSION_ID}/${userId}`);
    
    const cursorData = {
      displayName: displayName || 'Anonymous',
      cursorColor: cursorColor || '#3B82F6',
      cursorX: Math.round(x),
      cursorY: Math.round(y),
      lastSeen: serverTimestamp(),
      isOnline: true
    };
    
    await set(userCursorRef, cursorData);
  } catch (error) {
    console.error('❌ [CURSOR-SERVICE] Error updating cursor position:', error);
  }
};

/**
 * Subscribe to cursor positions of all users
 * @param {function} callback - Called with cursor data updates
 * @returns {function} - Unsubscribe function
 */
export const subscribeToCursors = (callback) => {
  try {
    const currentUserId = getCurrentUserId();
    const sessionRef = ref(rtdb, `${SESSIONS_PATH}/${CANVAS_SESSION_ID}`);
    
    const handleCursorUpdates = (snapshot) => {
      const allCursors = snapshot.val() || {};
      
      const otherUsersCursors = {};
      Object.keys(allCursors).forEach(userId => {
        const cursorData = allCursors[userId];
        // Debug each condition step by step
        const notCurrentUser = userId !== currentUserId;
        const hasData = !!cursorData;
        const hasDisplayName = cursorData && !!cursorData.displayName;
        const hasValidX = cursorData && typeof cursorData.cursorX === 'number' && cursorData.cursorX >= 0;
        const hasValidY = cursorData && typeof cursorData.cursorY === 'number' && cursorData.cursorY >= 0;
        
        // Include cursors that have data, even if display name is missing (we'll get it from presence)
        const shouldInclude = notCurrentUser && hasData;
        
        
        if (shouldInclude) {
          otherUsersCursors[userId] = cursorData;
        }
      });
      
      callback(otherUsersCursors);
    };
    
    onValue(sessionRef, handleCursorUpdates, (error) => {
      console.error('❌ [CURSOR-SERVICE] Firebase cursor subscription error:', error);
    });
    
    return () => {
      off(sessionRef, 'value', handleCursorUpdates);
    };
  } catch (error) {
    console.error('❌ [CURSOR-SERVICE] Error setting up cursor subscription:', error);
    return () => {};
  }
};

/**
 * Set up automatic cursor cleanup on disconnect
 * @param {string} displayName - User's display name
 * @param {string} cursorColor - User's cursor color
 * @returns {Promise<void>}
 */
export const setupCursorCleanup = async (displayName, cursorColor) => {
  try {
    const userId = getCurrentUserId();
    const userCursorRef = ref(rtdb, `${SESSIONS_PATH}/${CANVAS_SESSION_ID}/${userId}`);
    
    await onDisconnect(userCursorRef).remove();
    
    const cursorData = {
      displayName: displayName || 'Anonymous',
      cursorColor: cursorColor || '#3B82F6',
      cursorX: 0,
      cursorY: 0,
      lastSeen: serverTimestamp(),
      isOnline: true
    };
    
    await set(userCursorRef, cursorData);
  } catch (error) {
    console.error('❌ [CURSOR-SERVICE] Error setting up cursor cleanup:', error);
  }
};

/**
 * Manually remove cursor (e.g., on component unmount)
 * @param {string} userId - Optional user ID to remove (if not provided, uses getCurrentUserId)
 * @returns {Promise<void>}
 */
export const removeCursor = async (userId = null) => {
  try {
    const targetUserId = userId || getCurrentUserId();
    const userCursorRef = ref(rtdb, `${SESSIONS_PATH}/${CANVAS_SESSION_ID}/${targetUserId}`);
    
    await set(userCursorRef, null);
  } catch (error) {
    console.error('❌ [CURSOR-SERVICE] Error removing cursor:', error);
  }
};

/**
 * Get current user's cursor ID for filtering
 * @returns {string}
 */
export const getCurrentCursorUserId = getCurrentUserId;

// Export session constants for testing
export { SESSIONS_PATH, CANVAS_SESSION_ID };
