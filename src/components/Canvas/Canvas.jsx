// Canvas Component - Modern canvas with drawing functionality and theme support
import { useEffect, useCallback, useRef, useState, useMemo } from 'react';
import { Stage, Layer, Rect, Circle, Line } from 'react-konva';
import { useCanvas } from '../../hooks/useCanvas';
import { useCursors } from '../../hooks/useCursors';
import { useCanvasMode, SHAPE_TYPES } from '../../contexts/CanvasModeContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useDragPreviews } from '../../hooks/useDragPreviews';
import Shape from './Shape';
import Cursor from '../Collaboration/Cursor';
import { 
  MIN_ZOOM, 
  MAX_ZOOM,
  ZOOM_STEP,
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  DEFAULT_ZOOM,
  calculateInitialCanvasPosition
} from '../../utils/constants';
import { screenToCanvasCoordinates } from '../../utils/helpers';

const Canvas = () => {
  const {
    canvasPosition,
    zoom,
    shapes,
    selectedShapeId,
    stageRef,
    isLoading,
    error,
    isConnected,
    updateCanvasPosition,
    updateZoom,
    selectShape,
    deselectAll,
    constrainToBounds,
    addShape,
    updateShape,
    deleteShape,
    resetView,
    initializeCanvasPosition,
    retryConnection
  } = useCanvas();

  const { isDark } = useTheme();
  const {
    currentMode, 
    currentShapeType,
    setMode,
    CANVAS_MODES, 
    isDrawing, 
    drawPreview, 
    isCreatingShape,
    startDrawing, 
    updateDrawing, 
    finishDrawing, 
    cancelDrawing,
    resetCreationFlag,
    // Collaborative drawing previews
    otherUsersPreviews,
    isPreviewActive
  } = useCanvasMode();

  const { cursors } = useCursors(stageRef, isDrawing);
  const { otherUsersDragPreviews, updatePreview, clearPreview } = useDragPreviews();

  // 🚀 PERFORMANCE: Centralized shape event handling to eliminate individual listeners
  const shapeEventHandlers = useRef(new Map()); // Store shape event handlers by ID
  
  // Register a shape's event handlers
  const registerShapeHandlers = useCallback((shapeId, handlers) => {
    shapeEventHandlers.current.set(shapeId, handlers);
  }, []);
  
  // Unregister a shape's event handlers
  const unregisterShapeHandlers = useCallback((shapeId) => {
    shapeEventHandlers.current.delete(shapeId);
  }, []);

  const containerRef = useRef(null);
  const isDraggingCanvas = useRef(false);
  const lastPointerPosition = useRef(null);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });

  // Theme-based canvas colors - Figma-style redesign
  const canvasBackgroundColor = isDark ? '#1E1E1E' : '#FFFFFF'; // Pure white in light, dark in dark mode
  const canvasBorderColor = isDark ? '#60a5fa' : '#3b82f6'; // Blue border for visibility
  const canvasShadow = isDark ? 'rgba(96, 165, 250, 0.3)' : 'rgba(59, 130, 246, 0.2)'; // Subtle glow

  // 🚀 PERFORMANCE: Viewport culling DISABLED - showing all shapes
  const { visibleShapes, cullingStats } = useMemo(() => {
    // Return all shapes without culling
    return { 
      visibleShapes: shapes, 
      cullingStats: { total: shapes.length, visible: shapes.length, culled: 0, mode: 'disabled' }
    };
  }, [shapes]);

  // Shared function to constrain stage position
  const constrainPosition = useCallback((position, scale, stageWidth, stageHeight) => {
    const minVisibleEdge = 100;
    
    const scaledCanvasWidth = CANVAS_WIDTH * scale;
    const scaledCanvasHeight = CANVAS_HEIGHT * scale;
    
    const maxX = stageWidth - minVisibleEdge;
    const minX = -(scaledCanvasWidth - minVisibleEdge);
    const maxY = stageHeight - minVisibleEdge;
    const minY = -(scaledCanvasHeight - minVisibleEdge);
    
    return {
      x: Math.max(minX, Math.min(maxX, position.x)),
      y: Math.max(minY, Math.min(maxY, position.y))
    };
  }, []);

  // 🚀 PERFORMANCE: Throttled React state updates for zoom/position (for CanvasInfo display)
  const throttledZoomUpdate = useRef(null);
  
  // Cleanup throttled zoom timeout on unmount
  useEffect(() => {
    return () => {
      if (throttledZoomUpdate.current) {
        clearTimeout(throttledZoomUpdate.current);
      }
    };
  }, []);
  
  // Handle wheel zoom
  const handleWheel = useCallback((e) => {
    e.evt.preventDefault();
    
    const stage = stageRef.current;
    if (!stage) return;

    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();
    
    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const factor = 1 + ZOOM_STEP * direction;
    const newScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, oldScale * factor));

    const newPos = {
      x: pointer.x - mousePointTo.x * newScale,
      y: pointer.y - mousePointTo.y * newScale,
    };

    const constrainedPos = constrainPosition(newPos, newScale, stageSize.width, stageSize.height);
    
    // CRITICAL: Update Konva stage directly, DON'T trigger React re-render immediately
    stage.scale({ x: newScale, y: newScale });
    stage.position(constrainedPos);
    
    // 🚀 PERFORMANCE: Throttle React state updates to avoid jittering (only update every 100ms)
    if (throttledZoomUpdate.current) {
      clearTimeout(throttledZoomUpdate.current);
    }
    
    throttledZoomUpdate.current = setTimeout(() => {
      updateZoom(newScale);
      updateCanvasPosition(constrainedPos);
    }, 100);
  }, [constrainPosition, stageSize, updateZoom, updateCanvasPosition]);

  // Convert screen coordinates to canvas coordinates using shared function
  const screenToCanvasCoords = useCallback((screenPos) => {
    const stage = stageRef.current;
    if (!stage || !screenPos) return { x: 0, y: 0 };
    
    return screenToCanvasCoordinates(screenPos.x, screenPos.y, stage);
  }, []);

  // Handle stage click/mouse events
  const handleStageMouseDown = useCallback((e) => {
    const stage = stageRef.current;
    if (!stage) return;

    // 🚀 PERFORMANCE: Check for shape interactions first using event delegation
    const target = e.target;
    if (target !== stage && target.attrs?.id !== 'canvas-background') {
      // This is a shape interaction - find the shape ID and delegate
      const shapeId = target.attrs?.shapeId || target.attrs?.id;
      if (shapeId && shapeEventHandlers.current.has(shapeId)) {
        const handlers = shapeEventHandlers.current.get(shapeId);
        if (handlers.onMouseDown) {
          handlers.onMouseDown(e);
          return; // Shape handled the event
        }
      }
    }

    // Handle canvas-level interactions
    if (currentMode === CANVAS_MODES.DRAW && !isDrawing) {
      const screenPos = e.target.getStage().getPointerPosition();
      const canvasPos = screenToCanvasCoords(screenPos);
      // Constrain to canvas boundaries
      const constrainedPos = {
        x: Math.max(0, Math.min(CANVAS_WIDTH, canvasPos.x)),
        y: Math.max(0, Math.min(CANVAS_HEIGHT, canvasPos.y))
      };
      
      // Text tool: create immediately on click, no drag
      if (currentShapeType === SHAPE_TYPES.TEXT) {
        // ✅ Calculate fontSize based on zoom level for better readability
        // Formula: 48 / zoom
        // At 0.12 zoom (12%): ~400px (very readable when zoomed out)
        // At 1.0 zoom (100%): 48px (normal)
        // At 2.0 zoom (200%): 24px (smaller when zoomed in)
        const defaultFontSize = Math.max(8, Math.min(500, Math.round(48 / zoom)));
        
        addShape({
          type: 'text',
          x: constrainedPos.x,
          y: constrainedPos.y,
          text: 'Text',
          fontSize: defaultFontSize,
          fill: '#000000',
          // ✅ NO width/height - let text auto-size based on content
          opacity: 0.8, // Default opacity (single source of truth)
          rotation: 0 // Default rotation
        }).then((newShape) => {
          if (newShape) {
            selectShape(newShape.id);
          }
        });
        e.cancelBubble = true;
      } else {
        // Other draw tools: start drawing
        startDrawing(constrainedPos);
        e.cancelBubble = true;
      }
    } else if (currentMode === CANVAS_MODES.MOVE) {
      const clickedOnEmpty = e.target === e.target.getStage() || e.target.attrs.id === 'canvas-background';
      
      if (clickedOnEmpty) {
        // Start canvas panning
        isDraggingCanvas.current = true;
        lastPointerPosition.current = stage.getPointerPosition();
        deselectAll();
      }
    }
  }, [currentMode, CANVAS_MODES, isDrawing, startDrawing, screenToCanvasCoords, deselectAll, currentShapeType, SHAPE_TYPES, addShape, selectShape, zoom]);

  // Handle mouse move for drawing preview and canvas panning
  const handleStageMouseMove = useCallback((e) => {
    const stage = stageRef.current;
    if (!stage) return;

    if (currentMode === CANVAS_MODES.DRAW && isDrawing) {
      const screenPos = e.target.getStage().getPointerPosition();
      const pos = screenToCanvasCoords(screenPos);
      // Constrain to canvas boundaries
      const constrainedPos = {
        x: Math.max(0, Math.min(CANVAS_WIDTH, pos.x)),
        y: Math.max(0, Math.min(CANVAS_HEIGHT, pos.y))
      };
      updateDrawing(constrainedPos);
    } else if (currentMode === CANVAS_MODES.MOVE && isDraggingCanvas.current) {
      // 🚀 PERFORMANCE: Optimized canvas panning - keep in Konva, avoid React updates
      const currentPos = stage.getPointerPosition();
      const lastPos = lastPointerPosition.current;
      
      if (lastPos) {
        const dx = currentPos.x - lastPos.x;
        const dy = currentPos.y - lastPos.y;
        
        const currentStagePos = stage.position();
        const newPos = {
          x: currentStagePos.x + dx,
          y: currentStagePos.y + dy
        };
        
        const constrainedPos = constrainPosition(newPos, stage.scaleX(), stageSize.width, stageSize.height);
        
        // CRITICAL: Update Konva stage position directly, DON'T trigger React re-render
        stage.position(constrainedPos);
        
        // DON'T call updateCanvasPosition here - it triggers expensive React updates
        // We'll sync the React state only on mouse up
      }
      
      lastPointerPosition.current = currentPos;
    }
  }, [currentMode, CANVAS_MODES.DRAW, isDrawing, updateDrawing, screenToCanvasCoords, constrainPosition, stageSize]);

  // Handle mouse up to finish drawing or canvas panning
  const handleStageMouseUp = useCallback(async () => {
    if (currentMode === CANVAS_MODES.DRAW && isDrawing) {
      const result = finishDrawing();
      if (result && result.width > 5 && result.height > 5) {
        // Only create shape if it's large enough
        try {
          console.log('🔧 Creating shape with coordinates:', result);
          
          // Constrain final shape to canvas boundaries
          const constrainedResult = constrainToBounds(
            result.x,
            result.y,
            result.width,
            result.height
          );
          
          // Adjust width/height if position was constrained
          const finalWidth = Math.min(result.width, CANVAS_WIDTH - constrainedResult.x);
          const finalHeight = Math.min(result.height, CANVAS_HEIGHT - constrainedResult.y);
          
          // 🔧 RACE CONDITION FIX: Use exact coordinates from drawing preview
          // Support multiple shape types from the drawing result
          const shapeData = {
            type: result.type || 'rectangle', // Use the shape type from finishDrawing
            x: constrainedResult.x,
            y: constrainedResult.y,
            width: finalWidth,
            height: finalHeight,
            fill: '#cccccc',
            stroke: '#cccccc', // Same default color as fill
            strokeWidth: 2,
            opacity: 0.8, // Default opacity (single source of truth)
            rotation: 0 // Default rotation
          };
          
          // For lines and pen, also include the points array
          if ((result.type === 'line' || result.type === 'pen') && result.points) {
            shapeData.points = result.points;
          }
          
          await addShape(shapeData);
          
          // 🔧 RACE CONDITION FIX: Reset creation flag after successful creation
          resetCreationFlag();
        } catch (error) {
          console.error('Failed to create shape:', error);
          // If shape creation fails, reset the flag so user can try again
          resetCreationFlag();
        }
      } else {
        // Cancel if too small
        cancelDrawing();
      }
    } else if (currentMode === CANVAS_MODES.MOVE && isDraggingCanvas.current) {
      // 🚀 PERFORMANCE: Sync React state only when canvas panning ends
      const stage = stageRef.current;
      if (stage) {
        const finalPosition = stage.position();
        updateCanvasPosition(finalPosition); // Single React update after panning complete
      }
      
      // End canvas panning
      isDraggingCanvas.current = false;
      lastPointerPosition.current = null;
    }
  }, [currentMode, CANVAS_MODES.DRAW, isDrawing, finishDrawing, addShape, cancelDrawing, resetCreationFlag]);

  // Canvas-specific keyboard shortcuts (drawing cancellation)
  // Note: Most shortcuts are now handled globally by useKeyboardShortcuts in App.jsx
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Prevent shortcuts when typing in input fields
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
        return;
      }

      // Only handle Escape for canceling active drawing
      // (other Escape behavior is handled by global shortcuts)
      if (e.key === 'Escape' && isDrawing) {
        e.preventDefault();
        cancelDrawing();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawing, cancelDrawing]);

  // Handle container resize
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const { width, height } = containerRef.current.getBoundingClientRect();
        setStageSize({ width, height });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Initialize stage position and zoom when stage is ready
  useEffect(() => {
    const stage = stageRef.current;
    if (stage && stageSize.width > 0 && stageSize.height > 0) {
      // Set initial position and zoom
      stage.position(canvasPosition);
      stage.scale({ x: zoom, y: zoom });
    }
  }, [stageSize.width, stageSize.height, canvasPosition, zoom]);

  // Initialize to show entire canvas on first load
  useEffect(() => {
    const stage = stageRef.current;
    if (stage && stageSize.width > 0 && stageSize.height > 0) {
      // Use the context's initialize function to ensure consistency
      initializeCanvasPosition();
    }
  }, [stageSize.width, stageSize.height, initializeCanvasPosition]);

  // Set cursor style based on mode and state
  const getCursorClass = () => {
    if (currentMode === CANVAS_MODES.DRAW) {
      return 'cursor-draw';
    }
    if (currentMode === CANVAS_MODES.MOVE) {
      if (isDraggingCanvas.current) {
        return 'cursor-grabbing';
      }
      return 'cursor-grab';
    }
    return 'cursor-grab';
  };

  return (
    <div className={`w-full h-full relative ${getCursorClass()}`}>
      {/* Loading Overlay */}
      {isLoading && (
        <div className="loading-overlay">
          <div className="text-center">
            <div 
              className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto mb-4"
              style={{ borderColor: 'var(--accent-primary)' }}
            ></div>
            <p style={{ color: 'var(--text-primary)' }} className="font-medium">Loading canvas...</p>
            <p style={{ color: 'var(--text-secondary)' }} className="text-sm">Syncing with server</p>
          </div>
        </div>
      )}

      {/* Error Overlay */}
      {error && !isLoading && (
        <div className="error-overlay">
          <div className="text-center max-w-md mx-auto p-6">
            <div style={{ color: 'var(--danger)' }} className="mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>
              Connection Error
            </h3>
            <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>{error}</p>
            <button
              onClick={retryConnection}
              className="btn-modern"
              style={{ 
                backgroundColor: 'var(--danger)', 
                color: 'white',
                borderColor: 'var(--danger)'
              }}
            >
              Retry Connection
            </button>
          </div>
        </div>
      )}

      {/* Connection Status */}
      {!isConnected && !error && !isLoading && (
        <div 
          className="absolute top-4 right-4 px-3 py-2 rounded-md text-sm z-30 border"
          style={{ 
            backgroundColor: 'var(--warning)', 
            borderColor: 'var(--border-primary)',
            color: 'white'
          }}
        >
          <div className="flex items-center">
            <div className="w-2 h-2 bg-white rounded-full animate-pulse mr-2"></div>
            Reconnecting...
          </div>
        </div>
      )}

      {/* Konva Stage Container */}
      <div ref={containerRef} className="w-full h-full">
        {stageSize.width > 0 && stageSize.height > 0 && (
          <Stage
            ref={stageRef}
            width={stageSize.width}
            height={stageSize.height}
            draggable={false} // Never make stage draggable - handle manually
            onWheel={handleWheel}
            onMouseDown={handleStageMouseDown}
            onMouseMove={handleStageMouseMove}
            onMouseUp={handleStageMouseUp}
            // 🚀 PERFORMANCE: Optimize stage for many objects
            perfectDrawEnabled={false} // Disable pixel-perfect drawing for better performance
            listening={true} // Keep listening for interactions
          >
            <Layer
              // 🚀 PERFORMANCE: Optimize layer for many objects
              listening={true} // Keep listening for interactions
              perfectDrawEnabled={false} // Disable pixel-perfect drawing for better performance
              hitGraphEnabled={true} // Enable hit detection optimization
            >
              {/* Canvas Background - 5000x5000px as specified in PRD */}
              <Rect
                id="canvas-background"
                x={0}
                y={0}
                width={CANVAS_WIDTH} // 5000px
                height={CANVAS_HEIGHT} // 5000px
                fill={canvasBackgroundColor}
                stroke={canvasBorderColor}
                strokeWidth={4} // Thicker border for better visibility
                shadowColor={canvasShadow}
                shadowBlur={8}
                shadowOffset={{ x: 2, y: 2 }}
                shadowOpacity={0.3}
                // 🚀 PERFORMANCE: Optimize background rect
                perfectDrawEnabled={false}
                shadowForStrokeEnabled={false} // Disable expensive shadow for stroke
                hitStrokeWidth={0} // Disable hit detection on stroke for better performance
              />

              {/* Grid Lines for Visual Structure */}
              {(() => {
                const gridSize = 50; // Grid spacing in pixels
                const majorGridSize = gridSize * 4; // Major grid lines every 200px
                const lines = [];
                
                // Only render grid lines that are visible in the viewport for performance
                const stage = stageRef.current;
                let startX = 0, endX = CANVAS_WIDTH, startY = 0, endY = CANVAS_HEIGHT;
                
                if (stage && zoom < 0.5) {
                  // When zoomed out, calculate visible area to limit grid rendering
                  const stagePos = stage.position();
                  const scale = stage.scaleX();
                  
                  startX = Math.max(0, Math.floor((-stagePos.x / scale) / gridSize) * gridSize);
                  endX = Math.min(CANVAS_WIDTH, Math.ceil(((-stagePos.x + stageSize.width) / scale) / gridSize) * gridSize);
                  startY = Math.max(0, Math.floor((-stagePos.y / scale) / gridSize) * gridSize);
                  endY = Math.min(CANVAS_HEIGHT, Math.ceil(((-stagePos.y + stageSize.height) / scale) / gridSize) * gridSize);
                }
                
                // Vertical lines
                for (let x = startX; x <= endX; x += gridSize) {
                  const isMajor = x % majorGridSize === 0;
                  lines.push(
                    <Line
                      key={`v-${x}`}
                      points={[x, Math.max(0, startY), x, Math.min(CANVAS_HEIGHT, endY)]}
                      stroke={canvasBorderColor}
                      strokeWidth={isMajor ? 1 : 0.5}
                      opacity={isMajor ? 0.3 : 0.15}
                      listening={false}
                      perfectDrawEnabled={false}
                    />
                  );
                }
                
                // Horizontal lines  
                for (let y = startY; y <= endY; y += gridSize) {
                  const isMajor = y % majorGridSize === 0;
                  lines.push(
                    <Line
                      key={`h-${y}`}
                      points={[Math.max(0, startX), y, Math.min(CANVAS_WIDTH, endX), y]}
                      stroke={canvasBorderColor}
                      strokeWidth={isMajor ? 1 : 0.5}
                      opacity={isMajor ? 0.3 : 0.15}
                      listening={false}
                      perfectDrawEnabled={false}
                    />
                  );
                }
                
                return lines;
              })()}

              {/* Render Shapes - Smart viewport culling active */}
              {visibleShapes.map((shape) => (
                <Shape
                  key={shape.id}
                  id={shape.id}
                  type={shape.type}
                  x={shape.x}
                  y={shape.y}
                  width={shape.width}
                  height={shape.height}
                  fill={shape.fill}
                  opacity={shape.opacity}
                  rotation={shape.rotation} // Rotation in degrees
                  points={shape.points} // For lines
                  stroke={shape.stroke} // For lines and borders
                  strokeWidth={shape.strokeWidth} // For lines and borders
                  text={shape.text} // For text shapes
                  fontSize={shape.fontSize} // For text shapes
                  isSelected={selectedShapeId === shape.id}
                  isLocked={shape.isLocked}
                  lockedBy={shape.lockedBy}
                  // 🚀 PERFORMANCE: Pass viewport culling optimization hints
                  _isViewportCulled={visibleShapes.length < shapes.length}
                  _totalShapes={shapes.length}
                  // 🚀 PERFORMANCE: Pass event delegation functions
                  registerShapeHandlers={registerShapeHandlers}
                  unregisterShapeHandlers={unregisterShapeHandlers}
                  // 🚀 COLLABORATIVE: Pass Firebase-based drag preview functions
                  updateDragPreview={updatePreview}
                  clearDragPreview={clearPreview}
                />
              ))}

              {/* Drawing Preview - Only show if not creating shape */}
              {isDrawing && drawPreview && !isCreatingShape && (() => {
                const previewProps = {
                  fill: "rgba(59, 130, 246, 0.3)",
                  stroke: "#3b82f6",
                  strokeWidth: 2,
                  dash: [5, 5],
                  perfectDrawEnabled: false,
                  shadowEnabled: false,
                  listening: false
                };
                
                if (drawPreview.type === 'circle') {
                  // For circles: start is center, current defines radius
                  const centerX = drawPreview.startX;
                  const centerY = drawPreview.startY;
                  const radius = Math.sqrt(
                    Math.pow(drawPreview.currentX - drawPreview.startX, 2) +
                    Math.pow(drawPreview.currentY - drawPreview.startY, 2)
                  );
                  return <Circle x={centerX} y={centerY} radius={radius} {...previewProps} />;
                } else if (drawPreview.type === 'line') {
                  // For lines: draw straight line from start to current
                  const linePoints = [
                    drawPreview.startX,
                    drawPreview.startY,
                    drawPreview.currentX,
                    drawPreview.currentY
                  ];
                  return <Line points={linePoints} {...previewProps} fill={undefined} />;
                } else if (drawPreview.type === 'pen' && drawPreview.points && drawPreview.points.length >= 2) {
                  // For pen: draw freehand path (need at least 1 point = 2 values)
                  return <Line points={drawPreview.points} {...previewProps} fill={undefined} tension={0.5} lineCap="round" lineJoin="round" />;
                }
                
                // For rectangles: standard bounding box
                const previewX = Math.min(drawPreview.startX, drawPreview.currentX);
                const previewY = Math.min(drawPreview.startY, drawPreview.currentY);
                const previewWidth = Math.abs(drawPreview.currentX - drawPreview.startX);
                const previewHeight = Math.abs(drawPreview.currentY - drawPreview.startY);
                return <Rect x={previewX} y={previewY} width={previewWidth} height={previewHeight} {...previewProps} />;
              })()}

              {/* Other Users' Drawing Previews */}
              {Object.entries(otherUsersPreviews).map(([userId, preview]) => {
                // Use user's color with transparency
                const userColor = preview.userColor || '#ef4444'; // Default to red if no color
                const fillColor = `${userColor}33`; // Add transparency (20%)
                
                const collaborativeProps = {
                  key: `preview-${userId}`,
                  fill: fillColor,
                  stroke: userColor,
                  strokeWidth: 2,
                  dash: [3, 3],
                  opacity: 0.8,
                  perfectDrawEnabled: false,
                  shadowEnabled: false,
                  listening: false,
                  hitStrokeWidth: 0
                };
                
                // Render different preview shapes based on type
                if (preview.type === 'circle') {
                  // For circles: start is center, current defines radius
                  const centerX = preview.startX;
                  const centerY = preview.startY;
                  const radius = Math.sqrt(
                    Math.pow(preview.currentX - preview.startX, 2) +
                    Math.pow(preview.currentY - preview.startY, 2)
                  );
                  
                  // Only render if radius is meaningful
                  if (radius < 1) return null;
                  
                  return <Circle x={centerX} y={centerY} radius={radius} {...collaborativeProps} />;
                } else if (preview.type === 'line') {
                  // For lines: draw straight line
                  const linePoints = [
                    preview.startX,
                    preview.startY,
                    preview.currentX,
                    preview.currentY
                  ];
                  const distance = Math.sqrt(
                    Math.pow(preview.currentX - preview.startX, 2) +
                    Math.pow(preview.currentY - preview.startY, 2)
                  );
                  
                  // Only render if line has meaningful length
                  if (distance < 1) return null;
                  
                  return <Line points={linePoints} {...collaborativeProps} fill={undefined} />;
                } else if (preview.type === 'pen' && preview.points && preview.points.length >= 2) {
                  // For pen: draw freehand path (need at least 1 point = 2 values)
                  return <Line points={preview.points} {...collaborativeProps} fill={undefined} tension={0.5} lineCap="round" lineJoin="round" />;
                }
                
                // For rectangles: standard bounding box
                const x = Math.min(preview.startX, preview.currentX);
                const y = Math.min(preview.startY, preview.currentY);
                const width = Math.abs(preview.currentX - preview.startX);
                const height = Math.abs(preview.currentY - preview.startY);
                
                // Only render if the preview has meaningful dimensions
                if (width < 1 || height < 1) return null;
                
                return <Rect x={x} y={y} width={width} height={height} {...collaborativeProps} />;
              })}

              {/* Other Users' Drag Previews */}
              {Object.entries(otherUsersDragPreviews).map(([userId, dragPreview]) => {
                // Use user's color with enhanced visual feedback for dragging
                const userColor = dragPreview.userColor || '#ef4444'; // Default to red if no color
                const fillColor = `${userColor}44`; // Add transparency (27%)
                
                const dragProps = {
                  key: `drag-preview-${userId}-${dragPreview.shapeId}`,
                  fill: fillColor,
                  stroke: userColor,
                  strokeWidth: 3,
                  dash: [8, 4],
                  opacity: 0.9,
                  rotation: dragPreview.rotation || 0, // Apply rotation
                  shadowColor: userColor,
                  shadowBlur: 8,
                  shadowOpacity: 0.3,
                  perfectDrawEnabled: false,
                  listening: false,
                  hitStrokeWidth: 0,
                  shadowForStrokeEnabled: false
                };
                
                // Render based on shape type
                if (dragPreview.type === 'circle') {
                  const centerX = dragPreview.x + dragPreview.width / 2;
                  const centerY = dragPreview.y + dragPreview.height / 2;
                  const radius = Math.min(dragPreview.width, dragPreview.height) / 2;
                  return <Circle x={centerX} y={centerY} radius={radius} {...dragProps} />;
                } else if (dragPreview.type === 'line' && dragPreview.points && dragPreview.points.length === 4) {
                  // For line drag preview, render with translated points
                  return <Line x={0} y={0} points={dragPreview.points} {...dragProps} fill={undefined} />;
                } else if (dragPreview.type === 'pen' && dragPreview.points && dragPreview.points.length >= 4) {
                  // For pen drag preview, render with translated points
                  return <Line x={0} y={0} points={dragPreview.points} {...dragProps} fill={undefined} tension={0.5} lineCap="round" lineJoin="round" />;
                }
                
                // Default to rectangle - rotate around center
                return (
                  <Rect
                    x={dragPreview.x + dragPreview.width / 2}
                    y={dragPreview.y + dragPreview.height / 2}
                    width={dragPreview.width}
                    height={dragPreview.height}
                    offsetX={dragPreview.width / 2}
                    offsetY={dragPreview.height / 2}
                    {...dragProps}
                  />
                );
              })}
            </Layer>
          </Stage>
        )}
      </div>

      {/* Multiplayer Cursors Overlay */}
      {Object.entries(cursors).map(([userId, cursor]) => {
        const stage = stageRef.current;
        
        // Skip if no stage or cursor positions are invalid/hidden
        if (!stage) return null;
        
        // Check if cursor has valid position data
        const hasValidPosition = typeof cursor.cursorX === 'number' && 
                               typeof cursor.cursorY === 'number' && 
                               cursor.cursorX >= 0 && 
                               cursor.cursorY >= 0;
        
        if (!hasValidPosition) return null;
        
        const transform = stage.getAbsoluteTransform();
        const screenCoords = transform.point({ x: cursor.cursorX, y: cursor.cursorY });
        
        return (
          <Cursor
            key={userId}
            x={screenCoords.x}
            y={screenCoords.y}
            displayName={cursor.displayName || 'Anonymous'}
            color={cursor.cursorColor || '#3B82F6'}
            userId={userId}
          />
        );
      })}

      {/* 🚀 PERFORMANCE: Viewport culling stats overlay (dev mode) */}
      {process.env.NODE_ENV === 'development' && cullingStats && (
        <div 
          className="absolute bottom-4 right-4 px-3 py-2 rounded-md text-xs font-mono z-40 border"
          style={{ 
            backgroundColor: 'var(--bg-primary)', 
            borderColor: 'var(--border-primary)',
            color: 'var(--text-secondary)'
          }}
        >
          <div>Shapes: {cullingStats.visible}/{cullingStats.total}</div>
          <div>Mode: {cullingStats.mode}</div>
          {cullingStats.zoom && <div>Zoom: {cullingStats.zoom}</div>}
          {cullingStats.viewportRatio && <div>Viewport: {cullingStats.viewportRatio}</div>}
        </div>
      )}

      {/* Collaborative Drawing Preview Labels */}
      {Object.entries(otherUsersPreviews).map(([userId, preview]) => {
        const stage = stageRef.current;
        if (!stage) return null;
        
        // Calculate preview rectangle dimensions
        const x = Math.min(preview.startX, preview.currentX);
        const y = Math.min(preview.startY, preview.currentY);
        const width = Math.abs(preview.currentX - preview.startX);
        const height = Math.abs(preview.currentY - preview.startY);
        
        // Only render label if the preview has meaningful dimensions
        if (width < 5 || height < 5) return null;
        
        // Convert canvas coordinates to screen coordinates for the label
        const transform = stage.getAbsoluteTransform();
        const screenCoords = transform.point({ x: x, y: y - 10 }); // Position above the preview
        
        const userColor = preview.userColor || '#ef4444';
        const displayName = preview.displayName || 'Anonymous';
        
        return (
          <div
            key={`preview-label-${userId}`}
            className="absolute pointer-events-none z-40"
            style={{
              left: `${screenCoords.x}px`,
              top: `${screenCoords.y}px`,
              transform: 'translateY(-100%)'
            }}
          >
            <div
              className="px-2 py-1 text-xs font-medium text-white rounded shadow-lg whitespace-nowrap"
              style={{
                backgroundColor: userColor,
                maxWidth: '120px'
              }}
            >
              {displayName} is drawing...
            </div>
          </div>
        );
      })}

      {/* Collaborative Drag Preview Labels */}
      {Object.entries(otherUsersDragPreviews).map(([userId, dragPreview]) => {
        const stage = stageRef.current;
        if (!stage) return null;
        
        // Convert canvas coordinates to screen coordinates for the label
        const transform = stage.getAbsoluteTransform();
        const screenCoords = transform.point({ 
          x: dragPreview.x + dragPreview.width / 2, // Center of shape
          y: dragPreview.y - 10 // Position above the shape
        });
        
        const userColor = dragPreview.userColor || '#ef4444';
        const displayName = dragPreview.displayName || 'Anonymous';
        
        return (
          <div
            key={`drag-label-${userId}-${dragPreview.shapeId}`}
            className="absolute pointer-events-none z-50"
            style={{
              left: `${screenCoords.x}px`,
              top: `${screenCoords.y}px`,
              transform: 'translate(-50%, -100%)' // Center horizontally, position above
            }}
          >
            <div
              className="px-2 py-1 text-xs font-medium text-white rounded shadow-lg whitespace-nowrap animate-pulse"
              style={{
                backgroundColor: userColor,
                maxWidth: '120px',
                boxShadow: `0 4px 12px ${userColor}33` // Subtle glow matching user color
              }}
            >
              {displayName} is moving...
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default Canvas;