import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '@/utils/constants';

export const createCircleRowTool = tool(
  async ({ startX, startY, count, radius, spacing, fill }) => {
    return JSON.stringify({
      action: 'create_circle_row',
      data: { startX, startY, count, radius, spacing, fill }
    });
  },
  {
    name: 'create_circle_row',
    description: 'Creates a horizontal row of CIRCLES. Use when the user asks for multiple circles in a row, line, or horizontal arrangement.',
    schema: z.object({
      startX: z.number().min(0).max(CANVAS_WIDTH).default(500).describe('Row start X position (center of first circle)'),
      startY: z.number().min(0).max(CANVAS_HEIGHT).default(2500).describe('Row Y position (center of circles)'),
      count: z.number().min(2).max(50).describe('Number of circles in the row (2-50)'),
      radius: z.number().min(10).max(100).default(40).describe('Radius of each circle'),
      spacing: z.number().min(0).max(200).default(20).describe('Spacing between circle centers'),
      fill: z.string().default('#3B82F6').describe('Fill color'),
    }),
  }
);

