// ========================================
// COORDINATE CONVERSIONS
// ========================================
// Convert between center-based and top-left coordinate systems

/**
 * Convert center coordinates to top-left coordinates
 * @param {number} centerX - Center X position
 * @param {number} centerY - Center Y position
 * @param {number} width - Shape width
 * @param {number} height - Shape height
 * @returns {{x: number, y: number}} Top-left coordinates
 */
export function centerToTopLeft(centerX, centerY, width, height) {
  return {
    x: centerX - width / 2,
    y: centerY - height / 2
  };
}

/**
 * Convert top-left coordinates to center coordinates
 * @param {number} x - Top-left X position
 * @param {number} y - Top-left Y position
 * @param {number} width - Shape width
 * @param {number} height - Shape height
 * @returns {{x: number, y: number}} Center coordinates
 */
export function topLeftToCenter(x, y, width, height) {
  return {
    x: x + width / 2,
    y: y + height / 2
  };
}

/**
 * Convert circle center coordinates to top-left bounding box coordinates
 * Returns storage format: {x: topLeft, y: topLeft, width: diameter, height: diameter}
 * 
 * @param {number} centerX - Circle center X position
 * @param {number} centerY - Circle center Y position
 * @param {number} radius - Circle radius
 * @returns {{x: number, y: number, width: number, height: number}} Top-left bounding box
 */
export function circleCenterToTopLeft(centerX, centerY, radius) {
  const diameter = radius * 2;
  return {
    x: centerX - radius,
    y: centerY - radius,
    width: diameter,
    height: diameter
  };
}

/**
 * Convert circle top-left bounding box to center coordinates
 * Input is storage format: {x: topLeft, y: topLeft, width: diameter, height: diameter}
 * 
 * @param {number} x - Top-left X position
 * @param {number} y - Top-left Y position
 * @param {number} width - Bounding box width (diameter)
 * @param {number} height - Bounding box height (diameter)
 * @returns {{centerX: number, centerY: number, radius: number}} Center and radius
 */
export function circleTopLeftToCenter(x, y, width, height) {
  const radius = Math.min(width, height) / 2;
  return {
    centerX: x + radius,
    centerY: y + radius,
    radius
  };
}

/**
 * Convert text center coordinates to top-left coordinates with dimension estimation
 * @param {number} centerX - Center X position
 * @param {number} centerY - Center Y position
 * @param {string} text - Text content
 * @param {number} fontSize - Font size in pixels
 * @returns {{x: number, y: number, width: number, height: number}} Top-left coordinates with estimated dimensions
 */
export function textCenterToTopLeft(centerX, centerY, text, fontSize) {
  const estimatedWidth = text.length * fontSize * 0.6;
  const estimatedHeight = fontSize * 1.2;
  
  return {
    x: centerX - estimatedWidth / 2,
    y: centerY - estimatedHeight / 2,
    width: estimatedWidth,
    height: estimatedHeight
  };
}

/**
 * Convert Konva node position (center) to storage position (top-left)
 * Handles all shape types including text auto-sizing
 * 
 * @param {{x: () => number, y: () => number, width: () => number, height: () => number}} konvaNode - Konva shape node
 * @param {Object} shapeData - Original shape data
 * @returns {{x: number, y: number}} Storage coordinates (top-left)
 */
export function konvaPositionToStorage(konvaNode, shapeData) {
  const pos = konvaNode.position();
  
  // For text, get actual dimensions from Konva (auto-sized)
  const width = shapeData.type === 'text' ? konvaNode.width() : shapeData.width;
  const height = shapeData.type === 'text' ? konvaNode.height() : shapeData.height;
  
  return centerToTopLeft(pos.x, pos.y, width, height);
}

/**
 * Convert storage position (top-left) to Konva position (center)
 * @param {number} x - Storage X (top-left)
 * @param {number} y - Storage Y (top-left)
 * @param {number} width - Shape width
 * @param {number} height - Shape height
 * @returns {{x: number, y: number}} Konva position (center)
 */
export function storagePositionToKonva(x, y, width, height) {
  return topLeftToCenter(x, y, width, height);
}

