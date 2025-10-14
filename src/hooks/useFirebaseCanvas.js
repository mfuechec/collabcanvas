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
  getUserId
} from '../services/canvas';

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
    console.log('Setting up Firebase canvas subscription');
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
      
      console.log('Shape created successfully:', newShape.id);
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
      
      console.log('Shape updated successfully:', shapeId);
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
      console.log('Shape deleted successfully:', shapeId);
      return shapeId;
    } catch (err) {
      console.error('Failed to delete shape:', err);
      setError(err.message);
      throw err;
    }
  }, [canvasId]);

  // Lock a shape with automatic timeout
  const lockShape = useCallback(async (shapeId, timeoutMs = 5000) => {
    try {
      await lockShapeService(shapeId, canvasId);
      
      // Set up automatic unlock timeout
      const timeoutId = setTimeout(async () => {
        try {
          await unlockShapeService(shapeId, canvasId);
          console.log('Shape auto-unlocked after timeout:', shapeId);
        } catch (err) {
          console.error('Failed to auto-unlock shape:', err);
        }
        lockTimeoutsRef.current.delete(shapeId);
      }, timeoutMs);
      
      lockTimeoutsRef.current.set(shapeId, timeoutId);
      console.log('Shape locked with timeout:', shapeId, timeoutMs + 'ms');
      
      return true;
    } catch (err) {
      console.error('Failed to lock shape:', err);
      throw err;
    }
  }, [canvasId]);

  // Unlock a shape
  const unlockShape = useCallback(async (shapeId) => {
    try {
      // Clear any existing timeout
      const timeoutId = lockTimeoutsRef.current.get(shapeId);
      if (timeoutId) {
        clearTimeout(timeoutId);
        lockTimeoutsRef.current.delete(shapeId);
      }
      
      await unlockShapeService(shapeId, canvasId);
      console.log('Shape unlocked manually:', shapeId);
      return true;
    } catch (err) {
      console.error('Failed to unlock shape:', err);
      throw err;
    }
  }, [canvasId]);

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
    isShapeLockedByCurrentUser,
    isShapeLockedByOther,
    
    // User info
    getCurrentUserId,
    
    // Connection management
    retryConnection
  };
};
