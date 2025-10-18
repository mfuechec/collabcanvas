// ========================================
// SHAPE VALIDATION
// ========================================
// Validate and normalize shape data

import { SHAPE_TYPES, MIN_SHAPE_SIZE, MAX_SHAPE_SIZE, TEXT_DIMENSION_FORMULA, DEFAULT_SHAPE_PROPS, CANVAS_DIMENSIONS } from './constants.js';
import { isWithinCanvas } from './bounds.js';

/**
 * Validate a rectangle shape
 * @param {Object} shape - Rectangle shape data
 * @returns {{valid: boolean, errors: string[]}} Validation result
 */
export function validateRectangle(shape) {
  const errors = [];
  
  if (typeof shape.x !== 'number' || isNaN(shape.x)) {
    errors.push('Rectangle must have numeric x coordinate');
  }
  
  if (typeof shape.y !== 'number' || isNaN(shape.y)) {
    errors.push('Rectangle must have numeric y coordinate');
  }
  
  if (typeof shape.width !== 'number' || isNaN(shape.width) || shape.width < MIN_SHAPE_SIZE.rectangle.width) {
    errors.push(`Rectangle width must be at least ${MIN_SHAPE_SIZE.rectangle.width}px`);
  }
  
  if (typeof shape.height !== 'number' || isNaN(shape.height) || shape.height < MIN_SHAPE_SIZE.rectangle.height) {
    errors.push(`Rectangle height must be at least ${MIN_SHAPE_SIZE.rectangle.height}px`);
  }
  
  if (shape.width > MAX_SHAPE_SIZE.rectangle.width) {
    errors.push(`Rectangle width cannot exceed ${MAX_SHAPE_SIZE.rectangle.width}px`);
  }
  
  if (shape.height > MAX_SHAPE_SIZE.rectangle.height) {
    errors.push(`Rectangle height cannot exceed ${MAX_SHAPE_SIZE.rectangle.height}px`);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate a circle shape
 * @param {Object} shape - Circle shape data
 * @returns {{valid: boolean, errors: string[]}} Validation result
 */
export function validateCircle(shape) {
  const errors = [];
  
  if (typeof shape.x !== 'number' || isNaN(shape.x)) {
    errors.push('Circle must have numeric x coordinate');
  }
  
  if (typeof shape.y !== 'number' || isNaN(shape.y)) {
    errors.push('Circle must have numeric y coordinate');
  }
  
  if (typeof shape.width !== 'number' || isNaN(shape.width) || shape.width < MIN_SHAPE_SIZE.circle.diameter) {
    errors.push(`Circle diameter (width) must be at least ${MIN_SHAPE_SIZE.circle.diameter}px`);
  }
  
  if (typeof shape.height !== 'number' || isNaN(shape.height) || shape.height < MIN_SHAPE_SIZE.circle.diameter) {
    errors.push(`Circle diameter (height) must be at least ${MIN_SHAPE_SIZE.circle.diameter}px`);
  }
  
  if (shape.width !== shape.height) {
    errors.push('Circle width and height must be equal (diameter)');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate a text shape
 * @param {Object} shape - Text shape data
 * @returns {{valid: boolean, errors: string[]}} Validation result
 */
export function validateText(shape) {
  const errors = [];
  
  if (typeof shape.x !== 'number' || isNaN(shape.x)) {
    errors.push('Text must have numeric x coordinate');
  }
  
  if (typeof shape.y !== 'number' || isNaN(shape.y)) {
    errors.push('Text must have numeric y coordinate');
  }
  
  if (typeof shape.text !== 'string' || shape.text.length === 0) {
    errors.push('Text must have non-empty text content');
  }
  
  if (typeof shape.fontSize !== 'number' || isNaN(shape.fontSize) || shape.fontSize < MIN_SHAPE_SIZE.text.fontSize) {
    errors.push(`Text fontSize must be at least ${MIN_SHAPE_SIZE.text.fontSize}px`);
  }
  
  if (shape.fontSize > MAX_SHAPE_SIZE.text.fontSize) {
    errors.push(`Text fontSize cannot exceed ${MAX_SHAPE_SIZE.text.fontSize}px`);
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate a line shape
 * @param {Object} shape - Line shape data
 * @returns {{valid: boolean, errors: string[]}} Validation result
 */
export function validateLine(shape) {
  const errors = [];
  
  if (!Array.isArray(shape.points) || shape.points.length !== 4) {
    errors.push('Line must have exactly 4 points [x1, y1, x2, y2]');
  } else {
    // Check each point is a number
    for (let i = 0; i < shape.points.length; i++) {
      if (typeof shape.points[i] !== 'number' || isNaN(shape.points[i])) {
        errors.push(`Line point ${i} must be a number`);
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate a pen shape
 * @param {Object} shape - Pen shape data
 * @returns {{valid: boolean, errors: string[]}} Validation result
 */
export function validatePen(shape) {
  const errors = [];
  
  if (!Array.isArray(shape.points) || shape.points.length < 4 || shape.points.length % 2 !== 0) {
    errors.push('Pen must have at least 4 points (2 coordinates) and even number of values');
  } else {
    // Check each point is a number
    for (let i = 0; i < shape.points.length; i++) {
      if (typeof shape.points[i] !== 'number' || isNaN(shape.points[i])) {
        errors.push(`Pen point ${i} must be a number`);
        break; // Don't spam errors
      }
    }
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validate any shape based on its type
 * @param {Object} shape - Shape data
 * @returns {{valid: boolean, errors: string[]}} Validation result
 */
export function validateShape(shape) {
  if (!shape) {
    return { valid: false, errors: ['Shape is null or undefined'] };
  }
  
  if (!shape.type) {
    return { valid: false, errors: ['Shape must have a type'] };
  }
  
  // Validate based on type
  switch (shape.type) {
    case SHAPE_TYPES.RECTANGLE:
      return validateRectangle(shape);
    
    case SHAPE_TYPES.CIRCLE:
      return validateCircle(shape);
    
    case SHAPE_TYPES.TEXT:
      return validateText(shape);
    
    case SHAPE_TYPES.LINE:
      return validateLine(shape);
    
    case SHAPE_TYPES.PEN:
      return validatePen(shape);
    
    default:
      return { valid: false, errors: [`Unknown shape type: ${shape.type}`] };
  }
}

/**
 * Normalize a rectangle to canonical storage format
 * @param {Object} shape - Rectangle shape data (may have non-standard format)
 * @returns {Object} Normalized rectangle
 */
export function normalizeRectangle(shape) {
  return {
    type: SHAPE_TYPES.RECTANGLE,
    x: shape.x || 0,
    y: shape.y || 0,
    width: shape.width || MIN_SHAPE_SIZE.rectangle.width,
    height: shape.height || MIN_SHAPE_SIZE.rectangle.height,
    fill: shape.fill || DEFAULT_SHAPE_PROPS.fill,
    opacity: shape.opacity !== undefined ? shape.opacity : DEFAULT_SHAPE_PROPS.opacity,
    rotation: shape.rotation || DEFAULT_SHAPE_PROPS.rotation,
    cornerRadius: shape.cornerRadius || 0
  };
}

/**
 * Normalize a circle to canonical storage format
 * @param {Object} shape - Circle shape data (may have radius instead of diameter)
 * @returns {Object} Normalized circle
 */
export function normalizeCircle(shape) {
  // Handle both radius and width/height formats
  let diameter;
  if (shape.radius !== undefined) {
    diameter = shape.radius * 2;
  } else {
    diameter = Math.min(shape.width || 100, shape.height || 100);
  }
  
  // Ensure minimum size
  diameter = Math.max(diameter, MIN_SHAPE_SIZE.circle.diameter);
  
  return {
    type: SHAPE_TYPES.CIRCLE,
    x: shape.x || 0,
    y: shape.y || 0,
    width: diameter,
    height: diameter,
    fill: shape.fill || DEFAULT_SHAPE_PROPS.fill,
    opacity: shape.opacity !== undefined ? shape.opacity : DEFAULT_SHAPE_PROPS.opacity,
    rotation: shape.rotation || DEFAULT_SHAPE_PROPS.rotation
  };
}

/**
 * Normalize a text shape to canonical storage format
 * @param {Object} shape - Text shape data
 * @returns {Object} Normalized text
 */
export function normalizeText(shape) {
  return {
    type: SHAPE_TYPES.TEXT,
    x: shape.x || 0,
    y: shape.y || 0,
    text: shape.text || 'Text',
    fontSize: shape.fontSize || TEXT_DIMENSION_FORMULA.DEFAULT_FONT_SIZE,
    fill: shape.fill || '#000000',
    opacity: shape.opacity !== undefined ? shape.opacity : DEFAULT_SHAPE_PROPS.opacity,
    rotation: shape.rotation || DEFAULT_SHAPE_PROPS.rotation
    // Note: width and height are NOT stored for text (auto-sized)
  };
}

/**
 * Normalize a line shape to canonical storage format
 * @param {Object} shape - Line shape data
 * @returns {Object} Normalized line
 */
export function normalizeLine(shape) {
  // Calculate bounds from points
  const points = shape.points || [0, 0, 100, 100];
  const minX = Math.min(points[0], points[2]);
  const minY = Math.min(points[1], points[3]);
  const maxX = Math.max(points[0], points[2]);
  const maxY = Math.max(points[1], points[3]);
  
  return {
    type: SHAPE_TYPES.LINE,
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
    points: points,
    stroke: shape.stroke || shape.fill || DEFAULT_SHAPE_PROPS.stroke,
    strokeWidth: shape.strokeWidth || DEFAULT_SHAPE_PROPS.strokeWidth,
    fill: shape.stroke || shape.fill || DEFAULT_SHAPE_PROPS.fill,
    opacity: shape.opacity !== undefined ? shape.opacity : DEFAULT_SHAPE_PROPS.opacity,
    rotation: shape.rotation || DEFAULT_SHAPE_PROPS.rotation
  };
}

/**
 * Normalize a pen shape to canonical storage format
 * @param {Object} shape - Pen shape data
 * @returns {Object} Normalized pen
 */
export function normalizePen(shape) {
  // Calculate bounds from points
  const points = shape.points || [0, 0, 100, 100];
  const xCoords = points.filter((_, i) => i % 2 === 0);
  const yCoords = points.filter((_, i) => i % 2 === 1);
  const minX = Math.min(...xCoords);
  const maxX = Math.max(...xCoords);
  const minY = Math.min(...yCoords);
  const maxY = Math.max(...yCoords);
  
  return {
    type: SHAPE_TYPES.PEN,
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
    points: points,
    stroke: shape.stroke || shape.fill || DEFAULT_SHAPE_PROPS.stroke,
    strokeWidth: shape.strokeWidth || DEFAULT_SHAPE_PROPS.strokeWidth,
    fill: shape.stroke || shape.fill || DEFAULT_SHAPE_PROPS.fill,
    opacity: shape.opacity !== undefined ? shape.opacity : DEFAULT_SHAPE_PROPS.opacity,
    rotation: shape.rotation || DEFAULT_SHAPE_PROPS.rotation
  };
}

/**
 * Normalize any shape to canonical storage format
 * @param {Object} shape - Shape data (may be non-standard)
 * @returns {Object} Normalized shape
 */
export function normalizeShape(shape) {
  if (!shape || !shape.type) {
    return normalizeRectangle({ x: 0, y: 0, width: 100, height: 100 });
  }
  
  switch (shape.type) {
    case SHAPE_TYPES.RECTANGLE:
      return normalizeRectangle(shape);
    
    case SHAPE_TYPES.CIRCLE:
      return normalizeCircle(shape);
    
    case SHAPE_TYPES.TEXT:
      return normalizeText(shape);
    
    case SHAPE_TYPES.LINE:
      return normalizeLine(shape);
    
    case SHAPE_TYPES.PEN:
      return normalizePen(shape);
    
    default:
      console.warn(`Unknown shape type "${shape.type}", treating as rectangle`);
      return normalizeRectangle(shape);
  }
}

