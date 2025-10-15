import { Rect, Circle, Line, Text } from 'react-konva';
import { useRef, useEffect, useMemo } from 'react';
import { useCanvas } from '../../hooks/useCanvas';
import { useCanvasMode } from '../../contexts/CanvasModeContext';

const Shape = ({ 
  id,
  type = 'rectangle', // Default to rectangle for backward compatibility
  x, 
  y, 
  width, 
  height, 
  fill,
  opacity = 1.0, // Default to full opacity if not provided
  points, // For lines: [x1, y1, x2, y2]
  stroke, // For lines and borders
  strokeWidth, // For lines and borders
  text, // For text shapes
  fontSize, // For text shapes
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
      const shapePos = shapeNode.position();
      
      // Convert to bounding box coordinates for consistent broadcasting
      let boundingBoxX, boundingBoxY;
      if (type === 'circle') {
        // Circle position is center, convert to bounding box top-left
        boundingBoxX = shapePos.x - width / 2;
        boundingBoxY = shapePos.y - height / 2;
      } else if (type === 'line' || type === 'pen') {
        // Lines/pen are positioned at (0, 0), use stored bounding box
        boundingBoxX = x;
        boundingBoxY = y;
      } else {
        // Rectangle position is already top-left
        boundingBoxX = shapePos.x;
        boundingBoxY = shapePos.y;
      }
      
      // Send initial drag start position to other users
      const previewData = {
        userId: getCurrentUserId(),
        type, // Include type so preview renders correctly
        x: boundingBoxX,
        y: boundingBoxY,
        width,
        height,
        fill,
        isDragging: true
      };
      
      // For lines/pen, include the points array (no translation needed at drag start)
      if ((type === 'line' || type === 'pen') && points) {
        previewData.points = points;
      }
      
      updateDragPreview(id, previewData);
    }
  };

  // Handle shape drag move with boundary constraints
  const handleDragMove = (e) => {
    const shape = e.target;
    const newPos = shape.position();
    
    // For lines/pen, newPos is the drag offset from (0, 0)
    // For circles, newPos is the center. For rectangles, it's top-left.
    // Convert to bounding box coordinates for boundary checking
    let boundingBoxX, boundingBoxY;
    if (type === 'line' || type === 'pen') {
      // Lines/pen: their position changed from (0, 0), so add offset to original bounding box
      boundingBoxX = x + newPos.x;
      boundingBoxY = y + newPos.y;
    } else if (type === 'circle') {
      // Circle position is center, convert to bounding box top-left
      boundingBoxX = newPos.x - width / 2;
      boundingBoxY = newPos.y - height / 2;
    } else {
      // Rectangle position is already top-left
      boundingBoxX = newPos.x;
      boundingBoxY = newPos.y;
    }
    
    // Constrain shape to canvas boundaries using bounding box
    const constrainedBoundingBox = constrainToBounds(
      boundingBoxX, 
      boundingBoxY, 
      width, 
      height
    );
    
    // Convert back to shape-specific coordinates for Konva
    let constrainedPos;
    if (type === 'line' || type === 'pen') {
      // For lines/pen, calculate the constrained offset from original position
      constrainedPos = {
        x: constrainedBoundingBox.x - x,
        y: constrainedBoundingBox.y - y
      };
    } else if (type === 'circle') {
      // Convert bounding box back to center for circle
      constrainedPos = {
        x: constrainedBoundingBox.x + width / 2,
        y: constrainedBoundingBox.y + height / 2
      };
    } else {
      constrainedPos = constrainedBoundingBox;
    }
    
    // Update position if it was constrained
    if (constrainedPos.x !== newPos.x || constrainedPos.y !== newPos.y) {
      shape.position(constrainedPos);
    }
    
    // 🚀 PERFORMANCE: ZERO RE-RENDERS during drag
    // Store final bounding box position in ref for drag end sync
    originalPositionRef.current = { 
      x: constrainedBoundingBox.x, 
      y: constrainedBoundingBox.y 
    };
    
    // 🚀 COLLABORATIVE: Broadcast drag updates to other users (throttled)
    // Throttle to ~20fps for collaborative previews
    const now = Date.now();
    if (!lastPreviewUpdate.current || now - lastPreviewUpdate.current > 50) {
      if (updateDragPreview && getCurrentUserId()) {
        console.log('📡 [COLLAB] Broadcasting drag position (bounding box):', constrainedBoundingBox.x, constrainedBoundingBox.y);
        
        // Send bounding box position to other users via Firebase
        const previewData = {
          userId: getCurrentUserId(),
          type, // Include shape type for correct preview rendering
          x: constrainedBoundingBox.x,
          y: constrainedBoundingBox.y,
          width,
          height,
          fill,
          isDragging: true
        };
        
        // For lines/pen, translate points based on drag offset
        if ((type === 'line' || type === 'pen') && points) {
          const deltaX = constrainedBoundingBox.x - x;
          const deltaY = constrainedBoundingBox.y - y;
          const translatedPoints = points.map((coord, index) => {
            if (index % 2 === 0) {
              return coord + deltaX; // X coordinate
            } else {
              return coord + deltaY; // Y coordinate
            }
          });
          previewData.points = translatedPoints;
        }
        
        updateDragPreview(id, previewData);
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
    
    // Convert to bounding box coordinates for storage
    let boundingBoxX, boundingBoxY;
    if (type === 'line' || type === 'pen') {
      // Lines/pen: finalPos is offset from (0, 0), add to original bounding box
      boundingBoxX = x + finalPos.x;
      boundingBoxY = y + finalPos.y;
    } else if (type === 'circle') {
      // Circle position is center, convert to bounding box top-left
      boundingBoxX = finalPos.x - width / 2;
      boundingBoxY = finalPos.y - height / 2;
    } else {
      // Rectangle position is already top-left
      boundingBoxX = finalPos.x;
      boundingBoxY = finalPos.y;
    }
    
    // Ensure final bounding box position is within bounds
    const constrainedBoundingBox = constrainToBounds(
      boundingBoxX, 
      boundingBoxY, 
      width, 
      height
    );
    
    // For non-line/pen shapes, update position immediately for smooth UX
    if (type !== 'line' && type !== 'pen') {
      // Convert back to shape-specific coordinates for Konva display
      let constrainedPos;
      if (type === 'circle') {
        constrainedPos = {
          x: constrainedBoundingBox.x + width / 2,
          y: constrainedBoundingBox.y + height / 2
        };
      } else {
        constrainedPos = constrainedBoundingBox;
      }
      
      // Ensure shape is positioned correctly immediately
      shape.position(constrainedPos);
    } else if ((type === 'line' || type === 'pen') && points) {
      // For lines/pen, optimistically update points AND reset position to prevent blink
      const deltaX = constrainedBoundingBox.x - x;
      const deltaY = constrainedBoundingBox.y - y;
      
      const translatedPoints = points.map((coord, index) => {
        if (index % 2 === 0) {
          return coord + deltaX; // X coordinate
        } else {
          return coord + deltaY; // Y coordinate
        }
      });
      
      // Apply translated points immediately to Konva shape
      shape.points(translatedPoints);
      // Reset position to (0, 0)
      shape.position({ x: 0, y: 0 });
    }
    
    // 🚀 COLLABORATIVE: End drag preview broadcast to other users
    if (clearDragPreview && getCurrentUserId()) {
      console.log('📡 [COLLAB] Clearing drag preview for shape:', id);
      
      // Clear drag preview immediately - Firestore latency (~500ms) is acceptable
      clearDragPreview(id);
    }
    
    // 🚀 PERFORMANCE: No more clearPreview() call - we removed drag previews
    
    // Update position (keep lock since shape is still selected)
    Promise.resolve().then(async () => {
      try {
        // Calculate position offset for updating points arrays
        const deltaX = constrainedBoundingBox.x - x;
        const deltaY = constrainedBoundingBox.y - y;
        
        // For lines and pen strokes, update the points array as well
        const updates = {
          x: constrainedBoundingBox.x,
          y: constrainedBoundingBox.y
        };
        
        if ((type === 'line' || type === 'pen') && points && points.length >= 4) {
          // Translate all points by the offset
          const updatedPoints = points.map((coord, index) => {
            if (index % 2 === 0) {
              // X coordinate
              return coord + deltaX;
            } else {
              // Y coordinate
              return coord + deltaY;
            }
          });
          updates.points = updatedPoints;
          // Note: We already applied the optimistic update above (line 332-334)
          // so no need to reset position here
        }
        
        // Update position using bounding box coordinates (and points for lines/pen)
        await updateShape(id, updates);
        
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
    // Determine stroke color: Red for locked by other, Blue for selected (#0D99FF Figma-style)
    let strokeColor = 'transparent';
    if (shapeStateFlags.isLockedByOther) {
      strokeColor = '#ef4444'; // Red for locked by another user
    } else if (isSelected) {
      strokeColor = '#0D99FF'; // Figma-style blue for single selection
      // TODO: Use '#7B61FF' (purple) for multi-selection when implemented
    }
    
    // Calculate final opacity: opacity is the single source of truth from shape data
    let finalOpacity = opacity;
    if (shapeStateFlags.shouldShowOpacity) {
      // Locked by another user: 60% of base opacity
      finalOpacity = opacity * 0.6;
    }
    // Note: We no longer reduce opacity for unselected shapes. 
    // The stored opacity value is the single source of truth.
    
    return {
      stroke: strokeColor,
      strokeWidth: shapeStateFlags.shouldShowStroke ? 2 : 0,
      opacity: finalOpacity,
      draggable: shapeStateFlags.canDrag,
      cursorStyle: shapeStateFlags.cursorType
    };
  }, [shapeStateFlags, isSelected, currentMode, CANVAS_MODES.MOVE, opacity]);

  // 🚀 PERFORMANCE: Konva optimizations based on context
  const konvaOptimizations = useMemo(() => {
    const manyShapes = _totalShapes > 100;
    const isViewportCulled = _isViewportCulled;
    
    // For lines and pen strokes, we need a wider hit area since they don't have fill
    const needsWideHitArea = type === 'line' || type === 'pen';
    
    return {
      // Disable expensive features when there are many shapes
      perfectDrawEnabled: false,
      shadowEnabled: !manyShapes, // Disable shadows when many shapes for performance
      shadowForStrokeEnabled: false, // Always disable expensive shadow for stroke
      
      // Optimize hit detection - lines/pen need wider hit area for easier selection
      hitStrokeWidth: needsWideHitArea ? 20 : (isSelected ? undefined : 0),
      
      // Optimize listening based on interaction state  
      listening: !isViewportCulled || isSelected || visualStyles.draggable, // Reduce listeners when culled
      
      // Optimize transforms
      transformsEnabled: 'all' // Keep all transforms enabled for dragging
    };
  }, [_totalShapes, _isViewportCulled, isSelected, visualStyles.draggable, type]);

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

  // Common props for all shape types
  const commonProps = {
    fill,
    stroke: visualStyles.stroke,
    strokeWidth: visualStyles.strokeWidth,
    opacity: visualStyles.opacity,
    draggable: visualStyles.draggable,
    shapeId: id,
    onDragStart: handleDragStart,
    onDragMove: handleDragMove,
    onDragEnd: handleDragEnd,
    onClick: registerShapeHandlers ? undefined : handleClick,
    onTap: registerShapeHandlers ? undefined : handleClick,
    ...konvaOptimizations
  };

  // Render different shapes based on type
  if (type === 'circle') {
    // For circles, use the bounding box to calculate center and radius
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    const radius = Math.min(width, height) / 2;
    
    return (
      <Circle
        x={centerX}
        y={centerY}
        radius={radius}
        {...commonProps}
      />
    );
  }
  
  if (type === 'line' && points && points.length === 4) {
    // For lines, use points array (absolute coordinates) and position at (0, 0)
    // Note: We don't pass x, y from commonProps because points are already absolute
    const lineProps = {
      ...commonProps,
      x: 0, // Lines use absolute coordinates in points array
      y: 0,
      fill: undefined, // Lines don't have fill
      stroke: stroke || visualStyles.stroke || '#cccccc', // Same default as other shapes
      strokeWidth: strokeWidth || visualStyles.strokeWidth || 2
    };
    
    return (
      <Line
        points={points}
        {...lineProps}
      />
    );
  }
  
  if (type === 'pen' && points && points.length >= 4) {
    // For pen (freehand), use points array (absolute coordinates) and position at (0, 0)
    // Note: We don't pass x, y from commonProps because points are already absolute
    const penProps = {
      ...commonProps,
      x: 0, // Pen strokes use absolute coordinates in points array
      y: 0,
      fill: undefined, // Pen strokes don't have fill
      stroke: stroke || visualStyles.stroke || '#cccccc', // Same default as other shapes
      strokeWidth: strokeWidth || visualStyles.strokeWidth || 2,
      tension: 0.5, // Smooth the path
      lineCap: 'round',
      lineJoin: 'round'
    };
    
    return (
      <Line
        points={points}
        {...penProps}
      />
    );
  }
  
  if (type === 'text') {
    // For text shapes
    const textProps = {
      ...commonProps,
      text: text || 'Text',
      fontSize: fontSize || 24,
      fontFamily: 'Inter, system-ui, sans-serif',
      fill: fill || '#000000',
      width: width,
      wrap: 'word',
      align: 'left'
    };
    
    return (
      <Text
        x={x}
        y={y}
        {...textProps}
      />
    );
  }
  
  // Default to rectangle
  return (
    <Rect
      x={x}
      y={y}
      width={width}
      height={height}
      {...commonProps}
    />
  );
};

export default Shape;