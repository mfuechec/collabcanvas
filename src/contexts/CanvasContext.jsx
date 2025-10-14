// Canvas Context - Global state management for canvas and shapes with Firebase sync
import { createContext, useContext, useRef, useState, useCallback } from 'react';
import { useFirebaseCanvas } from '../hooks/useFirebaseCanvas';
import { 
  CANVAS_WIDTH, 
  CANVAS_HEIGHT, 
  DEFAULT_ZOOM, 
  DEFAULT_CANVAS_X, 
  DEFAULT_CANVAS_Y,
  MIN_ZOOM,
  MAX_ZOOM
} from '../utils/constants';

// Create Canvas Context
const CanvasContext = createContext();

// Canvas Provider Component
export const CanvasProvider = ({ children }) => {
  // Canvas viewport state (still local)
  const [canvasPosition, setCanvasPosition] = useState({
    x: DEFAULT_CANVAS_X,
    y: DEFAULT_CANVAS_Y
  });
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);

  // Selection state (local)
  const [selectedShapeId, setSelectedShapeId] = useState(null);

  // Stage ref for direct Konva access
  const stageRef = useRef(null);

  // Firebase canvas hook for real-time shapes
  const {
    shapes,
    isLoading,
    error,
    isConnected,
    addShape: addShapeFirebase,
    updateShape: updateShapeFirebase,
    deleteShape: deleteShapeFirebase,
    lockShape,
    unlockShape,
    isShapeLockedByCurrentUser,
    isShapeLockedByOther,
    getCurrentUserId,
    retryConnection
  } = useFirebaseCanvas();

  // Canvas manipulation methods
  const updateCanvasPosition = useCallback((newPosition) => {
    setCanvasPosition(newPosition);
  }, []);

  const updateZoom = useCallback((newZoom) => {
    // Clamp zoom between min and max values
    const clampedZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));
    setZoom(clampedZoom);
  }, []);

  const resetView = useCallback(() => {
    // Calculate position to center the entire 5000x5000 canvas in viewport
    const stage = stageRef.current;
    if (stage) {
      const stageWidth = stage.width();
      const stageHeight = stage.height();
      
      // At DEFAULT_ZOOM (0.2), the 5000x5000 canvas becomes 1000x1000
      const scaledCanvasWidth = CANVAS_WIDTH * DEFAULT_ZOOM;
      const scaledCanvasHeight = CANVAS_HEIGHT * DEFAULT_ZOOM;
      
      // Center the scaled canvas in the viewport
      const centerX = (stageWidth - scaledCanvasWidth) / 2;
      const centerY = (stageHeight - scaledCanvasHeight) / 2;
      
      setCanvasPosition({ x: centerX, y: centerY });
      setZoom(DEFAULT_ZOOM);
    } else {
      // Fallback if stage not available
      setCanvasPosition({ x: DEFAULT_CANVAS_X, y: DEFAULT_CANVAS_Y });
      setZoom(DEFAULT_ZOOM);
    }
  }, []);

  // Shape management methods with Firebase integration
  const addShape = useCallback(async (shapeData) => {
    try {
      const newShape = await addShapeFirebase(shapeData);
      return newShape;
    } catch (error) {
      console.error('Failed to add shape:', error);
      throw error;
    }
  }, [addShapeFirebase]);

  const updateShape = useCallback(async (shapeId, updates) => {
    try {
      const updatedShape = await updateShapeFirebase(shapeId, updates);
      return updatedShape;
    } catch (error) {
      console.error('Failed to update shape:', error);
      throw error;
    }
  }, [updateShapeFirebase]);

  const deleteShape = useCallback(async (shapeId) => {
    try {
      await deleteShapeFirebase(shapeId);
      // Clear selection if deleted shape was selected
      if (selectedShapeId === shapeId) {
        setSelectedShapeId(null);
      }
      return shapeId;
    } catch (error) {
      console.error('Failed to delete shape:', error);
      throw error;
    }
  }, [deleteShapeFirebase, selectedShapeId]);

  const selectShape = useCallback((shapeId) => {
    // Unlock the previously selected shape when selecting a new one
    if (selectedShapeId && selectedShapeId !== shapeId) {
      console.log('🔓 [LOCKING] Unlocking previous shape on new selection:', selectedShapeId);
      unlockShape(selectedShapeId).catch((error) => {
        console.error('❌ [LOCKING] Failed to unlock previous shape on new selection:', error);
      });
    }
    setSelectedShapeId(shapeId);
  }, [selectedShapeId, unlockShape]);

  const deselectAll = useCallback(() => {
    // Unlock the currently selected shape before deselecting
    if (selectedShapeId) {
      console.log('🔓 [LOCKING] Unlocking shape on deselect:', selectedShapeId);
      unlockShape(selectedShapeId).catch((error) => {
        console.error('❌ [LOCKING] Failed to unlock shape on deselect:', error);
      });
    }
    setSelectedShapeId(null);
  }, [selectedShapeId, unlockShape]);

  // Get selected shape
  const selectedShape = shapes.find(shape => shape.id === selectedShapeId) || null;

  // Canvas boundary checking utilities
  const isWithinBounds = useCallback((x, y, width = 0, height = 0) => {
    return (
      x >= 0 && 
      y >= 0 && 
      x + width <= CANVAS_WIDTH && 
      y + height <= CANVAS_HEIGHT
    );
  }, []);

  const constrainToBounds = useCallback((x, y, width = 0, height = 0) => {
    return {
      x: Math.max(0, Math.min(x, CANVAS_WIDTH - width)),
      y: Math.max(0, Math.min(y, CANVAS_HEIGHT - height))
    };
  }, []);

  // Get visible canvas area based on current zoom and position
  const getVisibleArea = useCallback(() => {
    if (!stageRef.current) return null;

    const stage = stageRef.current;
    const scale = stage.scaleX(); // Assuming uniform scaling
    const stageWidth = stage.width();
    const stageHeight = stage.height();
    const position = stage.position();

    return {
      x: -position.x / scale,
      y: -position.y / scale,
      width: stageWidth / scale,
      height: stageHeight / scale
    };
  }, []);

  // Canvas context value
  const contextValue = {
    // Canvas state
    canvasPosition,
    zoom,
    stageRef,
    isLoading,
    error,
    isConnected,

    // Shapes state  
    shapes,
    selectedShapeId,
    selectedShape,

    // Canvas methods
    updateCanvasPosition,
    updateZoom,
    resetView,
    getVisibleArea,

    // Shape methods (now Firebase-connected)
    addShape,
    updateShape,
    deleteShape,
    selectShape,
    deselectAll,

    // Firebase-specific methods
    lockShape,
    unlockShape,
    isShapeLockedByCurrentUser,
    isShapeLockedByOther,
    getCurrentUserId,
    retryConnection,

    // Utility methods
    isWithinBounds,
    constrainToBounds,

    // Canvas dimensions (constants)
    canvasWidth: CANVAS_WIDTH,
    canvasHeight: CANVAS_HEIGHT
  };

  return (
    <CanvasContext.Provider value={contextValue}>
      {children}
    </CanvasContext.Provider>
  );
};

// Custom hook to use Canvas Context
export const useCanvas = () => {
  const context = useContext(CanvasContext);
  
  if (!context) {
    throw new Error('useCanvas must be used within a CanvasProvider');
  }
  
  return context;
};

// Export context for testing
export { CanvasContext };
