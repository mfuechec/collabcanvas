import { tool } from '@langchain/core/tools';
import { z } from 'zod';

export const updateShapeTool = tool(
  async ({ shapeId, fill, fontSize, width, height, radius, text, opacity }) => {
    // Build updates object with only defined properties
    const updates = {};
    if (fill !== undefined) updates.fill = fill;
    if (fontSize !== undefined) updates.fontSize = fontSize;
    if (width !== undefined) updates.width = width;
    if (height !== undefined) updates.height = height;
    if (radius !== undefined) {
      updates.radius = radius;
      updates._isCircleRadiusUpdate = true;
    }
    if (text !== undefined) updates.text = text;
    if (opacity !== undefined) updates.opacity = opacity;
    
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
    name: 'update_shape',
    description: 'Updates properties of a specific shape. Use when the user asks to change color, size, font size, radius (for circles), opacity, or other properties of an existing shape. You must provide the exact shape ID from the Canvas Objects list.',
    schema: z.object({
      shapeId: z.string().describe('The exact ID of the shape from the Canvas Objects list'),
      fill: z.string().nullable().optional().describe('New fill color (hex code like #FF0000)'),
      fontSize: z.number().min(12).max(72).nullable().optional().describe('New font size for text (12-72)'),
      width: z.number().min(10).max(1000).nullable().optional().describe('New width in pixels (rectangles only)'),
      height: z.number().min(10).max(1000).nullable().optional().describe('New height in pixels (rectangles only)'),
      radius: z.number().min(10).max(500).nullable().optional().describe('New radius for circles (10-500). Automatically converts to width/height.'),
      text: z.string().nullable().optional().describe('New text content (for text shapes)'),
      opacity: z.number().min(0).max(1).nullable().optional().describe('Opacity/transparency (0.0 = fully transparent, 1.0 = fully opaque, 0.5 = 50% transparent)'),
    }).partial(), // Allow partial updates - only include fields that are being updated
  }
);

