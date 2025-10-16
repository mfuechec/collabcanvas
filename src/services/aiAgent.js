import { ChatOpenAI } from '@langchain/openai';
import { AgentExecutor, createToolCallingAgent } from 'langchain/agents';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { z } from 'zod';
import { tool } from '@langchain/core/tools';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../utils/constants';

// Get API key from environment
const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
  console.error('❌ VITE_OPENAI_API_KEY is not set in .env file');
  throw new Error('OpenAI API key is required. Please add VITE_OPENAI_API_KEY to your .env file.');
}

// Initialize OpenAI model
const model = new ChatOpenAI({
  modelName: 'gpt-4o',
  temperature: 0.2,
  apiKey: OPENAI_API_KEY,
  configuration: {
    apiKey: OPENAI_API_KEY,
  },
});

// Canvas operation tools
const createRectangleTool = tool(
  async ({ x, y, width, height, fill }) => {
    // Convert center coordinates to top-left corner
    const topLeftX = x - (width / 2);
    const topLeftY = y - (height / 2);
    return JSON.stringify({
      action: 'create_rectangle',
      data: { x: topLeftX, y: topLeftY, width, height, fill, type: 'rectangle' }
    });
  },
  {
    name: 'create_rectangle',
    description: 'Creates a rectangle on the canvas. Use this when the user asks to create or add a rectangle, box, or square.',
    schema: z.object({
      x: z.number().min(0).max(CANVAS_WIDTH).describe('Center X position (0 to 5000). Use 2500 for canvas center.'),
      y: z.number().min(0).max(CANVAS_HEIGHT).describe('Center Y position (0 to 5000). Use 2500 for canvas center.'),
      width: z.number().min(10).max(1000).describe('Width in pixels (10-1000)'),
      height: z.number().min(10).max(1000).describe('Height in pixels (10-1000)'),
      fill: z.string().describe('Fill color (hex code like #FF0000 for red, #0000FF for blue, #00FF00 for green)'),
    }),
  }
);

const createCircleTool = tool(
  async ({ x, y, radius, fill }) => {
    // Convert radius to width/height for storage
    const diameter = radius * 2;
    return JSON.stringify({
      action: 'create_circle',
      data: { x: x - radius, y: y - radius, width: diameter, height: diameter, fill, type: 'circle' }
    });
  },
  {
    name: 'create_circle',
    description: 'Creates a circle on the canvas. Use this when the user asks to create or add a circle or dot.',
    schema: z.object({
      x: z.number().min(0).max(CANVAS_WIDTH).describe('Center X position (0 to 5000). Use 2500 for canvas center.'),
      y: z.number().min(0).max(CANVAS_HEIGHT).describe('Center Y position (0 to 5000). Use 2500 for canvas center.'),
      radius: z.number().min(5).max(500).describe('Radius in pixels (5-500)'),
      fill: z.string().describe('Fill color (hex code like #FF0000 for red, #0000FF for blue)'),
    }),
  }
);

const createTextTool = tool(
  async ({ x, y, text, fontSize, fill }) => {
    // Estimate text dimensions (approximate)
    const estimatedWidth = text.length * fontSize * 0.6;
    const height = fontSize + 8;
    
    // Convert center coordinates to top-left corner
    const topLeftX = x - (estimatedWidth / 2);
    const topLeftY = y - (height / 2);
    
    return JSON.stringify({
      action: 'create_text',
      data: { x: topLeftX, y: topLeftY, text, fontSize, fill, type: 'text', width: estimatedWidth, height }
    });
  },
  {
    name: 'create_text',
    description: 'Creates a text label on the canvas. Use this when the user asks to add text, label, or write something.',
    schema: z.object({
      x: z.number().min(0).max(CANVAS_WIDTH).describe('Center X position (0 to 5000). Use 2500 for canvas center.'),
      y: z.number().min(0).max(CANVAS_HEIGHT).describe('Center Y position (0 to 5000). Use 2500 for canvas center.'),
      text: z.string().describe('The text content to display'),
      fontSize: z.number().min(12).max(72).default(24).describe('Font size in pixels (12-72, default 24)'),
      fill: z.string().default('#000000').describe('Text color (hex code, default black)'),
    }),
  }
);

const createLineTool = tool(
  async ({ x1, y1, x2, y2, stroke, strokeWidth }) => {
    const minX = Math.min(x1, x2);
    const minY = Math.min(y1, y2);
    const width = Math.abs(x2 - x1);
    const height = Math.abs(y2 - y1);
    
    return JSON.stringify({
      action: 'create_line',
      data: {
        x: minX,
        y: minY,
        width,
        height,
        points: [x1, y1, x2, y2],
        stroke,
        strokeWidth,
        fill: stroke,
        type: 'line'
      }
    });
  },
  {
    name: 'create_line',
    description: 'Creates a straight line on the canvas. Use this when the user asks to draw a line connecting two points.',
    schema: z.object({
      x1: z.number().min(0).max(CANVAS_WIDTH).describe('Start X position (0 to 5000)'),
      y1: z.number().min(0).max(CANVAS_HEIGHT).describe('Start Y position (0 to 5000)'),
      x2: z.number().min(0).max(CANVAS_WIDTH).describe('End X position (0 to 5000)'),
      y2: z.number().min(0).max(CANVAS_HEIGHT).describe('End Y position (0 to 5000)'),
      stroke: z.string().default('#000000').describe('Line color (hex code)'),
      strokeWidth: z.number().min(1).max(20).default(2).describe('Line thickness (1-20)'),
    }),
  }
);

const updateShapeTool = tool(
  async ({ shapeId, fill, fontSize, width, height, text }) => {
    const updates = {};
    if (fill !== undefined) updates.fill = fill;
    if (fontSize !== undefined) updates.fontSize = fontSize;
    if (width !== undefined) updates.width = width;
    if (height !== undefined) updates.height = height;
    if (text !== undefined) updates.text = text;
    
    return JSON.stringify({
      action: 'update_shape',
      data: { shapeId, updates }
    });
  },
  {
    name: 'update_shape',
    description: 'Updates properties of a specific shape. Use when the user asks to change color, size, font size, or other properties of an existing shape. You must provide the exact shape ID from the Canvas Objects list.',
    schema: z.object({
      shapeId: z.string().describe('The exact ID of the shape from the Canvas Objects list'),
      fill: z.string().optional().describe('New fill color (hex code like #FF0000)'),
      fontSize: z.number().min(12).max(72).optional().describe('New font size for text (12-72)'),
      width: z.number().min(10).max(1000).optional().describe('New width in pixels'),
      height: z.number().min(10).max(1000).optional().describe('New height in pixels'),
      text: z.string().optional().describe('New text content (for text shapes)'),
    }),
  }
);

const moveShapeTool = tool(
  async ({ shapeId, x, y }) => {
    return JSON.stringify({
      action: 'move_shape',
      data: { shapeId, x, y }
    });
  },
  {
    name: 'move_shape',
    description: 'Moves a shape to a new position. Use this when the user asks to move, reposition, or relocate a shape. You must provide the exact shape ID from the Canvas Objects list. You can provide just x, just y, or both to update position.',
    schema: z.object({
      shapeId: z.string().describe('The exact ID of the shape from the Canvas Objects list'),
      x: z.number().min(0).max(CANVAS_WIDTH).optional().describe('New X position (0 to 5000). Omit to keep current X. Use 2500 for center.'),
      y: z.number().min(0).max(CANVAS_HEIGHT).optional().describe('New Y position (0 to 5000). Omit to keep current Y. Use 2500 for center.'),
    }),
  }
);

const resizeShapeTool = tool(
  async ({ shapeId, width, height }) => {
    return JSON.stringify({
      action: 'resize_shape',
      data: { shapeId, width, height }
    });
  },
  {
    name: 'resize_shape',
    description: 'Resizes a shape to new dimensions. Use when the user asks to make something bigger, smaller, or change its size. You must provide the exact shape ID from the Canvas Objects list.',
    schema: z.object({
      shapeId: z.string().describe('The exact ID of the shape from the Canvas Objects list'),
      width: z.number().min(10).max(1000).optional().describe('New width in pixels'),
      height: z.number().min(10).max(1000).optional().describe('New height in pixels'),
    }),
  }
);

const rotateShapeTool = tool(
  async ({ shapeId, rotation }) => {
    return JSON.stringify({
      action: 'rotate_shape',
      data: { shapeId, rotation }
    });
  },
  {
    name: 'rotate_shape',
    description: 'Rotates a shape by a specified angle. Use when the user asks to rotate or turn a shape. You must provide the exact shape ID from the Canvas Objects list.',
    schema: z.object({
      shapeId: z.string().describe('The exact ID of the shape from the Canvas Objects list'),
      rotation: z.number().min(0).max(360).describe('Rotation angle in degrees (0-360)'),
    }),
  }
);

const deleteShapeTool = tool(
  async ({ shapeId }) => {
    return JSON.stringify({
      action: 'delete_shape',
      data: { shapeId }
    });
  },
  {
    name: 'delete_shape',
    description: 'Deletes a single shape from the canvas. For deleting multiple shapes, use batch_delete_shapes instead. You must provide the exact shape ID from the Canvas Objects list.',
    schema: z.object({
      shapeId: z.string().describe('The exact ID of the shape from the Canvas Objects list'),
    }),
  }
);

// Batch operations for efficiency
const batchUpdateShapesTool = tool(
  async ({ shapeIds, updates }) => {
    return JSON.stringify({
      action: 'batch_update_shapes',
      data: { shapeIds, updates }
    });
  },
  {
    name: 'batch_update_shapes',
    description: 'Updates multiple shapes with the same properties in one operation. Much faster than calling update_shape multiple times. Use when applying the same changes to multiple shapes.',
    schema: z.object({
      shapeIds: z.array(z.string()).describe('Array of shape IDs from the Canvas Objects list'),
      updates: z.object({
        fill: z.string().optional(),
        fontSize: z.number().min(12).max(72).optional(),
        width: z.number().min(10).max(1000).optional(),
        height: z.number().min(10).max(1000).optional(),
        text: z.string().optional(),
      }).describe('Properties to update on all shapes'),
    }),
  }
);

const batchMoveShapesTool = tool(
  async ({ shapeIds, x, y }) => {
    return JSON.stringify({
      action: 'batch_move_shapes',
      data: { shapeIds, x, y }
    });
  },
  {
    name: 'batch_move_shapes',
    description: 'Moves multiple shapes to the same position in one operation. Much faster than calling move_shape multiple times. Use when moving multiple shapes to the same location.',
    schema: z.object({
      shapeIds: z.array(z.string()).describe('Array of shape IDs from the Canvas Objects list'),
      x: z.number().min(0).max(CANVAS_WIDTH).optional().describe('New X position for all shapes. Omit to keep current X.'),
      y: z.number().min(0).max(CANVAS_HEIGHT).optional().describe('New Y position for all shapes. Omit to keep current Y.'),
    }),
  }
);

const batchDeleteShapesTool = tool(
  async ({ shapeIds }) => {
    return JSON.stringify({
      action: 'batch_delete_shapes',
      data: { shapeIds }
    });
  },
  {
    name: 'batch_delete_shapes',
    description: 'Deletes multiple shapes in one operation. Much faster than calling delete_shape multiple times. Use when removing multiple shapes at once.',
    schema: z.object({
      shapeIds: z.array(z.string()).describe('Array of shape IDs from the Canvas Objects list'),
    }),
  }
);

const batchCreateShapesTool = tool(
  async ({ shapes }) => {
    return JSON.stringify({
      action: 'batch_create_shapes',
      data: { shapes }
    });
  },
  {
    name: 'batch_create_shapes',
    description: 'Creates multiple shapes with DIFFERENT properties in one operation. MUCH FASTER than calling individual create tools multiple times. Use when creating 3+ shapes, especially with varying properties.',
    schema: z.object({
      shapes: z.array(z.object({
        type: z.enum(['rectangle', 'circle', 'text', 'line']).describe('Shape type'),
        // Rectangle properties
        x: z.number().min(0).max(CANVAS_WIDTH).optional().describe('X position (top-left for rectangle/text, center for circle, start for line)'),
        y: z.number().min(0).max(CANVAS_HEIGHT).optional().describe('Y position (top-left for rectangle/text, center for circle, start for line)'),
        width: z.number().min(10).max(1000).optional().describe('Width (rectangle only)'),
        height: z.number().min(10).max(1000).optional().describe('Height (rectangle only)'),
        // Circle properties
        radius: z.number().min(10).max(500).optional().describe('Radius (circle only)'),
        // Text properties
        text: z.string().optional().describe('Text content (text only)'),
        fontSize: z.number().min(12).max(72).optional().describe('Font size (text only, default 24)'),
        // Line properties
        x1: z.number().min(0).max(CANVAS_WIDTH).optional().describe('Start X (line only)'),
        y1: z.number().min(0).max(CANVAS_HEIGHT).optional().describe('Start Y (line only)'),
        x2: z.number().min(0).max(CANVAS_WIDTH).optional().describe('End X (line only)'),
        y2: z.number().min(0).max(CANVAS_HEIGHT).optional().describe('End Y (line only)'),
        // Common properties
        fill: z.string().optional().describe('Fill color (hex format, e.g. #FF0000)'),
        stroke: z.string().optional().describe('Stroke color (hex format)'),
        strokeWidth: z.number().min(1).max(20).optional().describe('Stroke width'),
      })).min(1).max(100).describe('Array of shapes to create (max 100)'),
    }),
  }
);

const createGridTool = tool(
  async ({ startX, startY, rows, cols, cellWidth, cellHeight, spacing, fill }) => {
    return JSON.stringify({
      action: 'create_grid',
      data: { startX, startY, rows, cols, cellWidth, cellHeight, spacing, fill }
    });
  },
  {
    name: 'create_grid',
    description: 'Creates a grid of rectangles. Use when the user asks for a grid, matrix, or multiple shapes arranged in rows and columns.',
    schema: z.object({
      startX: z.number().min(0).max(CANVAS_WIDTH).default(500).describe('Grid start X position'),
      startY: z.number().min(0).max(CANVAS_HEIGHT).default(500).describe('Grid start Y position'),
      rows: z.number().min(1).max(20).describe('Number of rows (1-20)'),
      cols: z.number().min(1).max(20).describe('Number of columns (1-20)'),
      cellWidth: z.number().min(20).max(200).default(80).describe('Width of each cell'),
      cellHeight: z.number().min(20).max(200).default(80).describe('Height of each cell'),
      spacing: z.number().min(0).max(50).default(10).describe('Spacing between cells'),
      fill: z.string().default('#3B82F6').describe('Fill color for cells'),
    }),
  }
);

const createRowTool = tool(
  async ({ startX, startY, count, width, height, spacing, fill }) => {
    return JSON.stringify({
      action: 'create_row',
      data: { startX, startY, count, width, height, spacing, fill }
    });
  },
  {
    name: 'create_row',
    description: 'Creates a horizontal row of RECTANGLES. Use ONLY when the user specifically asks for rectangles in a row.',
    schema: z.object({
      startX: z.number().min(0).max(CANVAS_WIDTH).default(500).describe('Row start X position'),
      startY: z.number().min(0).max(CANVAS_HEIGHT).default(2500).describe('Row Y position'),
      count: z.number().min(2).max(50).describe('Number of shapes in the row (2-50)'),
      width: z.number().min(20).max(200).default(80).describe('Width of each shape'),
      height: z.number().min(20).max(200).default(80).describe('Height of each shape'),
      spacing: z.number().min(0).max(100).default(20).describe('Spacing between shapes'),
      fill: z.string().default('#3B82F6').describe('Fill color'),
    }),
  }
);

const createCircleRowTool = tool(
  async ({ startX, startY, count, radius, spacing, fill }) => {
    return JSON.stringify({
      action: 'create_circle_row',
      data: { startX, startY, count, radius, spacing, fill }
    });
  },
  {
    name: 'create_circle_row',
    description: 'Creates a horizontal row of CIRCLES. Use when the user asks for multiple circles in a row, line, or horizontal arrangement.',
    schema: z.object({
      startX: z.number().min(0).max(CANVAS_WIDTH).default(500).describe('Row start X position (center of first circle)'),
      startY: z.number().min(0).max(CANVAS_HEIGHT).default(2500).describe('Row Y position (center of circles)'),
      count: z.number().min(2).max(50).describe('Number of circles in the row (2-50)'),
      radius: z.number().min(10).max(100).default(40).describe('Radius of each circle'),
      spacing: z.number().min(0).max(200).default(20).describe('Spacing between circle centers'),
      fill: z.string().default('#3B82F6').describe('Fill color'),
    }),
  }
);

const clearCanvasTool = tool(
  async () => {
    return JSON.stringify({
      action: 'clear_canvas',
      data: {}
    });
  },
  {
    name: 'clear_canvas',
    description: 'Clears all shapes from the canvas. Use when the user asks to clear, delete all, remove everything, or start fresh.',
    schema: z.object({}),
  }
);

const generateRandomCoordinatesTool = tool(
  async ({ count, shapeType, minSize = 50, maxSize = 200 }) => {
    const coordinates = [];
    const margin = 100; // Keep shapes away from edges
    
    for (let i = 0; i < count; i++) {
      const size = minSize + Math.random() * (maxSize - minSize);
      
      // Calculate valid bounds based on shape type
      let x, y;
      if (shapeType === 'circle') {
        // For circles, x,y is center, so add radius margin
        x = margin + size + Math.random() * (CANVAS_WIDTH - 2 * (margin + size));
        y = margin + size + Math.random() * (CANVAS_HEIGHT - 2 * (margin + size));
      } else {
        // For rectangles/text, x,y is top-left
        x = margin + Math.random() * (CANVAS_WIDTH - size - 2 * margin);
        y = margin + Math.random() * (CANVAS_HEIGHT - size - 2 * margin);
      }
      
      coordinates.push({
        x: Math.round(x),
        y: Math.round(y),
        size: Math.round(size)
      });
    }
    
    return JSON.stringify({
      action: 'calculated_coordinates',
      data: { coordinates }
    });
  },
  {
    name: 'generate_random_coordinates',
    description: 'Generates random, valid coordinates for shapes that will be entirely within canvas boundaries (0-5000). Returns an array of {x, y, size} objects. Use this BEFORE batch_create_shapes when you need random positions to ensure all shapes stay within bounds.',
    schema: z.object({
      count: z.number().min(1).max(100).describe('Number of coordinate sets to generate'),
      shapeType: z.enum(['rectangle', 'circle', 'text']).describe('Shape type (affects how coordinates are calculated)'),
      minSize: z.number().min(10).max(500).optional().default(50).describe('Minimum size for shapes (default 50)'),
      maxSize: z.number().min(10).max(1000).optional().default(200).describe('Maximum size for shapes (default 200)'),
    }),
  }
);

// All tools
const tools = [
  createRectangleTool,
  createCircleTool,
  createTextTool,
  createLineTool,
  updateShapeTool,
  moveShapeTool,
  resizeShapeTool,
  rotateShapeTool,
  deleteShapeTool,
  batchCreateShapesTool,
  batchUpdateShapesTool,
  batchMoveShapesTool,
  batchDeleteShapesTool,
  createGridTool,
  createRowTool,
  createCircleRowTool,
  clearCanvasTool,
  generateRandomCoordinatesTool,
];

// System prompt
const prompt = ChatPromptTemplate.fromMessages([
  [
    'system',
    `You are an AI assistant helping users create and manipulate shapes on a 5000x5000 pixel canvas.

**Canvas Coordinates:**
- Canvas size: 5000x5000 pixels
- Center: (2500, 2500)
- Top-left: (0, 0)
- Bottom-right: (5000, 5000)

**Available Tools Summary:**
1. **create_rectangle** - Requires: x, y, width, height, fill. For creating a SINGLE rectangle.
2. **create_circle** - Requires: x, y, radius, fill. For creating a SINGLE circle.
3. **create_text** - Requires: x, y, text. Optional: fontSize (default 24), fill (default black). For creating SINGLE text.
4. **create_line** - Requires: x1, y1, x2, y2. Optional: stroke (default black), strokeWidth (default 2). For creating a SINGLE line.
5. **batch_create_shapes** - Requires: shapes (array of shape definitions). MUCH FASTER for creating 3+ shapes! SINGLE Firebase operation.
6. **update_shape** - Requires: shapeId. Optional: fill, fontSize, width, height, text
7. **move_shape** - Requires: shapeId. Optional: x, y (provide either or both)
8. **resize_shape** - Requires: shapeId. Optional: width, height (provide either or both)
9. **rotate_shape** - Requires: shapeId, rotation
10. **delete_shape** - Requires: shapeId
11. **batch_update_shapes** - Requires: shapeIds (array), updates. MUCH FASTER for updating 3+ shapes! SINGLE Firebase operation.
12. **batch_move_shapes** - Requires: shapeIds (array). Optional: x, y. MUCH FASTER for moving 3+ shapes! SINGLE Firebase operation.
13. **batch_delete_shapes** - Requires: shapeIds (array). MUCH FASTER for deleting 3+ shapes! SINGLE Firebase operation.
14. **create_grid** - Requires: rows, cols. Optional: startX, startY, cellWidth, cellHeight, spacing, fill. Creates RECTANGLES in a grid layout.
15. **create_row** - Requires: count. Optional: startX, startY, width, height, spacing, fill. Creates RECTANGLES in a horizontal row.
16. **create_circle_row** - Requires: count. Optional: startX, startY, radius, spacing, fill. Creates CIRCLES in a horizontal row.
17. **clear_canvas** - No parameters required
18. **generate_random_coordinates** - Requires: count, shapeType. Optional: minSize, maxSize. Calculates valid random coordinates that stay within canvas bounds. Use BEFORE batch_create_shapes for random positioning.

**Your Role:**
1. Interpret user requests about creating, moving, resizing, rotating, or deleting shapes
2. Use the provided tools to execute canvas operations
3. When users say "center", use coordinates (2500, 2500)
4. The user's message will include a list of **Current Canvas Objects** with their IDs and properties
5. Use the shape IDs from the canvas object list when calling update, move, rotate, or delete tools
6. For complex requests (like "create a login form"), break them down into multiple tool calls
7. Be helpful and creative in interpreting ambiguous requests
8. Always check tool schemas - some parameters are optional, some required
9. **CRITICAL PERFORMANCE RULE**: 
   - When CREATING 3+ shapes → Use **batch_create_shapes** (NOT individual create tools)
   - When UPDATING 3+ shapes → Use **batch_update_shapes** (NOT individual update_shape calls)
   - When MOVING 3+ shapes → Use **batch_move_shapes** (NOT individual move_shape calls)
   - When DELETING 3+ shapes → Use **batch_delete_shapes** (NOT individual delete_shape calls)

**Important:**
- Always provide coordinates within 0-5000 range
- Use common colors: red=#FF0000, blue=#0000FF, green=#00FF00, yellow=#FFFF00, etc.
- For "twice as big" or "50% bigger", calculate the new size based on current shape dimensions
- When arranging multiple shapes, use appropriate spacing
- When modifying or deleting shapes, ALWAYS use the exact shape IDs from the **Current Canvas Objects** list
- To delete multiple shapes (e.g., "delete all green objects"), call delete_shape for each matching ID
- To modify multiple shapes (e.g., "make all text bigger"), call update_shape for each matching text shape ID

**Example Interpretations:**
- "Create a red circle" → create_circle with center (2500, 2500), radius 50, fill #FF0000
- "Create 14 blue circles" → (1) generate_random_coordinates with count=14, shapeType='circle' (2) batch_create_shapes with 14 circle objects using the coordinates
- "Create 50 random shapes" → (1) generate_random_coordinates multiple times for different shape types (2) batch_create_shapes with 50 mixed shape objects
- "Build a login form" → batch_create_shapes with multiple rectangles (for input fields, buttons) and text labels arranged vertically
- "Delete the hello world text" → Look for text with "hello world" in canvas objects, call delete_shape with that ID
- "Make all text maximum size" → Find all text shapes, use batch_update_shapes with fontSize=72
- "Delete all green objects" → Find all shapes with fill=#00FF00, use batch_delete_shapes with those IDs
- "Move all circles to the left" → Find all circle shapes, use batch_move_shapes with x-200
- "Move the rectangle to the right" → Find rectangle in canvas objects, call move_shape with x+300
- "Make a 3x3 grid of squares" → create_grid with rows=3, cols=3
- "Clear the canvas" → call clear_canvas to remove all shapes
- "Fill the canvas with random shapes" → (1) generate_random_coordinates for various types (2) batch_create_shapes
- "Start fresh" → call clear_canvas to delete everything`,
  ],
  ['placeholder', '{chat_history}'],
  ['human', '{input}'],
  ['placeholder', '{agent_scratchpad}'],
]);

// Agent and executor will be created lazily on first use
let agentExecutor = null;

/**
 * Get or create the agent executor (lazy initialization)
 */
async function getAgentExecutor() {
  if (!agentExecutor) {
    console.log('🤖 [AI] Initializing agent executor...');
    const agent = await createToolCallingAgent({
      llm: model,
      tools,
      prompt,
    });
    
    agentExecutor = new AgentExecutor({
      agent,
      tools,
      verbose: true,
      returnIntermediateSteps: true, // CRITICAL: Return intermediate steps so we can extract actions
    });
  }
  return agentExecutor;
}

/**
 * Execute an AI command on the canvas
 * @param {string} userMessage - The user's natural language command
 * @param {Array} chatHistory - Previous conversation messages
 * @param {Array} canvasShapes - Current shapes on the canvas
 * @returns {Promise<{response: string, actions: Array}>} - AI response and canvas actions to execute
 */
export async function executeAICommand(userMessage, chatHistory = [], canvasShapes = []) {
  try {
    console.log('🤖 [AI] Executing command:', userMessage);
    console.log('🤖 [AI] Canvas shapes:', canvasShapes.length, 'shapes');
    
    // Build canvas state context
    let canvasContext = '';
    if (canvasShapes.length > 0) {
      canvasContext = '\n\n**Current Canvas Objects:**\n';
      canvasShapes.forEach((shape, index) => {
        const shapeInfo = `${index + 1}. ${shape.type} (ID: ${shape.id})`;
        const details = [];
        if (shape.text) details.push(`text="${shape.text}"`);
        if (shape.fill) details.push(`color=${shape.fill}`);
        if (shape.width && shape.height) details.push(`size=${shape.width}x${shape.height}`);
        if (shape.fontSize) details.push(`fontSize=${shape.fontSize}`);
        canvasContext += `${shapeInfo} - ${details.join(', ')}\n`;
      });
    } else {
      canvasContext = '\n\n**Current Canvas Objects:** (empty canvas)\n';
    }
    
    // Add canvas context to the input
    const enhancedInput = `${userMessage}\n${canvasContext}`;
    
    // Get the agent executor (lazy initialization)
    const executor = await getAgentExecutor();
    
    const result = await executor.invoke({
      input: enhancedInput,
      chat_history: chatHistory,
    });
    
    console.log('🤖 [AI] Full result:', result);
    console.log('🤖 [AI] Intermediate steps:', result.intermediateSteps);
    
    // Parse tool outputs to extract actions
    const actions = [];
    
    if (result.intermediateSteps && Array.isArray(result.intermediateSteps)) {
      for (const step of result.intermediateSteps) {
        console.log('🤖 [AI] Processing step:', step);
        console.log('🤖 [AI] Step action:', step.action);
        console.log('🤖 [AI] Step observation:', step.observation);
        
        // The observation contains the JSON string returned by the tool
        if (step.observation) {
          try {
            const parsedAction = JSON.parse(step.observation);
            console.log('🤖 [AI] Parsed action:', parsedAction);
            actions.push(parsedAction);
          } catch (e) {
            console.warn('🤖 [AI] Failed to parse tool output:', step.observation, e);
          }
        }
      }
    }
    
    console.log('🤖 [AI] Final actions to execute:', actions);
    
    return {
      response: result.output,
      actions,
    };
  } catch (error) {
    console.error('🤖 [AI] Error executing command:', error);
    throw error;
  }
}

/**
 * Get information about available AI commands
 */
export function getAICapabilities() {
  return {
    categories: {
      creation: ['Create rectangles, circles, text, lines'],
      manipulation: ['Move, resize, rotate shapes'],
      layout: ['Create grids, rows of shapes'],
      deletion: ['Delete shapes by description'],
    },
    examples: [
      'Create a red circle in the center',
      'Add a blue rectangle at position 1000, 1000',
      'Move the red circle to the right',
      'Create a 3x3 grid of squares',
      'Build a login form',
      'Rotate the text 45 degrees',
      'Make the circle twice as big',
      'Delete all blue rectangles',
    ],
  };
}

