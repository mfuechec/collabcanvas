// ========================================
// TOOLS REGISTRY
// ========================================
// Central registry for all AI tools
// Import all tools from their respective modules

// Create tools
import { createRectangleTool } from './create/rectangle.js';
import { createCircleTool } from './create/circle.js';
import { createTextTool } from './create/text.js';
import { createLineTool } from './create/line.js';

// Modify tools
import { updateShapeTool } from './modify/update.js';
import { moveShapeTool } from './modify/move.js';
import { resizeShapeTool } from './modify/resize.js';
import { rotateShapeTool } from './modify/rotate.js';
import { deleteShapeTool } from './modify/delete.js';

// Batch tools
import { batchUpdateShapesTool } from './batch/batchUpdate.js';
import { batchOperationsTool } from './batch/batchOperations.js';

// Pattern tools
import { createGridTool } from './patterns/grid.js';
import { createRowTool } from './patterns/row.js';
import { createCircleRowTool } from './patterns/circleRow.js';

// Utility tools
import { clearCanvasTool } from './utility/clear.js';
import { addRandomShapesTool } from './utility/randomShapes.js';

// Template tools
import { USE_LOGIN_TEMPLATE_TOOL } from './templates/useLoginTemplate.js';
import { USE_NAVBAR_TEMPLATE_TOOL } from './templates/useNavbarTemplate.js';
import { USE_CARD_TEMPLATE_TOOL } from './templates/useCardTemplate.js';

// Export all tools as an array (for LangChain)
// OPTIMIZED: Only expose batch tools + specialized tools
// This forces the AI to batch operations for better performance
export const tools = [
  // Template tools (fastest for common UI patterns, 100-300x faster than GPT)
  USE_LOGIN_TEMPLATE_TOOL,
  USE_NAVBAR_TEMPLATE_TOOL,
  USE_CARD_TEMPLATE_TOOL,
  
  // Batch tools (handles 95% of operations)
  batchOperationsTool,      // All create/update/delete
  batchUpdateShapesTool,    // Relative transforms (move all, scale all, etc.)
  
  // Specialized pattern tools (have custom logic)
  createGridTool,
  createRowTool,
  createCircleRowTool,
  
  // Utility tools
  clearCanvasTool,
  addRandomShapesTool
];

// Individual tools still exported for potential direct use
// but NOT exposed to the LLM to force batching
export const individualTools = [
  createRectangleTool,
  createCircleTool,
  createTextTool,
  createLineTool,
  updateShapeTool,
  moveShapeTool,
  resizeShapeTool,
  rotateShapeTool,
  deleteShapeTool,
];

// Export tool registry for easy lookup by name
export const toolRegistry = {
  'create_rectangle': createRectangleTool,
  'create_circle': createCircleTool,
  'create_text': createTextTool,
  'create_line': createLineTool,
  
  'update_shape': updateShapeTool,
  'move_shape': moveShapeTool,
  'resize_shape': resizeShapeTool,
  'rotate_shape': rotateShapeTool,
  'delete_shape': deleteShapeTool,
  
  'batch_update_shapes': batchUpdateShapesTool,
  'batch_operations': batchOperationsTool,
  
  'create_grid': createGridTool,
  'create_row': createRowTool,
  'create_circle_row': createCircleRowTool,
  
  'clear_canvas': clearCanvasTool,
  'add_random_shapes': addRandomShapesTool,
  
  'use_login_template': USE_LOGIN_TEMPLATE_TOOL,
  'use_navbar_template': USE_NAVBAR_TEMPLATE_TOOL,
  'use_card_template': USE_CARD_TEMPLATE_TOOL
};

// Export individual tools for direct imports
export {
  createRectangleTool,
  createCircleTool,
  createTextTool,
  createLineTool,
  updateShapeTool,
  moveShapeTool,
  resizeShapeTool,
  rotateShapeTool,
  deleteShapeTool,
  batchUpdateShapesTool,
  batchOperationsTool,
  createGridTool,
  createRowTool,
  createCircleRowTool,
  clearCanvasTool,
  addRandomShapesTool
};

