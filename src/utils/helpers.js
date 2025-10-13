// Helper functions for CollabCanvas
import { getCurrentCursorUserId } from '../services/cursors';

/**
 * Color palette for user cursors - high contrast colors that work on light backgrounds
 */
const CURSOR_COLORS = [
  '#EF4444', // Red
  '#F97316', // Orange  
  '#EAB308', // Yellow
  '#22C55E', // Green
  '#06B6D4', // Cyan
  '#3B82F6', // Blue
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#F59E0B', // Amber
  '#10B981'  // Emerald
];

/**
 * Generate a consistent color for a user based on their ID
 * @param {string} userId - User's unique identifier
 * @returns {string} - Hex color code
 */
export const generateUserColor = (userId) => {
  if (!userId) return CURSOR_COLORS[0];
  
  // Create a simple hash of the userId
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Use absolute value and modulo to get a color index
  const colorIndex = Math.abs(hash) % CURSOR_COLORS.length;
  return CURSOR_COLORS[colorIndex];
};

/**
 * Get the current user's assigned color
 * @returns {string} - Hex color code
 */
export const getCurrentUserColor = () => {
  const userId = getCurrentCursorUserId();
  return generateUserColor(userId);
};

/**
 * Generate a display name from email (fallback for users without display names)
 * @param {string} email - User's email address
 * @returns {string} - Display name
 */
export const generateDisplayNameFromEmail = (email) => {
  if (!email) return 'Anonymous';
  
  // Extract username from email (part before @)
  const username = email.split('@')[0];
  
  // Capitalize first letter and limit length
  const displayName = username.charAt(0).toUpperCase() + username.slice(1);
  
  // Truncate if too long
  return displayName.length > 20 ? displayName.substring(0, 20) : displayName;
};

/**
 * Throttle function calls to limit frequency
 * @param {function} func - Function to throttle
 * @param {number} delay - Delay in milliseconds
 * @returns {function} - Throttled function
 */
export const throttle = (func, delay) => {
  let timeoutId;
  let lastExecTime = 0;
  
  return function (...args) {
    const currentTime = Date.now();
    
    if (currentTime - lastExecTime > delay) {
      func.apply(this, args);
      lastExecTime = currentTime;
    } else {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => {
        func.apply(this, args);
        lastExecTime = Date.now();
      }, delay - (currentTime - lastExecTime));
    }
  };
};

/**
 * Convert screen coordinates to canvas coordinates
 * @param {number} screenX - Screen X coordinate
 * @param {number} screenY - Screen Y coordinate
 * @param {object} stage - Konva stage reference
 * @returns {object} - {x, y} canvas coordinates
 */
export const screenToCanvasCoordinates = (screenX, screenY, stage) => {
  if (!stage) return { x: screenX, y: screenY };
  
  try {
    const transform = stage.getAbsoluteTransform().copy();
    transform.invert();
    
    const canvasCoords = transform.point({ x: screenX, y: screenY });
    
    return {
      x: Math.round(canvasCoords.x),
      y: Math.round(canvasCoords.y)
    };
  } catch (error) {
    console.error('Error converting screen to canvas coordinates:', error);
    return { x: screenX, y: screenY };
  }
};

/**
 * Check if two points are significantly different (for delta checking)
 * @param {object} point1 - {x, y} coordinates
 * @param {object} point2 - {x, y} coordinates
 * @param {number} threshold - Minimum distance to consider "different" (default: 2px)
 * @returns {boolean} - True if points are significantly different
 */
export const isSignificantMove = (point1, point2, threshold = 2) => {
  if (!point1 || !point2) return true;
  
  const dx = Math.abs(point1.x - point2.x);
  const dy = Math.abs(point1.y - point2.y);
  
  // Return true if EITHER dx OR dy exceeds threshold
  return dx >= threshold || dy >= threshold;
};

// Export color palette for testing
export { CURSOR_COLORS };
