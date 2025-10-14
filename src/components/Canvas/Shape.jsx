import { Rect } from 'react-konva';
import { useRef, useEffect, useMemo } from 'react';
import { useCanvas } from '../../hooks/useCanvas';
import { useCanvasMode } from '../../contexts/CanvasModeContext';
import { useDragPreviews } from '../../hooks/useDragPreviews';

const Shape = ({ 
  id, 
  x, 
  y, 
  width, 
  height, 
  fill, 
  isSelected, 
  isLocked, 
  lockedBy 
}) => {
  const { 
    selectShape, 
    updateShape, 
    constrainToBounds,
    lockShape,
    unlockShape,
    emergencyUnlock,
    clearLockTimeout,
    resetLockTimeout,
    isShapeLockedByCurrentUser,
    isShapeLockedByOther,
    getCurrentUserId,
    shapes // Get live shapes array to check current state
  } = useCanvas();

  const { currentMode, CANVAS_MODES } = useCanvasMode();
  const { updatePreview, clearPreview, isActive: isDragPreviewActive } = useDragPreviews();

  // Track if we've already locked this shape during current drag session
  const lockAttemptedRef = useRef(false);
  const lockPromiseRef = useRef(null); // Track the lock promise
  const dragCompletedRef = useRef(false); // Track if drag has completed to prevent timeout re-locking
  
  // Track if shape is currently being dragged (including drag and hold)
  const isDraggingRef = useRef(false);
  
  // Race condition prevention: cancellation token and pending unlock state
  const lockCancelTokenRef = useRef(null);
  const pendingUnlockRef = useRef(false);
  
  // Store original position for potential revert on page unload
  const originalPositionRef = useRef({ x, y });

  // Cleanup effect for component unmount during drag
  useEffect(() => {
    return () => {
      // If component unmounts during drag, unlock the shape
      if (isDraggingRef.current && isLocked && lockedBy === getCurrentUserId()) {
        console.log('🔄 [LOCKING] Component unmount during drag, unlocking:', id);
        unlockShape(id).catch(error => {
          console.error('Failed to unlock on unmount:', error);
        });
      }
    };
  }, [id, isLocked, lockedBy, getCurrentUserId, unlockShape]);

  // Update original position when shape position changes (not during drag)
  useEffect(() => {
    if (!isDraggingRef.current) {
      originalPositionRef.current = { x, y };
    }
  }, [x, y]);

  // Handle shape click for selection
  const handleClick = (e) => {
    // Only allow selection in move mode
    if (currentMode !== CANVAS_MODES.MOVE) {
      return;
    }
    
    // Stop event from bubbling to stage
    e.cancelBubble = true;
    
    // Don't select if locked by another user (use live state)
    if (isShapeLockedByOther(liveShape)) {
      return;
    }
    
    // Select the shape
    selectShape(id);
    
    // Lock the shape temporarily for selection (5 minutes - same as drag)
    lockShape(id, 300000).catch(() => {
      // Silent error
    });
  };

  // Handle shape drag start
  const handleDragStart = (e) => {
    // Only allow dragging in move mode
    if (currentMode !== CANVAS_MODES.MOVE) {
      e.target.stopDrag();
      return;
    }
    
    // Check if shape is already locked by another user (use live state)
    if (liveShape.isLocked && liveShape.lockedBy && liveShape.lockedBy !== getCurrentUserId()) {
      e.target.stopDrag();
      return;
    }
    
    // Select the shape
    selectShape(id);
    
    // Reset lock attempt flag for new drag session
    lockAttemptedRef.current = false;
    lockPromiseRef.current = null; // Clear any previous lock promise
    dragCompletedRef.current = false; // Reset drag completion flag
    
    // Reset race condition prevention states
    lockCancelTokenRef.current = null;
    pendingUnlockRef.current = false;
    
    // Mark as actively dragging (including drag and hold)
    isDraggingRef.current = true;
    
    // Store original position for potential revert
    originalPositionRef.current = { x, y };
    
    // Clear any existing timeouts (from click or previous operations) to prevent conflicts
    clearLockTimeout(id);
    
  };

  // Handle shape drag move with boundary constraints
  const handleDragMove = (e) => {
    const shape = e.target;
    const newPos = shape.position();
    
    // Lock the shape on first move (after drag is confirmed to be working)
    // Only lock if: 1) shape is unlocked, 2) we haven't attempted to lock yet, 3) not already locked by current user, 4) not pending unlock
    if (!liveShape.isLocked && !lockAttemptedRef.current && !isShapeLockedByCurrentUser(liveShape) && !pendingUnlockRef.current) {
      lockAttemptedRef.current = true; // Prevent multiple lock attempts
      
      // Create cancellation token for this lock operation
      const cancelToken = { cancelled: false };
      lockCancelTokenRef.current = cancelToken;
      
      // Pass a callback to check if still dragging AND drag hasn't completed AND not cancelled
      const isDraggingCallback = () => isDraggingRef.current && !dragCompletedRef.current && !cancelToken.cancelled;
      const originalPos = originalPositionRef.current;
      
      // Use a very long timeout for drag operations - we'll unlock manually before it fires
      const lockPromise = lockShape(id, 300000, isDraggingCallback, originalPos, cancelToken); // 5 minutes
      lockPromiseRef.current = lockPromise; // Store the promise
      
      lockPromise.then(() => {
        // Silent success
      }).catch(() => {
        lockAttemptedRef.current = false; // Reset flag on failure so we can try again
      });
    } else if (liveShape.isLocked && liveShape.lockedBy && liveShape.lockedBy !== getCurrentUserId()) {
      // This shouldn't happen due to handleDragStart check, but handle silently
    }
    
    // Constrain shape to canvas boundaries
    const constrainedPos = constrainToBounds(
      newPos.x, 
      newPos.y, 
      width, 
      height
    );
    
    // Update position if it was constrained
    if (constrainedPos.x !== newPos.x || constrainedPos.y !== newPos.y) {
      shape.position(constrainedPos);
    }
    
    // Update collaborative drag preview for other users to see
    if (isDragPreviewActive) {
      updatePreview(id, {
        x: constrainedPos.x,
        y: constrainedPos.y,
        width,
        height,
        fill
      });
    }
  };

  // Handle shape drag end - ALL Firebase operations here
  const handleDragEnd = (e) => {
    const shape = e.target;
    const finalPos = shape.position();
    
    // Mark drag as completed to prevent timeout from re-locking
    dragCompletedRef.current = true;
    
    // Set pending unlock state to prevent race conditions
    pendingUnlockRef.current = true;
    
    // Cancel any pending lock operations
    if (lockCancelTokenRef.current) {
      lockCancelTokenRef.current.cancelled = true;
    }
    
    // Clear dragging state
    isDraggingRef.current = false;
    
    // Ensure final position is within bounds
    const constrainedPos = constrainToBounds(
      finalPos.x, 
      finalPos.y, 
      width, 
      height
    );
    
    // Ensure shape is positioned correctly immediately
    shape.position(constrainedPos);
    
    // Clear collaborative drag preview when drag ends
    clearPreview();
    
    // Update position and unlock shape (drag is complete)
    Promise.resolve().then(async () => {
      try {
        // Wait for any pending lock operation to complete first
        if (lockPromiseRef.current) {
          try {
            await lockPromiseRef.current;
          } catch (lockError) {
            // Silent lock error
          }
          lockPromiseRef.current = null;
        }
        
        // Update position
        await updateShape(id, {
          x: constrainedPos.x,
          y: constrainedPos.y
        });
        
        // Clear any pending timeout to prevent race condition
        clearLockTimeout(id);
        
        // Unlock the shape immediately after drag ends
        await unlockShape(id);
        
        // NEW: Clear drag preview immediately after unlock to prevent persistence
        if (isDragPreviewActive) {
          clearPreview();
        }
        
        // Clear pending unlock state after successful unlock
        pendingUnlockRef.current = false;
      } catch (error) {
        // On error, unlock immediately to prevent permanent locks
        try {
          await unlockShape(id);
          
          // NEW: Clear drag preview on error to prevent persistence  
          if (isDragPreviewActive) {
            clearPreview();
          }
          
          // Clear pending unlock state after error unlock
          pendingUnlockRef.current = false;
        } catch (unlockError) {
          // Clear pending unlock state even if unlock fails
          pendingUnlockRef.current = false;
        }
      }
    });
  };

  // Get live shape state from Firebase (reactive to shapes array changes)
  const liveShape = useMemo(() => {
    const foundShape = shapes.find(s => s.id === id);
    return foundShape || { id, isLocked, lockedBy }; // Fallback to props if not found
  }, [shapes, id, isLocked, lockedBy]);

  // Visual styling based on live state with immediate feedback for pending operations (reactive)
  const stroke = useMemo(() => {
    // Use pending unlock state for immediate visual feedback
    if (pendingUnlockRef.current) {
      return isSelected ? '#3b82f6' : 'transparent'; // Show as unlocked immediately
    }
    
    const isVisuallyLocked = isShapeLockedByOther(liveShape);
    
    if (isVisuallyLocked) {
      return '#ef4444'; // Red border for locked by others
    }
    if (isSelected) {
      return '#3b82f6'; // Blue border for selected
    }
    return 'transparent';
  }, [liveShape, pendingUnlockRef.current, isSelected, isShapeLockedByOther]);

  const strokeWidth = useMemo(() => {
    // Use pending unlock state for immediate visual feedback
    if (pendingUnlockRef.current) {
      return isSelected ? 2 : 0; // Show as unlocked immediately
    }
    
    return (isSelected || isShapeLockedByOther(liveShape)) ? 2 : 0;
  }, [liveShape, pendingUnlockRef.current, isSelected, isShapeLockedByOther]);

  const opacity = useMemo(() => {
    // Use local pending unlock state to provide immediate visual feedback
    if (pendingUnlockRef.current) {
      return 1.0; // Show as unlocked immediately when unlock is pending
    }
    
    return isShapeLockedByOther(liveShape) ? 0.6 : 1.0;
  }, [liveShape, pendingUnlockRef.current, isShapeLockedByOther]);

  const draggable = useMemo(() => {
    // Use local pending unlock state to allow immediate dragging
    if (pendingUnlockRef.current) {
      return currentMode === CANVAS_MODES.MOVE; // Allow dragging immediately when unlock is pending
    }
    
    return currentMode === CANVAS_MODES.MOVE && !isShapeLockedByOther(liveShape);
  }, [liveShape, pendingUnlockRef.current, currentMode, CANVAS_MODES.MOVE, isShapeLockedByOther]);

  const cursorStyle = useMemo(() => {
    // Use live state and pending unlock for cursor feedback
    if (pendingUnlockRef.current) {
      return 'pointer'; // Show as draggable immediately
    }
    
    return isShapeLockedByOther(liveShape) ? 'not-allowed' : 'pointer';
  }, [liveShape, pendingUnlockRef.current, isShapeLockedByOther]);

  return (
    <Rect
      x={x}
      y={y}
      width={width}
      height={height}
      fill={fill}
      stroke={stroke}
      strokeWidth={strokeWidth}
      opacity={opacity}
      draggable={draggable}
      onClick={handleClick}
      onTap={handleClick} // For mobile
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      // Visual feedback on hover
      onMouseEnter={(e) => {
        const container = e.target.getStage().container();
        if (currentMode === CANVAS_MODES.MOVE) {
          container.style.cursor = cursorStyle;
        }
      }}
      onMouseLeave={(e) => {
        const container = e.target.getStage().container();
        container.style.cursor = 'default';
      }}
    />
  );
};

export default Shape;