import { tool } from '@langchain/core/tools';
import { z } from 'zod';

export const deleteShapeTool = tool(
  async ({ shapeId }) => {
    // Return batch_operations format for unified execution
    return JSON.stringify({
      action: 'batch_operations',
      data: {
        operations: [{
          type: 'delete',
          shapeId
        }]
      }
    });
  },
  {
    name: 'delete_shape',
    description: 'Deletes a shape from the canvas. Use when the user asks to remove or delete a shape. You must provide the exact shape ID from the Canvas Objects list.',
    schema: z.object({
      shapeId: z.string().describe('The exact ID of the shape from the Canvas Objects list'),
    }),
  }
);

