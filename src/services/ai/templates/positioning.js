// ========================================
// SMART POSITIONING SYSTEM
// ========================================
// Intelligently position templates based on viewport and collisions

import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../../../utils/constants.js';
import { 
  getShapeBounds, 
  rectanglesIntersect, 
  findEmptySpace as findEmptySpaceUtil,
  CANVAS_DIMENSIONS 
} from '../../../utils/shapes/index.js';

const CANVAS_CENTER_X = CANVAS_DIMENSIONS.CENTER_X;
const CANVAS_CENTER_Y = CANVAS_DIMENSIONS.CENTER_Y;

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
  
  const preferredPos = {
    x: searchCenterX - (width / 2),
    y: searchCenterY - (height / 2)
  };
  
  const emptySpace = findEmptySpaceUtil(width, height, preferredPos, canvasShapes);
  
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
 * Now uses consolidated shape utilities (fixes circle coordinate bug!)
 */
function hasCollision(x, y, width, height, shapes, padding = 50) {
  const rect1 = { x: x - padding, y: y - padding, width: width + padding * 2, height: height + padding * 2 };
  
  for (const shape of shapes) {
    // ✅ Use consolidated getShapeBounds - correctly handles all shape types including circles
    const rect2 = getShapeBounds(shape);
    
    // Check rectangle intersection
    if (rectanglesIntersect(rect1, rect2)) {
      return true;
    }
  }
  
  return false;
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

