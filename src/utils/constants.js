// Canvas Constants - Core dimensions and settings for the collaborative canvas
// These constants define the canvas workspace boundaries and viewport settings

// Canvas Dimensions (5000x5000px virtual workspace)
export const CANVAS_WIDTH = 5000;
export const CANVAS_HEIGHT = 5000;

// Zoom Settings
export const MIN_ZOOM = 0.05; // Allow zooming out further to see entire canvas
export const MAX_ZOOM = 3.0;
export const ZOOM_STEP = 0.1;
export const DEFAULT_ZOOM = 0.25; // 25% zoom level

// Default Canvas Position (centered to show entire canvas)
// At 0.25 zoom, 5000px canvas becomes 1250px, easily fits in viewport with context
export const DEFAULT_CANVAS_X = 0; // Will be calculated dynamically
export const DEFAULT_CANVAS_Y = 0; // Will be calculated dynamically

/**
 * Calculate the initial canvas position to center the canvas in the viewport
 * This ensures consistent positioning between initial load and reset
 * @param {number} viewportWidth - Width of the stage/viewport
 * @param {number} viewportHeight - Height of the stage/viewport
 * @returns {object} - { x, y } position to center the canvas
 */
export const calculateInitialCanvasPosition = (viewportWidth, viewportHeight) => {
  // At DEFAULT_ZOOM, the 5000x5000 canvas becomes scaled down
  const scaledCanvasWidth = CANVAS_WIDTH * DEFAULT_ZOOM;
  const scaledCanvasHeight = CANVAS_HEIGHT * DEFAULT_ZOOM;
  
  // Center the scaled canvas in the viewport
  const centerX = (viewportWidth - scaledCanvasWidth) / 2;
  const centerY = (viewportHeight - scaledCanvasHeight) / 2;
  
  return { x: centerX, y: centerY };
};

// Shape Defaults (for when we add shapes later)
export const DEFAULT_SHAPE_WIDTH = 100;
export const DEFAULT_SHAPE_HEIGHT = 100;
export const DEFAULT_SHAPE_FILL = '#cccccc'; // Gray fill as specified in PRD
