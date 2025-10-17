import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '@/utils/constants';

// COORDINATE SYSTEM: AI receives CENTER coordinates, we store as TOP-LEFT
export const createRectangleTool = tool(
  async ({ x, y, width, height, fill, cornerRadius }) => {
    // Convert center coordinates to top-left corner for storage
    const topLeftX = x - (width / 2);
    const topLeftY = y - (height / 2);
    console.log(`📐 [CREATE_RECTANGLE] AI provided center: (${x}, ${y}), converting to top-left: (${topLeftX}, ${topLeftY}), size: ${width}x${height}${cornerRadius ? `, cornerRadius: ${cornerRadius}` : ''}`);
    
    // Return batch_operations format for unified execution
    return JSON.stringify({
      action: 'batch_operations',
      data: {
        operations: [{
          type: 'create',
          shape: { type: 'rectangle', x: topLeftX, y: topLeftY, width, height, fill, cornerRadius }
        }]
      }
    });
  },
  {
    name: 'create_rectangle',
    description: 'Creates a rectangle on the canvas. Use this when the user asks to create or add a rectangle, box, or square. Use cornerRadius for rounded corners (modern UI elements like cards, buttons, inputs).',
    schema: z.object({
      x: z.number().min(0).max(CANVAS_WIDTH).describe('Center X position (0 to 5000). Use 2500 for canvas center.'),
      y: z.number().min(0).max(CANVAS_HEIGHT).describe('Center Y position (0 to 5000). Use 2500 for canvas center.'),
      width: z.number().min(10).max(1000).describe('Width in pixels (10-1000)'),
      height: z.number().min(10).max(1000).describe('Height in pixels (10-1000)'),
      fill: z.string().describe('Fill color (hex code like #FF0000 for red, #0000FF for blue, #00FF00 for green)'),
      cornerRadius: z.number().min(0).max(50).optional().describe('Border radius for rounded corners (0-50). Use 8-12 for buttons/cards, 4-6 for inputs.'),
    }),
  }
);

