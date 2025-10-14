// Canvas Component - Modern canvas with drawing functionality and theme support
import { useEffect, useCallback, useRef, useState, useMemo } from 'react';
import { Stage, Layer, Rect, Line } from 'react-konva';
import { useCanvas } from '../../hooks/useCanvas';
import { useCursors } from '../../hooks/useCursors';
import { useCanvasMode } from '../../contexts/CanvasModeContext';
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

  // Theme-based canvas colors with better differentiation
  const canvasBackgroundColor = isDark ? '#ffffff' : '#ffffff'; // Canvas is always white
  const canvasBorderColor = isDark ? '#60a5fa' : '#3b82f6'; // Blue border for visibility
  const canvasShadow = isDark ? 'rgba(96, 165, 250, 0.3)' : 'rgba(59, 130, 246, 0.2)'; // Subtle glow

  // 🚀 PERFORMANCE: Smart viewport culling system
  const { visibleShapes, cullingStats } = useMemo(() => {
    const stage = stageRef.current;
    
    // If no stage or no shapes, return all shapes
    if (!stage || shapes.length === 0 || stageSize.width === 0 || stageSize.height === 0) {
      return { 
        visibleShapes: shapes, 
        cullingStats: { total: shapes.length, visible: shapes.length, culled: 0, mode: 'no-stage' }
      };
    }
    
    // 🚀 PERFORMANCE: Get live stage position to avoid stale React state during panning
    const stagePos = stage.position();
    const scale = stage.scaleX();
    
    // Calculate what portion of the canvas is currently visible
    const viewportWidth = stageSize.width / scale;
    const viewportHeight = stageSize.height / scale;
    const canvasVisibleRatio = Math.min(
      viewportWidth / CANVAS_WIDTH,
      viewportHeight / CANVAS_HEIGHT
    );
    
    // If viewing most of the canvas (>70% visible), show all shapes
    // This ensures 500 shapes are visible when zoomed out to see full canvas
    if (canvasVisibleRatio > 0.7) {
      console.log('🔍 Full canvas view - showing all shapes (canvas visible ratio:', canvasVisibleRatio.toFixed(2), ')');
      return { 
        visibleShapes: shapes, 
        cullingStats: { total: shapes.length, visible: shapes.length, culled: 0, mode: 'full-canvas' }
      };
    }
    
    // Calculate viewport bounds with padding for smooth scrolling
    const padding = Math.max(100, Math.min(500, 1000 / scale)); // Adaptive padding based on zoom
    const viewportBounds = {
      left: (-stagePos.x / scale) - padding,
      top: (-stagePos.y / scale) - padding,
      right: ((-stagePos.x + stageSize.width) / scale) + padding,
      bottom: ((-stagePos.y + stageSize.height) / scale) + padding
    };
    
    // Filter shapes to only those intersecting with viewport
    const visible = shapes.filter(shape => {
      // Quick bounding box intersection test
      return !(
        shape.x + shape.width < viewportBounds.left ||
        shape.x > viewportBounds.right ||
        shape.y + shape.height < viewportBounds.top ||
        shape.y > viewportBounds.bottom
      );
    });
    
    const stats = { 
      total: shapes.length, 
      visible: visible.length, 
      culled: shapes.length - visible.length,
      mode: 'culling',
      viewportRatio: canvasVisibleRatio.toFixed(2),
      zoom: scale.toFixed(2)
    };
    
    console.log('🚀 Viewport culling active:', stats);
    
    return { visibleShapes: visible, cullingStats: stats };
  }, [shapes, stageSize, zoom]); // 🚀 PERFORMANCE: Removed canvasPosition dependency to reduce recalculations

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
    
    stage.scale({ x: newScale, y: newScale });
    stage.position(constrainedPos);
    
    updateZoom(newScale);
    updateCanvasPosition(constrainedPos);
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
      
      console.log('🎯 Mouse down - Screen pos:', screenPos, 'Canvas pos:', canvasPos);
      
      startDrawing(canvasPos);
      e.cancelBubble = true;
    } else if (currentMode === CANVAS_MODES.MOVE) {
      const clickedOnEmpty = e.target === e.target.getStage() || e.target.attrs.id === 'canvas-background';
      
      if (clickedOnEmpty) {
        // Start canvas panning
        isDraggingCanvas.current = true;
        lastPointerPosition.current = stage.getPointerPosition();
        deselectAll();
      }
    }
  }, [currentMode, CANVAS_MODES, isDrawing, startDrawing, screenToCanvasCoords, deselectAll]);

  // Handle mouse move for drawing preview and canvas panning
  const handleStageMouseMove = useCallback((e) => {
    const stage = stageRef.current;
    if (!stage) return;

    if (currentMode === CANVAS_MODES.DRAW && isDrawing) {
      const screenPos = e.target.getStage().getPointerPosition();
      const pos = screenToCanvasCoords(screenPos);
      console.log('🎯 Mouse move - Screen pos:', screenPos, 'Canvas pos:', pos);
      updateDrawing(pos);
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
          
          // 🔧 RACE CONDITION FIX: Use exact coordinates from drawing preview
          await addShape({
            type: 'rectangle',
            x: result.x,
            y: result.y,
            width: result.width,
            height: result.height,
            fill: '#cccccc'
          });
          
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

  // Enhanced keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Prevent shortcuts when typing in input fields
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
        return;
      }

      switch (e.key) {
        case 'Escape':
          if (isDrawing) {
            cancelDrawing();
          } else if (selectedShapeId) {
            deselectAll();
          }
          break;
          
        case 'Delete':
        case 'Backspace':
          if (selectedShapeId) {
            e.preventDefault();
            deleteShape(selectedShapeId);
          }
          break;
          
        case 'd':
        case 'D':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            setMode(CANVAS_MODES.DRAW);
          }
          break;
          
        case 'v':
        case 'V':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            setMode(CANVAS_MODES.MOVE);
          }
          break;
          
        case 'r':
        case 'R':
          if (!e.ctrlKey && !e.metaKey) {
            e.preventDefault();
            resetView();
          }
          break;
          
        case '0':
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            resetView();
          }
          break;
          
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDrawing, cancelDrawing, selectedShapeId, deleteShape, deselectAll, setMode, CANVAS_MODES, resetView]);

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
                  x={shape.x}
                  y={shape.y}
                  width={shape.width}
                  height={shape.height}
                  fill={shape.fill}
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
              {isDrawing && drawPreview && !isCreatingShape && (
                <Rect
                  x={Math.min(drawPreview.startX, drawPreview.currentX)}
                  y={Math.min(drawPreview.startY, drawPreview.currentY)}
                  width={Math.abs(drawPreview.currentX - drawPreview.startX)}
                  height={Math.abs(drawPreview.currentY - drawPreview.startY)}
                  fill="rgba(59, 130, 246, 0.3)"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  dash={[5, 5]}
                  // 🚀 PERFORMANCE: Optimize preview rect
                  perfectDrawEnabled={false}
                  shadowEnabled={false}
                  listening={false} // Preview doesn't need events
                />
              )}

              {/* Other Users' Drawing Previews */}
              {Object.entries(otherUsersPreviews).map(([userId, preview]) => {
                // Calculate preview rectangle dimensions
                const x = Math.min(preview.startX, preview.currentX);
                const y = Math.min(preview.startY, preview.currentY);
                const width = Math.abs(preview.currentX - preview.startX);
                const height = Math.abs(preview.currentY - preview.startY);
                
                // Only render if the preview has meaningful dimensions
                if (width < 1 || height < 1) return null;
                
                // Use user's color with transparency
                const userColor = preview.userColor || '#ef4444'; // Default to red if no color
                const fillColor = `${userColor}33`; // Add transparency (20%)
                
                return (
                  <Rect
                    key={`preview-${userId}`}
                    x={x}
                    y={y}
                    width={width}
                    height={height}
                    fill={fillColor}
                    stroke={userColor}
                    strokeWidth={2}
                    dash={[3, 3]} // Different dash pattern to distinguish from current user
                    opacity={0.8}
                    // 🚀 PERFORMANCE: Optimize collaborative preview rects
                    perfectDrawEnabled={false}
                    shadowEnabled={false}
                    listening={false} // Previews don't need events
                    hitStrokeWidth={0} // Disable hit detection
                  />
                );
              })}

              {/* Other Users' Drag Previews */}
              {Object.entries(otherUsersDragPreviews).map(([userId, dragPreview]) => {
                // Use user's color with enhanced visual feedback for dragging
                const userColor = dragPreview.userColor || '#ef4444'; // Default to red if no color
                const fillColor = `${userColor}44`; // Add transparency (27%)
                
                return (
                  <Rect
                    key={`drag-preview-${userId}-${dragPreview.shapeId}`}
                    x={dragPreview.x}
                    y={dragPreview.y}
                    width={dragPreview.width}
                    height={dragPreview.height}
                    fill={fillColor}
                    stroke={userColor}
                    strokeWidth={3} // Thicker stroke to indicate active dragging
                    dash={[8, 4]} // Different dash pattern for drag previews
                    opacity={0.9}
                    // Add subtle glow effect for dragging
                    shadowColor={userColor}
                    shadowBlur={8}
                    shadowOpacity={0.3}
                    // 🚀 PERFORMANCE: Optimize drag preview rects
                    perfectDrawEnabled={false}
                    listening={false} // Drag previews don't need events
                    hitStrokeWidth={0} // Disable hit detection
                    shadowForStrokeEnabled={false} // Optimize shadow rendering
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