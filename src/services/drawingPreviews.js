// Drawing Previews Service - Firebase Realtime Database operations for collaborative drawing previews
import { ref, set, onValue, off, onDisconnect, serverTimestamp, remove } from 'firebase/database';
import { rtdb } from './firebase';
import { getAuth } from 'firebase/auth';
import { generateUserColor } from '../utils/helpers';

// Session path for drawing preview data
const PREVIEWS_PATH = 'drawing-previews';
const CANVAS_SESSION_ID = 'global-canvas-v1';

/**
 * Get current user ID from Firebase Auth or generate session ID
 */
const getCurrentUserId = () => {
  const auth = getAuth();
  
  if (auth.currentUser?.uid) {
    return auth.currentUser.uid;
  }
  
  let userId = sessionStorage.getItem('drawing_user_id');
  if (!userId) {
    userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('drawing_user_id', userId);
  }
  return userId;
};

/**
 * Update drawing preview for current user
 * @param {object} previewData - Drawing preview data {startX, startY, currentX, currentY}
 * @param {string} displayName - User's display name
 * @param {string} userColor - User's color for the preview
 * @returns {Promise<void>}
 */
export const updateDrawingPreview = async (previewData, displayName, userColor) => {
  try {
    const userId = getCurrentUserId();
    const userPreviewRef = ref(rtdb, `${PREVIEWS_PATH}/${CANVAS_SESSION_ID}/${userId}`);
    
    const preview = {
      ...previewData,
      displayName: displayName || 'Anonymous',
      userColor: userColor || generateUserColor(userId),
      lastUpdated: serverTimestamp(),
      isActive: true
    };
    
    await set(userPreviewRef, preview);
  } catch (error) {
    console.error('❌ [DRAWING-PREVIEWS] Error updating preview:', error);
    // Don't throw - preview updates should be non-blocking
  }
};

/**
 * Remove drawing preview for current user
 * @param {string} userId - Optional user ID to remove (if not provided, uses getCurrentUserId)
 * @returns {Promise<void>}
 */
export const removeDrawingPreview = async (userId = null) => {
  try {
    const targetUserId = userId || getCurrentUserId();
    const userPreviewRef = ref(rtdb, `${PREVIEWS_PATH}/${CANVAS_SESSION_ID}/${targetUserId}`);
    
    await remove(userPreviewRef);
  } catch (error) {
    console.error('❌ [DRAWING-PREVIEWS] Error removing preview:', error);
  }
};

/**
 * Subscribe to drawing previews of all users
 * @param {function} callback - Called with preview data updates
 * @returns {function} - Unsubscribe function
 */
export const subscribeToDrawingPreviews = (callback) => {
  try {
    const currentUserId = getCurrentUserId();
    const sessionRef = ref(rtdb, `${PREVIEWS_PATH}/${CANVAS_SESSION_ID}`);
    
    const handlePreviewUpdates = (snapshot) => {
      const allPreviews = snapshot.val() || {};
      
      const otherUsersPreviews = {};
      Object.keys(allPreviews).forEach(userId => {
        const previewData = allPreviews[userId];
        
        // Only include previews from other users that are active
        if (userId !== currentUserId && previewData && previewData.isActive) {
          otherUsersPreviews[userId] = previewData;
        }
      });
      
      callback(otherUsersPreviews);
    };
    
    onValue(sessionRef, handlePreviewUpdates, (error) => {
      console.error('❌ [DRAWING-PREVIEWS] Firebase subscription error:', error);
    });
    
    return () => {
      off(sessionRef, 'value', handlePreviewUpdates);
    };
  } catch (error) {
    console.error('❌ [DRAWING-PREVIEWS] Error setting up subscription:', error);
    return () => {}; // Return empty unsubscribe function
  }
};

/**
 * Set up automatic preview cleanup on disconnect
 * @param {string} displayName - User's display name
 * @param {string} userColor - User's color
 * @returns {Promise<void>}
 */
export const setupDrawingPreviewCleanup = async (displayName, userColor) => {
  try {
    const userId = getCurrentUserId();
    const userPreviewRef = ref(rtdb, `${PREVIEWS_PATH}/${CANVAS_SESSION_ID}/${userId}`);
    
    // Set up automatic removal on disconnect
    await onDisconnect(userPreviewRef).remove();
  } catch (error) {
    console.error('❌ [DRAWING-PREVIEWS] Error setting up preview cleanup:', error);
  }
};

/**
 * Get current user's preview ID for filtering
 * @returns {string}
 */
export const getCurrentDrawingUserId = getCurrentUserId;

// Export session constants for testing
export { PREVIEWS_PATH, CANVAS_SESSION_ID };
