import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '@/utils/constants';

export const createGridTool = tool(
  async ({ startX, startY, rows, cols, cellWidth, cellHeight, spacing, fill }) => {
    return JSON.stringify({
      action: 'create_grid',
      data: { startX, startY, rows, cols, cellWidth, cellHeight, spacing, fill }
    });
  },
  {
    name: 'create_grid',
    description: 'Creates a grid of rectangles. Use when the user asks for a grid, matrix, or multiple shapes arranged in rows and columns.',
    schema: z.object({
      startX: z.number().min(0).max(CANVAS_WIDTH).default(500).describe('Grid start X position'),
      startY: z.number().min(0).max(CANVAS_HEIGHT).default(500).describe('Grid start Y position'),
      rows: z.number().min(1).max(20).describe('Number of rows (1-20)'),
      cols: z.number().min(1).max(20).describe('Number of columns (1-20)'),
      cellWidth: z.number().min(20).max(200).default(80).describe('Width of each cell'),
      cellHeight: z.number().min(20).max(200).default(80).describe('Height of each cell'),
      spacing: z.number().min(0).max(50).default(10).describe('Spacing between cells'),
      fill: z.string().default('#3B82F6').describe('Fill color for cells'),
    }),
  }
);

