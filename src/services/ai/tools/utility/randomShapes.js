import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { generateRandomShapes } from '../../../../utils/randomShapes.js';

// ========================================
// RANDOM SHAPES TOOL
// ========================================

/**
 * Generate random shapes for testing and quick population
 * Useful for performance testing and demonstrations
 */
export const addRandomShapesTool = tool(
  async ({ count, types, balanced }) => {
    const options = {};
    
    if (types && types.length > 0) {
      options.types = types;
    }
    
    if (balanced !== null) {
      options.balanced = balanced;
    }

    const shapes = generateRandomShapes(count, options);
    
    return JSON.stringify({
      action: 'batch_operations',
      data: {
        operations: shapes.map(shape => ({
          type: 'create',
          shape
        }))
      }
    });
  },
  {
    name: 'add_random_shapes',
    description: 'Generate and add random shapes to the canvas for testing or quick population. Creates a balanced mix of rectangles, circles, text, and lines with random properties (colors, sizes, positions, rotations). All coordinates are validated to stay within canvas bounds (0-5000). Perfect for stress testing performance or quickly filling the canvas.',
    schema: z.object({
      count: z.number().min(1).max(1000).describe('Number of random shapes to generate (1-1000)'),
      types: z.array(z.enum(['rectangle', 'circle', 'text', 'line'])).nullable().describe('Specific shape types to generate (null for all types)'),
      balanced: z.boolean().nullable().describe('If true, distribute evenly across types; if false, random distribution (default: true)'),
    })
  }
);

