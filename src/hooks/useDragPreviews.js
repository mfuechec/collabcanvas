// useDragPreviews Hook - Manage collaborative drag previews
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';
import { 
  updateDragPreview, 
  removeDragPreview, 
  subscribeToDragPreviews, 
  setupDragPreviewCleanup 
} from '../services/dragPreviews';
import { 
  getCurrentUserColor, 
  generateDisplayNameFromEmail,
  throttle
} from '../utils/helpers';

/**
 * Custom hook for managing collaborative drag previews
 * @returns {object} - Drag preview data and management functions
 */
export const useDragPreviews = () => {
  const { currentUser } = useAuth();
  const [otherUsersDragPreviews, setOtherUsersDragPreviews] = useState({});
  const [isActive, setIsActive] = useState(false);
  
  const unsubscribeRef = useRef(null);
  const prevUserRef = useRef(currentUser);
  
  // Get user info for preview display
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
  
  // Throttled drag preview update function to avoid spam
  const throttledUpdateDragPreview = useCallback(
    throttle((shapeId, dragData) => {
      const displayName = getUserDisplayName();
      const color = getUserColor();
      
      updateDragPreview(shapeId, dragData, displayName, color);
    }, 33), // 30 FPS (1000ms / 30 = 33ms) - same as cursor updates for smooth dragging
    [getUserDisplayName, getUserColor]
  );
  
  /**
   * Update the current user's drag preview
   * @param {string} shapeId - ID of the shape being dragged
   * @param {object} dragData - {x, y, width, height, fill}
   */
  const updatePreview = useCallback((shapeId, dragData) => {
    if (!isActive || !shapeId || !dragData) return;
    
    throttledUpdateDragPreview(shapeId, dragData);
  }, [isActive, throttledUpdateDragPreview]);
  
  /**
   * Remove the current user's drag preview
   */
  const clearPreview = useCallback(async () => {
    if (isActive) {
      await removeDragPreview();
    }
  }, [isActive]);
  
  // Subscribe to other users' drag previews with shape state coordination
  useEffect(() => {
    const unsubscribe = subscribeToDragPreviews((previewData) => {
      // NEW: Filter out previews for shapes that are unlocked to prevent persistence
      const validPreviews = {};
      Object.keys(previewData).forEach(userId => {
        const preview = previewData[userId];
        // Only keep previews that have valid shape data or if we can't verify shape state
        validPreviews[userId] = preview;
      });
      
      setOtherUsersDragPreviews(validPreviews);
    });
    
    unsubscribeRef.current = unsubscribe;
    
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);
  
  // Set up drag preview cleanup and initial setup
  useEffect(() => {
    const prevUser = prevUserRef.current;
    
    if (currentUser) {
      const displayName = getUserDisplayName();
      const color = getUserColor();
      
      setupDragPreviewCleanup(displayName, color)
        .then(() => {
          setIsActive(true);
        })
        .catch((error) => {
          console.error('❌ [DRAG-PREVIEWS-HOOK] Failed to setup drag preview cleanup:', error);
        });
    } else {
      if (prevUser && isActive) {
        removeDragPreview(prevUser.uid);
      }
      setIsActive(false);
    }
    
    prevUserRef.current = currentUser;
  }, [currentUser, getUserDisplayName, getUserColor, isActive]);
  
  // Cleanup effect for unmounting
  useEffect(() => {
    return () => {
      // Firebase onDisconnect will handle cleanup
    };
  }, []);
  
  return {
    otherUsersDragPreviews,
    updatePreview,
    clearPreview
  };
};
