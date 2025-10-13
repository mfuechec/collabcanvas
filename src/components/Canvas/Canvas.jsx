// Canvas Component - Main canvas workspace with pan, zoom, and shape rendering
import { useEffect, useCallback, useRef, useState } from 'react';
import { Stage, Layer, Rect } from 'react-konva';
import { useCanvas } from '../../hooks/useCanvas';
import { useCursors } from '../../hooks/useCursors';
import Shape from './Shape';
import Cursor from '../Collaboration/Cursor';
import { 
  CANVAS_BACKGROUND_COLOR, 
  CANVAS_BORDER_COLOR,
  MIN_ZOOM, 
  MAX_ZOOM,
  ZOOM_STEP,
  CANVAS_WIDTH,
  CANVAS_HEIGHT 
} from '../../utils/constants';

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
    updateShape,
    deleteShape,
    retryConnection
  } = useCanvas();

  // Multiplayer cursors
  const { cursors } = useCursors(stageRef);

  const containerRef = useRef(null);
  const isDraggingCanvas = useRef(false);
  const [stageSize, setStageSize] = useState({ width: 0, height: 0 });

  // Shared function to constrain stage position to ensure canvas stays visible
  const constrainPosition = useCallback((position, scale, stageWidth, stageHeight) => {
    // Ensure at least 100px of canvas edge is always visible
    const minVisibleEdge = 100;
    
    // Calculate the bounds of the scaled canvas
    const scaledCanvasWidth = CANVAS_WIDTH * scale;
    const scaledCanvasHeight = CANVAS_HEIGHT * scale;
    
    // Maximum position: canvas can be moved right/down until its left/top edge reaches minVisibleEdge from right/bottom of viewport
    const maxX = stageWidth - minVisibleEdge;
    const maxY = stageHeight - minVisibleEdge;
    
    // Minimum position: canvas can be moved left/up until its right/bottom edge reaches minVisibleEdge from left/top of viewport  
    const minX = -(scaledCanvasWidth - minVisibleEdge);
    const minY = -(scaledCanvasHeight - minVisibleEdge);
    
    const result = {
      x: Math.max(minX, Math.min(maxX, position.x)),
      y: Math.max(minY, Math.min(maxY, position.y))
    };
    
    return result;
  }, []);

  // Handle zoom functionality with cursor positioning and robust constraints
  const handleWheel = useCallback((e) => {
    e.evt.preventDefault();

    const stage = stageRef.current;
    if (!stage || stageSize.width === 0 || stageSize.height === 0) {
      return;
    }

    const pointer = stage.getPointerPosition();
    const mousePointTo = {
      x: (pointer.x - stage.x()) / stage.scaleX(),
      y: (pointer.y - stage.y()) / stage.scaleY(),
    };

    // Calculate new zoom level
    const direction = e.evt.deltaY > 0 ? -1 : 1;
    const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoom + direction * ZOOM_STEP));

    // Calculate new position to zoom towards cursor
    const newPos = {
      x: pointer.x - mousePointTo.x * newZoom,
      y: pointer.y - mousePointTo.y * newZoom,
    };

    // Apply boundary constraints after zoom calculation
    const constrainedPos = constrainPosition(newPos, newZoom, stageSize.width, stageSize.height);

    // Update zoom in context
    updateZoom(newZoom);

    // Apply zoom and constrained position to stage
    stage.scale({ x: newZoom, y: newZoom });
    stage.position(constrainedPos);
    updateCanvasPosition(constrainedPos);
  }, [zoom, updateZoom, updateCanvasPosition, stageRef, constrainPosition, stageSize]);

  // Update stage size when window resizes or container changes
  useEffect(() => {
    const updateSize = () => {
      if (containerRef.current) {
        const container = containerRef.current;
        const rect = container.getBoundingClientRect();
        setStageSize({
          width: rect.width,
          height: rect.height
        });
      }
    };

    // Initial size
    updateSize();

    // Listen for window resize
    window.addEventListener('resize', updateSize);
    
    // Use ResizeObserver for more accurate container size tracking
    let resizeObserver;
    if (containerRef.current && ResizeObserver) {
      resizeObserver = new ResizeObserver(updateSize);
      resizeObserver.observe(containerRef.current);
    }
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', updateSize);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, []); // Remove handleWheel dependency to prevent infinite loop

  // Handle canvas pan functionality
  const handleStageDragStart = useCallback(() => {
    isDraggingCanvas.current = true;
  }, []);

  const handleStageDragMove = useCallback((e) => {
    if (!isDraggingCanvas.current) return;

    const stage = e.target.getStage();
    const newPosition = stage.position();
    const scale = stage.scaleX();
    
    // Apply boundary constraints using shared function
    const constrainedPosition = constrainPosition(newPosition, scale, stageSize.width, stageSize.height);

    stage.position(constrainedPosition);
    updateCanvasPosition(constrainedPosition);
  }, [updateCanvasPosition, stageSize, constrainPosition]);

  const handleStageDragEnd = useCallback(() => {
    isDraggingCanvas.current = false;
  }, []);

  // Handle clicking on empty canvas (deselect)
  const handleStageClick = useCallback((e) => {
    // Check if click was on stage background or canvas background rect (not on a shape)
    const stage = e.target.getStage();
    const isStageClick = e.target === stage;
    const isCanvasBackgroundClick = e.target.attrs && 
                                   e.target.attrs.width === CANVAS_WIDTH && 
                                   e.target.attrs.height === CANVAS_HEIGHT;
    
    if (isStageClick || isCanvasBackgroundClick) {
      deselectAll();
    }
  }, [deselectAll]);

  // Handle shape click selection
  const handleShapeClick = useCallback((shapeId) => {
    selectShape(shapeId);
  }, [selectShape]);

  // Handle shape drag with boundary constraints
  const handleShapeDragMove = useCallback((e, shapeId) => {
    const shape = e.target;
    const newPos = shape.position();
    const shapeData = shapes.find(s => s.id === shapeId);
    
    if (!shapeData) return;

    // Constrain shape to canvas boundaries
    const constrainedPos = constrainToBounds(
      newPos.x, 
      newPos.y, 
      shapeData.width, 
      shapeData.height
    );

    // Update shape position in context and on canvas
    shape.position(constrainedPos);
    updateShape(shapeId, constrainedPos);
  }, [shapes, constrainToBounds, updateShape]);

  // Handle keyboard shortcuts (especially delete key)
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Handle delete key for selected shapes
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedShapeId) {
        const selectedShape = shapes.find(s => s.id === selectedShapeId);
        
        // Only delete if shape is not locked
        if (selectedShape && !selectedShape.isLocked) {
          deleteShape(selectedShapeId);
        }
      }
    };

    // Add event listener
    window.addEventListener('keydown', handleKeyDown);
    
    // Cleanup
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedShapeId, shapes, deleteShape]);

  // Update stage ref when component mounts
  useEffect(() => {
    if (stageRef.current) {
      // Set initial scale and position
      stageRef.current.scale({ x: zoom, y: zoom });
      stageRef.current.position(canvasPosition);
    }
  }, []);

  // Update stage when zoom or position changes
  useEffect(() => {
    if (stageRef.current) {
      stageRef.current.scale({ x: zoom, y: zoom });
      stageRef.current.position(canvasPosition);
    }
  }, [zoom, canvasPosition]);

  return (
    <div className="w-full h-full bg-gray-100 overflow-hidden relative">
      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-50">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-700 font-medium">Loading canvas...</p>
            <p className="text-gray-500 text-sm">Syncing with server</p>
          </div>
        </div>
      )}

      {/* Error Overlay */}
      {error && !isLoading && (
        <div className="absolute inset-0 bg-red-50 bg-opacity-90 flex items-center justify-center z-40">
          <div className="text-center max-w-md mx-auto p-6">
            <div className="text-red-600 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-red-800 mb-2">Connection Error</h3>
            <p className="text-red-700 mb-4">{error}</p>
            <button
              onClick={retryConnection}
              className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
            >
              Retry Connection
            </button>
          </div>
        </div>
      )}

      {/* Connection Status */}
      {!isConnected && !error && !isLoading && (
        <div className="absolute top-4 right-4 bg-yellow-100 border border-yellow-400 text-yellow-800 px-3 py-2 rounded-md text-sm z-30">
          <div className="flex items-center">
            <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse mr-2"></div>
            Reconnecting...
          </div>
        </div>
      )}

      {/* Konva Stage Container - Fully responsive */}
      <div 
        ref={containerRef}
        className="w-full h-full"
      >
        {stageSize.width > 0 && stageSize.height > 0 && (
          <Stage
            ref={stageRef}
            width={stageSize.width}
            height={stageSize.height}
            draggable={true}
            onDragStart={handleStageDragStart}
            onDragMove={handleStageDragMove}
            onDragEnd={handleStageDragEnd}
            onWheel={handleWheel}
            onClick={handleStageClick}
          >
            <Layer>
              {/* Canvas Background */}
              <Rect
                x={0}
                y={0}
                width={CANVAS_WIDTH}
                height={CANVAS_HEIGHT}
                fill={CANVAS_BACKGROUND_COLOR}
                stroke={CANVAS_BORDER_COLOR}
                strokeWidth={2}
              />

              {/* Render Shapes */}
              {shapes.map((shape) => (
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
                />
              ))}
            </Layer>
          </Stage>
        )}
      </div>

      {/* Multiplayer Cursors Overlay */}
      {cursors.map((cursor) => {
        // Convert canvas coordinates to screen coordinates
        const stage = stageRef.current;
        if (!stage) return null;
        
        const transform = stage.getAbsoluteTransform();
        const screenCoords = transform.point({ x: cursor.x, y: cursor.y });
        
        return (
          <Cursor
            key={cursor.id}
            x={screenCoords.x}
            y={screenCoords.y}
            displayName={cursor.displayName}
            color={cursor.color}
            userId={cursor.id}
          />
        );
      })}
    </div>
  );
};

export default Canvas;
