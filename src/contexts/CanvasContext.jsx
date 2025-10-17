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
  MAX_ZOOM,
  calculateInitialCanvasPosition
} from '../utils/constants';

// Create Canvas Context
const CanvasContext = createContext();

// Canvas Provider Component
export const CanvasProvider = ({ children }) => {
  // Canvas viewport state (still local)
  // Start with null and set proper position once stage is ready
  const [canvasPosition, setCanvasPosition] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  const [isInitialized, setIsInitialized] = useState(false);

  // Selection state (local)
  const [selectedShapeId, setSelectedShapeId] = useState(null);

  // Clipboard state for copy/paste
  const [clipboard, setClipboard] = useState(null);

  // Undo/Redo state
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);
  const isUndoRedoAction = useRef(false); // Flag to prevent recording undo/redo actions

  // Stage ref for direct Konva access
  const stageRef = useRef(null);

  // Firebase canvas hook for real-time shapes
  const {
    shapes,
    shapesMap, // 🚀 PERFORMANCE: Get optimized shapes map
    isLoading,
    error,
    isConnected,
    addShape: addShapeFirebase,
    batchAddShapes: batchAddShapesFirebase,
    updateShape: updateShapeFirebase,
    batchUpdateShapes: batchUpdateShapesFirebase,
    deleteShape: deleteShapeFirebase,
    batchDeleteShapes: batchDeleteShapesFirebase,
    batchOperations: batchOperationsFirebase,
    executeSmartOperation, // NEW: Smart service layer executor
    lockShape,
    unlockShape,
    clearLockTimeout,
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

  // Initialize canvas position (called once when stage is ready)
  const initializeCanvasPosition = useCallback(() => {
    const stage = stageRef.current;
    if (stage && !isInitialized) {
      const stageWidth = stage.width();
      const stageHeight = stage.height();
      
      const initialPosition = calculateInitialCanvasPosition(stageWidth, stageHeight);
      
      setCanvasPosition(initialPosition);
      setZoom(DEFAULT_ZOOM);
      setIsInitialized(true);
      
      console.log('🎯 [CANVAS-INIT] Initial position set:', initialPosition);
    }
  }, [isInitialized]);

  const resetView = useCallback(() => {
    // Use the shared calculation function to ensure consistency
    const stage = stageRef.current;
    if (stage) {
      const stageWidth = stage.width();
      const stageHeight = stage.height();
      
      const resetPosition = calculateInitialCanvasPosition(stageWidth, stageHeight);
      
      setCanvasPosition(resetPosition);
      setZoom(DEFAULT_ZOOM);
      
      console.log('🔄 [CANVAS-RESET] Position reset to:', resetPosition);
    } else {
      // Fallback if stage not available - use constants
      setCanvasPosition({ x: DEFAULT_CANVAS_X, y: DEFAULT_CANVAS_Y });
      setZoom(DEFAULT_ZOOM);
    }
  }, []);

  // Helper to add action to history
  const recordAction = useCallback((action) => {
    if (isUndoRedoAction.current) return; // Don't record undo/redo actions
    
    setUndoStack(prev => [...prev, action]);
    setRedoStack([]); // Clear redo stack when new action is performed
    
    // Limit undo stack to 50 actions to prevent memory issues
    setUndoStack(prev => prev.slice(-50));
  }, []);

  // Undo function
  const undo = useCallback(async () => {
    if (undoStack.length === 0) {
      console.log('Nothing to undo');
      return false;
    }

    const action = undoStack[undoStack.length - 1];
    isUndoRedoAction.current = true;

    try {
      switch (action.type) {
        case 'ADD_SHAPE':
          // Undo add by deleting the shape
          await deleteShapeFirebase(action.shapeId);
          setRedoStack(prev => [...prev, action]);
          break;

        case 'DELETE_SHAPE':
          // Undo delete by re-adding the shape
          await addShapeFirebase({ ...action.shapeData, id: action.shapeId });
          setRedoStack(prev => [...prev, action]);
          break;

        case 'UPDATE_SHAPE':
          // Undo update by restoring previous state
          await updateShapeFirebase(action.shapeId, action.oldData);
          setRedoStack(prev => [...prev, action]);
          break;

        default:
          console.warn('Unknown action type:', action.type);
      }

      setUndoStack(prev => prev.slice(0, -1));
      console.log('✅ Undo successful:', action.type);
      return true;
    } catch (error) {
      console.error('❌ Undo failed:', error);
      return false;
    } finally {
      isUndoRedoAction.current = false;
    }
  }, [undoStack, deleteShapeFirebase, addShapeFirebase, updateShapeFirebase]);

  // Redo function
  const redo = useCallback(async () => {
    if (redoStack.length === 0) {
      console.log('Nothing to redo');
      return false;
    }

    const action = redoStack[redoStack.length - 1];
    isUndoRedoAction.current = true;

    try {
      switch (action.type) {
        case 'ADD_SHAPE':
          // Redo add by re-adding the shape
          await addShapeFirebase({ ...action.shapeData, id: action.shapeId });
          setUndoStack(prev => [...prev, action]);
          break;

        case 'DELETE_SHAPE':
          // Redo delete by deleting again
          await deleteShapeFirebase(action.shapeId);
          setUndoStack(prev => [...prev, action]);
          break;

        case 'UPDATE_SHAPE':
          // Redo update by applying new state
          await updateShapeFirebase(action.shapeId, action.newData);
          setUndoStack(prev => [...prev, action]);
          break;

        default:
          console.warn('Unknown action type:', action.type);
      }

      setRedoStack(prev => prev.slice(0, -1));
      console.log('✅ Redo successful:', action.type);
      return true;
    } catch (error) {
      console.error('❌ Redo failed:', error);
      return false;
    } finally {
      isUndoRedoAction.current = false;
    }
  }, [redoStack, addShapeFirebase, deleteShapeFirebase, updateShapeFirebase]);

  // Shape management methods with Firebase integration
  const addShape = useCallback(async (shapeData) => {
    try {
      const newShape = await addShapeFirebase(shapeData);
      
      // Record action for undo
      if (newShape) {
        recordAction({
          type: 'ADD_SHAPE',
          shapeId: newShape.id,
          shapeData: { ...newShape }
        });
      }
      
      return newShape;
    } catch (error) {
      console.error('Failed to add shape:', error);
      throw error;
    }
  }, [addShapeFirebase, recordAction]);

  const batchAddShapes = useCallback(async (shapesData) => {
    try {
      const newShapes = await batchAddShapesFirebase(shapesData);
      
      // Record actions for undo (record each shape)
      if (newShapes && newShapes.length > 0) {
        // Record as multiple ADD_SHAPE actions for proper undo support
        newShapes.forEach(newShape => {
          recordAction({
            type: 'ADD_SHAPE',
            shapeId: newShape.id,
            shapeData: { ...newShape }
          });
        });
      }
      
      return newShapes;
    } catch (error) {
      console.error('Failed to batch add shapes:', error);
      throw error;
    }
  }, [batchAddShapesFirebase, recordAction]);

  const updateShape = useCallback(async (shapeId, updates) => {
    try {
      // Get the old shape data before updating
      const oldShape = shapesMap.get(shapeId);
      
      const updatedShape = await updateShapeFirebase(shapeId, updates);
      
      // Record action for undo (only if we have old data)
      if (oldShape && updatedShape) {
        // Extract only the fields that were updated
        const oldData = {};
        const newData = {};
        Object.keys(updates).forEach(key => {
          oldData[key] = oldShape[key];
          newData[key] = updates[key];
        });
        
        recordAction({
          type: 'UPDATE_SHAPE',
          shapeId,
          oldData,
          newData
        });
      }
      
      return updatedShape;
    } catch (error) {
      console.error('Failed to update shape:', error);
      throw error;
    }
  }, [updateShapeFirebase, shapesMap, recordAction]);

  const deleteShape = useCallback(async (shapeId) => {
    try {
      // Get the shape data before deleting
      const shapeToDelete = shapesMap.get(shapeId);
      
      await deleteShapeFirebase(shapeId);
      
      // Record action for undo
      if (shapeToDelete) {
        recordAction({
          type: 'DELETE_SHAPE',
          shapeId,
          shapeData: { ...shapeToDelete }
        });
      }
      
      // Clear selection if deleted shape was selected
      if (selectedShapeId === shapeId) {
        setSelectedShapeId(null);
      }
      return shapeId;
    } catch (error) {
      console.error('Failed to delete shape:', error);
      throw error;
    }
  }, [deleteShapeFirebase, selectedShapeId, shapesMap, recordAction]);

  const batchUpdateShapes = useCallback(async (shapeIds, updates) => {
    try {
      // Get old shape data for undo
      const shapesToUpdate = shapeIds.map(id => shapesMap.get(id)).filter(Boolean);
      
      // Support both object and function for updates
      // If updates is a function, call it for each shapeId to get specific updates
      const isFunction = typeof updates === 'function';
      
      if (isFunction) {
        // Call batch update with per-shape updates
        await batchUpdateShapesFirebase(shapeIds, updates);
        
        // Record actions for undo with per-shape data
        if (shapesToUpdate.length > 0) {
          shapesToUpdate.forEach(oldShape => {
            const shapeUpdates = updates(oldShape.id);
            const oldData = {};
            const newData = {};
            Object.keys(shapeUpdates).forEach(key => {
              oldData[key] = oldShape[key];
              newData[key] = shapeUpdates[key];
            });
            
            recordAction({
              type: 'UPDATE_SHAPE',
              shapeId: oldShape.id,
              oldData,
              newData
            });
          });
        }
      } else {
        // Original behavior: same updates for all shapes
        await batchUpdateShapesFirebase(shapeIds, updates);
        
        // Record actions for undo
        if (shapesToUpdate.length > 0) {
          shapesToUpdate.forEach(oldShape => {
            const oldData = {};
            const newData = {};
            Object.keys(updates).forEach(key => {
              oldData[key] = oldShape[key];
              newData[key] = updates[key];
            });
            
            recordAction({
              type: 'UPDATE_SHAPE',
              shapeId: oldShape.id,
              oldData,
              newData
            });
          });
        }
      }
      
      return shapeIds;
    } catch (error) {
      console.error('Failed to batch update shapes:', error);
      throw error;
    }
  }, [batchUpdateShapesFirebase, shapesMap, recordAction]);

  const batchDeleteShapes = useCallback(async (shapeIds) => {
    try {
      // Get shape data before deleting for undo
      const shapesToDelete = shapeIds.map(id => shapesMap.get(id)).filter(Boolean);
      
      await batchDeleteShapesFirebase(shapeIds);
      
      // Record actions for undo
      if (shapesToDelete.length > 0) {
        shapesToDelete.forEach(shape => {
          recordAction({
            type: 'DELETE_SHAPE',
            shapeId: shape.id,
            shapeData: { ...shape }
          });
        });
      }
      
      // Clear selection if any deleted shape was selected
      if (shapeIds.includes(selectedShapeId)) {
        setSelectedShapeId(null);
      }
      
      return shapeIds;
    } catch (error) {
      console.error('Failed to batch delete shapes:', error);
      throw error;
    }
  }, [batchDeleteShapesFirebase, shapesMap, selectedShapeId, recordAction]);

  const duplicateShape = useCallback(async (shapeId) => {
    try {
      // Find the shape to duplicate (shapesMap is a Map object)
      const shape = shapesMap.get(shapeId);
      if (!shape) {
        console.error('Shape not found for duplication:', shapeId);
        return null;
      }

      // Create a copy with a small offset
      // Only include defined values to avoid Firestore errors
      const duplicateData = {
        type: shape.type || 'rectangle',
        x: shape.x + 20, // Offset by 20px
        y: shape.y + 20,
        width: shape.width,
        height: shape.height,
        fill: shape.fill,
        opacity: shape.opacity !== undefined ? shape.opacity : 1.0,
        ...(shape.rotation !== undefined && { rotation: shape.rotation }),
        // Copy additional properties for different shape types
        ...(shape.type === 'text' && shape.text && { text: shape.text }),
        ...(shape.type === 'text' && shape.fontSize && { fontSize: shape.fontSize }),
        ...(shape.type === 'line' && shape.points && { points: shape.points }),
        ...(shape.type === 'pen' && shape.points && { points: shape.points }),
        ...(shape.stroke && { stroke: shape.stroke }),
        ...(shape.strokeWidth !== undefined && { strokeWidth: shape.strokeWidth })
      };

      // Add the duplicate to Firebase
      const newShape = await addShapeFirebase(duplicateData);
      
      // Select the new shape
      if (newShape) {
        setSelectedShapeId(newShape.id);
      }
      
      return newShape;
    } catch (error) {
      console.error('Failed to duplicate shape:', error);
      throw error;
    }
  }, [shapesMap, addShapeFirebase]);

  // Copy shape to clipboard
  const copyShape = useCallback((shapeId) => {
    try {
      // Find the shape to copy (shapesMap is a Map object)
      const shape = shapesMap.get(shapeId);
      if (!shape) {
        console.error('Shape not found for copying:', shapeId);
        return false;
      }

      // Store shape data to clipboard (excluding id and Firebase metadata)
      // Only include defined values to avoid Firestore errors
      const shapeData = {
        type: shape.type || 'rectangle',
        x: shape.x,
        y: shape.y,
        width: shape.width,
        height: shape.height,
        fill: shape.fill,
        opacity: shape.opacity !== undefined ? shape.opacity : 1.0,
        ...(shape.rotation !== undefined && { rotation: shape.rotation }),
        // Copy additional properties for different shape types
        ...(shape.type === 'text' && shape.text && { text: shape.text }),
        ...(shape.type === 'text' && shape.fontSize && { fontSize: shape.fontSize }),
        ...(shape.type === 'line' && shape.points && { points: shape.points }),
        ...(shape.type === 'pen' && shape.points && { points: shape.points }),
        ...(shape.stroke && { stroke: shape.stroke }),
        ...(shape.strokeWidth !== undefined && { strokeWidth: shape.strokeWidth })
      };

      setClipboard(shapeData);
      console.log('📋 Copied shape to clipboard:', shapeId);
      return true;
    } catch (error) {
      console.error('Failed to copy shape:', error);
      return false;
    }
  }, [shapesMap]);

  // Helper function to constrain coordinates to canvas bounds
  const constrainToBounds = useCallback((x, y, width = 0, height = 0, rotation = 0) => {
    // No rotation - simple bounds check
    if (!rotation || rotation === 0) {
      return {
        x: Math.max(0, Math.min(x, CANVAS_WIDTH - width)),
        y: Math.max(0, Math.min(y, CANVAS_HEIGHT - height))
      };
    }
    
    // Calculate rotated bounding box by checking all four corners
    const radians = (rotation * Math.PI) / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    
    // Four corners of the unrotated rectangle (relative to top-left)
    const corners = [
      { x: 0, y: 0 },           // Top-left
      { x: width, y: 0 },       // Top-right
      { x: width, y: height },  // Bottom-right
      { x: 0, y: height }       // Bottom-left
    ];
    
    // Rotate each corner around (0, 0) and find min/max
    const rotatedCorners = corners.map(corner => ({
      x: corner.x * cos - corner.y * sin,
      y: corner.x * sin + corner.y * cos
    }));
    
    const minX = Math.min(...rotatedCorners.map(c => c.x));
    const maxX = Math.max(...rotatedCorners.map(c => c.x));
    const minY = Math.min(...rotatedCorners.map(c => c.y));
    const maxY = Math.max(...rotatedCorners.map(c => c.y));
    
    // Rotated bounding box dimensions
    const rotatedWidth = maxX - minX;
    const rotatedHeight = maxY - minY;
    const offsetX = minX; // Offset from original top-left
    const offsetY = minY;
    
    // Constrain the top-left of the rotated bounding box
    const constrainedX = Math.max(-offsetX, Math.min(x, CANVAS_WIDTH - rotatedWidth - offsetX));
    const constrainedY = Math.max(-offsetY, Math.min(y, CANVAS_HEIGHT - rotatedHeight - offsetY));
    
    return {
      x: constrainedX,
      y: constrainedY
    };
  }, []);

  // Paste shape from clipboard
  const pasteShape = useCallback(async (options = {}) => {
    try {
      if (!clipboard) {
        console.log('Clipboard is empty');
        return null;
      }

      let pasteX, pasteY;

      if (options.x !== undefined && options.y !== undefined) {
        // Use provided position (e.g., cursor position)
        pasteX = options.x;
        pasteY = options.y;
      } else {
        // Default: center of visible viewport
        const stage = stageRef.current;
        if (stage) {
          const stageWidth = stage.width();
          const stageHeight = stage.height();
          const scale = stage.scaleX();
          const position = stage.position();
          
          // Calculate center of visible area in canvas coordinates
          pasteX = (-position.x + stageWidth / 2) / scale;
          pasteY = (-position.y + stageHeight / 2) / scale;
        } else {
          // Fallback to small offset if stage not available
          pasteX = clipboard.x + 20;
          pasteY = clipboard.y + 20;
        }
      }

      // Constrain to canvas bounds
      const constrainedPos = constrainToBounds(
        pasteX - (clipboard.width || 0) / 2,
        pasteY - (clipboard.height || 0) / 2,
        clipboard.width || 0,
        clipboard.height || 0,
        clipboard.rotation || 0
      );

      // Create a new shape at the target position
      const pasteData = {
        ...clipboard,
        x: constrainedPos.x,
        y: constrainedPos.y,
      };

      // Add the pasted shape to Firebase
      const newShape = await addShapeFirebase(pasteData);
      
      // Select the new shape
      if (newShape) {
        setSelectedShapeId(newShape.id);
      }
      
      console.log('📋 Pasted shape from clipboard at:', { x: constrainedPos.x, y: constrainedPos.y });
      return newShape;
    } catch (error) {
      console.error('Failed to paste shape:', error);
      throw error;
    }
  }, [clipboard, addShapeFirebase, constrainToBounds, stageRef]);

  const selectShape = useCallback(async (shapeId) => {
    // Set selection immediately (optimistic)
    setSelectedShapeId(shapeId);
    
    // Lock the newly selected shape (lockShape will auto-unlock all other shapes by this user)
    if (shapeId) {
      try {
        await lockShape(shapeId, 300000); // 5 minute lock
        console.log('✅ [LOCKING] Shape locked:', shapeId);
      } catch (error) {
        console.error('❌ [LOCKING] Failed to lock newly selected shape:', error);
        // If lock fails, still keep it selected (local only)
      }
    }
  }, [lockShape]);

  const deselectAll = useCallback(() => {
    // Unlock the currently selected shape before deselecting
    const shapeToUnlock = selectedShapeId;
    
    // Deselect immediately (optimistic)
    setSelectedShapeId(null);
    
    // Then unlock in background
    if (shapeToUnlock) {
      console.log('🔓 [LOCKING] Unlocking shape on deselect:', shapeToUnlock);
      unlockShape(shapeToUnlock).catch((error) => {
        console.error('❌ [LOCKING] Failed to unlock shape on deselect:', error);
      });
    }
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
    shapesMap, // 🚀 PERFORMANCE: Expose shapes map for O(1) lookups
    selectedShapeId,
    selectedShape,

    // Canvas methods
    updateCanvasPosition,
    updateZoom,
    resetView,
    initializeCanvasPosition,
    getVisibleArea,

    // Shape methods (now Firebase-connected)
    addShape,
    batchAddShapes,
    updateShape,
    batchUpdateShapes,
    deleteShape,
    batchDeleteShapes,
    duplicateShape,
    copyShape,
    pasteShape,
    selectShape,
    deselectAll,

    // Undo/Redo
    undo,
    redo,
    canUndo: undoStack.length > 0,
    canRedo: redoStack.length > 0,

    // Firebase-specific methods
    batchOperations: batchOperationsFirebase,
    executeSmartOperation, // Smart service layer executor
    lockShape,
    unlockShape,
    clearLockTimeout,
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
