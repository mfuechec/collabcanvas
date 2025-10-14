// Canvas Mode Context - Drawing and interaction mode management
import { createContext, useContext, useState, useCallback } from 'react';

const CanvasModeContext = createContext();

export const useCanvasMode = () => {
  const context = useContext(CanvasModeContext);
  if (!context) {
    throw new Error('useCanvasMode must be used within a CanvasModeProvider');
  }
  return context;
};

export const CANVAS_MODES = {
  MOVE: 'move',
  DRAW: 'draw'
};

export const CanvasModeProvider = ({ children }) => {
  const [currentMode, setCurrentMode] = useState(CANVAS_MODES.MOVE);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawPreview, setDrawPreview] = useState(null);
  const [isCreatingShape, setIsCreatingShape] = useState(false); // 🔧 NEW: Flag to prevent race condition

  const setMode = useCallback((mode) => {
    setCurrentMode(mode);
    // Clear any drawing state when changing modes
    if (mode !== CANVAS_MODES.DRAW) {
      setIsDrawing(false);
      setDrawPreview(null);
      setIsCreatingShape(false);
    }
  }, []);

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
      setDrawPreview(prev => ({
        ...prev,
        currentX: currentPoint.x,
        currentY: currentPoint.y
      }));
    }
  }, [isDrawing, drawPreview, isCreatingShape]);

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
      
      return result;
    }
    return null;
  }, [isDrawing, drawPreview, isCreatingShape]);

  const cancelDrawing = useCallback(() => {
    setIsDrawing(false);
    setDrawPreview(null);
    setIsCreatingShape(false);
  }, []);

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
      CANVAS_MODES
    }}>
      {children}
    </CanvasModeContext.Provider>
  );
};
