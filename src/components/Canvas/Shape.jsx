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
  opacity = 1.0, // Default to full opacity if not provided
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
    clearLockTimeout,
    isShapeLockedByCurrentUser,
    isShapeLockedByOther,
    getCurrentUserId,
    shapes, // Get live shapes array to check current state
    shapesMap // 🚀 PERFORMANCE: Get optimized shapes map for O(1) lookup
  } = useCanvas();

  const { currentMode, CANVAS_MODES } = useCanvasMode();
  // 🚀 PERFORMANCE: Removed useDragPreviews - no more real-time drag updates

  // Track if shape is currently being dragged
  const isDraggingRef = useRef(false);
  
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
    
    // Select the shape (this will lock it if not already locked)
    selectShape(id);
    
    // Ensure shape is locked for dragging (in case drag started without click)
    if (!shapeStateFlags.isLockedByCurrentUser) {
      lockShape(id, 300000).catch(() => {
        // Silent error - will still allow drag
      });
    }
    
    // Mark as actively dragging
    isDraggingRef.current = true;
    
    // Store original position for potential revert
    originalPositionRef.current = { x, y };
    
    // 🚀 COLLABORATIVE: Start broadcasting drag preview to other users
    if (updateDragPreview && getCurrentUserId()) {
      console.log('📡 [COLLAB] Starting drag preview broadcast for shape:', id);
      
      // Get the Konva shape node
      const shapeNode = e.target;
      
      // Send initial drag start position to other users
      updateDragPreview(id, {
        userId: getCurrentUserId(),
        x: shapeNode.x(),
        y: shapeNode.y(),
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
    
    // Update position (keep lock since shape is still selected)
    Promise.resolve().then(async () => {
      try {
        // Update position
        await updateShape(id, {
          x: constrainedPos.x,
          y: constrainedPos.y
        });
        
        // Keep shape locked - it's still selected!
        // Lock will expire after 5 minutes or when shape is deselected
      } catch (error) {
        console.error('Failed to update shape position:', error);
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
    return {
      stroke: shapeStateFlags.isLockedByOther 
        ? '#ef4444' 
        : isSelected ? '#3b82f6' : 'transparent',
      
      strokeWidth: shapeStateFlags.shouldShowStroke ? 2 : 0,
      
      // Use the shape's actual opacity, but reduce it further if locked by another user
      opacity: shapeStateFlags.shouldShowOpacity ? opacity * 0.6 : opacity,
      
      draggable: shapeStateFlags.canDrag,
      
      cursorStyle: shapeStateFlags.cursorType
    };
  }, [shapeStateFlags, isSelected, currentMode, CANVAS_MODES.MOVE, opacity]);

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
      // Only unlock if actively dragging (use ref to avoid dependencies)
      if (isDraggingRef.current) {
        console.log('🔄 [LOCKING] Component unmount during drag, unlocking:', id);
        // Don't check lock state here - just attempt unlock if dragging
        // The unlock function will handle the validation
        unlockShape(id).catch(error => {
          // Silent error - component is unmounting anyway
        });
      }
    };
  }, [id, registerShapeHandlers, unregisterShapeHandlers, unlockShape]);

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