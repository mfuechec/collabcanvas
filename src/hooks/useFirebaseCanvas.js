// Firebase Canvas Hook - Real-time canvas operations with Firestore
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';
import {
  subscribeToShapes,
  createShape as createShapeService,
  updateShape as updateShapeService,
  deleteShape as deleteShapeService,
  lockShape as lockShapeService,
  unlockShape as unlockShapeService,
  setupDisconnectCleanup,
  clearDisconnectCleanup,
  monitorDisconnectCleanup,
  processDisconnectCleanup,
  getUserId
} from '../services/canvas';
import { clearDragPreviewsByShape } from '../services/dragPreviews';

export const useFirebaseCanvas = (canvasId = 'global-canvas-v1') => {
  const { currentUser } = useAuth();
  const [shapes, setShapes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isConnected, setIsConnected] = useState(true);
  
  const unsubscribeRef = useRef(null);
  const lockTimeoutsRef = useRef(new Map()); // Track lock timeouts

  // Subscribe to real-time shape updates
  useEffect(() => {
    // Always set up subscription, don't require currentUser for MVP
    setIsLoading(true);
    setError(null);

    try {
      const unsubscribe = subscribeToShapes(canvasId, (data) => {
        if (data.error) {
          setError(data.error);
          setIsConnected(false);
        } else {
          setShapes(data.shapes || []);
          setError(null);
          setIsConnected(true);
        }
        setIsLoading(false);
      });

      unsubscribeRef.current = unsubscribe;

      return () => {
        if (unsubscribe) {
          unsubscribe();
        }
      };
    } catch (err) {
      console.error('Failed to subscribe to canvas:', err);
      setError('Failed to connect to canvas. Please refresh the page.');
      setIsLoading(false);
    }
  }, [canvasId]); // Remove currentUser dependency

  // Monitor disconnect cleanup events
  useEffect(() => {
    if (!currentUser) return;

    const unsubscribeCleanup = monitorDisconnectCleanup(processDisconnectCleanup);

    return () => {
      if (unsubscribeCleanup) {
        unsubscribeCleanup();
      }
    };
  }, [currentUser]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Clear all lock timeouts
      lockTimeoutsRef.current.forEach(timeout => clearTimeout(timeout));
      lockTimeoutsRef.current.clear();
      
      // Unsubscribe from Firestore
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  // Create a new shape
  const addShape = useCallback(async (shapeData) => {
    try {
      setError(null);
      const newShape = await createShapeService(shapeData, canvasId);
      
      return newShape;
    } catch (err) {
      console.error('Failed to create shape:', err);
      setError(err.message);
      throw err;
    }
  }, [canvasId]);

  // Update an existing shape
  const updateShape = useCallback(async (shapeId, updates) => {
    try {
      setError(null);
      const updatedShape = await updateShapeService(shapeId, updates, canvasId);
      
      return updatedShape;
    } catch (err) {
      console.error('Failed to update shape:', err);
      setError(err.message);
      throw err;
    }
  }, [canvasId]);

  // Delete a shape
  const deleteShape = useCallback(async (shapeId) => {
    try {
      setError(null);
      await deleteShapeService(shapeId, canvasId);
      return shapeId;
    } catch (err) {
      console.error('Failed to delete shape:', err);
      setError(err.message);
      throw err;
    }
  }, [canvasId]);

  // Lock a shape with automatic timeout, drag state checking, disconnect cleanup, and cancellation support
  const lockShape = useCallback(async (shapeId, timeoutMs = 2000, isDraggingCallback = null, originalPosition = null, cancelToken = null) => {
    try {
      // Check if operation was cancelled before starting
      if (cancelToken && cancelToken.cancelled) {
        return false;
      }
      
      // OPTIMISTIC UPDATE: Immediately update local state for instant visual feedback
      const currentUserId = currentUser?.uid || getUserId();
      setShapes(prevShapes => 
        prevShapes.map(shape => 
          shape.id === shapeId 
            ? {
                ...shape,
                isLocked: true,
                lockedBy: currentUserId,
                lockedAt: Date.now(),
                unlockedAt: undefined,
                lastModifiedAt: Date.now(),
                lastModifiedBy: currentUserId
              }
            : shape
        )
      );
      
      console.log('→ LOCK signal sent to Firebase:', shapeId);
      await lockShapeService(shapeId, canvasId);
      console.log('← LOCK received from Firebase:', shapeId);
      
      // Check if operation was cancelled after Firebase lock but before setup
      if (cancelToken && cancelToken.cancelled) {
        console.log('→ UNLOCK signal sent to Firebase (cancelled lock):', shapeId);
        await unlockShapeService(shapeId, canvasId);
        console.log('← UNLOCK received from Firebase (cancelled lock):', shapeId);
        return false;
      }
      
      // Set up disconnect cleanup if original position provided (for drag operations)
      if (originalPosition) {
        await setupDisconnectCleanup(shapeId, originalPosition, canvasId);
      }
      
      // Set up automatic unlock timeout with drag state checking and cancellation support
      const timeoutId = setTimeout(async () => {
        try {
          // Check if operation was cancelled
          if (cancelToken && cancelToken.cancelled) {
            return;
          }
          
          // Check if shape is still being dragged before auto-unlocking
          if (isDraggingCallback && isDraggingCallback()) {
            // Extend timeout by another period if still dragging
            lockTimeoutsRef.current.delete(shapeId);
            lockShape(shapeId, timeoutMs, isDraggingCallback, originalPosition, cancelToken);
            return;
          }
          
          console.log('→ UNLOCK signal sent to Firebase (timeout):', shapeId);
          await unlockShapeService(shapeId, canvasId);
          console.log('← UNLOCK received from Firebase (timeout):', shapeId);
        } catch (err) {
          // Silent timeout errors
        }
        lockTimeoutsRef.current.delete(shapeId);
      }, timeoutMs);
      
      lockTimeoutsRef.current.set(shapeId, timeoutId);
      
      return true;
    } catch (err) {
      
      // ROLLBACK: If Firebase fails, revert the optimistic update
      setShapes(prevShapes => 
        prevShapes.map(shape => 
          shape.id === shapeId 
            ? {
                ...shape,
                isLocked: false, // Revert to unlocked
                lockedBy: undefined,
                lockedAt: undefined,
                unlockedAt: Date.now()
              }
            : shape
        )
      );
      
      throw err;
    }
  }, [canvasId, currentUser]);

  // Emergency unlock for page unload scenarios
  const emergencyUnlock = useCallback(async (shapeId, originalPosition = null) => {
    try {
      // Clear any existing timeout first
      clearLockTimeout(shapeId);
      
      // If original position provided, revert first
      if (originalPosition) {
        await updateShapeService(shapeId, {
          x: originalPosition.x,
          y: originalPosition.y
        }, canvasId);
      }
      
      // Then unlock
      await unlockShapeService(shapeId, canvasId);
      return true;
    } catch (err) {
      throw err;
    }
  }, [canvasId]);

  // Clear timeout for a shape (to prevent auto-unlock during active operations)
  const clearLockTimeout = useCallback((shapeId) => {
    const timeoutId = lockTimeoutsRef.current.get(shapeId);
    if (timeoutId) {
      clearTimeout(timeoutId);
      lockTimeoutsRef.current.delete(shapeId);
    }
  }, []);

  // Reset timeout for a shape (useful during drag operations to extend the lock)
  const resetLockTimeout = useCallback(async (shapeId, timeoutMs = 5000) => {
    // Clear existing timeout
    clearLockTimeout(shapeId);
    
    // Set new timeout
    const timeoutId = setTimeout(async () => {
      try {
        await unlockShapeService(shapeId, canvasId);
      } catch (err) {
        // Silent reset timeout errors
      }
      lockTimeoutsRef.current.delete(shapeId);
    }, timeoutMs);
    
    lockTimeoutsRef.current.set(shapeId, timeoutId);
  }, [canvasId, clearLockTimeout]);

  // Unlock a shape
  const unlockShape = useCallback(async (shapeId) => {
    try {
      // OPTIMISTIC UPDATE: Immediately update local state for instant visual feedback
      setShapes(prevShapes => 
        prevShapes.map(shape => 
          shape.id === shapeId 
            ? {
                ...shape,
                isLocked: false,
                lockedBy: undefined,
                lockedAt: undefined,
                unlockedAt: Date.now(),
                lastModifiedAt: Date.now(),
                lastModifiedBy: currentUser?.uid || getUserId()
              }
            : shape
        )
      );
      
      // Clear any existing timeout
      const timeoutId = lockTimeoutsRef.current.get(shapeId);
      if (timeoutId) {
        clearTimeout(timeoutId);
        lockTimeoutsRef.current.delete(shapeId);
      }
      
      // Then perform Firebase unlock (real-time subscription will confirm the change)
      console.log('→ UNLOCK signal sent to Firebase:', shapeId);
      await unlockShapeService(shapeId, canvasId);
      console.log('← UNLOCK received from Firebase:', shapeId);
      
      // NEW: Clear any drag previews for this shape across all users
      await clearDragPreviewsByShape(shapeId);
      
      return true;
    } catch (err) {
      
      // ROLLBACK: If Firebase fails, revert the optimistic update
      setShapes(prevShapes => 
        prevShapes.map(shape => 
          shape.id === shapeId 
            ? {
                ...shape,
                isLocked: true, // Revert to locked
                lockedBy: currentUser?.uid || getUserId(), // Assume current user had it locked
                unlockedAt: undefined
              }
            : shape
        )
      );
      
      throw err;
    }
  }, [canvasId, currentUser]);

  // Get current user ID
  const getCurrentUserId = useCallback(() => {
    return currentUser?.uid || getUserId();
  }, [currentUser]);

  // Check if a shape is locked by current user
  const isShapeLockedByCurrentUser = useCallback((shape) => {
    const userId = getCurrentUserId();
    return shape.isLocked === true && shape.lockedBy === userId;
  }, [getCurrentUserId]);

  // Check if a shape is locked by another user
  const isShapeLockedByOther = useCallback((shape) => {
    const userId = getCurrentUserId();
    // A shape is locked by another user if:
    // 1. It's marked as locked (isLocked === true)
    // 2. It has a valid lockedBy value (not null/undefined)  
    // 3. The lockedBy value is different from current user
    return shape.isLocked === true && shape.lockedBy && shape.lockedBy !== userId;
  }, [getCurrentUserId]);

  // Retry connection
  const retryConnection = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }
    
    setIsLoading(true);
    setError(null);
    
    // Re-trigger the subscription effect
    window.location.reload();
  }, []);

  return {
    // State
    shapes,
    isLoading,
    error,
    isConnected,
    
    // Shape operations
    addShape,
    updateShape,
    deleteShape,
    
    // Locking operations
    lockShape,
    unlockShape,
    emergencyUnlock,
    clearLockTimeout,
    resetLockTimeout,
    isShapeLockedByCurrentUser,
    isShapeLockedByOther,
    
    // User info
    getCurrentUserId,
    
    // Connection management
    retryConnection
  };
};
