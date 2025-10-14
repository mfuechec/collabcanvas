// Helper functions for CollabCanvas
import { getCurrentCursorUserId } from '../services/cursors';

/**
 * Expanded color palette for user cursors and avatars - high contrast colors that work on both light and dark backgrounds
 * Carefully selected for maximum distinction and accessibility
 */
const CURSOR_COLORS = [
  // Reds & Pinks
  '#EF4444', // Red
  '#DC2626', // Dark Red
  '#F87171', // Light Red
  '#EC4899', // Pink
  '#BE185D', // Dark Pink
  '#F472B6', // Light Pink
  '#E11D48', // Rose
  
  // Oranges & Yellows
  '#F97316', // Orange
  '#EA580C', // Dark Orange
  '#FB923C', // Light Orange
  '#EAB308', // Yellow
  '#CA8A04', // Dark Yellow
  '#FDE047', // Bright Yellow
  '#F59E0B', // Amber
  '#D97706', // Dark Amber
  
  // Greens
  '#22C55E', // Green
  '#16A34A', // Dark Green
  '#4ADE80', // Light Green
  '#10B981', // Emerald
  '#059669', // Dark Emerald
  '#34D399', // Light Emerald
  '#65A30D', // Lime
  '#84CC16', // Bright Lime
  
  // Blues & Cyans
  '#3B82F6', // Blue
  '#2563EB', // Dark Blue
  '#60A5FA', // Light Blue
  '#06B6D4', // Cyan
  '#0891B2', // Dark Cyan
  '#22D3EE', // Light Cyan
  '#0EA5E9', // Sky Blue
  '#0284C7', // Dark Sky
  
  // Purples & Violets
  '#8B5CF6', // Purple
  '#7C3AED', // Dark Purple
  '#A78BFA', // Light Purple
  '#A855F7', // Violet
  '#9333EA', // Dark Violet
  '#C084FC', // Light Violet
  '#6366F1', // Indigo
  '#4F46E5', // Dark Indigo
  
  // Additional Distinct Colors
  '#14B8A6', // Teal
  '#0D9488', // Dark Teal
  '#2DD4BF', // Light Teal
  '#F43F5E', // Red Rose
  '#E879F9', // Fuchsia
  '#C026D3', // Magenta
  '#8E4EC6', // Purple Medium
  '#7E22CE', // Purple Dark
  '#6B21A8', // Purple Deep
  '#581C87', // Purple Darker
  
  // Earth Tones (with good contrast)
  '#92400E', // Brown
  '#B45309', // Orange Brown
  '#A16207', // Yellow Brown
  '#166534', // Forest Green
  '#1E40AF', // Navy Blue
  '#7C2D12', // Dark Brown
  '#991B1B', // Dark Red
  '#1E3A8A', // Deep Blue
];

/**
 * Generate a consistent color for a user based on their ID
 * @param {string} userId - User's unique identifier
 * @returns {string} - Hex color code
 */
export const generateUserColor = (userId) => {
  if (!userId) return CURSOR_COLORS[0];
  
  // Create a more sophisticated hash of the userId for better distribution
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  
  // Add a secondary hash to improve distribution
  let secondaryHash = 0;
  for (let i = userId.length - 1; i >= 0; i--) {
    secondaryHash += userId.charCodeAt(i) * (i + 1);
  }
  
  // Combine both hashes for better color distribution
  const combinedHash = Math.abs(hash + secondaryHash);
  const colorIndex = combinedHash % CURSOR_COLORS.length;
  
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
