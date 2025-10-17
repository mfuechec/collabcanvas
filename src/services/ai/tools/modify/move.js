import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '@/utils/constants';

export const moveShapeTool = tool(
  async ({ shapeId, x, y }) => {
    // Build updates object with only defined properties
    const updates = {};
    if (x !== undefined) updates.x = x;
    if (y !== undefined) updates.y = y;
    
    // Return batch_operations format for unified execution
    return JSON.stringify({
      action: 'batch_operations',
      data: {
        operations: [{
          type: 'update',
          shapeId,
          updates
        }]
      }
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

