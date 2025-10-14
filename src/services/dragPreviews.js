// Drag Previews Service - Firebase Realtime Database operations for collaborative drag previews
import { ref, set, onValue, off, onDisconnect, serverTimestamp, remove } from 'firebase/database';
import { rtdb } from './firebase';
import { getAuth } from 'firebase/auth';
import { generateUserColor } from '../utils/helpers';

// Session path for drag preview data
const DRAG_PREVIEWS_PATH = 'drag-previews';
const CANVAS_SESSION_ID = 'global-canvas-v1';

/**
 * Get current user ID from Firebase Auth or generate session ID
 */
const getCurrentUserId = () => {
  const auth = getAuth();
  
  if (auth.currentUser?.uid) {
    return auth.currentUser.uid;
  }
  
  let userId = sessionStorage.getItem('drag_user_id');
  if (!userId) {
    userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('drag_user_id', userId);
  }
  return userId;
};

/**
 * Update drag preview for current user
 * @param {string} shapeId - ID of the shape being dragged
 * @param {object} dragData - Drag preview data {x, y, width, height, fill}
 * @param {string} displayName - User's display name
 * @param {string} userColor - User's color for the preview
 * @returns {Promise<void>}
 */
export const updateDragPreview = async (shapeId, dragData, displayName, userColor) => {
  try {
    const userId = getCurrentUserId();
    const dragPreviewRef = ref(rtdb, `${DRAG_PREVIEWS_PATH}/${CANVAS_SESSION_ID}/${userId}`);
    
    const preview = {
      shapeId,
      ...dragData,
      displayName: displayName || 'Anonymous',
      userColor: userColor || generateUserColor(userId),
      lastUpdated: serverTimestamp(),
      isDragging: true
    };
    
    await set(dragPreviewRef, preview);
  } catch (error) {
    console.error('❌ [DRAG-PREVIEWS] Error updating drag preview:', error);
    // Don't throw - preview updates should be non-blocking
  }
};

/**
 * Remove drag preview for current user
 * @param {string} userId - Optional user ID to remove (if not provided, uses getCurrentUserId)
 * @returns {Promise<void>}
 */
export const removeDragPreview = async (userId = null) => {
  try {
    const targetUserId = userId || getCurrentUserId();
    const dragPreviewRef = ref(rtdb, `${DRAG_PREVIEWS_PATH}/${CANVAS_SESSION_ID}/${targetUserId}`);
    
    await remove(dragPreviewRef);
  } catch (error) {
    console.error('❌ [DRAG-PREVIEWS] Error removing drag preview:', error);
  }
};

/**
 * Subscribe to drag previews of all users
 * @param {function} callback - Called with drag preview data updates
 * @returns {function} - Unsubscribe function
 */
export const subscribeToDragPreviews = (callback) => {
  try {
    const currentUserId = getCurrentUserId();
    const sessionRef = ref(rtdb, `${DRAG_PREVIEWS_PATH}/${CANVAS_SESSION_ID}`);
    
    const handleDragPreviewUpdates = (snapshot) => {
      const allPreviews = snapshot.val() || {};
      
      const otherUsersPreviews = {};
      Object.keys(allPreviews).forEach(userId => {
        const previewData = allPreviews[userId];
        
        // Only include previews from other users that are actively dragging
        if (userId !== currentUserId && previewData && previewData.isDragging) {
          otherUsersPreviews[userId] = previewData;
        }
      });
      
      callback(otherUsersPreviews);
    };
    
    onValue(sessionRef, handleDragPreviewUpdates, (error) => {
      console.error('❌ [DRAG-PREVIEWS] Firebase subscription error:', error);
    });
    
    return () => {
      off(sessionRef, 'value', handleDragPreviewUpdates);
    };
  } catch (error) {
    console.error('❌ [DRAG-PREVIEWS] Error setting up subscription:', error);
    return () => {}; // Return empty unsubscribe function
  }
};

/**
 * Set up automatic drag preview cleanup on disconnect
 * @param {string} displayName - User's display name
 * @param {string} userColor - User's color
 * @returns {Promise<void>}
 */
export const setupDragPreviewCleanup = async (displayName, userColor) => {
  try {
    const userId = getCurrentUserId();
    const dragPreviewRef = ref(rtdb, `${DRAG_PREVIEWS_PATH}/${CANVAS_SESSION_ID}/${userId}`);
    
    // Set up automatic removal on disconnect
    await onDisconnect(dragPreviewRef).remove();
  } catch (error) {
    console.error('❌ [DRAG-PREVIEWS] Error setting up drag preview cleanup:', error);
  }
};

/**
 * Get current user's drag preview ID for filtering
 * @returns {string}
 */
export const getCurrentDragUserId = getCurrentUserId;

// Export session constants for testing
export { DRAG_PREVIEWS_PATH, CANVAS_SESSION_ID };
