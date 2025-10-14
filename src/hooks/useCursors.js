// useCursors Hook - Track and manage multiplayer cursors
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from './useAuth';
import { 
  updateCursorPosition, 
  subscribeToCursors, 
  setupCursorCleanup, 
  removeCursor 
} from '../services/cursors';
import { 
  generateUserColor, 
  getCurrentUserColor, 
  generateDisplayNameFromEmail,
  throttle,
  screenToCanvasCoordinates,
  isSignificantMove
} from '../utils/helpers';

/**
 * Custom hook for managing multiplayer cursors
 * @param {object} stageRef - Konva stage reference for coordinate conversion
 * @param {boolean} isDrawing - Whether user is currently drawing (to pause cursor updates)
 * @returns {object} - Cursor data and management functions
 */
export const useCursors = (stageRef, isDrawing = false) => {
  const { currentUser } = useAuth();
  const [cursors, setCursors] = useState({});
  const [isActive, setIsActive] = useState(false);
  
  // Track last cursor position for delta checking
  const lastPositionRef = useRef({ x: 0, y: 0 });
  const unsubscribeRef = useRef(null);
  const prevUserRef = useRef(currentUser); // Track previous user state
  
  // Get user info for cursor display
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
  
  // Throttled cursor position update function
  const throttledUpdateCursor = useCallback(
    throttle((x, y) => {
      const displayName = getUserDisplayName();
      const color = getUserColor();
      
      updateCursorPosition(x, y, displayName, color);
    }, 33), // ~30 FPS (1000ms / 30 = 33ms)
    [getUserDisplayName, getUserColor]
  );
  
  // Handle mouse move events
  const handleMouseMove = useCallback((event) => {
    // Don't update cursor position while drawing
    if (!stageRef?.current || !isActive || isDrawing) return;
    
    try {
      const stage = stageRef.current;
      const pointerPosition = stage.getPointerPosition();
      
      if (!pointerPosition) return;
      
      // Convert to canvas coordinates
      const canvasCoords = screenToCanvasCoordinates(
        pointerPosition.x, 
        pointerPosition.y, 
        stage
      );
      
      // Check if movement is significant enough to update
      if (isSignificantMove(lastPositionRef.current, canvasCoords, 2)) {
        lastPositionRef.current = canvasCoords;
        throttledUpdateCursor(canvasCoords.x, canvasCoords.y);
      }
    } catch (error) {
      console.error('❌ [CURSORS-HOOK] Error handling mouse move:', error);
    }
  }, [stageRef, isActive, isDrawing, throttledUpdateCursor, getUserDisplayName, getUserColor]);
  
  // Handle drawing state changes
  useEffect(() => {
    if (isDrawing) {
      // Hide cursor when starting to draw
      const displayName = getUserDisplayName();
      const color = getUserColor();
      updateCursorPosition(-1, -1, displayName, color); // Hide cursor
    }
    // Note: Don't resume cursor updates here - let natural mouse movement handle it
  }, [isDrawing, getUserDisplayName, getUserColor]);
  
  // Handle mouse leave (hide cursor position but keep presence)
  const handleMouseLeave = useCallback(() => {
    if (isActive) {
      // Only hide cursor position, don't remove entire user presence
      const displayName = getUserDisplayName();
      const color = getUserColor();
      
      // Update with null cursor position to hide cursor, but keep presence data
      updateCursorPosition(-1, -1, displayName, color); // Use -1,-1 to indicate "hidden"
    }
  }, [isActive, getUserDisplayName, getUserColor]);
  
  // Subscribe to other users' cursors
  useEffect(() => {
    const unsubscribe = subscribeToCursors((cursorData) => {
      setCursors(cursorData);
    });
    
    unsubscribeRef.current = unsubscribe;
    
    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);
  
  // Set up cursor cleanup and initial presence
  useEffect(() => {
    const prevUser = prevUserRef.current;
    
    if (currentUser) {
      const displayName = getUserDisplayName();
      const color = getUserColor();
      
      setupCursorCleanup(displayName, color)
        .then(() => {
          setIsActive(true);
        })
        .catch((error) => {
          console.error('❌ [CURSORS-HOOK] Failed to setup cursor:', error);
        });
    } else {
      if (prevUser && isActive) {
        removeCursor(prevUser.uid);
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
  
  // Add/remove mouse event listeners
  useEffect(() => {
    if (!stageRef?.current || !isActive) return;
    
    const stage = stageRef.current;
    const stageContainer = stage.container();
    
    if (stageContainer) {
      stageContainer.addEventListener('mousemove', handleMouseMove);
      stageContainer.addEventListener('mouseleave', handleMouseLeave);
      
      return () => {
        stageContainer.removeEventListener('mousemove', handleMouseMove);
        stageContainer.removeEventListener('mouseleave', handleMouseLeave);
      };
    }
  }, [stageRef, isActive, handleMouseMove, handleMouseLeave]);
  
  // Process cursor data for rendering
  const processedCursors = Object.keys(cursors).map(userId => {
    const cursor = cursors[userId];
    return {
      id: userId,
      x: cursor.cursorX,
      y: cursor.cursorY,
      displayName: cursor.displayName,
      color: cursor.cursorColor || generateUserColor(userId),
      lastSeen: cursor.lastSeen
    };
  });
  
  return {
    cursors,  // Return raw cursors object for Canvas.jsx (Object.entries)
    isActive,
    currentUserColor: getUserColor(),
    currentUserDisplayName: getUserDisplayName()
  };
};
