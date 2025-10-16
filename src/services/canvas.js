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
  disableNetwork,
  collection,
  writeBatch,
  query,
  getDocs,
  deleteDoc
} from 'firebase/firestore';
import { 
  ref, 
  set, 
  onValue, 
  off, 
  onDisconnect 
} from 'firebase/database';
import { getAuth } from 'firebase/auth';
import { db, rtdb } from './firebase';

// Enhanced error handling wrapper for canvas operations
const handleCanvasError = (error, operation, context = {}) => {
  console.error(`Canvas ${operation} error:`, {
    error: error.message,
    code: error.code,
    context,
    timestamp: new Date().toISOString()
  });

  // Create user-friendly error messages
  let userMessage = error.message;
  
  if (error.code === 'permission-denied') {
    userMessage = 'You don\'t have permission to perform this action.';
  } else if (error.code === 'unavailable') {
    userMessage = 'Service temporarily unavailable. Please try again.';
  } else if (error.code === 'deadline-exceeded') {
    userMessage = 'Operation timed out. Please check your connection.';
  } else if (error.message?.includes('offline')) {
    userMessage = 'You appear to be offline. Changes will sync when connection is restored.';
  } else if (error.message?.includes('quota')) {
    userMessage = 'Storage quota exceeded. Please contact support.';
  }

  // Create enhanced error with context
  const enhancedError = new Error(userMessage);
  enhancedError.code = error.code;
  enhancedError.operation = operation;
  enhancedError.context = context;
  enhancedError.originalError = error;
  enhancedError.isRetryable = ['unavailable', 'deadline-exceeded'].includes(error.code);
  
  return enhancedError;
};

// Network connectivity check
const checkNetworkConnectivity = async () => {
  try {
    // Simple connectivity check
    await fetch('/favicon.ico', { method: 'HEAD', cache: 'no-cache' });
    return true;
  } catch {
    return false;
  }
};

// Retry wrapper for network operations
const withRetry = async (operation, maxRetries = 3, delay = 1000) => {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Don't retry for certain error types
      if (error.code === 'permission-denied' || 
          error.code === 'not-found' ||
          error.message?.includes('locked by another user')) {
        throw error;
      }
      
      // Check if we should retry
      if (attempt < maxRetries && 
          (error.code === 'unavailable' || 
           error.code === 'deadline-exceeded' ||
           !navigator.onLine)) {
        
        console.log(`Canvas operation failed, retrying in ${delay}ms (attempt ${attempt}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 1.5; // Exponential backoff
        continue;
      }
      
      throw error;
    }
  }
  
  throw lastError;
};

// Canvas document ID for MVP (single global canvas)
const CANVAS_DOC_ID = 'global-canvas-v1';
const CANVAS_COLLECTION = 'canvas';
const DISCONNECT_CLEANUP_PATH = 'disconnect-cleanup';
const CANVAS_SESSION_ID = 'global-canvas-v1';

// Get current user ID from Firebase Auth or generate session ID
const getCurrentUserId = () => {
  // Try to get from Firebase Auth first
  const auth = getAuth();
  if (auth.currentUser?.uid) {
    return auth.currentUser.uid;
  }
  
  // Fallback to session storage for anonymous users - use same key as cursor service
  let userId = sessionStorage.getItem('cursor_user_id');
  if (!userId) {
    userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    sessionStorage.setItem('cursor_user_id', userId);
  }
  return userId;
};

// Initialize canvas document if it doesn't exist
// ARCHITECTURE: Canvas metadata in main doc, shapes in subcollection
const initializeCanvasDocument = async (canvasId = CANVAS_DOC_ID) => {
  return withRetry(async () => {
    try {
      const canvasRef = doc(db, CANVAS_COLLECTION, canvasId);
      const canvasDoc = await getDoc(canvasRef);
      
      if (!canvasDoc.exists()) {
        console.log('✨ Initializing new per-shape canvas architecture:', canvasId);
        // NEW: Only metadata in main document, shapes go in subcollection
        await setDoc(canvasRef, {
          canvasId,
          shapeCount: 0, // Track count instead of array
          lastUpdated: serverTimestamp(),
          createdAt: serverTimestamp(),
          createdBy: getCurrentUserId()
        });
      }
      
      return canvasRef;
    } catch (error) {
      throw handleCanvasError(error, 'initialize', { canvasId });
    }
  });
};

// Subscribe to real-time shape updates
// NEW ARCHITECTURE: Listens to shapes subcollection (each shape is a separate document)
const subscribeToShapes = (canvasId = CANVAS_DOC_ID, callback) => {
  try {
    // Subscribe to shapes subcollection instead of main document
    const shapesCollectionRef = getShapesCollectionRef(canvasId);
    const shapesQuery = query(shapesCollectionRef);
    
    console.log('📡 [PER-SHAPE] Subscribing to shapes subcollection:', canvasId);
    
    const unsubscribe = onSnapshot(shapesQuery, (querySnapshot) => {
      // Convert Firestore documents to shape objects
      const shapes = [];
      querySnapshot.forEach((doc) => {
        shapes.push({
          id: doc.id,
          ...doc.data()
        });
      });
      
      console.log(`📊 [PER-SHAPE] Canvas updated: ${shapes.length} shapes`);
      
      // Debug: Log lock state of locked shapes
      shapes.forEach(shape => {
        if (shape.isLocked) {
          console.log('🔍 [FIREBASE-UPDATE] Shape lock state:', {
            id: shape.id,
            isLocked: shape.isLocked,
            lockedBy: shape.lockedBy,
            lockedAt: shape.lockedAt
          });
        }
      });
      
      callback({
        shapes,
        lastUpdated: Date.now(),
        canvasId
      });
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

// HELPER: Get reference to a shape document in subcollection
const getShapeRef = (shapeId, canvasId = CANVAS_DOC_ID) => {
  return doc(db, CANVAS_COLLECTION, canvasId, 'shapes', shapeId);
};

// HELPER: Get reference to shapes collection
const getShapesCollectionRef = (canvasId = CANVAS_DOC_ID) => {
  return collection(db, CANVAS_COLLECTION, canvasId, 'shapes');
};

// Create a new shape
// NEW ARCHITECTURE: Creates shape as individual document in subcollection
const createShape = async (shapeData, canvasId = CANVAS_DOC_ID) => {
  return withRetry(async () => {
    try {
      const userId = getCurrentUserId();
      
      // Ensure canvas document exists
      await initializeCanvasDocument(canvasId);
      
      const now = Date.now();
      const shapeId = `shape_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const newShape = {
        // Spread shapeData first, then apply defaults/overrides
        ...shapeData,
        // Apply defaults for missing fields
        type: shapeData.type || 'rectangle',
        x: shapeData.x || 100,
        y: shapeData.y || 100,
        width: shapeData.width || 100,
        height: shapeData.height || 100,
        fill: shapeData.fill || '#cccccc',
        opacity: shapeData.opacity !== undefined ? shapeData.opacity : 0.8,
        // System fields (always override)
        createdBy: userId,
        createdAt: now,
        lastModifiedBy: userId,
        lastModifiedAt: now,
        isLocked: false
      };
      
      console.log('📝 [PER-SHAPE] Creating shape:', shapeId);
      
      // Write shape to its own document in subcollection
      const shapeRef = getShapeRef(shapeId, canvasId);
      await setDoc(shapeRef, newShape);
      
      return { id: shapeId, ...newShape };
    } catch (error) {
      throw handleCanvasError(error, 'create', { shapeData, canvasId });
    }
  });
};

// Batch create multiple shapes in a single Firebase operation
// NEW ARCHITECTURE: Uses writeBatch() to write all shapes simultaneously
const batchCreateShapes = async (shapesData, canvasId = CANVAS_DOC_ID) => {
  return withRetry(async () => {
    try {
      const userId = getCurrentUserId();
      
      // Ensure canvas document exists
      await initializeCanvasDocument(canvasId);
      
      const now = Date.now();
      
      // Create batch operation (can handle up to 500 operations)
      const batch = writeBatch(db);
      
      // Process all shapes and add to batch
      const newShapes = shapesData.map((shapeData, index) => {
        const shapeId = `shape_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${index}`;
        
        const shape = {
          ...shapeData,
          type: shapeData.type || 'rectangle',
          x: shapeData.x !== undefined ? shapeData.x : 100,
          y: shapeData.y !== undefined ? shapeData.y : 100,
          width: shapeData.width || 100,
          height: shapeData.height || 100,
          fill: shapeData.fill || '#cccccc',
          opacity: shapeData.opacity !== undefined ? shapeData.opacity : 0.8,
          createdBy: userId,
          createdAt: now + index,
          lastModifiedBy: userId,
          lastModifiedAt: now + index,
          isLocked: false
        };
        
        // Add this shape's document to the batch
        const shapeRef = getShapeRef(shapeId, canvasId);
        batch.set(shapeRef, shape);
        
        return { id: shapeId, ...shape };
      });
      
      console.log(`🚀 [WRITEBATCH] Creating ${newShapes.length} shapes in TRUE parallel operation`);
      
      // Execute all writes atomically (all succeed or all fail)
      await batch.commit();
      
      console.log(`✅ [WRITEBATCH] Successfully batch created ${newShapes.length} shapes`);
      
      return newShapes;
    } catch (error) {
      throw handleCanvasError(error, 'batchCreate', { shapesCount: shapesData.length, canvasId });
    }
  });
};

// Update an existing shape
// NEW ARCHITECTURE: Updates shape document directly in subcollection
const updateShape = async (shapeId, updates, canvasId = CANVAS_DOC_ID) => {
  try {
    const userId = getCurrentUserId();
    const shapeRef = getShapeRef(shapeId, canvasId);
    
    // Get current shape document
    const shapeDoc = await getDoc(shapeRef);
    if (!shapeDoc.exists()) {
      throw new Error('Shape not found');
    }
    
    const currentShape = shapeDoc.data();
    
    // Check if shape is locked by another user
    if (currentShape.isLocked && currentShape.lockedBy !== userId) {
      throw new Error('Shape is locked by another user');
    }
    
    // Update the shape document
    const updateData = {
      ...updates,
      lastModifiedBy: userId,
      lastModifiedAt: Date.now()
    };
    
    console.log('📝 [PER-SHAPE] Updating shape:', shapeId);
    
    await updateDoc(shapeRef, updateData);
    
    return { id: shapeId, ...currentShape, ...updateData };
  } catch (error) {
    console.error('Error updating shape:', error);
    throw error;
  }
};

// Delete a shape
// NEW ARCHITECTURE: Deletes shape document from subcollection
const deleteShape = async (shapeId, canvasId = CANVAS_DOC_ID) => {
  try {
    const userId = getCurrentUserId();
    const shapeRef = getShapeRef(shapeId, canvasId);
    
    // Get shape to check lock status
    const shapeDoc = await getDoc(shapeRef);
    if (!shapeDoc.exists()) {
      throw new Error('Shape not found');
    }
    
    const shape = shapeDoc.data();
    
    // Check if shape is locked by another user
    if (shape.isLocked && shape.lockedBy !== userId) {
      throw new Error('Cannot delete shape locked by another user');
    }
    
    console.log('🗑️ [PER-SHAPE] Deleting shape:', shapeId);
    
    // Delete the shape document
    await deleteDoc(shapeRef);
    
    return shapeId;
  } catch (error) {
    console.error('Error deleting shape:', error);
    throw error;
  }
};

// Batch update multiple shapes in a single Firebase operation
// NEW ARCHITECTURE: Uses writeBatch() for parallel updates
const batchUpdateShapes = async (shapeIds, updates, canvasId = CANVAS_DOC_ID) => {
  try {
    const userId = getCurrentUserId();
    const now = Date.now();
    
    // Create batch operation
    const batch = writeBatch(db);
    
    console.log(`🚀 [WRITEBATCH] Updating ${shapeIds.length} shapes in parallel`);
    
    // Add all updates to batch
    for (const shapeId of shapeIds) {
      const shapeRef = getShapeRef(shapeId, canvasId);
      
      // Note: We can't check locks before batch, so we update optimistically
      // The client-side should prevent updating locked shapes
      batch.update(shapeRef, {
        ...updates,
        lastModifiedBy: userId,
        lastModifiedAt: now
      });
    }
    
    // Execute all updates atomically
    await batch.commit();
    
    console.log(`✅ [WRITEBATCH] Successfully batch updated ${shapeIds.length} shapes`);
    
    return shapeIds;
  } catch (error) {
    throw handleCanvasError(error, 'batchUpdate', { shapeIds, updates, canvasId });
  }
};

// Batch delete multiple shapes in a single Firebase operation
// NEW ARCHITECTURE: Uses writeBatch() for parallel deletes
const batchDeleteShapes = async (shapeIds, canvasId = CANVAS_DOC_ID) => {
  try {
    // Create batch operation
    const batch = writeBatch(db);
    
    console.log(`🚀 [WRITEBATCH] Deleting ${shapeIds.length} shapes in parallel`);
    
    // Add all deletes to batch
    for (const shapeId of shapeIds) {
      const shapeRef = getShapeRef(shapeId, canvasId);
      batch.delete(shapeRef);
    }
    
    // Execute all deletes atomically
    await batch.commit();
    
    console.log(`✅ [WRITEBATCH] Successfully batch deleted ${shapeIds.length} shapes`);
    
    return shapeIds;
  } catch (error) {
    throw handleCanvasError(error, 'batchDelete', { shapeIds, canvasId });
  }
};

// Lock a shape (for collaborative editing)
// NEW ARCHITECTURE: Works with subcollection, uses batch for auto-unlock
const lockShape = async (shapeId, canvasId = CANVAS_DOC_ID) => {
  try {
    const userId = getCurrentUserId();
    
    // FIRST: Query all shapes to find those locked by this user
    const shapesCollectionRef = getShapesCollectionRef(canvasId);
    const shapesSnapshot = await getDocs(query(shapesCollectionRef));
    
    const batch = writeBatch(db);
    let shapesToUnlock = 0;
    
    // Find all shapes locked by this user (except the one we're about to lock)
    shapesSnapshot.forEach((doc) => {
      const shape = doc.data();
      if (shape.isLocked === true && shape.lockedBy === userId && doc.id !== shapeId) {
        // Add unlock to batch
        batch.update(doc.ref, {
          isLocked: false,
          lockedBy: null,
          lockedAt: null,
          unlockedAt: Date.now(),
          lastModifiedAt: Date.now(),
          lastModifiedBy: userId
        });
        shapesToUnlock++;
      }
    });
    
    if (shapesToUnlock > 0) {
      console.log(`🔓 [AUTO-UNLOCK] Unlocking ${shapesToUnlock} shapes for user ${userId}`);
    }
    
    // Add lock for new shape to the same batch
    const shapeRef = getShapeRef(shapeId, canvasId);
    batch.update(shapeRef, {
      isLocked: true,
      lockedBy: userId,
      lockedAt: Date.now(),
      lastModifiedAt: Date.now(),
      lastModifiedBy: userId
    });
    
    // Execute all operations atomically
    await batch.commit();
    
    // Set up automatic unlock on disconnect (browser close/refresh)
    const lockCleanupRef = ref(rtdb, `${DISCONNECT_CLEANUP_PATH}/${CANVAS_SESSION_ID}/${userId}/${shapeId}`);
    await onDisconnect(lockCleanupRef).set({
      action: 'unlock',
      shapeId,
      canvasId,
      userId,
      timestamp: Date.now()
    });
    
    console.log('✅ [LOCKING-SERVICE] Shape locked successfully with disconnect cleanup:', shapeId);
    return true;
  } catch (error) {
    console.error('Error locking shape:', error);
    throw new Error('Failed to lock shape');
  }
};

// Set up disconnect cleanup for a shape being dragged
const setupDisconnectCleanup = async (shapeId, originalPosition, canvasId = CANVAS_DOC_ID) => {
  try {
    const userId = getCurrentUserId();
    const cleanupRef = ref(rtdb, `${DISCONNECT_CLEANUP_PATH}/${CANVAS_SESSION_ID}/${userId}/${shapeId}`);
    
    // Set up automatic cleanup on disconnect
    await onDisconnect(cleanupRef).set({
      action: 'unlock_and_revert',
      shapeId,
      originalPosition,
      canvasId,
      userId,
      timestamp: Date.now()
    });
    
    // Set active drag marker
    await set(cleanupRef, {
      action: 'dragging',
      shapeId,
      originalPosition,
      canvasId,
      userId,
      timestamp: Date.now()
    });
    
    console.log('✅ [DISCONNECT-CLEANUP] Setup for shape:', shapeId);
  } catch (error) {
    console.error('❌ [DISCONNECT-CLEANUP] Setup failed:', error);
  }
};

// Clear disconnect cleanup for a shape
const clearDisconnectCleanup = async (shapeId) => {
  try {
    const userId = getCurrentUserId();
    const cleanupRef = ref(rtdb, `${DISCONNECT_CLEANUP_PATH}/${CANVAS_SESSION_ID}/${userId}/${shapeId}`);
    
    // Cancel the onDisconnect and remove current data
    await onDisconnect(cleanupRef).cancel();
    await set(cleanupRef, null);
    
    console.log('✅ [DISCONNECT-CLEANUP] Cleared for shape:', shapeId);
  } catch (error) {
    console.error('❌ [DISCONNECT-CLEANUP] Clear failed:', error);
  }
};

// Monitor disconnect cleanup events and process them
const monitorDisconnectCleanup = (callback) => {
  try {
    const cleanupRef = ref(rtdb, `${DISCONNECT_CLEANUP_PATH}/${CANVAS_SESSION_ID}`);
    
    const handleCleanupEvents = (snapshot) => {
      const allCleanups = snapshot.val() || {};
      
      Object.keys(allCleanups).forEach(userId => {
        const userCleanups = allCleanups[userId] || {};
        
        Object.keys(userCleanups).forEach(shapeId => {
          const cleanup = userCleanups[shapeId];
          
          if (cleanup && (cleanup.action === 'unlock_and_revert' || cleanup.action === 'unlock')) {
            console.log('🔄 [DISCONNECT-CLEANUP] Processing cleanup for shape:', shapeId, 'action:', cleanup.action);
            
            // Process the cleanup
            callback({
              shapeId: cleanup.shapeId,
              originalPosition: cleanup.originalPosition, // May be undefined for 'unlock' action
              canvasId: cleanup.canvasId,
              userId: cleanup.userId,
              action: cleanup.action
            });
            
            // Remove the cleanup event after processing
            const eventRef = ref(rtdb, `${DISCONNECT_CLEANUP_PATH}/${CANVAS_SESSION_ID}/${userId}/${shapeId}`);
            set(eventRef, null).catch(error => {
              console.error('Failed to clear cleanup event:', error);
            });
          }
        });
      });
    };
    
    onValue(cleanupRef, handleCleanupEvents, (error) => {
      console.error('❌ [DISCONNECT-CLEANUP] Monitor error:', error);
    });
    
    return () => {
      off(cleanupRef, 'value', handleCleanupEvents);
    };
  } catch (error) {
    console.error('❌ [DISCONNECT-CLEANUP] Monitor setup failed:', error);
    return () => {};
  }
};

// Unlock a shape
// NEW ARCHITECTURE: Updates shape document directly in subcollection
const unlockShape = async (shapeId, canvasId = CANVAS_DOC_ID) => {
  try {
    const userId = getCurrentUserId();
    
    // Clear disconnect cleanup first
    await clearDisconnectCleanup(shapeId);
    
    // Get reference to shape document
    const shapeRef = getShapeRef(shapeId, canvasId);
    const shapeDoc = await getDoc(shapeRef);
    
    if (!shapeDoc.exists()) {
      console.warn('Shape not found for unlock (may have been deleted):', shapeId);
      return; // Shape doesn't exist, nothing to unlock
    }
    
    // Update shape to remove lock
    await updateDoc(shapeRef, {
      isLocked: false,
      lockedBy: null,
      lockedAt: null,
      unlockedAt: Date.now(),
      lastModifiedBy: userId,
      lastModifiedAt: Date.now()
    });
    
    console.log('✅ [LOCKING-SERVICE] Shape unlocked successfully:', shapeId, 'by user:', userId);
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

// Process a disconnect cleanup event
const processDisconnectCleanup = async ({ shapeId, originalPosition, canvasId, userId, action }) => {
  try {
    console.log('🔄 [DISCONNECT-CLEANUP] Processing cleanup for shape:', shapeId, 'from user:', userId, 'action:', action);
    
    if (action === 'unlock_and_revert' && originalPosition) {
      // Drag operation disconnect: revert position AND unlock
      await updateShape(shapeId, {
        x: originalPosition.x,
        y: originalPosition.y
      }, canvasId);
      
      await unlockShape(shapeId, canvasId);
      console.log('✅ [DISCONNECT-CLEANUP] Reverted position and unlocked shape:', shapeId);
    } else if (action === 'unlock') {
      // Selection-only disconnect: just unlock
      await unlockShape(shapeId, canvasId);
      console.log('✅ [DISCONNECT-CLEANUP] Unlocked shape:', shapeId);
    }
  } catch (error) {
    console.error('❌ [DISCONNECT-CLEANUP] Processing failed:', error);
  }
};

// Get current user ID for external use
const getUserId = getCurrentUserId;

export {
  subscribeToShapes,
  createShape,
  batchCreateShapes,
  updateShape,
  batchUpdateShapes,
  deleteShape,
  batchDeleteShapes,
  lockShape,
  unlockShape,
  setupDisconnectCleanup,
  clearDisconnectCleanup,
  monitorDisconnectCleanup,
  processDisconnectCleanup,
  getUserId
};
