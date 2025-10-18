// ========================================
// SHAPE CONSTANTS
// ========================================
// Centralized constants for shape operations

/**
 * Shape type enumeration
 */
export const SHAPE_TYPES = {
  RECTANGLE: 'rectangle',
  CIRCLE: 'circle',
  TEXT: 'text',
  LINE: 'line',
  PEN: 'pen'
};

/**
 * Minimum dimensions for shapes
 */
export const MIN_SHAPE_SIZE = {
  rectangle: { width: 10, height: 10 },
  circle: { radius: 5, diameter: 10 },
  text: { fontSize: 8 },
  line: { length: 1 }
};

/**
 * Maximum dimensions for shapes
 */
export const MAX_SHAPE_SIZE = {
  rectangle: { width: 5000, height: 5000 },
  circle: { radius: 2500, diameter: 5000 },
  text: { fontSize: 500 },
  line: { length: 7071 } // sqrt(5000^2 + 5000^2)
};

/**
 * Text dimension calculation formulas
 * Standardized to ensure consistency across the app
 */
export const TEXT_DIMENSION_FORMULA = {
  WIDTH_PER_CHAR: 0.6,      // ~60% of fontSize per character
  HEIGHT_MULTIPLIER: 1.2,    // Height is 1.2x fontSize
  DEFAULT_FONT_SIZE: 48      // Default font size for new text
};

/**
 * Default shape properties
 */
export const DEFAULT_SHAPE_PROPS = {
  fill: '#cccccc',
  opacity: 0.8,
  rotation: 0,
  stroke: '#cccccc',
  strokeWidth: 2
};

/**
 * Canvas dimensions (from constants.js)
 */
export const CANVAS_DIMENSIONS = {
  WIDTH: 5000,
  HEIGHT: 5000,
  CENTER_X: 2500,
  CENTER_Y: 2500
};

