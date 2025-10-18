// ========================================
// COLLISION DETECTION
// ========================================
// Check for overlaps and collisions between shapes

import { getShapeBounds } from './bounds.js';
import { CANVAS_DIMENSIONS } from './constants.js';

/**
 * Check if two rectangles intersect
 * @param {{x: number, y: number, width: number, height: number}} rect1 - First rectangle
 * @param {{x: number, y: number, width: number, height: number}} rect2 - Second rectangle
 * @returns {boolean} True if rectangles intersect
 */
export function rectanglesIntersect(rect1, rect2) {
  return !(
    rect1.x + rect1.width < rect2.x ||
    rect2.x + rect2.width < rect1.x ||
    rect1.y + rect1.height < rect2.y ||
    rect2.y + rect2.height < rect1.y
  );
}

/**
 * Check if a bounding box collides with any existing shapes
 * @param {number} x - Bounding box X
 * @param {number} y - Bounding box Y
 * @param {number} width - Bounding box width
 * @param {number} height - Bounding box height
 * @param {Array<Object>} shapes - Array of existing shapes
 * @param {number} [padding=0] - Optional padding around the box
 * @returns {boolean} True if collision detected
 */
export function hasCollision(x, y, width, height, shapes, padding = 0) {
  const rect1 = {
    x: x - padding,
    y: y - padding,
    width: width + padding * 2,
    height: height + padding * 2
  };
  
  for (const shape of shapes) {
    const rect2 = getShapeBounds(shape);
    
    if (rectanglesIntersect(rect1, rect2)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Find an empty space on the canvas near a preferred position
 * Uses spiral search pattern to find collision-free space
 * 
 * @param {number} width - Width of space needed
 * @param {number} height - Height of space needed
 * @param {{x: number, y: number}} preferredPos - Preferred position (top-left)
 * @param {Array<Object>} shapes - Array of existing shapes
 * @param {number} [step=100] - Search step size
 * @param {number} [maxRadius=1000] - Maximum search radius
 * @param {number} [padding=50] - Padding around shapes
 * @returns {{x: number, y: number}|null} Empty position or null if not found
 */
export function findEmptySpace(width, height, preferredPos, shapes, step = 100, maxRadius = 1000, padding = 50) {
  const { x: preferredX, y: preferredY } = preferredPos;
  
  // Try preferred position first
  if (!hasCollision(preferredX, preferredY, width, height, shapes, padding)) {
    // Ensure it's within canvas bounds
    if (preferredX >= 0 && preferredX + width <= CANVAS_DIMENSIONS.WIDTH &&
        preferredY >= 0 && preferredY + height <= CANVAS_DIMENSIONS.HEIGHT) {
      return { x: preferredX, y: preferredY };
    }
  }
  
  // Spiral search pattern
  for (let radius = step; radius <= maxRadius; radius += step) {
    // Try 8 positions around the preferred location
    const positions = [
      { x: preferredX, y: preferredY - radius }, // North
      { x: preferredX + radius, y: preferredY - radius }, // NE
      { x: preferredX + radius, y: preferredY }, // East
      { x: preferredX + radius, y: preferredY + radius }, // SE
      { x: preferredX, y: preferredY + radius }, // South
      { x: preferredX - radius, y: preferredY + radius }, // SW
      { x: preferredX - radius, y: preferredY }, // West
      { x: preferredX - radius, y: preferredY - radius }, // NW
    ];
    
    for (const pos of positions) {
      // Ensure within canvas bounds
      if (pos.x < 0 || pos.x + width > CANVAS_DIMENSIONS.WIDTH ||
          pos.y < 0 || pos.y + height > CANVAS_DIMENSIONS.HEIGHT) {
        continue;
      }
      
      // Check for collisions
      if (!hasCollision(pos.x, pos.y, width, height, shapes, padding)) {
        return pos;
      }
    }
  }
  
  return null;
}

/**
 * Check if a shape overlaps with any other shapes
 * @param {Object} shape - Shape to check
 * @param {Array<Object>} otherShapes - Array of other shapes
 * @param {number} [padding=0] - Optional padding
 * @returns {boolean} True if shape overlaps with any other shape
 */
export function shapeOverlapsAny(shape, otherShapes, padding = 0) {
  const bounds = getShapeBounds(shape);
  return hasCollision(bounds.x, bounds.y, bounds.width, bounds.height, otherShapes, padding);
}

/**
 * Get all shapes that intersect with a given bounding box
 * @param {number} x - Bounding box X
 * @param {number} y - Bounding box Y
 * @param {number} width - Bounding box width
 * @param {number} height - Bounding box height
 * @param {Array<Object>} shapes - Array of shapes to check
 * @returns {Array<Object>} Array of intersecting shapes
 */
export function getIntersectingShapes(x, y, width, height, shapes) {
  const rect1 = { x, y, width, height };
  const intersecting = [];
  
  for (const shape of shapes) {
    const rect2 = getShapeBounds(shape);
    
    if (rectanglesIntersect(rect1, rect2)) {
      intersecting.push(shape);
    }
  }
  
  return intersecting;
}

/**
 * Check if a point is inside a shape's bounding box
 * @param {{x: number, y: number}} point - Point to check
 * @param {Object} shape - Shape to check against
 * @returns {boolean} True if point is inside shape bounds
 */
export function isPointInShapeBounds(point, shape) {
  const bounds = getShapeBounds(shape);
  
  return (
    point.x >= bounds.x &&
    point.x <= bounds.x + bounds.width &&
    point.y >= bounds.y &&
    point.y <= bounds.y + bounds.height
  );
}

