import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '@/utils/constants';

// COORDINATE SYSTEM: AI receives CENTER coordinates, we store as TOP-LEFT
export const createCircleTool = tool(
  async ({ x, y, radius, fill }) => {
    // Convert center coordinates to TOP-LEFT of bounding box
    // Circle storage: x, y = top-left, width/height = diameter
    const diameter = radius * 2;
    const topLeftX = x - radius;
    const topLeftY = y - radius;
    
    // Return batch_operations format for unified execution
    return JSON.stringify({
      action: 'batch_operations',
      data: {
        operations: [{
          type: 'create',
          shape: { type: 'circle', x: topLeftX, y: topLeftY, width: diameter, height: diameter, fill }
        }]
      }
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

