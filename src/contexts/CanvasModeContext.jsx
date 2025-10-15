// Canvas Mode Context - Drawing and interaction mode management
import { createContext, useContext, useState, useCallback } from 'react';
import { useDrawingPreviews } from '../hooks/useDrawingPreviews';

const CanvasModeContext = createContext();

export const useCanvasMode = () => {
  const context = useContext(CanvasModeContext);
  if (!context) {
    throw new Error('useCanvasMode must be used within a CanvasModeProvider');
  }
  return context;
};

const CANVAS_MODES = {
  MOVE: 'move',
  DRAW: 'draw'
};

const SHAPE_TYPES = {
  RECTANGLE: 'rectangle',
  CIRCLE: 'circle',
  LINE: 'line',
  PEN: 'pen',  // Freehand drawing
  TEXT: 'text'
};

// Export SHAPE_TYPES for use in other components
export { SHAPE_TYPES };

export const CanvasModeProvider = ({ children }) => {
  const [currentMode, setCurrentMode] = useState(CANVAS_MODES.MOVE);
  const [currentShapeType, setCurrentShapeType] = useState(SHAPE_TYPES.RECTANGLE); // Default to rectangle
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawPreview, setDrawPreview] = useState(null);
  const [penPoints, setPenPoints] = useState([]); // For freehand pen tool
  const [isCreatingShape, setIsCreatingShape] = useState(false); // 🔧 NEW: Flag to prevent race condition
  
  // Collaborative drawing previews
  const { 
    otherUsersPreviews, 
    isActive: isPreviewActive, 
    updatePreview, 
    clearPreview 
  } = useDrawingPreviews();

  const setMode = useCallback((mode, shapeType = null) => {
    setCurrentMode(mode);
    // If a shape type is provided, update it
    if (shapeType) {
      setCurrentShapeType(shapeType);
    }
    // Clear any drawing state when changing modes
    if (mode !== CANVAS_MODES.DRAW) {
      setIsDrawing(false);
      setDrawPreview(null);
      setIsCreatingShape(false);
      // Clear collaborative preview when switching modes
      clearPreview();
    }
  }, [clearPreview]);

  const startDrawing = useCallback((startPoint) => {
    if (currentMode === CANVAS_MODES.DRAW && !isCreatingShape) {
      setIsDrawing(true);
      
      // For pen tool, initialize points array
      if (currentShapeType === SHAPE_TYPES.PEN) {
        const initialPoints = [startPoint.x, startPoint.y];
        setPenPoints(initialPoints);
        setDrawPreview({
          type: currentShapeType,
          points: initialPoints
        });
        
        // Broadcast initial pen preview
        if (isPreviewActive) {
          updatePreview({
            type: currentShapeType,
            points: initialPoints
          });
        }
      } else {
        // For other shapes, use start/current coordinates
        setDrawPreview({
          type: currentShapeType,
          startX: startPoint.x,
          startY: startPoint.y,
          currentX: startPoint.x,
          currentY: startPoint.y
        });
        
        // 🎯 Broadcast to other users (if active)
        const updatedPreview = {
          type: currentShapeType,
          startX: startPoint.x,
          startY: startPoint.y,
          currentX: startPoint.x,
          currentY: startPoint.y
        };
        
        if (isPreviewActive) {
          updatePreview(updatedPreview);
        }
      }
    }
  }, [currentMode, CANVAS_MODES.DRAW, isCreatingShape, currentShapeType, isPreviewActive, updatePreview, SHAPE_TYPES.PEN]);

  const updateDrawing = useCallback((currentPoint) => {
    if (isDrawing && drawPreview && !isCreatingShape) {
      // For pen tool, add points to the array
      if (drawPreview.type === SHAPE_TYPES.PEN) {
        const newPoints = [...penPoints, currentPoint.x, currentPoint.y];
        setPenPoints(newPoints);
        
        const updatedPreview = {
          type: drawPreview.type,
          points: newPoints
        };
        
        setDrawPreview(updatedPreview);
        
        // Broadcast pen preview
        if (isPreviewActive) {
          updatePreview(updatedPreview);
        }
      } else {
        // For other shapes, update current coordinates
        const updatedPreview = {
          ...drawPreview,
          currentX: currentPoint.x,
          currentY: currentPoint.y
        };
        
        setDrawPreview(updatedPreview);
        
        // 🎯 Broadcast to other users
        const broadcastPreview = {
          type: drawPreview.type,
          startX: drawPreview.startX,
          startY: drawPreview.startY,
          currentX: currentPoint.x,
          currentY: currentPoint.y
        };
        
        if (isPreviewActive) {
          updatePreview(broadcastPreview);
        }
      }
    }
  }, [isDrawing, drawPreview, isCreatingShape, isPreviewActive, updatePreview, penPoints, SHAPE_TYPES.PEN]);

  const finishDrawing = useCallback(() => {
    if (isDrawing && drawPreview && !isCreatingShape) {
      // 🔧 RACE CONDITION FIX: Set flag to prevent new drawing until shape creation is complete
      setIsCreatingShape(true);
      
      let result;
      
      if (drawPreview.type === 'circle') {
        // For circles: start point is center, distance to current is radius
        const centerX = drawPreview.startX;
        const centerY = drawPreview.startY;
        const radius = Math.sqrt(
          Math.pow(drawPreview.currentX - drawPreview.startX, 2) +
          Math.pow(drawPreview.currentY - drawPreview.startY, 2)
        );
        
        // Convert to bounding box for storage (x, y = top-left corner)
        result = {
          type: 'circle',
          x: centerX - radius,
          y: centerY - radius,
          width: radius * 2,
          height: radius * 2
        };
      } else if (drawPreview.type === 'line') {
        // For lines: store start and end points
        result = {
          type: 'line',
          points: [
            drawPreview.startX,
            drawPreview.startY,
            drawPreview.currentX,
            drawPreview.currentY
          ],
          // Also store bounding box for boundary checking and selection
          x: Math.min(drawPreview.startX, drawPreview.currentX),
          y: Math.min(drawPreview.startY, drawPreview.currentY),
          width: Math.abs(drawPreview.currentX - drawPreview.startX),
          height: Math.abs(drawPreview.currentY - drawPreview.startY)
        };
      } else if (drawPreview.type === 'pen' && penPoints.length >= 4) {
        // For pen: calculate bounding box from all points
        const xCoords = penPoints.filter((_, i) => i % 2 === 0); // Even indices are X
        const yCoords = penPoints.filter((_, i) => i % 2 === 1); // Odd indices are Y
        const minX = Math.min(...xCoords);
        const maxX = Math.max(...xCoords);
        const minY = Math.min(...yCoords);
        const maxY = Math.max(...yCoords);
        
        result = {
          type: 'pen',
          points: penPoints,
          x: minX,
          y: minY,
          width: maxX - minX,
          height: maxY - minY
        };
      } else {
        // For rectangles: use standard bounding box
        result = {
          type: drawPreview.type,
          x: Math.min(drawPreview.startX, drawPreview.currentX),
          y: Math.min(drawPreview.startY, drawPreview.currentY),
          width: Math.abs(drawPreview.currentX - drawPreview.startX),
          height: Math.abs(drawPreview.currentY - drawPreview.startY)
        };
      }
      
      // 🔧 RACE CONDITION FIX: Clear preview immediately and synchronously
      setIsDrawing(false);
      setDrawPreview(null);
      setPenPoints([]); // Clear pen points
      
      // Clear collaborative preview when finishing drawing
      clearPreview();
      
      return result;
    }
    return null;
  }, [isDrawing, drawPreview, isCreatingShape, clearPreview, penPoints, SHAPE_TYPES.CIRCLE, SHAPE_TYPES.LINE]);

  const cancelDrawing = useCallback(() => {
    setIsDrawing(false);
    setDrawPreview(null);
    setPenPoints([]); // Clear pen points
    setIsCreatingShape(false);
    // Clear collaborative preview when cancelling drawing
    clearPreview();
  }, [clearPreview]);

  // 🔧 NEW: Function to reset creation flag after shape is successfully created
  const resetCreationFlag = useCallback(() => {
    setIsCreatingShape(false);
  }, []);

  const value = {
    currentMode,
    currentShapeType,
    setMode,
    CANVAS_MODES,
    SHAPE_TYPES,
    isDrawing,
    drawPreview,
    startDrawing,
    updateDrawing,
    finishDrawing,
    cancelDrawing,
    setIsCreatingShape,
    resetCreationFlag,
    // Collaborative drawing previews
    otherUsersPreviews
  };

  return (
    <CanvasModeContext.Provider value={value}>
      {children}
    </CanvasModeContext.Provider>
  );
};
