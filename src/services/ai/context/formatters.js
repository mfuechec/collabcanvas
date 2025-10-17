// ========================================
// CANVAS STATE FORMATTING
// ========================================

/**
 * Format canvas shapes into a human-readable context string
 * @param {Array} canvasShapes - Array of shape objects
 * @param {number} maxShapes - Maximum number of shapes to include
 * @param {boolean} includeHeader - Whether to include the header
 * @returns {string} Formatted canvas state
 */
export function formatCanvasState(canvasShapes, maxShapes = 10, includeHeader = true) {
  if (canvasShapes.length === 0) {
    return includeHeader ? '\n\n**Current Canvas Objects:** (empty canvas)\n' : '(empty canvas)';
  }
  
  let formattedState = includeHeader ? '\n\n**Current Canvas Objects:**\n' : '';
  
  canvasShapes.slice(0, maxShapes).forEach((shape, index) => {
    let details = `${shape.type} (ID: ${shape.id}, fill: ${shape.fill || 'none'}`;
    
    // Report size appropriately based on shape type
    if (shape.type === 'circle' && shape.width && shape.height) {
      // For circles, report RADIUS (not diameter/width/height)
      const radius = Math.min(shape.width, shape.height) / 2;
      details += `, radius: ${radius}`;
    } else if (shape.width && shape.height) {
      // For rectangles/text, report width x height
      details += `, size: ${shape.width}x${shape.height}`;
    }
    
    if (shape.text) {
      details += `, text: "${shape.text}"`;
    }
    if (shape.fontSize) {
      details += `, fontSize: ${shape.fontSize}`;
    }
    
    formattedState += includeHeader 
      ? `${index + 1}. ${details})\n`
      : `- ${details})\n`;
  });
  
  if (canvasShapes.length > maxShapes) {
    formattedState += `... and ${canvasShapes.length - maxShapes} more\n`;
  }
  
  return formattedState;
}

