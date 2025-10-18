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
      // ✅ FIX: Respect provided ID (for undo/redo), otherwise generate new one
      const shapeId = shapeData.id || `shape_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const shapeType = shapeData.type || 'rectangle';
      
      // Filter out undefined values from shapeData to avoid Firestore errors
      const cleanedShapeData = {};
      Object.keys(shapeData).forEach(key => {
        if (shapeData[key] !== undefined) {
          cleanedShapeData[key] = shapeData[key];
        }
      });
      
      const newShape = {
        // Spread cleaned shapeData first, then apply defaults/overrides
        ...cleanedShapeData,
        // Apply defaults for missing fields (use !== undefined to allow 0)
        type: shapeType,
        x: shapeData.x !== undefined ? shapeData.x : 100,
        y: shapeData.y !== undefined ? shapeData.y : 100,
        // ✅ FIX: Text shapes don't need width/height (auto-sized)
        ...(shapeType !== 'text' && {
          width: shapeData.width || 100,
          height: shapeData.height || 100,
        }),
        fill: shapeData.fill || (shapeType === 'text' ? '#000000' : '#cccccc'),
        // Opacity: use 0.8 default, but never allow 0 (invisible)
        opacity: (shapeData.opacity !== undefined && shapeData.opacity > 0) ? shapeData.opacity : 0.8,
        // Z-index for layer ordering (use createdAt as default if not specified)
        zIndex: shapeData.zIndex !== undefined ? shapeData.zIndex : now,
        // System fields (always override)
        createdBy: userId,
        createdAt: now,
        lastModifiedBy: userId,
        lastModifiedAt: now,
        isLocked: false
      };
      
      console.log('📝 [PER-SHAPE] Creating shape:', shapeId, '- Storing to Firebase:', { type: newShape.type, x: newShape.x, y: newShape.y, width: newShape.width, height: newShape.height });
      
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
          zIndex: shapeData.zIndex !== undefined ? shapeData.zIndex : now + index,
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
      
      // ⏱️ PERFORMANCE: Time Firebase batch write
      const fbStart = performance.now();
      
      // Execute all writes atomically (all succeed or all fail)
      await batch.commit();
      
      const fbTime = performance.now() - fbStart;
      console.log(`🔥 [FIREBASE] Batch created ${newShapes.length} shapes in ${fbTime.toFixed(0)}ms`);
      
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
    
    console.log('📝 [PER-SHAPE] Updating shape:', shapeId, 'with data:', updateData);
    
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
    
    // Support both object and function for updates
    const isFunction = typeof updates === 'function';
    
    // Add all updates to batch
    for (const shapeId of shapeIds) {
      const shapeRef = getShapeRef(shapeId, canvasId);
      
      // Get updates for this specific shape
      const shapeUpdates = isFunction ? updates(shapeId) : updates;
      
      // Note: We can't check locks before batch, so we update optimistically
      // The client-side should prevent updating locked shapes
      batch.update(shapeRef, {
        ...shapeUpdates,
        lastModifiedBy: userId,
        lastModifiedAt: now
      });
    }
    
    // Execute all updates atomically
    await batch.commit();
    
    return shapeIds;
  } catch (error) {
    console.error('❌ [FIREBASE] Batch update error:', error);
    throw handleCanvasError(error, 'batchUpdate', { shapeIds, updates, canvasId });
  }
};

// Batch delete multiple shapes in a single Firebase operation
// NEW ARCHITECTURE: Uses writeBatch() for parallel deletes
const batchDeleteShapes = async (shapeIds, canvasId = CANVAS_DOC_ID) => {
  try {
    // Create batch operation
    const batch = writeBatch(db);
    
    // Add all deletes to batch
    for (const shapeId of shapeIds) {
      const shapeRef = getShapeRef(shapeId, canvasId);
      batch.delete(shapeRef);
    }
    
    // ⏱️ PERFORMANCE: Time Firebase batch write
    const fbStart = performance.now();
    
    // Execute all deletes atomically
    await batch.commit();
    
    const fbTime = performance.now() - fbStart;
    console.log(`🔥 [FIREBASE] Batch deleted ${shapeIds.length} shapes in ${fbTime.toFixed(0)}ms`);
    
    return shapeIds;
  } catch (error) {
    throw handleCanvasError(error, 'batchDelete', { shapeIds, canvasId });
  }
};

// UNIFIED BATCH OPERATIONS: Mixed create/update/delete in a SINGLE atomic Firebase transaction
const batchOperations = async (operations, canvasId = CANVAS_DOC_ID) => {
  return withRetry(async () => {
    try {
      const userId = getCurrentUserId();
      
      // Ensure canvas document exists
      await initializeCanvasDocument(canvasId);
      
      const now = Date.now();
      
      // Create batch operation (can handle up to 500 operations)
      const batch = writeBatch(db);
      
      const results = {
        created: [],
        updated: [],
        deleted: []
      };
      
      // Process all operations and add to batch
      for (let i = 0; i < operations.length; i++) {
        const op = operations[i];
        
        if (op.type === 'create' && op.shape) {
          // CREATE OPERATION
          const shapeId = `shape_${Date.now()}_${Math.random().toString(36).substr(2, 9)}_${i}`;
          
          // ✅ FIX: Handle malformed AI output (when AI sends {tool: "create_rectangle", args: {...}})
          let shapeData = op.shape;
          if (op.shape.tool && op.shape.args) {
            console.warn(`⚠️ [BATCH-OPS] Malformed shape data detected, extracting from args`);
            shapeData = op.shape.args;
          }
          
          // Detect shape type from properties if not explicitly provided
          let shapeType = shapeData.type;
          if (!shapeType) {
            if (shapeData.x1 !== undefined && shapeData.y1 !== undefined && shapeData.x2 !== undefined && shapeData.y2 !== undefined) {
              shapeType = 'line';
            } else if (shapeData.radius !== undefined) {
              shapeType = 'circle';
            } else if (shapeData.text !== undefined) {
              shapeType = 'text';
            } else {
              shapeType = 'rectangle';
            }
          }
          
          const shape = {
            ...shapeData,
            type: shapeType,
            // Apply defaults based on shape type
            ...(shapeType === 'line' ? {
              // Lines: convert x1,y1,x2,y2 to points array
              points: shapeData.points || [shapeData.x1 || 0, shapeData.y1 || 0, shapeData.x2 || 100, shapeData.y2 || 100],
              stroke: shapeData.stroke || '#cccccc',
              strokeWidth: shapeData.strokeWidth || 2,
              x: 0,
              y: 0
            } : shapeType === 'circle' ? {
              // Circles: use radius to calculate width/height
              // AI provides CENTER coordinates, convert to TOP-LEFT for storage
              width: (shapeData.radius || 50) * 2,
              height: (shapeData.radius || 50) * 2,
              x: (shapeData.x !== undefined ? shapeData.x : 100) - (shapeData.radius || 50),
              y: (shapeData.y !== undefined ? shapeData.y : 100) - (shapeData.radius || 50),
              fill: shapeData.fill || '#cccccc'
            } : {
              // Rectangles and text: standard defaults
              x: shapeData.x !== undefined ? shapeData.x : 100,
              y: shapeData.y !== undefined ? shapeData.y : 100,
              width: shapeData.width || 100,
              height: shapeData.height || 100,
              fill: shapeData.fill || '#cccccc'
            }),
            opacity: shapeData.opacity !== undefined ? shapeData.opacity : 0.8,
            zIndex: shapeData.zIndex !== undefined ? shapeData.zIndex : now + i,
            createdBy: userId,
            createdAt: now + i,
            lastModifiedBy: userId,
            lastModifiedAt: now + i,
            isLocked: false
          };
          
          console.log(`📝 [BATCH-OPS] Creating ${shapeType}:`, shapeType === 'line' ? { points: shape.points, stroke: shape.stroke } : { x: shape.x, y: shape.y, width: shape.width, height: shape.height });
          
          const shapeRef = getShapeRef(shapeId, canvasId);
          batch.set(shapeRef, shape);
          results.created.push({ id: shapeId, ...shape });
          
        } else if (op.type === 'update' && op.shapeId && op.updates) {
          // UPDATE OPERATION
          const shapeRef = getShapeRef(op.shapeId, canvasId);
          
          // Filter out "empty" values (OpenAI's structured outputs forces AI to send all fields)
          // AI sends: 0 for unused numbers, "" for unused strings, null for unused values
          // We only want to update fields that have actual values
          const cleanUpdates = {};
          Object.keys(op.updates).forEach(key => {
            const value = op.updates[key];
            // Keep the value if it's:
            // - A non-empty string (but allow "0" as a string)
            // - A non-zero number (but this might break legitimate 0 values!)
            // - NOT null/undefined
            // Actually, let's be more specific: exclude null, undefined, 0, and ""
            // BUT only if the field is typically non-zero (x, y, width, height, fontSize, rotation, cornerRadius)
            // For fill/text/opacity, keep any value
            
            if (value === null || value === undefined) {
              return; // Skip null/undefined
            }
            
            if (value === 0 || value === "") {
              // For these fields, 0/"" is likely a placeholder, not a real value
              const placeholderFields = ['x', 'y', 'width', 'height', 'fontSize', 'rotation', 'cornerRadius', 'radius', 'text'];
              if (placeholderFields.includes(key)) {
                return; // Skip placeholder 0/""
              }
            }
            
            // For opacity, 0 is valid (fully transparent), but AI shouldn't be setting it to 0 by default
            if (key === 'opacity' && value === 0) {
              return; // Skip opacity: 0 (AI placeholder)
            }
            
            // Keep this value
            cleanUpdates[key] = value;
          });
          
          const updateData = {
            ...cleanUpdates,
            lastModifiedBy: userId,
            lastModifiedAt: now + i
          };
          batch.update(shapeRef, updateData);
          results.updated.push(op.shapeId);
          
        } else if (op.type === 'delete' && op.shapeId) {
          // DELETE OPERATION
          const shapeRef = getShapeRef(op.shapeId, canvasId);
          batch.delete(shapeRef);
          
          // Clear disconnect cleanup for this shape
          clearDisconnectCleanup(op.shapeId).catch(err => 
            console.warn('[BATCH-OPS] Failed to clear disconnect for shape:', op.shapeId, err)
          );
          
          results.deleted.push(op.shapeId);
        }
      }
      
      // ⏱️ PERFORMANCE: Time Firebase batch write
      const fbStart = performance.now();
      
      // Execute all operations atomically
      await batch.commit();
      
      const fbTime = performance.now() - fbStart;
      console.log(`🔥 [FIREBASE] Batch operations completed in ${fbTime.toFixed(0)}ms:`, {
        created: results.created.length,
        updated: results.updated.length,
        deleted: results.deleted.length,
        total: operations.length
      });
      
      return results;
    } catch (error) {
      throw handleCanvasError(error, 'batchOperations', { operations, canvasId });
    }
  });
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
            // Database rules now allow any authenticated user to write (so online users can clean up after disconnected users)
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
      console.warn('[UNLOCK] Shape not found (may have been deleted):', shapeId);
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
    // ✅ FIX: If shape was deleted between check and update, ignore error
    if (error.code === 'not-found' || error.message?.includes('No document to update')) {
      console.warn('[UNLOCK] Shape not found (may have been deleted):', shapeId);
      return; // Shape was deleted, nothing to unlock
    }
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

// ========================================
// SMART OPERATION EXECUTOR
// ========================================

/**
 * Execute smart operation with automatic business logic handling
 * This is the SINGLE ENTRY POINT for all AI-driven canvas operations
 * 
 * Handles:
 * - Circle radius updates (auto-centering)
 * - Relative transforms (deltaX, deltaY, scaleX, scaleY, deltaRotation)
 * - Grid/row expansion (converts to batch operations)
 * - Automatic batching and optimization
 * 
 * @param {string} action - The operation type
 * @param {object} data - The operation data
 * @param {string} canvasId - Canvas document ID
 * @returns {Promise<any>} - Operation result
 */
export const executeSmartOperation = async (action, data, canvasId = CANVAS_DOC_ID) => {
  // Generate unique execution ID for tracking duplicates
  const executionId = Math.random().toString(36).substr(2, 6);
  console.log(`🔷 [SMART-OP-${executionId}] START: ${action}`, { 
    data, 
    timestamp: new Date().toISOString()
  });
  
  try {
    let result;
    switch (action) {
      // ========================================
      // CREATE OPERATIONS
      // ========================================
      
      case 'create_rectangle':
      case 'create_text': {
        // Simple create - delegate to createShape
        result = await createShape(data, canvasId);
        console.log(`✅ [SMART-OP-${executionId}] Create completed, returning result`);
        return result;
      }
      
      case 'create_line': {
        // Convert x1,y1,x2,y2 to line shape format
        const { x1, y1, x2, y2, stroke, strokeWidth, ...rest } = data;
        const minX = Math.min(x1, x2);
        const minY = Math.min(y1, y2);
        const lineShape = {
          ...rest,
          type: 'line',
          x: minX,
          y: minY,
          width: Math.abs(x2 - x1),
          height: Math.abs(y2 - y1),
          points: [x1, y1, x2, y2],
          stroke,
          strokeWidth,
          fill: stroke // Lines use stroke as fill
        };
        result = await createShape(lineShape, canvasId);
        console.log(`✅ [SMART-OP-${executionId}] Line created, returning result`);
        return result;
      }
      
      case 'create_circle': {
        // Convert radius to width/height and ensure type is set
        // AI provides CENTER coordinates, but we store as TOP-LEFT
        const { radius, x, y, ...rest } = data;
        const diameter = radius * 2;
        const topLeftX = x - radius;
        const topLeftY = y - radius;
        const circleData = {
          ...rest,
          type: 'circle',
          x: topLeftX,
          y: topLeftY,
          width: diameter,
          height: diameter
        };
        result = await createShape(circleData, canvasId);
        console.log(`✅ [SMART-OP-${executionId}] Create circle completed (center [${x},${y}], radius ${radius} → top-left [${topLeftX},${topLeftY}], diameter ${diameter})`);
        return result;
      }
      
      // ========================================
      // UPDATE OPERATIONS
      // ========================================
      
      case 'update_shape': {
        const { shapeId, radius, ...otherUpdates } = data;
        
        // ✅ SMART: Handle circle radius updates with auto-centering
        if (radius !== undefined) {
          console.log(`🔵 [SMART-OP] Circle radius update detected, auto-centering...`);
          
          // Fetch current shape to calculate position adjustment
          const shapeRef = getShapeRef(shapeId, canvasId);
          const shapeDoc = await getDoc(shapeRef);
          
          if (!shapeDoc.exists()) {
            throw new Error(`Shape ${shapeId} not found`);
          }
          
          const currentShape = shapeDoc.data();
          
          if (currentShape.type === 'circle') {
            const oldRadius = Math.min(currentShape.width || 0, currentShape.height || 0) / 2;
            const newRadius = radius;
            const newDiameter = newRadius * 2;
            
            // Calculate position adjustment to keep center in same place
            const radiusDiff = oldRadius - newRadius;
            
            const updates = {
              ...otherUpdates,
              x: currentShape.x + radiusDiff,
              y: currentShape.y + radiusDiff,
              width: newDiameter,
              height: newDiameter,
            };
            
            console.log(`🔵 [SMART-OP] Adjusted position: (${updates.x}, ${updates.y}) for radius ${newRadius}`);
            return await updateShape(shapeId, updates, canvasId);
          }
        }
        
        // Standard update (no special handling needed)
        return await updateShape(shapeId, { radius, ...otherUpdates }, canvasId);
      }
      
      case 'move_shape': {
        // Simple move - just update x/y
        const { shapeId, x, y } = data;
        const updates = {};
        if (x !== undefined) updates.x = x;
        if (y !== undefined) updates.y = y;
        return await updateShape(shapeId, updates, canvasId);
      }
      
      case 'resize_shape': {
        // Simple resize - update width/height
        const { shapeId, width, height } = data;
        const updates = {};
        if (width !== undefined) updates.width = width;
        if (height !== undefined) updates.height = height;
        return await updateShape(shapeId, updates, canvasId);
      }
      
      case 'rotate_shape': {
        // Simple rotation
        const { shapeId, rotation } = data;
        return await updateShape(shapeId, { rotation }, canvasId);
      }
      
      // ========================================
      // DELETE OPERATIONS
      // ========================================
      
      case 'delete_shape': {
        const { shapeId } = data;
        return await deleteShape(shapeId, canvasId);
      }
      
      // ========================================
      // BATCH OPERATIONS
      // ========================================
      
      case 'batch_update_shapes': {
        let { shapeIds, updates, deltaX, deltaY, deltaRotation, scaleX, scaleY } = data;
        
        // ✅ FIX: Convert object to array if needed (JSON parsing can convert arrays to objects)
        if (shapeIds && typeof shapeIds === 'object' && !Array.isArray(shapeIds)) {
          console.log(`🔧 [SMART-OP] Converting shapeIds object to array`);
          shapeIds = Object.values(shapeIds);
        }
        
        // ✅ SMART: Handle relative transforms
        const hasRelativeTransforms = deltaX !== undefined || deltaY !== undefined || 
                                       deltaRotation !== undefined || scaleX !== undefined || scaleY !== undefined;
        
        if (hasRelativeTransforms) {
          console.log(`🔄 [SMART-OP] Relative transforms detected, fetching current shapes...`);
          
          // Fetch current shapes
          const shapeRefs = shapeIds.map(id => getShapeRef(id, canvasId));
          const shapeDocs = await Promise.all(shapeRefs.map(ref => getDoc(ref)));
          const currentShapes = shapeDocs
            .filter(doc => doc.exists())
            .map(doc => ({ id: doc.id, ...doc.data() }));
          
          // Build update operations with calculated absolute values
          const operations = currentShapes.map(shape => {
            const shapeUpdates = {};
            
            // Relative position
            if (deltaX !== undefined) shapeUpdates.x = (shape.x || 0) + deltaX;
            if (deltaY !== undefined) shapeUpdates.y = (shape.y || 0) + deltaY;
            
            // Relative rotation
            if (deltaRotation !== undefined) {
              const currentRotation = shape.rotation || 0;
              shapeUpdates.rotation = (currentRotation + deltaRotation) % 360;
            }
            
            // Relative scale
            if (scaleX !== undefined) shapeUpdates.width = (shape.width || 100) * scaleX;
            if (scaleY !== undefined) shapeUpdates.height = (shape.height || 100) * scaleY;
            
            return {
              type: 'update',
              shapeId: shape.id,
              updates: shapeUpdates
            };
          });
          
          console.log(`🔄 [SMART-OP] Executing ${operations.length} relative transform operations`);
          return await batchOperations(operations, canvasId);
        }
        
        // Absolute updates - simple batch
        if (updates && Object.keys(updates).length > 0) {
          return await batchUpdateShapes(shapeIds, updates, canvasId);
        }
        
        console.warn(`⚠️ [SMART-OP] batch_update_shapes called with no updates`);
        return { updated: [] };
      }
      
      case 'batch_operations': {
        // Direct pass-through to batch operations
        let { operations } = data;
        
        // ✅ FIX: Convert object to array if needed (JSON parsing can convert arrays to objects)
        if (operations && typeof operations === 'object' && !Array.isArray(operations)) {
          console.log(`🔧 [SMART-OP] Converting operations object to array`);
          operations = Object.values(operations);
        }
        
        return await batchOperations(operations, canvasId);
      }
      
      // ========================================
      // GRID/PATTERN OPERATIONS
      // ========================================
      
      case 'create_grid': {
        console.log(`📐 [SMART-OP] Expanding grid into batch operations...`);
        const { startX = 500, startY = 500, rows, cols, cellWidth = 80, cellHeight = 80, spacing = 10, fill = '#3B82F6' } = data;
        
        const operations = [];
        for (let row = 0; row < rows; row++) {
          for (let col = 0; col < cols; col++) {
            const x = startX + col * (cellWidth + spacing);
            const y = startY + row * (cellHeight + spacing);
            operations.push({
              type: 'create',
              shape: {
                type: 'rectangle',
                x,
                y,
                width: cellWidth,
                height: cellHeight,
                fill,
                opacity: 0.8
              }
            });
          }
        }
        
        console.log(`📐 [SMART-OP] Created ${operations.length} shapes for ${rows}x${cols} grid`);
        return await batchOperations(operations, canvasId);
      }
      
      case 'create_row': {
        console.log(`📐 [SMART-OP] Expanding row into batch operations...`);
        const { startX = 500, startY = 2500, count, width = 80, height = 80, spacing = 20, fill = '#3B82F6' } = data;
        
        const operations = [];
        for (let i = 0; i < count; i++) {
          const x = startX + i * (width + spacing);
          operations.push({
            type: 'create',
            shape: {
              type: 'rectangle',
              x,
              y: startY,
              width,
              height,
              fill,
              opacity: 0.8
            }
          });
        }
        
        console.log(`📐 [SMART-OP] Created ${operations.length} rectangles for row`);
        return await batchOperations(operations, canvasId);
      }
      
      case 'create_circle_row': {
        console.log(`📐 [SMART-OP] Expanding circle row into batch operations...`);
        const { startX = 500, startY = 2500, count, radius = 40, spacing = 20, fill = '#3B82F6' } = data;
        
        const operations = [];
        for (let i = 0; i < count; i++) {
          // Circles are stored as top-left of bounding box
          const diameter = radius * 2;
          const centerX = startX + i * (diameter + spacing);
          const topLeftX = centerX - radius;
          const topLeftY = startY - radius;
          
          operations.push({
            type: 'create',
            shape: {
              type: 'circle',
              x: topLeftX,
              y: topLeftY,
              width: diameter,
              height: diameter,
              fill,
              opacity: 0.8
            }
          });
        }
        
        console.log(`📐 [SMART-OP] Created ${operations.length} circles for row`);
        return await batchOperations(operations, canvasId);
      }
      
      // ========================================
      // UTILITY OPERATIONS
      // ========================================
      
      case 'clear_canvas': {
        // This is handled by clearAllShapes utility
        console.log(`🗑️ [SMART-OP] Clear canvas requested - delegate to clearAllShapes`);
        return { message: 'Clear canvas should be handled by clearAllShapes utility' };
      }
      
      case 'add_random_shapes': {
        // Generate random shapes and delegate to batch_operations
        console.log(`🎲 [SMART-OP] Generating ${data.count} random shapes`);
        
        // Import the random shapes utility
        const { generateRandomShapes } = await import('../utils/randomShapes.js');
        
        const options = {};
        if (data.types && data.types.length > 0) {
          options.types = data.types;
        }
        if (data.balanced !== null && data.balanced !== undefined) {
          options.balanced = data.balanced;
        }
        
        const shapes = generateRandomShapes(data.count, options);
        
        // Convert to batch operations format
        const operations = shapes.map(shape => ({
          type: 'create',
          shape
        }));
        
        console.log(`📐 [SMART-OP] Created ${operations.length} random shapes, delegating to batch_operations`);
        return await batchOperations(operations, canvasId);
      }
      
      case 'calculated_coordinates': {
        // No-op - this is for AI to receive coordinate calculations
        return { message: 'Coordinates calculated' };
      }
      
      case 'use_login_template': {
        console.log(`⚡ [TEMPLATE-TOOL] Executing use_login_template`);
        const { USE_LOGIN_TEMPLATE_TOOL } = await import('./ai/tools/templates/useLoginTemplate.js');
        const result = await USE_LOGIN_TEMPLATE_TOOL.execute(data, { 
          canvasShapes: [], // Templates have their own positioning logic
          userStyleGuide: null
        });
        return await executeSmartOperation(result.action, result.data, canvasId);
      }
      
      case 'use_navbar_template': {
        console.log(`⚡ [TEMPLATE-TOOL] Executing use_navbar_template`);
        const { USE_NAVBAR_TEMPLATE_TOOL } = await import('./ai/tools/templates/useNavbarTemplate.js');
        const result = await USE_NAVBAR_TEMPLATE_TOOL.execute(data, { 
          canvasShapes: [], // Templates have their own positioning logic
          userStyleGuide: null
        });
        return await executeSmartOperation(result.action, result.data, canvasId);
      }
      
      case 'use_card_template': {
        console.log(`⚡ [TEMPLATE-TOOL] Executing use_card_template`);
        const { USE_CARD_TEMPLATE_TOOL } = await import('./ai/tools/templates/useCardTemplate.js');
        const result = await USE_CARD_TEMPLATE_TOOL.execute(data, { 
          canvasShapes: [], // Templates have their own positioning logic
          userStyleGuide: null
        });
        return await executeSmartOperation(result.action, result.data, canvasId);
      }
      
      default:
        throw new Error(`Unknown action: ${action}`);
    }
  } catch (error) {
    console.error(`❌ [SMART-OP-${executionId}] ERROR: ${action}:`, error.message);
    throw handleCanvasError(error, 'executeSmartOperation', { action, data });
  } finally {
    console.log(`🔶 [SMART-OP-${executionId}] END: ${action}`);
  }
};

export {
  subscribeToShapes,
  createShape,
  batchCreateShapes,
  updateShape,
  batchUpdateShapes,
  deleteShape,
  batchDeleteShapes,
  batchOperations,
  // executeSmartOperation is exported inline (line 857)
  lockShape,
  unlockShape,
  setupDisconnectCleanup,
  clearDisconnectCleanup,
  monitorDisconnectCleanup,
  processDisconnectCleanup,
  getUserId
};
