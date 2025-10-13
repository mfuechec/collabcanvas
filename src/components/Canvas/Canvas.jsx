// Canvas Component - Main canvas workspace with pan, zoom, and shape rendering
import { useEffect, useCallback, useRef, useState } from 'react';
import { Stage, Layer, Rect } from 'react-konva';
import { useCanvas } from '../../hooks/useCanvas';
import Shape from './Shape';
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
    updateCanvasPosition,
    updateZoom,
    selectShape,
    deselectAll,
    constrainToBounds,
    updateShape,
    deleteShape
  } = useCanvas();

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
    <div className="w-full h-full bg-gray-100 overflow-hidden">
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
    </div>
  );
};

export default Canvas;
