// ========================================
// SMART POSITIONING SYSTEM
// ========================================
// Intelligently position templates based on viewport and collisions

import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../../../utils/constants.js';

const CANVAS_CENTER_X = 2500;
const CANVAS_CENTER_Y = 2500;

/**
 * Calculate optimal position for a template
 * 
 * Priority:
 * 1. Canvas center (if in viewport and no collision)
 * 2. Viewport center (if canvas center not in viewport)
 * 3. Find empty space near canvas/viewport center
 */
export function calculateOptimalPosition({
  width,
  height,
  canvasShapes = [],
  viewport = null // { x, y, width, height, scale }
}) {
  // Step 1: Try canvas center
  const canvasCenterPos = {
    x: CANVAS_CENTER_X - (width / 2),
    y: CANVAS_CENTER_Y - (height / 2)
  };
  
  // Check if canvas center is in viewport (if viewport info available)
  const canvasCenterInViewport = !viewport || isInViewport(
    CANVAS_CENTER_X,
    CANVAS_CENTER_Y,
    viewport
  );
  
  if (canvasCenterInViewport) {
    // Check for collisions at canvas center
    if (!hasCollision(canvasCenterPos.x, canvasCenterPos.y, width, height, canvasShapes)) {
      console.log('📍 [POSITIONING] Using canvas center (no collision)');
      return canvasCenterPos;
    }
  }
  
  // Step 2: Try viewport center (if canvas center not in viewport)
  if (viewport && !canvasCenterInViewport) {
    const viewportCenterX = viewport.x + (viewport.width / 2);
    const viewportCenterY = viewport.y + (viewport.height / 2);
    
    const viewportCenterPos = {
      x: viewportCenterX - (width / 2),
      y: viewportCenterY - (height / 2)
    };
    
    // Ensure it's within canvas bounds
    viewportCenterPos.x = Math.max(0, Math.min(CANVAS_WIDTH - width, viewportCenterPos.x));
    viewportCenterPos.y = Math.max(0, Math.min(CANVAS_HEIGHT - height, viewportCenterPos.y));
    
    if (!hasCollision(viewportCenterPos.x, viewportCenterPos.y, width, height, canvasShapes)) {
      console.log('📍 [POSITIONING] Using viewport center (canvas center not in viewport)');
      return viewportCenterPos;
    }
  }
  
  // Step 3: Find empty space near preferred location
  const searchCenterX = viewport ? viewport.x + (viewport.width / 2) : CANVAS_CENTER_X;
  const searchCenterY = viewport ? viewport.y + (viewport.height / 2) : CANVAS_CENTER_Y;
  
  const emptySpace = findEmptySpace({
    width,
    height,
    preferredX: searchCenterX - (width / 2),
    preferredY: searchCenterY - (height / 2),
    canvasShapes
  });
  
  if (emptySpace) {
    console.log('📍 [POSITIONING] Found empty space near center');
    return emptySpace;
  }
  
  // Step 4: Last resort - use canvas center anyway
  console.warn('⚠️ [POSITIONING] No empty space found, using canvas center (may overlap)');
  return canvasCenterPos;
}

/**
 * Check if a point is within the viewport
 */
function isInViewport(x, y, viewport) {
  return (
    x >= viewport.x &&
    x <= viewport.x + viewport.width &&
    y >= viewport.y &&
    y <= viewport.y + viewport.height
  );
}

/**
 * Check if a rectangle collides with any existing shapes
 */
function hasCollision(x, y, width, height, shapes, padding = 50) {
  const rect1 = { x: x - padding, y: y - padding, width: width + padding * 2, height: height + padding * 2 };
  
  for (const shape of shapes) {
    // Get shape bounding box
    const rect2 = getShapeBounds(shape);
    
    // Check rectangle intersection
    if (rectanglesIntersect(rect1, rect2)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Get bounding box for a shape
 */
function getShapeBounds(shape) {
  let x = shape.x || 0;
  let y = shape.y || 0;
  let width = shape.width || 100;
  let height = shape.height || 100;
  
  // Handle circles (center-based positioning)
  if (shape.type === 'circle') {
    const radius = shape.radius || shape.width / 2 || 50;
    x = x - radius;
    y = y - radius;
    width = radius * 2;
    height = radius * 2;
  }
  
  // Handle text (approximate bounds)
  if (shape.type === 'text') {
    const fontSize = shape.fontSize || 16;
    const textLength = (shape.text || '').length;
    width = textLength * fontSize * 0.6;
    height = fontSize * 1.2;
  }
  
  return { x, y, width, height };
}

/**
 * Check if two rectangles intersect
 */
function rectanglesIntersect(rect1, rect2) {
  return !(
    rect1.x + rect1.width < rect2.x ||
    rect2.x + rect2.width < rect1.x ||
    rect1.y + rect1.height < rect2.y ||
    rect2.y + rect2.height < rect1.y
  );
}

/**
 * Find empty space for a template using spiral search
 */
function findEmptySpace({ width, height, preferredX, preferredY, canvasShapes }) {
  const step = 100; // Search step size
  const maxRadius = 1000; // Max search radius
  
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
      if (pos.x < 0 || pos.x + width > CANVAS_WIDTH ||
          pos.y < 0 || pos.y + height > CANVAS_HEIGHT) {
        continue;
      }
      
      // Check for collisions
      if (!hasCollision(pos.x, pos.y, width, height, canvasShapes)) {
        return pos;
      }
    }
  }
  
  return null;
}

/**
 * Get viewport info (placeholder - would need to be passed from UI)
 * For now, we'll assume viewport is centered on canvas
 */
export function getDefaultViewport() {
  return {
    x: CANVAS_CENTER_X - 400, // Assuming ~800px viewport width
    y: CANVAS_CENTER_Y - 300, // Assuming ~600px viewport height
    width: 800,
    height: 600,
    scale: 1
  };
}

