// Canvas Context - Global state management for canvas and shapes
import { createContext, useContext, useRef, useState, useCallback } from 'react';
import { 
  CANVAS_WIDTH, 
  CANVAS_HEIGHT, 
  DEFAULT_ZOOM, 
  DEFAULT_CANVAS_X, 
  DEFAULT_CANVAS_Y,
  MAX_SHAPES_LIMIT 
} from '../utils/constants';

// Create Canvas Context
const CanvasContext = createContext();

// Canvas Provider Component
export const CanvasProvider = ({ children }) => {
  // Canvas viewport state
  const [canvasPosition, setCanvasPosition] = useState({
    x: DEFAULT_CANVAS_X,
    y: DEFAULT_CANVAS_Y
  });
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);

  // Shapes state (will be synced with Firestore later)
  const [shapes, setShapes] = useState([]);
  const [selectedShapeId, setSelectedShapeId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Stage ref for direct Konva access
  const stageRef = useRef(null);

  // Canvas manipulation methods
  const updateCanvasPosition = useCallback((newPosition) => {
    setCanvasPosition(newPosition);
  }, []);

  const updateZoom = useCallback((newZoom) => {
    // Clamp zoom between min and max values
    const clampedZoom = Math.max(0.1, Math.min(3, newZoom));
    setZoom(clampedZoom);
  }, []);

  const resetView = useCallback(() => {
    setCanvasPosition({ x: DEFAULT_CANVAS_X, y: DEFAULT_CANVAS_Y });
    setZoom(DEFAULT_ZOOM);
  }, []);

  // Shape management methods (local state for now, will integrate Firebase later)
  const addShape = useCallback((shapeData) => {
    if (shapes.length >= MAX_SHAPES_LIMIT) {
      console.warn(`Maximum shape limit (${MAX_SHAPES_LIMIT}) reached`);
      return null;
    }

    const newShape = {
      id: `shape_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'rectangle', // Only rectangles for MVP
      x: shapeData.x || 100,
      y: shapeData.y || 100,
      width: shapeData.width || 100,
      height: shapeData.height || 100,
      fill: shapeData.fill || '#cccccc',
      createdAt: Date.now(),
      isLocked: false,
      lockedBy: null,
      ...shapeData
    };

    setShapes(prevShapes => [...prevShapes, newShape]);
    return newShape;
  }, [shapes.length]);

  const updateShape = useCallback((shapeId, updates) => {
    setShapes(prevShapes => 
      prevShapes.map(shape => 
        shape.id === shapeId 
          ? { ...shape, ...updates, lastModified: Date.now() }
          : shape
      )
    );
  }, []);

  const deleteShape = useCallback((shapeId) => {
    setShapes(prevShapes => prevShapes.filter(shape => shape.id !== shapeId));
    
    // Clear selection if deleted shape was selected
    if (selectedShapeId === shapeId) {
      setSelectedShapeId(null);
    }
  }, [selectedShapeId]);

  const selectShape = useCallback((shapeId) => {
    setSelectedShapeId(shapeId);
  }, []);

  const deselectAll = useCallback(() => {
    setSelectedShapeId(null);
  }, []);

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

    // Shapes state  
    shapes,
    selectedShapeId,
    selectedShape,

    // Canvas methods
    updateCanvasPosition,
    updateZoom,
    resetView,
    getVisibleArea,

    // Shape methods
    addShape,
    updateShape,
    deleteShape,
    selectShape,
    deselectAll,

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
