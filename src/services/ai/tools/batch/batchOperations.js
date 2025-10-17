import { tool } from '@langchain/core/tools';
import { z } from 'zod';

export const batchOperationsTool = tool(
  async ({ operations }) => {
    return JSON.stringify({
      action: 'batch_operations',
      data: { operations }
    });
  },
  {
    name: 'batch_operations',
    description: 'Executes multiple mixed operations (create, update, delete) in a single efficient call. MUCH FASTER than separate tool calls. Use for complex requests like "delete all red shapes and create 5 blue circles". Shape types auto-detected: x1/y1/x2/y2 = line, radius = circle, text = text, otherwise rectangle.',
    schema: z.object({
      operations: z.array(z.object({
        type: z.enum(['create', 'update', 'delete']).describe('Operation type'),
        // CREATE operations
        shape: z.object({
          type: z.enum(['rectangle', 'circle', 'text', 'line']).optional().describe('Shape type (optional - auto-detected from properties)'),
          x: z.number().optional(),
          y: z.number().optional(),
          width: z.number().optional(),
          height: z.number().optional(),
          radius: z.number().optional(),
          text: z.string().optional(),
          fontSize: z.number().optional(),
          fill: z.string().optional(),
          stroke: z.string().optional(),
          strokeWidth: z.number().optional(),
          opacity: z.number().min(0).max(1).optional(),
          cornerRadius: z.number().min(0).max(50).optional().describe('Border radius for rectangles (0-50)'),
          x1: z.number().optional(),
          y1: z.number().optional(),
          x2: z.number().optional(),
          y2: z.number().optional(),
        }).optional().describe('Shape data for CREATE operations'),
        // UPDATE operations
        shapeId: z.string().optional().describe('Shape ID for UPDATE/DELETE operations'),
        updates: z.object({
          x: z.number().optional(),
          y: z.number().optional(),
          width: z.number().optional(),
          height: z.number().optional(),
          fill: z.string().optional(),
          fontSize: z.number().optional(),
          text: z.string().optional(),
          rotation: z.number().optional(),
          opacity: z.number().min(0).max(1).optional(),
          cornerRadius: z.number().min(0).max(50).optional(),
        }).optional().describe('Properties to update for UPDATE operations'),
      })).min(1).max(50).describe('Array of operations to execute (max 50)'),
    }),
  }
);

