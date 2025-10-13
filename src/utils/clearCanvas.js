// Utility to clear all shapes from Firebase canvas
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { getUserId } from '../services/canvas';

const CANVAS_COLLECTION = 'canvas';
const CANVAS_DOC_ID = 'global-canvas-v1';

/**
 * Clear all shapes from the Firebase canvas
 * @returns {Promise<void>}
 */
export const clearAllShapes = async () => {
  try {
    const canvasRef = doc(db, CANVAS_COLLECTION, CANVAS_DOC_ID);
    const userId = getUserId();
    
    console.log('Clearing all shapes from Firebase...');
    
    await updateDoc(canvasRef, {
      shapes: [], // Clear all shapes
      lastUpdated: serverTimestamp(),
      lastModifiedBy: userId
    });
    
    console.log('✅ All shapes cleared successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to clear shapes:', error);
    throw new Error('Failed to clear canvas. Please try again.');
  }
};

/**
 * Reset the entire canvas document to initial state
 * @returns {Promise<void>}
 */
export const resetCanvas = async () => {
  try {
    const canvasRef = doc(db, CANVAS_COLLECTION, CANVAS_DOC_ID);
    const userId = getUserId();
    const now = Date.now();
    
    console.log('Resetting canvas to initial state...');
    
    await updateDoc(canvasRef, {
      canvasId: CANVAS_DOC_ID,
      shapes: [],
      createdAt: now,
      lastUpdated: serverTimestamp(),
      lastModifiedBy: userId,
      createdBy: userId
    });
    
    console.log('✅ Canvas reset successfully');
    return true;
  } catch (error) {
    console.error('❌ Failed to reset canvas:', error);
    throw new Error('Failed to reset canvas. Please try again.');
  }
};

// Make functions available globally for console debugging
if (typeof window !== 'undefined') {
  window.clearAllShapes = clearAllShapes;
  window.resetCanvas = resetCanvas;
  console.log('🧹 Canvas clearing functions available:');
  console.log('  • clearAllShapes() - Remove all shapes');
  console.log('  • resetCanvas() - Complete reset');
}
