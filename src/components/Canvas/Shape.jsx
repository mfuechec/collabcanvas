import { Rect, Circle, Line, Text } from 'react-konva';
import { useRef, useEffect, useMemo, useState, useCallback } from 'react';
import { useCanvas } from '../../hooks/useCanvas';
import { useCanvasMode } from '../../contexts/CanvasModeContext';
import { 
  getActualDimensions,
  konvaPositionToBoundingBox,
  boundingBoxToKonvaPosition,
  getLineBounds,
  getPenBounds,
  translateLinePoints,
  translatePenPoints
} from '../../utils/shapes';

const Shape = ({ 
  id,
  type = 'rectangle', // Default to rectangle for backward compatibility
  x, 
  y, 
  width, 
  height, 
  fill,
  opacity = 1.0, // Default to full opacity if not provided
  rotation = 0, // Default rotation
  cornerRadius = 0, // Border radius for rectangles
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

  // 🐛 DEBUG: Log rectangle rendering (remove after debugging)
  useEffect(() => {
    if (type === 'rectangle') {
      console.log(`🖼️ [SHAPE] Rendering rectangle ${id.slice(-6)}:`, {
        storedTopLeft: { x, y },
        renderCenter: { x: x + width / 2, y: y + height / 2 },
        size: { width, height },
        rotation,
        cornerRadius
      });
    }
  }, [id, type, x, y, width, height, rotation, cornerRadius]);

  // Track if shape is currently being dragged
  const isDraggingRef = useRef(false);
  
  // Store original position for potential revert on page unload
  const originalPositionRef = useRef({ x, y });
  
  // 🚀 PERFORMANCE: Throttle drag preview updates
  const lastPreviewUpdate = useRef(0);

  // 🎯 TEXT CENTERPOINT: Track actual measured dimensions for text shapes
  // Text auto-sizes, so we measure after Konva renders to get accurate dimensions
  const [textDimensions, setTextDimensions] = useState(null);
  
  // Callback ref to measure text dimensions immediately after Konva creates the node
  const textRef = useCallback((node) => {
    if (node && type === 'text') {
      // Measure actual dimensions from Konva
      const actualWidth = node.width();
      const actualHeight = node.height();
      
      // Only update if dimensions changed (avoid infinite loops)
      setTextDimensions(prev => {
        if (!prev || prev.width !== actualWidth || prev.height !== actualHeight) {
          return { width: actualWidth, height: actualHeight };
        }
        return prev;
      });
      
      // Apply centerpoint offset immediately
      node.offsetX(actualWidth / 2);
      node.offsetY(actualHeight / 2);
      
      // Position at center (stored top-left + half dimensions)
      node.x(x + actualWidth / 2);
      node.y(y + actualHeight / 2);
    }
  }, [type, x, y]); // Re-measure if position changes
  
  // Re-measure text when content or fontSize changes
  useEffect(() => {
    if (type === 'text') {
      // Reset dimensions to trigger re-measurement
      setTextDimensions(null);
    }
  }, [type, text, fontSize]);

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
      
      // Get the Konva shape node
      const shapeNode = e.target;
      
      // Convert Konva position to bounding box using consolidated utility
      const shapeData = { type, width, height, points };
      const boundingBox = konvaPositionToBoundingBox(shapeNode.position(), shapeData, shapeNode);
      const boundingBoxX = boundingBox.x;
      const boundingBoxY = boundingBox.y;
      
      // Send initial drag start position to other users
      const previewData = {
        userId: getCurrentUserId(),
        type, // Include type so preview renders correctly
        x: boundingBoxX,
        y: boundingBoxY,
        isDragging: true
      };
      
      // Add shape-specific properties
      if (type === 'line' || type === 'pen') {
        // Lines use stroke, not fill, and have points instead of width/height
        if (points) previewData.points = points;
        if (stroke) previewData.stroke = stroke;
        if (strokeWidth) previewData.strokeWidth = strokeWidth;
      } else {
        // Other shapes use width/height and fill
        if (width) previewData.width = width;
        if (height) previewData.height = height;
        if (fill) previewData.fill = fill;
        // Include cornerRadius for rectangles
        if (type === 'rectangle' && cornerRadius) {
          previewData.cornerRadius = cornerRadius;
        }
        // Include text content and fontSize for text
        if (type === 'text') {
          if (text) previewData.text = text;
          if (fontSize) previewData.fontSize = fontSize;
        }
      }
      
      // Include rotation for accurate preview
      if (rotation) {
        previewData.rotation = rotation;
      }
      
      // 🐛 DEBUG: Log what we're sending for text
      if (type === 'text') {
        console.log('📤 [SHAPE] Sending text drag preview data (START):', {
          type,
          x: previewData.x,
          y: previewData.y,
          width: previewData.width,
          height: previewData.height,
          text: previewData.text,
          fontSize: previewData.fontSize,
          fill: previewData.fill,
          hasText: !!previewData.text,
          hasFontSize: !!previewData.fontSize,
          allData: previewData
        });
      }
      
      updateDragPreview(id, previewData);
    }
  };

  // Handle shape drag move with boundary constraints
  const handleDragMove = (e) => {
    const shape = e.target;
    const newPos = shape.position();
    
    // Get actual dimensions using utility (handles text auto-sizing)
    const shapeData = { type, width, height, points };
    const dimensions = getActualDimensions(shapeData, shape);
    
    // Convert Konva position to bounding box for boundary checking
    const boundingBox = konvaPositionToBoundingBox(newPos, shapeData, shape);
    
    // Constrain shape to canvas boundaries (with rotation)
    const constrainedBoundingBox = constrainToBounds(
      boundingBox.x, 
      boundingBox.y, 
      dimensions.width, 
      dimensions.height,
      rotation,
      type  // Pass shape type so circles don't calculate rotated bounds
    );
    
    // Convert constrained bounding box back to Konva position
    const constrainedPos = boundingBoxToKonvaPosition(constrainedBoundingBox, shapeData, shape);
    
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
        
        // Send bounding box position to other users via Firebase
        const previewData = {
          userId: getCurrentUserId(),
          type, // Include shape type for correct preview rendering
          x: constrainedBoundingBox.x,
          y: constrainedBoundingBox.y,
          isDragging: true
        };
        
        // Add shape-specific properties
        if (type === 'line' && points) {
          // Translate line points using utility
          const deltaX = constrainedBoundingBox.x - x;
          const deltaY = constrainedBoundingBox.y - y;
          previewData.points = translateLinePoints(points, deltaX, deltaY);
          if (stroke) previewData.stroke = stroke;
          if (strokeWidth) previewData.strokeWidth = strokeWidth;
        } else if (type === 'pen' && points) {
          // Translate pen points using utility
          const deltaX = constrainedBoundingBox.x - x;
          const deltaY = constrainedBoundingBox.y - y;
          previewData.points = translatePenPoints(points, deltaX, deltaY);
          if (stroke) previewData.stroke = stroke;
          if (strokeWidth) previewData.strokeWidth = strokeWidth;
        } else {
          // Other shapes use width/height and fill
          if (width) previewData.width = width;
          if (height) previewData.height = height;
          if (fill) previewData.fill = fill;
          // Include cornerRadius for rectangles
          if (type === 'rectangle' && cornerRadius) {
            previewData.cornerRadius = cornerRadius;
          }
          // Include text content and fontSize for text
          if (type === 'text') {
            if (text) previewData.text = text;
            if (fontSize) previewData.fontSize = fontSize;
          }
        }
        
        // Include rotation for accurate preview
        if (rotation) {
          previewData.rotation = rotation;
        }
        
        // 🐛 DEBUG: Log what we're sending for text (throttled)
        if (type === 'text') {
          console.log('📤 [SHAPE] Sending text drag preview data (MOVE):', {
            type,
            x: previewData.x,
            y: previewData.y,
            width: previewData.width,
            height: previewData.height,
            text: previewData.text,
            fontSize: previewData.fontSize,
            fill: previewData.fill,
            hasText: !!previewData.text,
            hasFontSize: !!previewData.fontSize
          });
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
    
    // Get actual dimensions using utility (handles text auto-sizing)
    const shapeData = { type, width, height, points };
    const dimensions = getActualDimensions(shapeData, shape);
    
    // Convert Konva position to bounding box for storage
    const boundingBox = konvaPositionToBoundingBox(finalPos, shapeData, shape);
    
    // Ensure final bounding box position is within bounds (with rotation)
    const constrainedBoundingBox = constrainToBounds(
      boundingBox.x, 
      boundingBox.y, 
      dimensions.width, 
      dimensions.height,
      rotation,
      type  // Pass shape type so circles don't calculate rotated bounds
    );
    
    // Update Konva position immediately for smooth UX (prevents blink on re-render)
    const constrainedPos = boundingBoxToKonvaPosition(constrainedBoundingBox, shapeData, shape);
    shape.position(constrainedPos);
    
    // For lines/pen, also update points immediately
    if ((type === 'line' || type === 'pen') && points) {
      const deltaX = constrainedBoundingBox.x - x;
      const deltaY = constrainedBoundingBox.y - y;
      
      const translatedPoints = type === 'line' 
        ? translateLinePoints(points, deltaX, deltaY)
        : translatePenPoints(points, deltaX, deltaY);
      
      shape.points(translatedPoints);
      
      // Update offsets to match new center
      const bounds = type === 'line' 
        ? getLineBounds(translatedPoints) 
        : getPenBounds(translatedPoints);
      shape.offsetX(bounds.centerX);
      shape.offsetY(bounds.centerY);
    }
    
    // 🚀 COLLABORATIVE: End drag preview broadcast to other users
    if (clearDragPreview && getCurrentUserId()) {
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
        
        // Calculate updates based on shape type
        const updates = {};
        
        if (type === 'line' && points && points.length >= 4) {
          // Translate line points using utility
          const updatedPoints = translateLinePoints(points, deltaX, deltaY);
          updates.points = updatedPoints;
          
          // Update x,y to match new bounding box
          const bounds = getLineBounds(updatedPoints);
          updates.x = bounds.x;
          updates.y = bounds.y;
          updates.width = bounds.width;
          updates.height = bounds.height;
        } else if (type === 'pen' && points && points.length >= 4) {
          // Translate pen points using utility
          const updatedPoints = translatePenPoints(points, deltaX, deltaY);
          updates.points = updatedPoints;
          
          // Update x,y to match new bounding box
          const bounds = getPenBounds(updatedPoints);
          updates.x = bounds.x;
          updates.y = bounds.y;
          updates.width = bounds.width;
          updates.height = bounds.height;
        } else {
          // For all other shapes, update x/y coordinates
          updates.x = constrainedBoundingBox.x;
          updates.y = constrainedBoundingBox.y;
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
    rotation: rotation || 0, // Apply rotation
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
    // Circles are rotationally symmetric - don't apply rotation
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    const radius = Math.min(width, height) / 2;
    
    const { rotation: _unused, ...circleProps } = commonProps; // Remove rotation from props
    
    return (
      <Circle
        x={centerX}
        y={centerY}
        radius={radius}
        {...circleProps}
      />
    );
  }
  
  if (type === 'line' && points && points.length === 4) {
    // Calculate the center of the line for rotation
    const centerX = (points[0] + points[2]) / 2;
    const centerY = (points[1] + points[3]) / 2;
    
    // For lines, use points array (absolute coordinates)
    // Position at center and use offset so rotation happens around center
    const lineProps = {
      ...commonProps,
      x: centerX,
      y: centerY,
      offsetX: centerX,
      offsetY: centerY,
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
    // Calculate the center of the pen drawing for rotation
    const xCoords = points.filter((_, i) => i % 2 === 0);
    const yCoords = points.filter((_, i) => i % 2 === 1);
    const centerX = (Math.min(...xCoords) + Math.max(...xCoords)) / 2;
    const centerY = (Math.min(...yCoords) + Math.max(...yCoords)) / 2;
    
    // For pen (freehand), use points array (absolute coordinates)
    // Position at center and use offset so rotation happens around center
    const penProps = {
      ...commonProps,
      x: centerX,
      y: centerY,
      offsetX: centerX,
      offsetY: centerY,
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
    // ✅ Text auto-sizes, then we measure and position at centerpoint
    // The callback ref (textRef) handles measurement and centerpoint positioning
    const textProps = {
      ...commonProps,
      ref: textRef, // Callback ref measures dimensions and applies centerpoint offset
      x, // Initial position (callback ref will reposition to center)
      y,
      text: text || 'Text',
      fontSize: fontSize || 48,
      fontFamily: 'Inter, system-ui, sans-serif',
      fill: fill || '#000000',
      // NO width - let text auto-size
      // NO wrap - single line text
      align: 'left',
      // offsetX/offsetY will be set by callback ref after measurement
    };
    
    return (
      <Text
        {...textProps}
      />
    );
  }
  
  // Default to rectangle - rotate around center
  return (
    <Rect
      x={x + width / 2}
      y={y + height / 2}
      width={width}
      height={height}
      cornerRadius={cornerRadius}
      offsetX={width / 2}
      offsetY={height / 2}
      {...commonProps}
    />
  );
};

export default Shape;