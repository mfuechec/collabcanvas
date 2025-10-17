// ========================================
// RANDOM SHAPE GENERATION UTILITY
// ========================================

import { CANVAS_WIDTH, CANVAS_HEIGHT } from './constants.js';

/**
 * Generate a random integer between min and max (inclusive)
 */
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

/**
 * Generate a random color from a curated palette
 */
function randomColor() {
  const colors = [
    '#FF6B6B', '#4ECDC4', '#45B7D1', '#FFA07A', '#98D8C8',
    '#F7DC6F', '#BB8FCE', '#85C1E2', '#F8B195', '#C06C84',
    '#6C5B7B', '#355C7D', '#F67280', '#C06C84', '#00D9FF',
    '#0D99FF', '#FF0080', '#8B4513', '#2ECC71', '#E74C3C',
  ];
  return colors[randomInt(0, colors.length - 1)];
}

/**
 * Generate random shape properties ensuring all coordinates are within canvas bounds
 * @param {string} type - Shape type ('rectangle', 'circle', 'text', 'line')
 * @returns {Object} Random shape properties
 */
function generateRandomShape(type) {
  const baseShape = {
    type,
    fill: randomColor(),
    rotation: randomInt(0, 360),
  };

  switch (type) {
    case 'rectangle': {
      const width = randomInt(50, 300);
      const height = randomInt(50, 300);
      // Ensure rectangle stays within bounds (stored as top-left)
      const x = randomInt(0, CANVAS_WIDTH - width);
      const y = randomInt(0, CANVAS_HEIGHT - height);
      return {
        ...baseShape,
        x,
        y,
        width,
        height,
        cornerRadius: randomInt(0, 20),
      };
    }

    case 'circle': {
      const radius = randomInt(25, 150);
      const diameter = radius * 2;
      // Ensure circle stays within bounds (stored as top-left of bounding box)
      const x = randomInt(0, CANVAS_WIDTH - diameter);
      const y = randomInt(0, CANVAS_HEIGHT - diameter);
      return {
        ...baseShape,
        x,
        y,
        width: diameter,
        height: diameter,
      };
    }

    case 'text': {
      const fontSize = randomInt(16, 72);
      // Rough estimate of text width (actual width calculated by Konva)
      const estimatedWidth = 100;
      const estimatedHeight = fontSize * 1.2;
      // Ensure text stays within bounds
      const x = randomInt(estimatedWidth / 2, CANVAS_WIDTH - estimatedWidth / 2);
      const y = randomInt(estimatedHeight / 2, CANVAS_HEIGHT - estimatedHeight / 2);
      
      const textOptions = [
        'Hello', 'World', 'Test', 'Canvas', 'Shape',
        'Design', 'Create', 'Build', 'Draw', 'Art',
      ];
      
      return {
        ...baseShape,
        x,
        y,
        text: textOptions[randomInt(0, textOptions.length - 1)],
        fontSize,
      };
    }

    case 'line': {
      // Ensure both endpoints are within bounds
      const x1 = randomInt(50, CANVAS_WIDTH - 50);
      const y1 = randomInt(50, CANVAS_HEIGHT - 50);
      const x2 = randomInt(50, CANVAS_WIDTH - 50);
      const y2 = randomInt(50, CANVAS_HEIGHT - 50);
      return {
        ...baseShape,
        x1,
        y1,
        x2,
        y2,
        stroke: baseShape.fill, // Lines use stroke instead of fill
        strokeWidth: randomInt(2, 10),
      };
    }

    default:
      throw new Error(`Unknown shape type: ${type}`);
  }
}

/**
 * Generate multiple random shapes
 * @param {number} count - Number of shapes to generate
 * @param {Object} options - Generation options
 * @param {Array<string>} options.types - Shape types to generate (default: all types)
 * @param {boolean} options.balanced - If true, distribute evenly across types (default: true)
 * @returns {Array<Object>} Array of random shape objects
 */
export function generateRandomShapes(count, options = {}) {
  const {
    types = ['rectangle', 'circle', 'text', 'line'],
    balanced = true,
  } = options;

  if (!Array.isArray(types) || types.length === 0) {
    throw new Error('types must be a non-empty array');
  }

  if (count <= 0) {
    return [];
  }

  const shapes = [];

  if (balanced) {
    // Distribute evenly across types
    const shapesPerType = Math.floor(count / types.length);
    const remainder = count % types.length;

    for (let i = 0; i < types.length; i++) {
      const typeCount = shapesPerType + (i < remainder ? 1 : 0);
      for (let j = 0; j < typeCount; j++) {
        shapes.push(generateRandomShape(types[i]));
      }
    }
  } else {
    // Random distribution
    for (let i = 0; i < count; i++) {
      const randomType = types[randomInt(0, types.length - 1)];
      shapes.push(generateRandomShape(randomType));
    }
  }

  console.log(`🎲 [RANDOM] Generated ${shapes.length} random shapes`);
  return shapes;
}

/**
 * Validate that a shape's coordinates are within canvas bounds
 * @param {Object} shape - Shape to validate
 * @returns {boolean} True if shape is within bounds
 */
export function isShapeWithinBounds(shape) {
  const { type } = shape;

  switch (type) {
    case 'rectangle':
      return (
        shape.x >= 0 &&
        shape.y >= 0 &&
        shape.x + shape.width <= CANVAS_WIDTH &&
        shape.y + shape.height <= CANVAS_HEIGHT
      );

    case 'circle':
      return (
        shape.x >= 0 &&
        shape.y >= 0 &&
        shape.x + shape.width <= CANVAS_WIDTH &&
        shape.y + shape.height <= CANVAS_HEIGHT
      );

    case 'text':
      // Text is harder to validate perfectly, use rough estimate
      return (
        shape.x >= 0 &&
        shape.y >= 0 &&
        shape.x <= CANVAS_WIDTH &&
        shape.y <= CANVAS_HEIGHT
      );

    case 'line':
      return (
        shape.x1 >= 0 &&
        shape.y1 >= 0 &&
        shape.x2 >= 0 &&
        shape.y2 >= 0 &&
        shape.x1 <= CANVAS_WIDTH &&
        shape.y1 <= CANVAS_HEIGHT &&
        shape.x2 <= CANVAS_WIDTH &&
        shape.y2 <= CANVAS_HEIGHT
      );

    default:
      return false;
  }
}

