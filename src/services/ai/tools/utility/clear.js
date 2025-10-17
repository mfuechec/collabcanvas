import { tool } from '@langchain/core/tools';
import { z } from 'zod';

export const clearCanvasTool = tool(
  async () => {
    return JSON.stringify({
      action: 'clear_canvas',
      data: {}
    });
  },
  {
    name: 'clear_canvas',
    description: 'Clears all shapes from the canvas. Use when the user asks to clear, delete all, remove everything, or start fresh.',
    schema: z.object({}),
  }
);

