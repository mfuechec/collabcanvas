// Utility to clear all shapes from Firebase canvas and add test data
import { doc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import { getUserId } from '../services/canvas';
import { 
  CANVAS_WIDTH, 
  CANVAS_HEIGHT, 
  DEFAULT_SHAPE_WIDTH, 
  DEFAULT_SHAPE_HEIGHT, 
  DEFAULT_SHAPE_FILL 
} from './constants';

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
 * Generate a random shape with random position and size
 * @returns {object} - Shape object
 */
const generateRandomShape = () => {
  const id = `shape_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const userId = getUserId();
  const now = Date.now();
  
  // Random position within canvas bounds (with padding)
  const padding = 100;
  const x = Math.random() * (CANVAS_WIDTH - DEFAULT_SHAPE_WIDTH - padding * 2) + padding;
  const y = Math.random() * (CANVAS_HEIGHT - DEFAULT_SHAPE_HEIGHT - padding * 2) + padding;
  
  // Random size variations (50% to 200% of default size)
  const sizeMultiplier = 0.5 + Math.random() * 1.5;
  const width = Math.floor(DEFAULT_SHAPE_WIDTH * sizeMultiplier);
  const height = Math.floor(DEFAULT_SHAPE_HEIGHT * sizeMultiplier);
  
  return {
    id,
    x: Math.floor(x),
    y: Math.floor(y),
    width,
    height,
    fill: DEFAULT_SHAPE_FILL,
    createdBy: userId,
    createdAt: now,
    lastModifiedBy: userId,
    lastModifiedAt: now,
    isLocked: false
  };
};

/**
 * Add multiple random shapes to the canvas
 * @param {number} count - Number of shapes to add (default: 500)
 * @returns {Promise<void>}
 */
export const addRandomShapes = async (count = 500) => {
  try {
    const canvasRef = doc(db, CANVAS_COLLECTION, CANVAS_DOC_ID);
    const userId = getUserId();
    
    console.log(`🎲 Generating ${count} random shapes...`);
    
    // Generate all shapes
    const randomShapes = [];
    for (let i = 0; i < count; i++) {
      randomShapes.push(generateRandomShape());
    }
    
    console.log(`📦 Adding ${randomShapes.length} shapes to Firebase...`);
    
    // Add all shapes to Firebase in one operation
    await updateDoc(canvasRef, {
      shapes: randomShapes,
      lastUpdated: serverTimestamp(),
      lastModifiedBy: userId
    });
    
    console.log(`✅ Successfully added ${randomShapes.length} random shapes to canvas!`);
    console.log(`📊 Canvas now contains shapes distributed across ${CANVAS_WIDTH}x${CANVAS_HEIGHT}px area`);
    return true;
  } catch (error) {
    console.error('❌ Failed to add random shapes:', error);
    throw new Error('Failed to add random shapes. Please try again.');
  }
};

// Make functions available globally for console debugging
if (typeof window !== 'undefined') {
  window.clearAllShapes = clearAllShapes;
  window.addRandomShapes = addRandomShapes;
  
  console.log('🧹 Canvas utility functions available:');
  console.log('  • clearAllShapes() - Remove all shapes');
  console.log('  • addRandomShapes(count) - Add random shapes (default: 500)');
  console.log('');
  console.log('💡 Examples:');
  console.log('  addRandomShapes(500)  // Replace with 500 random shapes');
  console.log('  addRandomShapes(50)   // Replace with 50 random shapes');
}
