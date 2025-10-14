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
  // Try to get from Firebase Auth first
  const auth = getAuth();
  if (auth.currentUser) {
    return auth.currentUser.uid;
  }
  
  // Fallback to session storage for anonymous users
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
      isOnline: true  // ✅ Always set user as online when updating cursor
    };
    
    await set(userCursorRef, cursorData);
  } catch (error) {
    console.error('Error updating cursor position:', error);
    // Don't throw - cursor updates should be non-blocking
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
      
      // Filter out current user's cursor and null/undefined entries
      const otherUsersCursors = {};
      Object.keys(allCursors).forEach(userId => {
        const cursorData = allCursors[userId];
        // Only include valid cursor data that's not the current user and has visible position
        if (userId !== currentUserId && cursorData && cursorData.displayName && 
            cursorData.cursorX >= 0 && cursorData.cursorY >= 0) {
          otherUsersCursors[userId] = cursorData;
        }
      });
      
      callback(otherUsersCursors);
    };
    
    // Listen for cursor updates
    onValue(sessionRef, handleCursorUpdates);
    
    // Return unsubscribe function
    return () => {
      off(sessionRef, 'value', handleCursorUpdates);
    };
  } catch (error) {
    console.error('Error subscribing to cursors:', error);
    return () => {}; // Return empty unsubscribe function
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
    
    // Set up automatic removal on disconnect
    await onDisconnect(userCursorRef).remove();
    
    // Set initial cursor and presence data
    const cursorData = {
      displayName: displayName || 'Anonymous',
      cursorColor: cursorColor || '#3B82F6',
      cursorX: 0,
      cursorY: 0,
      lastSeen: serverTimestamp(),
      isOnline: true  // Set presence when cursor is active
    };
    
    await set(userCursorRef, cursorData);
    
    console.log('Cursor cleanup configured for user:', userId);
  } catch (error) {
    console.error('Error setting up cursor cleanup:', error);
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
    
    console.log('🗑️ Attempting to remove cursor for user:', targetUserId);
    console.log('🗑️ Removing from path:', `${SESSIONS_PATH}/${CANVAS_SESSION_ID}/${targetUserId}`);
    
    await set(userCursorRef, null);
    
    console.log('✅ Cursor removed successfully for user:', targetUserId);
  } catch (error) {
    console.error('❌ Error removing cursor:', error);
  }
};

/**
 * Get current user's cursor ID for filtering
 * @returns {string}
 */
export const getCurrentCursorUserId = getCurrentUserId;

// Export session constants for testing
export { SESSIONS_PATH, CANVAS_SESSION_ID };
