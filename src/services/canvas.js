// Canvas Service - Firebase Firestore operations for real-time shape synchronization
import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  onSnapshot, 
  arrayUnion, 
  arrayRemove,
  serverTimestamp,
  enableNetwork,
  disableNetwork
} from 'firebase/firestore';
import { db } from './firebase';

// Canvas document ID for MVP (single global canvas)
const CANVAS_DOC_ID = 'global-canvas-v1';
const CANVAS_COLLECTION = 'canvas';

// Get current user ID (will be enhanced when we have proper user management)
const getCurrentUserId = () => {
  // For now, generate a session-based user ID
  // TODO: Replace with actual Firebase Auth user ID
  if (!window.canvasUserId) {
    window.canvasUserId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
  return window.canvasUserId;
};

// Initialize canvas document if it doesn't exist
const initializeCanvasDocument = async (canvasId = CANVAS_DOC_ID) => {
  try {
    const canvasRef = doc(db, CANVAS_COLLECTION, canvasId);
    const canvasDoc = await getDoc(canvasRef);
    
    if (!canvasDoc.exists()) {
      console.log('Initializing new canvas document:', canvasId);
      await setDoc(canvasRef, {
        canvasId,
        shapes: [],
        lastUpdated: serverTimestamp(),
        createdAt: serverTimestamp(),
        createdBy: getCurrentUserId()
      });
    }
    
    return canvasRef;
  } catch (error) {
    console.error('Error initializing canvas document:', error);
    throw new Error('Failed to initialize canvas document');
  }
};

// Subscribe to real-time shape updates
const subscribeToShapes = (canvasId = CANVAS_DOC_ID, callback) => {
  try {
    const canvasRef = doc(db, CANVAS_COLLECTION, canvasId);
    
    console.log('Subscribing to canvas updates:', canvasId);
    
    const unsubscribe = onSnapshot(canvasRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const data = docSnapshot.data();
        console.log('Canvas data updated:', data);
        callback({
          shapes: data.shapes || [],
          lastUpdated: data.lastUpdated,
          canvasId: data.canvasId
        });
      } else {
        console.log('Canvas document does not exist, initializing...');
        initializeCanvasDocument(canvasId).then(() => {
          callback({
            shapes: [],
            lastUpdated: null,
            canvasId
          });
        });
      }
    }, (error) => {
      console.error('Error in canvas subscription:', error);
      callback({
        error: 'Failed to sync with server. Please check your connection.',
        shapes: [],
        lastUpdated: null,
        canvasId
      });
    });
    
    return unsubscribe;
  } catch (error) {
    console.error('Error setting up canvas subscription:', error);
    throw new Error('Failed to subscribe to canvas updates');
  }
};

// Create a new shape
const createShape = async (shapeData, canvasId = CANVAS_DOC_ID) => {
  try {
    const canvasRef = doc(db, CANVAS_COLLECTION, canvasId);
    const userId = getCurrentUserId();
    
    // Ensure canvas document exists
    await initializeCanvasDocument(canvasId);
    
    // Use regular timestamp since serverTimestamp() doesn't work with arrayUnion
    const now = Date.now();
    
    const newShape = {
      id: `shape_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'rectangle', // Only rectangles for MVP
      x: shapeData.x || 100,
      y: shapeData.y || 100,
      width: shapeData.width || 100,
      height: shapeData.height || 100,
      fill: shapeData.fill || '#cccccc',
      createdBy: userId,
      createdAt: now,
      lastModifiedBy: userId,
      lastModifiedAt: now,
      isLocked: false,
      lockedBy: null,
      ...shapeData
    };
    
    console.log('Creating shape:', newShape);
    
    // Add shape to shapes array
    await updateDoc(canvasRef, {
      shapes: arrayUnion(newShape),
      lastUpdated: serverTimestamp(),
      lastModifiedBy: userId
    });
    
    return newShape;
  } catch (error) {
    console.error('Error creating shape:', error);
    throw new Error('Failed to create shape. Please try again.');
  }
};

// Update an existing shape
const updateShape = async (shapeId, updates, canvasId = CANVAS_DOC_ID) => {
  try {
    const canvasRef = doc(db, CANVAS_COLLECTION, canvasId);
    const userId = getCurrentUserId();
    
    // Get current document
    const docSnapshot = await getDoc(canvasRef);
    if (!docSnapshot.exists()) {
      throw new Error('Canvas document not found');
    }
    
    const data = docSnapshot.data();
    const shapes = data.shapes || [];
    
    // Find and update the shape
    const shapeIndex = shapes.findIndex(shape => shape.id === shapeId);
    if (shapeIndex === -1) {
      throw new Error('Shape not found');
    }
    
    const currentShape = shapes[shapeIndex];
    
    // Check if shape is locked by another user
    if (currentShape.isLocked && currentShape.lockedBy !== userId) {
      throw new Error('Shape is locked by another user');
    }
    
    // Update the shape
    const updatedShape = {
      ...currentShape,
      ...updates,
      lastModifiedBy: userId,
      lastModifiedAt: Date.now() // Use regular timestamp instead of serverTimestamp
    };
    
    // Replace the shape in the array
    const updatedShapes = [...shapes];
    updatedShapes[shapeIndex] = updatedShape;
    
    console.log('Updating shape:', shapeId, updates);
    
    await updateDoc(canvasRef, {
      shapes: updatedShapes,
      lastUpdated: serverTimestamp(),
      lastModifiedBy: userId
    });
    
    return updatedShape;
  } catch (error) {
    console.error('Error updating shape:', error);
    throw error; // Re-throw to preserve specific error messages
  }
};

// Delete a shape
const deleteShape = async (shapeId, canvasId = CANVAS_DOC_ID) => {
  try {
    const canvasRef = doc(db, CANVAS_COLLECTION, canvasId);
    const userId = getCurrentUserId();
    
    // Get current document
    const docSnapshot = await getDoc(canvasRef);
    if (!docSnapshot.exists()) {
      throw new Error('Canvas document not found');
    }
    
    const data = docSnapshot.data();
    const shapes = data.shapes || [];
    
    // Find the shape to delete
    const shapeToDelete = shapes.find(shape => shape.id === shapeId);
    if (!shapeToDelete) {
      throw new Error('Shape not found');
    }
    
    // Check if shape is locked by another user
    if (shapeToDelete.isLocked && shapeToDelete.lockedBy !== userId) {
      throw new Error('Cannot delete shape locked by another user');
    }
    
    console.log('Deleting shape:', shapeId);
    
    // Remove shape from shapes array
    await updateDoc(canvasRef, {
      shapes: arrayRemove(shapeToDelete),
      lastUpdated: serverTimestamp(),
      lastModifiedBy: userId
    });
    
    return shapeId;
  } catch (error) {
    console.error('Error deleting shape:', error);
    throw error; // Re-throw to preserve specific error messages
  }
};

// Lock a shape (for collaborative editing)
const lockShape = async (shapeId, canvasId = CANVAS_DOC_ID) => {
  try {
    const userId = getCurrentUserId();
    
    await updateShape(shapeId, {
      isLocked: true,
      lockedBy: userId,
      lockedAt: Date.now() // Use regular timestamp
    }, canvasId);
    
    console.log('Shape locked:', shapeId, 'by user:', userId);
    return true;
  } catch (error) {
    console.error('Error locking shape:', error);
    throw new Error('Failed to lock shape');
  }
};

// Unlock a shape
const unlockShape = async (shapeId, canvasId = CANVAS_DOC_ID) => {
  try {
    const userId = getCurrentUserId();
    
    await updateShape(shapeId, {
      isLocked: false,
      lockedBy: null,
      lockedAt: null,
      unlockedAt: Date.now() // Use regular timestamp
    }, canvasId);
    
    console.log('Shape unlocked:', shapeId, 'by user:', userId);
    return true;
  } catch (error) {
    console.error('Error unlocking shape:', error);
    throw new Error('Failed to unlock shape');
  }
};

// Enable/disable offline persistence
const enableOfflinePersistence = async () => {
  try {
    await enableNetwork(db);
    console.log('Firestore network enabled');
  } catch (error) {
    console.error('Error enabling Firestore network:', error);
  }
};

const disableOfflinePersistence = async () => {
  try {
    await disableNetwork(db);
    console.log('Firestore network disabled');
  } catch (error) {
    console.error('Error disabling Firestore network:', error);
  }
};

// Get current user ID for external use
const getUserId = getCurrentUserId;

export {
  subscribeToShapes,
  createShape,
  updateShape,
  deleteShape,
  lockShape,
  unlockShape,
  initializeCanvasDocument,
  enableOfflinePersistence,
  disableOfflinePersistence,
  getUserId,
  CANVAS_DOC_ID
};
