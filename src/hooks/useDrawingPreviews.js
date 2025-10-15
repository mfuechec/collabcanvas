// useDrawingPreviews Hook - Manage collaborative drawing previews
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';
import { 
  updateDrawingPreview, 
  removeDrawingPreview, 
  subscribeToDrawingPreviews, 
  setupDrawingPreviewCleanup 
} from '../services/drawingPreviews';
import { 
  getCurrentUserColor, 
  generateDisplayNameFromEmail,
  throttle
} from '../utils/helpers';

/**
 * Custom hook for managing collaborative drawing previews
 * @returns {object} - Drawing preview data and management functions
 */
export const useDrawingPreviews = () => {
  const { currentUser } = useAuth();
  const [otherUsersPreviews, setOtherUsersPreviews] = useState({});
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
  
  // Throttled preview update function to avoid spam
  const throttledUpdatePreview = useCallback(
    throttle((previewData) => {
      const displayName = getUserDisplayName();
      const color = getUserColor();
      
      updateDrawingPreview(previewData, displayName, color);
    }, 50), // 20 FPS (1000ms / 20 = 50ms) - faster than cursor updates for smooth drawing
    [getUserDisplayName, getUserColor]
  );
  
  /**
   * Update the current user's drawing preview
   * @param {object} previewData - {startX, startY, currentX, currentY}
   */
  const updatePreview = useCallback((previewData) => {
    if (!isActive || !previewData) return;
    
    throttledUpdatePreview(previewData);
  }, [isActive, throttledUpdatePreview]);
  
  /**
   * Remove the current user's drawing preview
   */
  const clearPreview = useCallback(async () => {
    if (isActive) {
      await removeDrawingPreview();
    }
  }, [isActive]);
  
  // Subscribe to other users' drawing previews
  useEffect(() => {
    const unsubscribe = subscribeToDrawingPreviews((previewData) => {
      setOtherUsersPreviews(previewData);
    });
    
    unsubscribeRef.current = unsubscribe;
    
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);
  
  // Set up preview cleanup and initial setup
  useEffect(() => {
    const prevUser = prevUserRef.current;
    
    if (currentUser) {
      const displayName = getUserDisplayName();
      const color = getUserColor();
      
      setupDrawingPreviewCleanup(displayName, color)
        .then(() => {
          setIsActive(true);
        })
        .catch((error) => {
          console.error('❌ [DRAWING-PREVIEWS-HOOK] Failed to setup preview cleanup:', error);
          setIsActive(false);
        });
    } else {
      if (prevUser) {
        removeDrawingPreview(prevUser.uid);
      }
      setIsActive(false);
    }
    
    prevUserRef.current = currentUser;
  }, [currentUser, getUserDisplayName, getUserColor]);
  
  // Cleanup effect for unmounting
  useEffect(() => {
    return () => {
      // Firebase onDisconnect will handle cleanup
    };
  }, []);
  
  return {
    otherUsersPreviews,
    isActive,
    updatePreview,
    clearPreview
  };
};
