import { tool } from '@langchain/core/tools';
import { z } from 'zod';

export const batchUpdateShapesTool = tool(
  async ({ shapeIds, updates, deltaX, deltaY, deltaRotation, scaleX, scaleY }) => {
    return JSON.stringify({
      action: 'batch_update_shapes',
      data: { shapeIds, updates, deltaX, deltaY, deltaRotation, scaleX, scaleY }
    });
  },
  {
    name: 'batch_update_shapes',
    description: 'Updates multiple shapes with the same properties OR applies relative transformations in one operation. Much faster than calling update_shape multiple times. Supports both absolute updates (fill, fontSize, opacity) and relative transforms (deltaX, deltaY, scaleX, scaleY, deltaRotation).',
    schema: z.object({
      shapeIds: z.array(z.string()).describe('Array of shape IDs from the Canvas Objects list'),
      // Absolute property updates
      updates: z.object({
        fill: z.string().nullable().optional(),
        fontSize: z.number().min(12).max(72).nullable().optional(),
        width: z.number().min(10).max(1000).nullable().optional(),
        height: z.number().min(10).max(1000).nullable().optional(),
        text: z.string().nullable().optional(),
        opacity: z.number().min(0).max(1).nullable().optional(),
      }).partial().optional().describe('Absolute properties to update on all shapes (e.g., set all to same color or opacity)'),
      // Relative transformations
      deltaX: z.number().nullable().optional().describe('Move all shapes by this X amount (e.g., 100 = move 100px right, -50 = move 50px left)'),
      deltaY: z.number().nullable().optional().describe('Move all shapes by this Y amount (e.g., 100 = move 100px down, -50 = move 50px up)'),
      deltaRotation: z.number().nullable().optional().describe('Rotate all shapes by this many degrees (e.g., 45 = rotate 45° clockwise, -90 = rotate 90° counterclockwise)'),
      scaleX: z.number().min(0.1).max(10).nullable().optional().describe('Scale width by this multiplier (e.g., 2 = double width, 0.5 = half width)'),
      scaleY: z.number().min(0.1).max(10).nullable().optional().describe('Scale height by this multiplier (e.g., 2 = double height, 0.5 = half height)'),
    }).partial(), // Allow partial updates - only include fields that are being updated
  }
);

