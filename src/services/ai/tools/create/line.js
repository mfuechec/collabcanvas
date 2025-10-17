import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '@/utils/constants';

export const createLineTool = tool(
  async ({ x1, y1, x2, y2, stroke, strokeWidth }) => {
    const minX = Math.min(x1, x2);
    const minY = Math.min(y1, y2);
    const width = Math.abs(x2 - x1);
    const height = Math.abs(y2 - y1);
    
    // Return batch_operations format for unified execution
    return JSON.stringify({
      action: 'batch_operations',
      data: {
        operations: [{
          type: 'create',
          shape: {
            type: 'line',
            x: minX,
            y: minY,
            width,
            height,
            points: [x1, y1, x2, y2],
            stroke,
            strokeWidth,
            fill: stroke
          }
        }]
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
      stroke: z.string().describe('Stroke color (hex code)'),
      strokeWidth: z.number().min(1).max(20).default(2).describe('Line width in pixels (1-20, default 2)'),
    }),
  }
);

