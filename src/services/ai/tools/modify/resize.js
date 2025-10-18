import { tool } from '@langchain/core/tools';
import { z } from 'zod';

export const resizeShapeTool = tool(
  async ({ shapeId, width, height }) => {
    // Build updates object with only defined properties
    const updates = {};
    if (width !== undefined) updates.width = width;
    if (height !== undefined) updates.height = height;
    
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
    name: 'resize_shape',
    description: 'Resizes a shape to new dimensions. Use when the user asks to make something bigger, smaller, or change its size. You must provide the exact shape ID from the Canvas Objects list.',
    schema: z.object({
      shapeId: z.string().describe('The exact ID of the shape from the Canvas Objects list'),
      width: z.number().min(10).max(1000).nullable().optional().describe('New width in pixels'),
      height: z.number().min(10).max(1000).nullable().optional().describe('New height in pixels'),
    }).partial(), // Allow partial updates - only include fields that are being updated
  }
);

