import { Rect } from 'react-konva';
import { useRef, useEffect, useMemo } from 'react';
import { useCanvas } from '../../hooks/useCanvas';
import { useCanvasMode } from '../../contexts/CanvasModeContext';

const Shape = ({ 
  id, 
  x, 
  y, 
  width, 
  height, 
  fill, 
  isSelected, 
  isLocked, 
  lockedBy,
  // 🚀 PERFORMANCE: Viewport culling optimization hints
  _isViewportCulled,
  _totalShapes,
  // 🚀 PERFORMANCE: Event delegation functions
  registerShapeHandlers,
  unregisterShapeHandlers,
  // 🚀 COLLABORATIVE: Firebase-based drag preview functions
  updateDragPreview,
  clearDragPreview
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
    shapes, // Get live shapes array to check current state
    shapesMap // 🚀 PERFORMANCE: Get optimized shapes map for O(1) lookup
  } = useCanvas();

  const { currentMode, CANVAS_MODES } = useCanvasMode();
  // 🚀 PERFORMANCE: Removed useDragPreviews - no more real-time drag updates

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
  
  // 🚀 PERFORMANCE: Throttle drag preview updates
  const lastPreviewUpdate = useRef(0);

  // Handle shape click for selection
  const handleClick = (e) => {
    // Only allow selection in move mode
    if (currentMode !== CANVAS_MODES.MOVE) {
      return;
    }
    
    // Stop event from bubbling to stage
    e.cancelBubble = true;
    
    // Don't select if locked by another user (use pre-computed value)
    if (shapeStateFlags.isLockedByOther) {
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
    // 🚀 CRITICAL: Prevent event bubbling to avoid canvas panning conflicts
    e.cancelBubble = true;
    if (e.evt) {
      e.evt.stopPropagation();
    }
    
    // Only allow dragging in move mode
    if (currentMode !== CANVAS_MODES.MOVE) {
      e.target.stopDrag();
      return;
    }
    
    // Check if shape is already locked by another user (use pre-computed value)
    if (shapeStateFlags.isLockedByOther) {
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
    
    // 🚀 COLLABORATIVE: Start broadcasting drag preview to other users
    if (updateDragPreview && getCurrentUserId()) {
      console.log('📡 [COLLAB] Starting drag preview broadcast for shape:', id);
      
      // Send initial drag start position to other users
      updateDragPreview(id, {
        userId: getCurrentUserId(),
        x: shape.x(),
        y: shape.y(),
        width,
        height,
        fill,
        isDragging: true
      });
    }
    
  };

  // Handle shape drag move with boundary constraints
  const handleDragMove = (e) => {
    const shape = e.target;
    const newPos = shape.position();
    
    // Lock the shape on first move (after drag is confirmed to be working)
    // Only lock if: 1) shape is unlocked, 2) we haven't attempted to lock yet, 3) not already locked by current user, 4) not pending unlock
    if (!liveShape.isLocked && !lockAttemptedRef.current && !shapeStateFlags.isLockedByCurrentUser && !pendingUnlockRef.current) {
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
    
    // 🚀 PERFORMANCE: ZERO RE-RENDERS during drag
    // Store final position in ref for drag end sync - NO React state updates
    originalPositionRef.current = { x: constrainedPos.x, y: constrainedPos.y };
    
    // 🚀 COLLABORATIVE: Broadcast drag updates to other users (throttled)
    // Throttle to ~20fps for collaborative previews
    const now = Date.now();
    if (!lastPreviewUpdate.current || now - lastPreviewUpdate.current > 50) {
      if (updateDragPreview && getCurrentUserId()) {
        console.log('📡 [COLLAB] Broadcasting drag position:', constrainedPos.x, constrainedPos.y);
        
        // Send position update to other users via Firebase
        updateDragPreview(id, {
          userId: getCurrentUserId(),
          x: constrainedPos.x,
          y: constrainedPos.y,
          width,
          height,
          fill,
          isDragging: true
        });
      }
      lastPreviewUpdate.current = now;
    }
  };

  // Handle shape drag end - ALL Firebase operations here
  const handleDragEnd = (e) => {
    const shape = e.target;
    const finalPos = shape.position();
    
    console.log('🔄 [DRAG] Drag ending for shape:', id, 'at position:', finalPos);
    
    // 🚀 CRITICAL: Prevent event bubbling to avoid canvas panning conflicts
    e.cancelBubble = true;
    if (e.evt) {
      e.evt.stopPropagation();
      e.evt.preventDefault();
    }
    
    // 🚀 CRITICAL: Clear dragging state FIRST
    isDraggingRef.current = false;
    dragCompletedRef.current = true;
    
    // Set pending unlock state to prevent race conditions
    pendingUnlockRef.current = true;
    
    // Cancel any pending lock operations
    if (lockCancelTokenRef.current) {
      lockCancelTokenRef.current.cancelled = true;
    }
    
    // Ensure final position is within bounds
    const constrainedPos = constrainToBounds(
      finalPos.x, 
      finalPos.y, 
      width, 
      height
    );
    
    // Ensure shape is positioned correctly immediately
    shape.position(constrainedPos);
    
    // 🚀 COLLABORATIVE: End drag preview broadcast to other users
    if (clearDragPreview && getCurrentUserId()) {
      console.log('📡 [COLLAB] Clearing drag preview for shape:', id);
      
      // Clear drag preview for other users
      clearDragPreview(id);
    }
    
    // 🚀 PERFORMANCE: No more clearPreview() call - we removed drag previews
    
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

  // 🚀 PERFORMANCE: Get live shape state using O(1) Map lookup instead of O(n) array.find
  const liveShape = useMemo(() => {
    return shapesMap.get(id) || { id, isLocked, lockedBy }; // Fallback to props if not found
  }, [shapesMap, id, isLocked, lockedBy]);

  // 🚀 PERFORMANCE: Pre-compute expensive values with stable references
  const shapeStateFlags = useMemo(() => {
    const isLockedByCurrentUser = isShapeLockedByCurrentUser(liveShape);
    const isLockedByOther = isShapeLockedByOther(liveShape);
    
    return {
      isLockedByCurrentUser,
      isLockedByOther,
      shouldShowStroke: isSelected || isLockedByOther,
      shouldShowOpacity: isLockedByOther,
      canDrag: currentMode === CANVAS_MODES.MOVE && !isLockedByOther,
      cursorType: isLockedByOther ? 'not-allowed' : 'pointer'
    };
  }, [liveShape, isSelected, currentMode, CANVAS_MODES.MOVE, isShapeLockedByCurrentUser, isShapeLockedByOther]);

  // 🚀 PERFORMANCE: Stable visual styling with minimal dependencies  
  const visualStyles = useMemo(() => {
    const isPendingUnlock = pendingUnlockRef.current;
    
    return {
      stroke: isPendingUnlock 
        ? (isSelected ? '#3b82f6' : 'transparent')
        : shapeStateFlags.isLockedByOther 
          ? '#ef4444' 
          : isSelected ? '#3b82f6' : 'transparent',
      
      strokeWidth: isPendingUnlock 
        ? (isSelected ? 2 : 0)
        : (shapeStateFlags.shouldShowStroke ? 2 : 0),
      
      opacity: isPendingUnlock 
        ? 1.0 
        : (shapeStateFlags.shouldShowOpacity ? 0.6 : 1.0),
      
      draggable: isPendingUnlock 
        ? (currentMode === CANVAS_MODES.MOVE)
        : shapeStateFlags.canDrag,
      
      cursorStyle: isPendingUnlock 
        ? 'pointer' 
        : shapeStateFlags.cursorType
    };
  }, [shapeStateFlags, isSelected, currentMode, CANVAS_MODES.MOVE]);

  // 🚀 PERFORMANCE: Konva optimizations based on context
  const konvaOptimizations = useMemo(() => {
    const manyShapes = _totalShapes > 100;
    const isViewportCulled = _isViewportCulled;
    
    return {
      // Disable expensive features when there are many shapes
      perfectDrawEnabled: false,
      shadowEnabled: !manyShapes, // Disable shadows when many shapes for performance
      shadowForStrokeEnabled: false, // Always disable expensive shadow for stroke
      
      // Optimize hit detection
      hitStrokeWidth: isSelected ? undefined : 0, // Only enable hit on stroke for selected shapes
      
      // Optimize listening based on interaction state  
      listening: !isViewportCulled || isSelected || visualStyles.draggable, // Reduce listeners when culled
      
      // Optimize transforms
      transformsEnabled: 'all' // Keep all transforms enabled for dragging
    };
  }, [_totalShapes, _isViewportCulled, isSelected, visualStyles.draggable]);

  // 🚀 PERFORMANCE: Optimized cleanup effect - minimal dependencies
  useEffect(() => {
    // Update original position when not dragging (avoid during drag operations)
    if (!isDraggingRef.current) {
      originalPositionRef.current = { x, y };
    }
    
    // 🚀 PERFORMANCE: Register click handlers only - drag handlers stay on Rect
    if (registerShapeHandlers) {
      const handlers = {
        onMouseDown: handleClick
        // onDragStart, onDragMove, onDragEnd removed - handled directly by Rect
      };
      registerShapeHandlers(id, handlers);
    }
    
    // Cleanup function for component unmount during drag
    return () => {
      // 🚀 PERFORMANCE: Unregister event handlers
      if (unregisterShapeHandlers) {
        unregisterShapeHandlers(id);
      }
      
      // If component unmounts during drag, unlock the shape
      if (isDraggingRef.current && isLocked && lockedBy) {
        const currentUserId = getCurrentUserId();
        if (lockedBy === currentUserId) {
          console.log('🔄 [LOCKING] Component unmount during drag, unlocking:', id);
          unlockShape(id).catch(error => {
            console.error('Failed to unlock on unmount:', error);
          });
        }
      }
    };
  }, [id, x, y, isLocked, lockedBy, registerShapeHandlers, unregisterShapeHandlers, handleClick]);

  return (
    <Rect
      x={x}
      y={y}
      width={width}
      height={height}
      fill={fill}
      stroke={visualStyles.stroke}
      strokeWidth={visualStyles.strokeWidth}
      opacity={visualStyles.opacity}
      draggable={visualStyles.draggable}
      // 🚀 PERFORMANCE: Add shape ID for event delegation
      shapeId={id}
      // 🚀 PERFORMANCE: Keep drag handlers on Rect - Konva needs them for proper drag lifecycle
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      // 🚀 PERFORMANCE: Use event delegation for click events only
      onClick={registerShapeHandlers ? undefined : handleClick}
      onTap={registerShapeHandlers ? undefined : handleClick}
      // 🚀 PERFORMANCE: Apply Konva optimizations
      {...konvaOptimizations}
    />
  );
};

export default Shape;