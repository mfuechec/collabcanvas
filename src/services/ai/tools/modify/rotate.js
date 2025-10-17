import { tool } from '@langchain/core/tools';
import { z } from 'zod';

export const rotateShapeTool = tool(
  async ({ shapeId, rotation }) => {
    // Return batch_operations format for unified execution
    return JSON.stringify({
      action: 'batch_operations',
      data: {
        operations: [{
          type: 'update',
          shapeId,
          updates: { rotation }
        }]
      }
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

