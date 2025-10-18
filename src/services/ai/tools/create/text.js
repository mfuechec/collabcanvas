import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '@/utils/constants';
import { textCenterToTopLeft } from '@/utils/shapes';

// COORDINATE SYSTEM: AI receives CENTER coordinates, we store as TOP-LEFT
export const createTextTool = tool(
  async ({ x, y, text, fontSize, fill }) => {
    // Convert center coordinates to top-left corner for storage
    // Uses standardized text dimension formula (fontSize * 1.2 for height)
    const { x: topLeftX, y: topLeftY, width: estimatedWidth, height } = textCenterToTopLeft(x, y, text, fontSize);
    
    // Return batch_operations format for unified execution
    return JSON.stringify({
      action: 'batch_operations',
      data: {
        operations: [{
          type: 'create',
          shape: { type: 'text', x: topLeftX, y: topLeftY, text, fontSize, fill, width: estimatedWidth, height }
        }]
      }
    });
  },
  {
    name: 'create_text',
    description: 'Creates a text label on the canvas. Use this when the user asks to add text, label, or write something.',
    schema: z.object({
      x: z.number().min(0).max(CANVAS_WIDTH).describe('Center X position (0 to 5000). Use 2500 for canvas center.'),
      y: z.number().min(0).max(CANVAS_HEIGHT).describe('Center Y position (0 to 5000). Use 2500 for canvas center.'),
      text: z.string().describe('The text content to display'),
      fontSize: z.number().min(8).max(500).default(48).describe('Font size in pixels (8-500, default 48)'),
      fill: z.string().default('#000000').describe('Text color (hex code, default black)'),
    }),
  }
);

