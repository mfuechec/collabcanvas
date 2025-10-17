import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '@/utils/constants';

export const createRowTool = tool(
  async ({ startX, startY, count, width, height, spacing, fill }) => {
    return JSON.stringify({
      action: 'create_row',
      data: { startX, startY, count, width, height, spacing, fill }
    });
  },
  {
    name: 'create_row',
    description: 'Creates a horizontal row of RECTANGLES. Use ONLY when the user specifically asks for rectangles in a row.',
    schema: z.object({
      startX: z.number().min(0).max(CANVAS_WIDTH).default(500).describe('Row start X position'),
      startY: z.number().min(0).max(CANVAS_HEIGHT).default(2500).describe('Row Y position'),
      count: z.number().min(2).max(50).describe('Number of shapes in the row (2-50)'),
      width: z.number().min(20).max(200).default(80).describe('Width of each shape'),
      height: z.number().min(20).max(200).default(80).describe('Height of each shape'),
      spacing: z.number().min(0).max(100).default(20).describe('Spacing between shapes'),
      fill: z.string().default('#3B82F6').describe('Fill color'),
    }),
  }
);

