import { Rect, Circle, Line, Text } from 'react-konva';
import { useRef, useEffect, useMemo, useState, useCallback } from 'react';
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
      const shapePos = shapeNode.position();
      
      // Convert to bounding box coordinates for consistent broadcasting
      let boundingBoxX, boundingBoxY;
      if (type === 'text') {
        // Text position is center, convert to bounding box top-left
        // Get actual text dimensions from the shape
        const actualWidth = shapeNode.width();
        const actualHeight = shapeNode.height();
        boundingBoxX = shapePos.x - actualWidth / 2;
        boundingBoxY = shapePos.y - actualHeight / 2;
      } else if (type === 'circle') {
        // Circle position is center, convert to bounding box top-left
        boundingBoxX = shapePos.x - width / 2;
        boundingBoxY = shapePos.y - height / 2;
      } else if (type === 'rectangle') {
        // Rectangle position is center, convert to bounding box top-left
        boundingBoxX = shapePos.x - width / 2;
        boundingBoxY = shapePos.y - height / 2;
      } else if (type === 'line' && points && points.length === 4) {
        // Lines are positioned at center with offsetX/offsetY
        const centerX = (points[0] + points[2]) / 2;
        const centerY = (points[1] + points[3]) / 2;
        const minX = Math.min(points[0], points[2]);
        const minY = Math.min(points[1], points[3]);
        // Bounding box position = center position - offset from center to top-left
        boundingBoxX = shapePos.x - (centerX - minX);
        boundingBoxY = shapePos.y - (centerY - minY);
      } else if (type === 'pen' && points && points.length >= 4) {
        // Pen is positioned at center with offsetX/offsetY
        const xCoords = points.filter((_, i) => i % 2 === 0);
        const yCoords = points.filter((_, i) => i % 2 === 1);
        const centerX = (Math.min(...xCoords) + Math.max(...xCoords)) / 2;
        const centerY = (Math.min(...yCoords) + Math.max(...yCoords)) / 2;
        const minX = Math.min(...xCoords);
        const minY = Math.min(...yCoords);
        // Bounding box position = center position - offset from center to top-left
        boundingBoxX = shapePos.x - (centerX - minX);
        boundingBoxY = shapePos.y - (centerY - minY);
      } else {
        // Fallback: assume top-left positioning
        boundingBoxX = shapePos.x;
        boundingBoxY = shapePos.y;
      }
      
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
      }
      
      // Include rotation for accurate preview
      if (rotation) {
        previewData.rotation = rotation;
      }
      
      updateDragPreview(id, previewData);
    }
  };

  // Handle shape drag move with boundary constraints
  const handleDragMove = (e) => {
    const shape = e.target;
    const newPos = shape.position();
    
    // ✅ Get actual dimensions from Konva node (works for auto-sized text!)
    const actualWidth = type === 'text' ? shape.width() : width;
    const actualHeight = type === 'text' ? shape.height() : height;
    
    // All shapes now use center position with offsetX/offsetY for rotation
    // Convert to bounding box coordinates for boundary checking
    let boundingBoxX, boundingBoxY;
    if (type === 'line' && points && points.length === 4) {
      // Lines are positioned at center with offsetX/offsetY
      // The visual top-left is at: newPos - offset = bounding box position
      const centerX = (points[0] + points[2]) / 2;
      const centerY = (points[1] + points[3]) / 2;
      const minX = Math.min(points[0], points[2]);
      const minY = Math.min(points[1], points[3]);
      // Bounding box position = center position - offset from center to top-left
      boundingBoxX = newPos.x - (centerX - minX);
      boundingBoxY = newPos.y - (centerY - minY);
    } else if (type === 'pen' && points && points.length >= 4) {
      // Pen is positioned at center with offsetX/offsetY
      const xCoords = points.filter((_, i) => i % 2 === 0);
      const yCoords = points.filter((_, i) => i % 2 === 1);
      const centerX = (Math.min(...xCoords) + Math.max(...xCoords)) / 2;
      const centerY = (Math.min(...yCoords) + Math.max(...yCoords)) / 2;
      const minX = Math.min(...xCoords);
      const minY = Math.min(...yCoords);
      // Bounding box position = center position - offset from center to top-left
      boundingBoxX = newPos.x - (centerX - minX);
      boundingBoxY = newPos.y - (centerY - minY);
    } else if (type === 'text') {
      // Text is now positioned at center with offsetX/offsetY (like rectangles)
      // Convert center to bounding box top-left
      boundingBoxX = newPos.x - actualWidth / 2;
      boundingBoxY = newPos.y - actualHeight / 2;
    } else {
      // Circle and rectangle use center position
      // Convert center to bounding box top-left
      // ✅ Use actual dimensions from Konva
      boundingBoxX = newPos.x - actualWidth / 2;
      boundingBoxY = newPos.y - actualHeight / 2;
    }
    
    // Constrain shape to canvas boundaries using bounding box (with rotation)
    // ✅ Use actual dimensions for boundary checking
    const constrainedBoundingBox = constrainToBounds(
      boundingBoxX, 
      boundingBoxY, 
      actualWidth, 
      actualHeight,
      rotation
    );
    
    // Convert back to shape-specific coordinates for Konva
    let constrainedPos;
    if (type === 'line' && points && points.length === 4) {
      // For lines, convert bounding box back to center position
      const centerX = (points[0] + points[2]) / 2;
      const centerY = (points[1] + points[3]) / 2;
      const minX = Math.min(points[0], points[2]);
      const minY = Math.min(points[1], points[3]);
      // Center position = bounding box + offset from top-left to center
      constrainedPos = {
        x: constrainedBoundingBox.x + (centerX - minX),
        y: constrainedBoundingBox.y + (centerY - minY)
      };
    } else if (type === 'pen' && points && points.length >= 4) {
      // For pen, convert bounding box back to center position
      const xCoords = points.filter((_, i) => i % 2 === 0);
      const yCoords = points.filter((_, i) => i % 2 === 1);
      const centerX = (Math.min(...xCoords) + Math.max(...xCoords)) / 2;
      const centerY = (Math.min(...yCoords) + Math.max(...yCoords)) / 2;
      const minX = Math.min(...xCoords);
      const minY = Math.min(...yCoords);
      // Center position = bounding box + offset from top-left to center
      constrainedPos = {
        x: constrainedBoundingBox.x + (centerX - minX),
        y: constrainedBoundingBox.y + (centerY - minY)
      };
    } else if (type === 'text') {
      // Text uses center position with offsetX/offsetY (like rectangles)
      // Convert bounding box back to center
      constrainedPos = {
        x: constrainedBoundingBox.x + actualWidth / 2,
        y: constrainedBoundingBox.y + actualHeight / 2
      };
    } else {
      // Circle and rectangle use center position
      // Convert bounding box back to center
      // ✅ Use actual dimensions for accurate positioning
      constrainedPos = {
        x: constrainedBoundingBox.x + actualWidth / 2,
        y: constrainedBoundingBox.y + actualHeight / 2
      };
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
        
        // Send bounding box position to other users via Firebase
        const previewData = {
          userId: getCurrentUserId(),
          type, // Include shape type for correct preview rendering
          x: constrainedBoundingBox.x,
          y: constrainedBoundingBox.y,
          isDragging: true
        };
        
        // Add shape-specific properties
        if (type === 'line' || type === 'pen') {
          // Lines use stroke and points
          if (points) {
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
          if (stroke) previewData.stroke = stroke;
          if (strokeWidth) previewData.strokeWidth = strokeWidth;
        } else {
          // Other shapes use width/height and fill
          if (width) previewData.width = width;
          if (height) previewData.height = height;
          if (fill) previewData.fill = fill;
        }
        
        // Include rotation for accurate preview
        if (rotation) {
          previewData.rotation = rotation;
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
    
    // ✅ Get actual dimensions from Konva node (works for auto-sized text!)
    const actualWidth = type === 'text' ? shape.width() : width;
    const actualHeight = type === 'text' ? shape.height() : height;
    
    // Convert to bounding box coordinates for storage
    let boundingBoxX, boundingBoxY;
    if (type === 'line' && points && points.length === 4) {
      // Lines are positioned at center with offsetX/offsetY
      const centerX = (points[0] + points[2]) / 2;
      const centerY = (points[1] + points[3]) / 2;
      const minX = Math.min(points[0], points[2]);
      const minY = Math.min(points[1], points[3]);
      // Bounding box position = center position - offset from center to top-left
      boundingBoxX = finalPos.x - (centerX - minX);
      boundingBoxY = finalPos.y - (centerY - minY);
    } else if (type === 'pen' && points && points.length >= 4) {
      // Pen is positioned at center with offsetX/offsetY
      const xCoords = points.filter((_, i) => i % 2 === 0);
      const yCoords = points.filter((_, i) => i % 2 === 1);
      const centerX = (Math.min(...xCoords) + Math.max(...xCoords)) / 2;
      const centerY = (Math.min(...yCoords) + Math.max(...yCoords)) / 2;
      const minX = Math.min(...xCoords);
      const minY = Math.min(...yCoords);
      // Bounding box position = center position - offset from center to top-left
      boundingBoxX = finalPos.x - (centerX - minX);
      boundingBoxY = finalPos.y - (centerY - minY);
    } else if (type === 'circle') {
      // Circle position is center, convert to bounding box top-left
      // ✅ Use actual dimensions for boundary checking
      boundingBoxX = finalPos.x - actualWidth / 2;
      boundingBoxY = finalPos.y - actualHeight / 2;
    } else if (type === 'text') {
      // Text is now positioned at center with offsetX/offsetY (like rectangles)
      // Convert center to bounding box top-left
      boundingBoxX = finalPos.x - actualWidth / 2;
      boundingBoxY = finalPos.y - actualHeight / 2;
    } else {
      // Rectangle rotates around center, so position is center
      // Convert center to bounding box top-left
      boundingBoxX = finalPos.x - width / 2;
      boundingBoxY = finalPos.y - height / 2;
    }
    
    // Ensure final bounding box position is within bounds (with rotation)
    // ✅ Use actual dimensions for boundary checking
    const constrainedBoundingBox = constrainToBounds(
      boundingBoxX, 
      boundingBoxY, 
      actualWidth, 
      actualHeight,
      rotation
    );
    
    // For non-line/pen shapes, update position immediately for smooth UX
    if (type === 'text') {
      // Text uses center position with offsetX/offsetY (like rectangles)
      // Convert bounding box back to center
      const constrainedPos = {
        x: constrainedBoundingBox.x + actualWidth / 2,
        y: constrainedBoundingBox.y + actualHeight / 2
      };
      shape.position(constrainedPos);
    } else if (type !== 'line' && type !== 'pen') {
      // Circle and rectangle use center position with offsetX/offsetY
      // Convert bounding box back to center position
      // ✅ Use actual dimensions for accurate positioning
      const constrainedPos = {
        x: constrainedBoundingBox.x + actualWidth / 2,
        y: constrainedBoundingBox.y + actualHeight / 2
      };
      
      // Ensure shape is positioned correctly immediately
      shape.position(constrainedPos);
    } else if ((type === 'line' || type === 'pen') && points) {
      // For lines/pen, optimistically update points AND position to prevent blink
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
      
      // Calculate new center position for the shape
      if (type === 'line' && translatedPoints.length === 4) {
        const newCenterX = (translatedPoints[0] + translatedPoints[2]) / 2;
        const newCenterY = (translatedPoints[1] + translatedPoints[3]) / 2;
        shape.position({ x: newCenterX, y: newCenterY });
        // Also update offsets to match new center (prevents blink on re-render)
        shape.offsetX(newCenterX);
        shape.offsetY(newCenterY);
      } else if (type === 'pen' && translatedPoints.length >= 4) {
        const xCoords = translatedPoints.filter((_, i) => i % 2 === 0);
        const yCoords = translatedPoints.filter((_, i) => i % 2 === 1);
        const newCenterX = (Math.min(...xCoords) + Math.max(...xCoords)) / 2;
        const newCenterY = (Math.min(...yCoords) + Math.max(...yCoords)) / 2;
        shape.position({ x: newCenterX, y: newCenterY });
        // Also update offsets to match new center (prevents blink on re-render)
        shape.offsetX(newCenterX);
        shape.offsetY(newCenterY);
      }
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
          
          // Also update x,y to keep them in sync with the new bounding box
          // This ensures stored x,y matches the points' bounding box
          if (type === 'pen') {
            const xCoords = updatedPoints.filter((_, i) => i % 2 === 0);
            const yCoords = updatedPoints.filter((_, i) => i % 2 === 1);
            updates.x = Math.min(...xCoords);
            updates.y = Math.min(...yCoords);
            updates.width = Math.max(...xCoords) - updates.x;
            updates.height = Math.max(...yCoords) - updates.y;
          } else if (type === 'line') {
            updates.x = Math.min(updatedPoints[0], updatedPoints[2]);
            updates.y = Math.min(updatedPoints[1], updatedPoints[3]);
            updates.width = Math.abs(updatedPoints[2] - updatedPoints[0]);
            updates.height = Math.abs(updatedPoints[3] - updatedPoints[1]);
          }
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