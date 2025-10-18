// ========================================
// ROTATION UTILITIES
// ========================================
// Rotation transformations and rotated bounds calculations

import { CANVAS_DIMENSIONS } from './constants.js';
import { getShapeBounds, estimateTextDimensions } from './bounds.js';

/**
 * Rotate a point around an origin
 * @param {{x: number, y: number}} point - Point to rotate
 * @param {number} angle - Rotation angle in degrees
 * @param {{x: number, y: number}} origin - Origin point to rotate around
 * @returns {{x: number, y: number}} Rotated point
 */
export function rotatePoint(point, angle, origin) {
  const radians = (angle * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  
  // Translate to origin
  const relX = point.x - origin.x;
  const relY = point.y - origin.y;
  
  // Rotate
  const rotatedX = relX * cos - relY * sin;
  const rotatedY = relX * sin + relY * cos;
  
  // Translate back
  return {
    x: rotatedX + origin.x,
    y: rotatedY + origin.y
  };
}

/**
 * Calculate the axis-aligned bounding box (AABB) of a rotated rectangle
 * @param {number} x - Top-left X (unrotated)
 * @param {number} y - Top-left Y (unrotated)
 * @param {number} width - Width
 * @param {number} height - Height
 * @param {number} rotation - Rotation in degrees
 * @returns {{x: number, y: number, width: number, height: number}} Axis-aligned bounding box
 */
export function getRotatedBoundingBox(x, y, width, height, rotation) {
  if (!rotation || rotation === 0) {
    return { x, y, width, height };
  }
  
  const radians = (rotation * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  
  // Four corners of the unrotated rectangle (relative to top-left)
  const corners = [
    { x: 0, y: 0 },
    { x: width, y: 0 },
    { x: width, y: height },
    { x: 0, y: height }
  ];
  
  // Rotate each corner
  const rotatedCorners = corners.map(corner => ({
    x: corner.x * cos - corner.y * sin,
    y: corner.x * sin + corner.y * cos
  }));
  
  // Find min/max to get AABB
  const minX = Math.min(...rotatedCorners.map(c => c.x));
  const maxX = Math.max(...rotatedCorners.map(c => c.x));
  const minY = Math.min(...rotatedCorners.map(c => c.y));
  const maxY = Math.max(...rotatedCorners.map(c => c.y));
  
  return {
    x: x + minX,
    y: y + minY,
    width: maxX - minX,
    height: maxY - minY
  };
}

/**
 * Get rotated bounding box for any shape type
 * @param {Object} shape - Shape object
 * @param {number} [rotation] - Optional rotation override (defaults to shape.rotation)
 * @returns {{x: number, y: number, width: number, height: number}} Rotated bounding box
 */
export function getRotatedShapeBounds(shape, rotation) {
  const bounds = getShapeBounds(shape);
  const angle = rotation !== undefined ? rotation : (shape.rotation || 0);
  
  // For line and pen, rotation is more complex (rotate each point)
  // For now, use the bounding box approach
  if (shape.type === 'line' || shape.type === 'pen') {
    // Line/pen points are absolute, so rotation affects the entire path
    // The bounding box approach works here
    return getRotatedBoundingBox(bounds.x, bounds.y, bounds.width, bounds.height, angle);
  }
  
  return getRotatedBoundingBox(bounds.x, bounds.y, bounds.width, bounds.height, angle);
}

/**
 * Check if a shape with given rotation fits within canvas bounds
 * @param {Object} shape - Shape object
 * @param {number} rotation - Rotation angle in degrees
 * @returns {boolean} True if shape fits within canvas
 */
export function isRotationValid(shape, rotation) {
  // Circles are rotationally symmetric - any rotation is valid
  if (shape.type === 'circle') {
    return true;
  }
  
  // Get shape bounds (handling text estimation)
  let shapeX = shape.x || 0;
  let shapeY = shape.y || 0;
  let shapeWidth = shape.width || 100;
  let shapeHeight = shape.height || 100;
  
  // For text, estimate dimensions
  if (shape.type === 'text') {
    const text = shape.text || 'Text';
    const fontSize = shape.fontSize || 48;
    const dims = estimateTextDimensions(text, fontSize);
    shapeWidth = dims.width;
    shapeHeight = dims.height;
  }
  
  // For lines/pen, check if all rotated points are within bounds
  if ((shape.type === 'line' || shape.type === 'pen') && shape.points && shape.points.length >= 4) {
    const radians = (rotation * Math.PI) / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    
    // Calculate center
    const xCoords = shape.points.filter((_, i) => i % 2 === 0);
    const yCoords = shape.points.filter((_, i) => i % 2 === 1);
    const centerX = (Math.min(...xCoords) + Math.max(...xCoords)) / 2;
    const centerY = (Math.min(...yCoords) + Math.max(...yCoords)) / 2;
    
    // Check if all rotated points are within canvas
    for (let i = 0; i < shape.points.length; i += 2) {
      const px = shape.points[i];
      const py = shape.points[i + 1];
      
      // Translate to origin (relative to center)
      const relX = px - centerX;
      const relY = py - centerY;
      
      // Rotate
      const rotatedX = relX * cos - relY * sin;
      const rotatedY = relX * sin + relY * cos;
      
      // Translate back
      const finalX = rotatedX + centerX;
      const finalY = rotatedY + centerY;
      
      // Check bounds
      if (finalX < 0 || finalX > CANVAS_DIMENSIONS.WIDTH || 
          finalY < 0 || finalY > CANVAS_DIMENSIONS.HEIGHT) {
        return false;
      }
    }
    
    return true;
  }
  
  // For standard shapes, check rotated bounding box
  const rotatedBounds = getRotatedBoundingBox(shapeX, shapeY, shapeWidth, shapeHeight, rotation);
  
  return (
    rotatedBounds.x >= 0 &&
    rotatedBounds.y >= 0 &&
    rotatedBounds.x + rotatedBounds.width <= CANVAS_DIMENSIONS.WIDTH &&
    rotatedBounds.y + rotatedBounds.height <= CANVAS_DIMENSIONS.HEIGHT
  );
}

/**
 * Find the maximum valid rotation in the direction of the target rotation
 * Uses binary search to find the closest valid rotation
 * 
 * @param {Object} shape - Shape object
 * @param {number} currentRotation - Current rotation in degrees
 * @param {number} targetRotation - Target rotation in degrees
 * @param {number} [precision=20] - Number of binary search iterations
 * @returns {number} Maximum valid rotation in degrees
 */
export function findMaxValidRotation(shape, currentRotation, targetRotation, precision = 20) {
  // If target is valid, return it
  if (isRotationValid(shape, targetRotation)) {
    return targetRotation;
  }
  
  // Binary search for the maximum valid rotation
  let low = currentRotation;
  let high = targetRotation;
  
  // Determine direction
  const direction = targetRotation > currentRotation ? 1 : -1;
  
  // Handle wrapping around 360
  if (Math.abs(targetRotation - currentRotation) > 180) {
    // User is rotating the "short way" around the circle
    if (direction > 0) {
      high = targetRotation - 360;
    } else {
      high = targetRotation + 360;
    }
  }
  
  let maxValid = currentRotation;
  
  for (let i = 0; i < precision; i++) {
    const mid = (low + high) / 2;
    const normalizedMid = ((mid % 360) + 360) % 360;
    
    if (isRotationValid(shape, normalizedMid)) {
      maxValid = normalizedMid;
      if (direction > 0) {
        low = mid;
      } else {
        high = mid;
      }
    } else {
      if (direction > 0) {
        high = mid;
      } else {
        low = mid;
      }
    }
  }
  
  return Math.round(maxValid);
}

/**
 * Check if rotating a shape would cause it to clip outside canvas
 * @param {Object} shape - Shape object
 * @param {number} newRotation - New rotation to test
 * @returns {boolean} True if shape would clip, false if it fits
 */
export function wouldClipOnRotation(shape, newRotation) {
  return !isRotationValid(shape, newRotation);
}

