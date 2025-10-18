// ========================================
// BOUNDING BOX CALCULATIONS
// ========================================
// Calculate bounding boxes for all shape types

import { TEXT_DIMENSION_FORMULA, CANVAS_DIMENSIONS } from './constants.js';
import { topLeftToCenter, circleTopLeftToCenter } from './coordinates.js';

/**
 * Estimate text dimensions based on content and font size
 * Uses standardized formula for consistency
 * 
 * @param {string} text - Text content
 * @param {number} fontSize - Font size in pixels
 * @returns {{width: number, height: number}} Estimated dimensions
 */
export function estimateTextDimensions(text, fontSize) {
  const width = text.length * fontSize * TEXT_DIMENSION_FORMULA.WIDTH_PER_CHAR;
  const height = fontSize * TEXT_DIMENSION_FORMULA.HEIGHT_MULTIPLIER;
  
  return { width, height };
}

/**
 * Get bounding box for a line (2 points)
 * @param {number[]} points - Line points [x1, y1, x2, y2]
 * @returns {{x: number, y: number, width: number, height: number, centerX: number, centerY: number}} Bounding box
 */
export function getLineBounds(points) {
  if (!points || points.length !== 4) {
    return { x: 0, y: 0, width: 0, height: 0, centerX: 0, centerY: 0 };
  }
  
  const [x1, y1, x2, y2] = points;
  const minX = Math.min(x1, x2);
  const minY = Math.min(y1, y2);
  const maxX = Math.max(x1, x2);
  const maxY = Math.max(y1, y2);
  
  const centerX = (x1 + x2) / 2;
  const centerY = (y1 + y2) / 2;
  
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
    centerX,
    centerY
  };
}

/**
 * Get bounding box for a pen path (multiple points)
 * @param {number[]} points - Pen points [x1, y1, x2, y2, ..., xn, yn]
 * @returns {{x: number, y: number, width: number, height: number, centerX: number, centerY: number}} Bounding box
 */
export function getPenBounds(points) {
  if (!points || points.length < 4) {
    return { x: 0, y: 0, width: 0, height: 0, centerX: 0, centerY: 0 };
  }
  
  const xCoords = points.filter((_, i) => i % 2 === 0);
  const yCoords = points.filter((_, i) => i % 2 === 1);
  
  const minX = Math.min(...xCoords);
  const maxX = Math.max(...xCoords);
  const minY = Math.min(...yCoords);
  const maxY = Math.max(...yCoords);
  
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  
  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
    centerX,
    centerY
  };
}

/**
 * Get bounding box for any shape type
 * Returns axis-aligned bounding box (AABB) in storage coordinates
 * 
 * @param {Object} shape - Shape object with type, x, y, width, height, etc.
 * @returns {{x: number, y: number, width: number, height: number}} Bounding box
 */
export function getShapeBounds(shape) {
  if (!shape) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
  
  const x = shape.x || 0;
  const y = shape.y || 0;
  
  // Handle different shape types
  if (shape.type === 'line' && shape.points && shape.points.length === 4) {
    return getLineBounds(shape.points);
  }
  
  if (shape.type === 'pen' && shape.points && shape.points.length >= 4) {
    return getPenBounds(shape.points);
  }
  
  if (shape.type === 'text') {
    // Text auto-sizes, estimate dimensions
    const text = shape.text || 'Text';
    const fontSize = shape.fontSize || TEXT_DIMENSION_FORMULA.DEFAULT_FONT_SIZE;
    const { width, height } = estimateTextDimensions(text, fontSize);
    
    return { x, y, width, height };
  }
  
  // Rectangle and circle use stored width/height
  // Note: Circle is stored as {x: topLeft, y: topLeft, width: diameter, height: diameter}
  const width = shape.width || 100;
  const height = shape.height || 100;
  
  return { x, y, width, height };
}

/**
 * Get center point of any shape type
 * @param {Object} shape - Shape object
 * @returns {{x: number, y: number}} Center coordinates
 */
export function getShapeCenter(shape) {
  if (!shape) {
    return { x: 0, y: 0 };
  }
  
  const bounds = getShapeBounds(shape);
  
  // For line and pen, we already calculated center in bounds
  if (shape.type === 'line' && shape.points && shape.points.length === 4) {
    const lineBounds = getLineBounds(shape.points);
    return { x: lineBounds.centerX, y: lineBounds.centerY };
  }
  
  if (shape.type === 'pen' && shape.points && shape.points.length >= 4) {
    const penBounds = getPenBounds(shape.points);
    return { x: penBounds.centerX, y: penBounds.centerY };
  }
  
  // For other shapes, center is at middle of bounding box
  return topLeftToCenter(bounds.x, bounds.y, bounds.width, bounds.height);
}

/**
 * Get actual dimensions from a Konva node (handles text auto-sizing)
 * @param {Object} shapeData - Original shape data
 * @param {Object} [konvaNode] - Optional Konva node reference
 * @returns {{width: number, height: number}} Actual dimensions
 */
export function getActualDimensions(shapeData, konvaNode = null) {
  // If text and we have a Konva node, get actual rendered dimensions
  if (shapeData.type === 'text' && konvaNode && typeof konvaNode.width === 'function') {
    return {
      width: konvaNode.width(),
      height: konvaNode.height()
    };
  }
  
  // If text but no Konva node, estimate
  if (shapeData.type === 'text') {
    return estimateTextDimensions(
      shapeData.text || 'Text',
      shapeData.fontSize || TEXT_DIMENSION_FORMULA.DEFAULT_FONT_SIZE
    );
  }
  
  // For all other shapes, use stored dimensions
  return {
    width: shapeData.width || 100,
    height: shapeData.height || 100
  };
}

/**
 * Check if a point is within canvas bounds
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @returns {boolean} True if within canvas
 */
export function isPointWithinCanvas(x, y) {
  return x >= 0 && x <= CANVAS_DIMENSIONS.WIDTH && 
         y >= 0 && y <= CANVAS_DIMENSIONS.HEIGHT;
}

/**
 * Check if a bounding box is within canvas bounds
 * @param {number} x - Top-left X
 * @param {number} y - Top-left Y
 * @param {number} width - Width
 * @param {number} height - Height
 * @returns {boolean} True if entirely within canvas
 */
export function isWithinCanvas(x, y, width, height) {
  return x >= 0 && 
         y >= 0 && 
         x + width <= CANVAS_DIMENSIONS.WIDTH && 
         y + height <= CANVAS_DIMENSIONS.HEIGHT;
}

/**
 * Constrain a bounding box to canvas bounds (simple, no rotation)
 * @param {number} x - Top-left X
 * @param {number} y - Top-left Y
 * @param {number} width - Width
 * @param {number} height - Height
 * @returns {{x: number, y: number}} Constrained position
 */
export function constrainToCanvas(x, y, width, height) {
  return {
    x: Math.max(0, Math.min(CANVAS_DIMENSIONS.WIDTH - width, x)),
    y: Math.max(0, Math.min(CANVAS_DIMENSIONS.HEIGHT - height, y))
  };
}

/**
 * Constrain a shape to canvas bounds (handles rotation)
 * This is the main function used by drag handlers and positioning
 * @param {number} x - Top-left X
 * @param {number} y - Top-left Y
 * @param {number} width - Width
 * @param {number} height - Height
 * @param {number} [rotation=0] - Rotation in degrees
 * @param {string} [shapeType] - Optional shape type (circle doesn't need rotation calculation)
 * @returns {{x: number, y: number}} Constrained position
 */
export function constrainToBounds(x, y, width = 0, height = 0, rotation = 0, shapeType = null) {
  // Circles are rotationally symmetric - rotation doesn't change their bounding box
  // No rotation calculation needed
  if (shapeType === 'circle' || !rotation || rotation === 0) {
    return {
      x: Math.max(0, Math.min(x, CANVAS_DIMENSIONS.WIDTH - width)),
      y: Math.max(0, Math.min(y, CANVAS_DIMENSIONS.HEIGHT - height))
    };
  }
  
  // Calculate rotated bounding box by checking all four corners
  const radians = (rotation * Math.PI) / 180;
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  
  // Four corners of the unrotated rectangle (relative to top-left)
  const corners = [
    { x: 0, y: 0 },           // Top-left
    { x: width, y: 0 },       // Top-right
    { x: width, y: height },  // Bottom-right
    { x: 0, y: height }       // Bottom-left
  ];
  
  // Rotate each corner around (0, 0) and find min/max
  const rotatedCorners = corners.map(corner => ({
    x: corner.x * cos - corner.y * sin,
    y: corner.x * sin + corner.y * cos
  }));
  
  const minX = Math.min(...rotatedCorners.map(c => c.x));
  const maxX = Math.max(...rotatedCorners.map(c => c.x));
  const minY = Math.min(...rotatedCorners.map(c => c.y));
  const maxY = Math.max(...rotatedCorners.map(c => c.y));
  
  // Rotated bounding box dimensions
  const rotatedWidth = maxX - minX;
  const rotatedHeight = maxY - minY;
  const offsetX = minX; // Offset from original top-left
  const offsetY = minY;
  
  // Constrain the top-left of the rotated bounding box
  const constrainedX = Math.max(-offsetX, Math.min(x, CANVAS_DIMENSIONS.WIDTH - rotatedWidth - offsetX));
  const constrainedY = Math.max(-offsetY, Math.min(y, CANVAS_DIMENSIONS.HEIGHT - rotatedHeight - offsetY));
  
  return {
    x: constrainedX,
    y: constrainedY
  };
}

/**
 * Calculate offset from bounding box top-left to shape center
 * Used for converting between Konva center position and storage position
 * 
 * @param {Object} shape - Shape object
 * @param {number[]} [points] - Optional points array for line/pen
 * @returns {{offsetX: number, offsetY: number}} Offset from top-left to center
 */
export function getBoundsOffset(shape, points = null) {
  if (shape.type === 'line' && points && points.length === 4) {
    const bounds = getLineBounds(points);
    return {
      offsetX: bounds.centerX - bounds.x,
      offsetY: bounds.centerY - bounds.y
    };
  }
  
  if (shape.type === 'pen' && points && points.length >= 4) {
    const bounds = getPenBounds(points);
    return {
      offsetX: bounds.centerX - bounds.x,
      offsetY: bounds.centerY - bounds.y
    };
  }
  
  // For standard shapes, offset is half the dimensions
  const { width, height } = getActualDimensions(shape);
  return {
    offsetX: width / 2,
    offsetY: height / 2
  };
}

/**
 * Translate line points by a delta
 * @param {number[]} points - Original points [x1, y1, x2, y2]
 * @param {number} deltaX - X translation
 * @param {number} deltaY - Y translation
 * @returns {number[]} Translated points
 */
export function translateLinePoints(points, deltaX, deltaY) {
  if (!points || points.length !== 4) return points;
  
  return [
    points[0] + deltaX,
    points[1] + deltaY,
    points[2] + deltaX,
    points[3] + deltaY
  ];
}

/**
 * Translate pen points by a delta
 * @param {number[]} points - Original points [x1, y1, ..., xn, yn]
 * @param {number} deltaX - X translation
 * @param {number} deltaY - Y translation
 * @returns {number[]} Translated points
 */
export function translatePenPoints(points, deltaX, deltaY) {
  if (!points || points.length < 4) return points;
  
  return points.map((coord, index) => {
    if (index % 2 === 0) {
      return coord + deltaX; // X coordinate
    } else {
      return coord + deltaY; // Y coordinate
    }
  });
}

