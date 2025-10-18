// ========================================
// RENDERING UTILITIES
// ========================================
// Convert shape data to Konva component props

import { getLineBounds, getPenBounds, getActualDimensions } from './bounds.js';
import { topLeftToCenter } from './coordinates.js';

/**
 * Get Konva rendering props for a rectangle
 * Rectangles render at center with offsetX/offsetY for rotation
 * 
 * @param {Object} shape - Rectangle shape data
 * @returns {Object} Konva component props
 */
export function getRectangleRenderProps(shape) {
  const { x, y, width, height, rotation = 0, cornerRadius = 0 } = shape;
  const center = topLeftToCenter(x, y, width, height);
  
  return {
    x: center.x,
    y: center.y,
    width,
    height,
    offsetX: width / 2,
    offsetY: height / 2,
    rotation,
    cornerRadius
  };
}

/**
 * Get Konva rendering props for a circle
 * Circles render at center with radius
 * 
 * @param {Object} shape - Circle shape data (stored as bounding box)
 * @returns {Object} Konva component props
 */
export function getCircleRenderProps(shape) {
  const { x, y, width, height, rotation = 0 } = shape;
  const radius = Math.min(width, height) / 2;
  const center = topLeftToCenter(x, y, width, height);
  
  return {
    x: center.x,
    y: center.y,
    radius,
    rotation
  };
}

/**
 * Get Konva rendering props for text
 * Text renders with dynamic positioning based on auto-sized dimensions
 * 
 * @param {Object} shape - Text shape data
 * @param {Object} [konvaNode] - Optional Konva text node for actual dimensions
 * @returns {Object} Konva component props
 */
export function getTextRenderProps(shape, konvaNode = null) {
  const { x, y, text = 'Text', fontSize = 48, rotation = 0 } = shape;
  
  // If we have the node, we can position accurately
  if (konvaNode) {
    const actualWidth = konvaNode.width();
    const actualHeight = konvaNode.height();
    const center = topLeftToCenter(x, y, actualWidth, actualHeight);
    
    return {
      x: center.x,
      y: center.y,
      text,
      fontSize,
      offsetX: actualWidth / 2,
      offsetY: actualHeight / 2,
      rotation
    };
  }
  
  // Without node, return base props (callback ref will handle positioning)
  return {
    x, // Initial position (will be updated by callback ref)
    y,
    text,
    fontSize,
    rotation
  };
}

/**
 * Get Konva rendering props for a line
 * Lines render at center with offsetX/offsetY
 * 
 * @param {Object} shape - Line shape data
 * @returns {Object} Konva component props
 */
export function getLineRenderProps(shape) {
  const { points, stroke, strokeWidth = 2, rotation = 0 } = shape;
  
  if (!points || points.length !== 4) {
    return {
      points: [0, 0, 100, 100],
      x: 50,
      y: 50,
      offsetX: 50,
      offsetY: 50,
      stroke: stroke || '#cccccc',
      strokeWidth,
      rotation
    };
  }
  
  const bounds = getLineBounds(points);
  
  return {
    points,
    x: bounds.centerX,
    y: bounds.centerY,
    offsetX: bounds.centerX,
    offsetY: bounds.centerY,
    stroke: stroke || '#cccccc',
    strokeWidth,
    rotation
  };
}

/**
 * Get Konva rendering props for a pen path
 * Pen paths render at center with offsetX/offsetY
 * 
 * @param {Object} shape - Pen shape data
 * @returns {Object} Konva component props
 */
export function getPenRenderProps(shape) {
  const { points, stroke, strokeWidth = 2, rotation = 0 } = shape;
  
  if (!points || points.length < 4) {
    return {
      points: [0, 0, 100, 100],
      x: 50,
      y: 50,
      offsetX: 50,
      offsetY: 50,
      stroke: stroke || '#cccccc',
      strokeWidth,
      rotation
    };
  }
  
  const bounds = getPenBounds(points);
  
  return {
    points,
    x: bounds.centerX,
    y: bounds.centerY,
    offsetX: bounds.centerX,
    offsetY: bounds.centerY,
    stroke: stroke || '#cccccc',
    strokeWidth,
    rotation,
    tension: 0.5,
    lineCap: 'round',
    lineJoin: 'round'
  };
}

/**
 * Get Konva rendering props for any shape type
 * Returns appropriate props based on shape.type
 * 
 * @param {Object} shape - Shape data
 * @param {Object} [konvaNode] - Optional Konva node (for text)
 * @returns {Object} Konva component props
 */
export function getKonvaRenderProps(shape, konvaNode = null) {
  if (!shape || !shape.type) {
    return getRectangleRenderProps({ x: 0, y: 0, width: 100, height: 100 });
  }
  
  switch (shape.type) {
    case 'circle':
      return getCircleRenderProps(shape);
    
    case 'text':
      return getTextRenderProps(shape, konvaNode);
    
    case 'line':
      return getLineRenderProps(shape);
    
    case 'pen':
      return getPenRenderProps(shape);
    
    case 'rectangle':
    default:
      return getRectangleRenderProps(shape);
  }
}

/**
 * Convert Konva position to bounding box position for drag handling
 * Used during drag operations to convert center position back to storage format
 * 
 * @param {Object} konvaPos - Konva position {x, y}
 * @param {Object} shape - Shape data
 * @param {Object} [konvaNode] - Optional Konva node for actual dimensions
 * @returns {{x: number, y: number}} Bounding box top-left position
 */
export function konvaPositionToBoundingBox(konvaPos, shape, konvaNode = null) {
  const { type, points, width, height } = shape;
  
  // Get actual dimensions (important for text)
  const dimensions = getActualDimensions(shape, konvaNode);
  
  // Line: special handling
  if (type === 'line' && points && points.length === 4) {
    const bounds = getLineBounds(points);
    const offsetX = bounds.centerX - bounds.x;
    const offsetY = bounds.centerY - bounds.y;
    return {
      x: konvaPos.x - offsetX,
      y: konvaPos.y - offsetY
    };
  }
  
  // Pen: special handling
  if (type === 'pen' && points && points.length >= 4) {
    const bounds = getPenBounds(points);
    const offsetX = bounds.centerX - bounds.x;
    const offsetY = bounds.centerY - bounds.y;
    return {
      x: konvaPos.x - offsetX,
      y: konvaPos.y - offsetY
    };
  }
  
  // Standard shapes: center to top-left
  return {
    x: konvaPos.x - dimensions.width / 2,
    y: konvaPos.y - dimensions.height / 2
  };
}

/**
 * Convert bounding box position back to Konva position for drag handling
 * Used to update Konva node position after constraining bounds
 * 
 * @param {{x: number, y: number}} boundingBox - Bounding box position
 * @param {Object} shape - Shape data
 * @param {Object} [konvaNode] - Optional Konva node for actual dimensions
 * @returns {{x: number, y: number}} Konva center position
 */
export function boundingBoxToKonvaPosition(boundingBox, shape, konvaNode = null) {
  const { type, points } = shape;
  
  // Get actual dimensions (important for text)
  const dimensions = getActualDimensions(shape, konvaNode);
  
  // Line: special handling
  if (type === 'line' && points && points.length === 4) {
    const bounds = getLineBounds(points);
    const offsetX = bounds.centerX - bounds.x;
    const offsetY = bounds.centerY - bounds.y;
    return {
      x: boundingBox.x + offsetX,
      y: boundingBox.y + offsetY
    };
  }
  
  // Pen: special handling
  if (type === 'pen' && points && points.length >= 4) {
    const bounds = getPenBounds(points);
    const offsetX = bounds.centerX - bounds.x;
    const offsetY = bounds.centerY - bounds.y;
    return {
      x: boundingBox.x + offsetX,
      y: boundingBox.y + offsetY
    };
  }
  
  // Standard shapes: top-left to center
  return {
    x: boundingBox.x + dimensions.width / 2,
    y: boundingBox.y + dimensions.height / 2
  };
}

