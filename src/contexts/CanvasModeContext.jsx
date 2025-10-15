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

export const CanvasModeProvider = ({ children }) => {
  const [currentMode, setCurrentMode] = useState(CANVAS_MODES.MOVE);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawPreview, setDrawPreview] = useState(null);
  const [isCreatingShape, setIsCreatingShape] = useState(false); // 🔧 NEW: Flag to prevent race condition
  
  // Collaborative drawing previews
  const { 
    otherUsersPreviews, 
    isActive: isPreviewActive, 
    updatePreview, 
    clearPreview 
  } = useDrawingPreviews();

  const setMode = useCallback((mode) => {
    setCurrentMode(mode);
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
      setDrawPreview({
        startX: startPoint.x,
        startY: startPoint.y,
        currentX: startPoint.x,
        currentY: startPoint.y
      });
    }
  }, [currentMode, isCreatingShape]);

  const updateDrawing = useCallback((currentPoint) => {
    if (isDrawing && drawPreview && !isCreatingShape) {
      const updatedPreview = {
        ...drawPreview,
        currentX: currentPoint.x,
        currentY: currentPoint.y
      };
      
      setDrawPreview(updatedPreview);
      
      // Update collaborative preview for other users to see
      if (isPreviewActive) {
        updatePreview(updatedPreview);
      }
    }
  }, [isDrawing, drawPreview, isCreatingShape, isPreviewActive, updatePreview]);

  const finishDrawing = useCallback(() => {
    if (isDrawing && drawPreview && !isCreatingShape) {
      // 🔧 RACE CONDITION FIX: Set flag to prevent new drawing until shape creation is complete
      setIsCreatingShape(true);
      
      const result = {
        x: Math.min(drawPreview.startX, drawPreview.currentX),
        y: Math.min(drawPreview.startY, drawPreview.currentY),
        width: Math.abs(drawPreview.currentX - drawPreview.startX),
        height: Math.abs(drawPreview.currentY - drawPreview.startY)
      };
      
      // 🔧 RACE CONDITION FIX: Clear preview immediately and synchronously
      setIsDrawing(false);
      setDrawPreview(null);
      
      // Clear collaborative preview when finishing drawing
      clearPreview();
      
      return result;
    }
    return null;
  }, [isDrawing, drawPreview, isCreatingShape, clearPreview]);

  const cancelDrawing = useCallback(() => {
    setIsDrawing(false);
    setDrawPreview(null);
    setIsCreatingShape(false);
    // Clear collaborative preview when cancelling drawing
    clearPreview();
  }, [clearPreview]);

  // 🔧 NEW: Function to reset creation flag after shape is successfully created
  const resetCreationFlag = useCallback(() => {
    setIsCreatingShape(false);
  }, []);

  return (
    <CanvasModeContext.Provider value={{
      currentMode,
      setMode,
      isDrawing,
      drawPreview,
      isCreatingShape,
      startDrawing,
      updateDrawing,
      finishDrawing,
      cancelDrawing,
      resetCreationFlag,
      CANVAS_MODES,
      // Collaborative drawing previews
      otherUsersPreviews,
      isPreviewActive
    }}>
      {children}
    </CanvasModeContext.Provider>
  );
};
