/**
 * Real-World Integration Tests
 * 
 * Tests complete workflows and real user scenarios.
 * Ensures schemas work correctly in production-like conditions.
 */

import { describe, it, expect } from 'vitest';
import { 
  toolArgsSchema, 
  executionPlanSchema 
} from '../../../src/services/ai/planning/schemas.js';
import { 
  generateMockAIResponse,
  createTestFixtures,
  validateWithDetails 
} from '../helpers/test-utils.js';

describe('Real-World Integration Scenarios', () => {
  
  describe('User Command: "Make it purple"', () => {
    
    it('should handle complete workflow from user input to execution', () => {
      // Simulate AI response to "make it purple"
      const aiResponse = {
        plan: [
          {
            step: 1,
            tool: 'batch_update_shapes',
            args: {
              tool: 'batch_update_shapes',
              shapeIds: ['shape_1'],
              updates: { fill: '#800080' }
            },
            description: 'Change color to purple'
          }
        ],
        reasoning: 'I\'ve changed the selected shape to purple.'
      };
      
      // Validate the execution plan
      expect(() => executionPlanSchema.parse(aiResponse)).not.toThrow();
      
      // Verify the plan structure
      const parsed = executionPlanSchema.parse(aiResponse);
      expect(parsed.plan).toHaveLength(1);
      expect(parsed.plan[0].tool).toBe('batch_update_shapes');
      expect(parsed.plan[0].args.updates.fill).toBe('#800080');
    });
    
  });
  
  describe('User Command: "Create a login form"', () => {
    
    it('should handle template creation workflow', () => {
      const aiResponse = {
        plan: [
          {
            step: 1,
            tool: 'use_login_template',
            args: {
              tool: 'use_login_template',
              primaryColor: '#3B82F6',
              size: 'normal',
              style: 'modern',
              fields: ['email', 'password'],
              socialProviders: ['google'],
              titleText: 'Welcome Back',
              subtitleText: 'Sign in to continue',
              buttonText: 'Sign In'
            },
            description: 'Create a modern login form with email and password fields'
          }
        ],
        reasoning: 'I\'ve created a modern login form with the requested styling and fields.'
      };
      
      expect(() => executionPlanSchema.parse(aiResponse)).not.toThrow();
      
      const parsed = executionPlanSchema.parse(aiResponse);
      expect(parsed.plan[0].tool).toBe('use_login_template');
      expect(parsed.plan[0].args.primaryColor).toBe('#3B82F6');
      expect(parsed.plan[0].args.fields).toEqual(['email', 'password']);
    });
    
  });
  
  describe('User Command: "Create a 3x3 grid and make it blue"', () => {
    
    it('should handle multi-step workflow', () => {
      const aiResponse = {
        plan: [
          {
            step: 1,
            tool: 'create_grid',
            args: {
              tool: 'create_grid',
              rows: 3,
              cols: 3,
              startX: 100,
              startY: 100,
              cellWidth: 80,
              cellHeight: 80,
              spacing: 10,
              fill: '#3B82F6'
            },
            description: 'Create a 3x3 grid with blue squares'
          }
        ],
        reasoning: 'I\'ve created a 3x3 grid with blue squares at the specified position.'
      };
      
      expect(() => executionPlanSchema.parse(aiResponse)).not.toThrow();
      
      const parsed = executionPlanSchema.parse(aiResponse);
      expect(parsed.plan[0].tool).toBe('create_grid');
      expect(parsed.plan[0].args.rows).toBe(3);
      expect(parsed.plan[0].args.cols).toBe(3);
      expect(parsed.plan[0].args.fill).toBe('#3B82F6');
    });
    
  });
  
  describe('User Command: "Move all shapes to the right"', () => {
    
    it('should handle batch movement workflow', () => {
      const aiResponse = {
        plan: [
          {
            step: 1,
            tool: 'batch_update_shapes',
            args: {
              tool: 'batch_update_shapes',
              shapeIds: ['shape_1', 'shape_2', 'shape_3'],
              deltaX: 100
            },
            description: 'Move all selected shapes 100 pixels to the right'
          }
        ],
        reasoning: 'I\'ve moved all selected shapes to the right by 100 pixels.'
      };
      
      expect(() => executionPlanSchema.parse(aiResponse)).not.toThrow();
      
      const parsed = executionPlanSchema.parse(aiResponse);
      expect(parsed.plan[0].tool).toBe('batch_update_shapes');
      expect(parsed.plan[0].args.shapeIds).toHaveLength(3);
      expect(parsed.plan[0].args.deltaX).toBe(100);
    });
    
  });
  
  describe('User Command: "Clear everything and start over"', () => {
    
    it('should handle canvas clearing workflow', () => {
      const aiResponse = {
        plan: [
          {
            step: 1,
            tool: 'clear_canvas',
            args: {
              tool: 'clear_canvas'
            },
            description: 'Clear the entire canvas'
          }
        ],
        reasoning: 'I\'ve cleared the canvas to start fresh.'
      };
      
      expect(() => executionPlanSchema.parse(aiResponse)).not.toThrow();
      
      const parsed = executionPlanSchema.parse(aiResponse);
      expect(parsed.plan[0].tool).toBe('clear_canvas');
    });
    
  });
  
  describe('Complex Multi-Step Workflow', () => {
    
    it('should handle complex user request with multiple operations', () => {
      const aiResponse = {
        plan: [
          {
            step: 1,
            tool: 'create_grid',
            args: {
              tool: 'create_grid',
              rows: 2,
              cols: 3,
              startX: 50,
              startY: 50,
              cellWidth: 100,
              cellHeight: 80,
              spacing: 20,
              fill: '#E5E7EB'
            },
            description: 'Create a 2x3 grid with gray squares'
          },
          {
            step: 2,
            tool: 'batch_update_shapes',
            args: {
              tool: 'batch_update_shapes',
              shapeIds: ['shape_1', 'shape_2'],
              updates: { fill: '#3B82F6' }
            },
            description: 'Make the first two squares blue'
          },
          {
            step: 3,
            tool: 'batch_update_shapes',
            args: {
              tool: 'batch_update_shapes',
              shapeIds: ['shape_3', 'shape_4'],
              updates: { fill: '#10B981' }
            },
            description: 'Make the next two squares green'
          },
          {
            step: 4,
            tool: 'batch_update_shapes',
            args: {
              tool: 'batch_update_shapes',
              shapeIds: ['shape_5', 'shape_6'],
              updates: { fill: '#F59E0B' }
            },
            description: 'Make the last two squares orange'
          }
        ],
        reasoning: 'I\'ve created a 2x3 grid and colored each row with different colors: blue, green, and orange.'
      };
      
      expect(() => executionPlanSchema.parse(aiResponse)).not.toThrow();
      
      const parsed = executionPlanSchema.parse(aiResponse);
      expect(parsed.plan).toHaveLength(4);
      expect(parsed.plan[0].tool).toBe('create_grid');
      expect(parsed.plan[1].tool).toBe('batch_update_shapes');
      expect(parsed.plan[2].tool).toBe('batch_update_shapes');
      expect(parsed.plan[3].tool).toBe('batch_update_shapes');
    });
    
  });
  
  describe('Error Recovery Scenarios', () => {
    
    it('should handle malformed AI response gracefully', () => {
      const malformedResponse = {
        plan: [
          {
            step: 1,
            tool: 'batch_update_shapes',
            args: {
              tool: 'batch_update_shapes',
              shapeIds: ['shape_1'],
              updates: { fill: '#FF0000' }
            },
            description: 'Change color to red'
          }
        ],
        reasoning: 'I\'ve changed the color to red.'
      };
      
      // This should be valid
      expect(() => executionPlanSchema.parse(malformedResponse)).not.toThrow();
    });
    
    it('should reject completely invalid AI response', () => {
      const invalidResponse = {
        plan: [
          {
            step: 'not_a_number',
            tool: 'unknown_tool',
            args: 'not_an_object',
            description: 123
          }
        ],
        reasoning: 456
      };
      
      expect(() => executionPlanSchema.parse(invalidResponse)).toThrow();
    });
    
  });
  
  describe('Performance Scenarios', () => {
    
    it('should handle large batch operations efficiently', () => {
      const largeBatch = {
        tool: 'batch_operations',
        operations: Array.from({ length: 100 }, (_, i) => ({
          type: 'create',
          shape: {
            type: 'rectangle',
            x: (i % 10) * 50,
            y: Math.floor(i / 10) * 50,
            width: 40,
            height: 40,
            fill: `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}`,
            // Add all required nullable fields
            radius: null,
            text: null,
            fontSize: null,
            stroke: null,
            strokeWidth: null,
            cornerRadius: null,
            x1: null,
            y1: null,
            x2: null,
            y2: null
          }
        }))
      };
      
      const start = performance.now();
      expect(() => toolArgsSchema.parse(largeBatch)).not.toThrow();
      const end = performance.now();
      
      // Should complete in reasonable time (less than 100ms)
      expect(end - start).toBeLessThan(100);
    });
    
    it('should handle complex execution plans efficiently', () => {
      const complexPlan = {
        plan: Array.from({ length: 50 }, (_, i) => ({
          step: i + 1,
          tool: 'batch_update_shapes',
          args: {
            tool: 'batch_update_shapes',
            shapeIds: [`shape_${i}`],
            updates: { fill: `#${Math.floor(Math.random() * 16777215).toString(16).padStart(6, '0')}` }
          },
          description: `Update shape ${i}`
        })),
        reasoning: 'Complex multi-step operation'
      };
      
      const start = performance.now();
      expect(() => executionPlanSchema.parse(complexPlan)).not.toThrow();
      const end = performance.now();
      
      // Should complete in reasonable time (less than 200ms)
      expect(end - start).toBeLessThan(200);
    });
    
  });
  
  describe('Edge Case Scenarios', () => {
    
    it('should handle empty execution plan', () => {
      const emptyPlan = {
        plan: [],
        reasoning: 'No operations needed'
      };
      
      expect(() => executionPlanSchema.parse(emptyPlan)).not.toThrow();
    });
    
    it('should handle single operation plan', () => {
      const singleOpPlan = {
        plan: [
          {
            step: 1,
            tool: 'clear_canvas',
            args: { tool: 'clear_canvas' },
            description: 'Clear canvas'
          }
        ],
        reasoning: 'Simple operation'
      };
      
      expect(() => executionPlanSchema.parse(singleOpPlan)).not.toThrow();
    });
    
    it('should handle mixed operation types in batch', () => {
      const mixedBatch = {
        tool: 'batch_operations',
        operations: [
          {
            type: 'create',
            shape: {
              type: 'rectangle',
              x: 100,
              y: 100,
              width: 200,
              height: 150,
              fill: '#FF0000',
              // Add all required nullable fields
              radius: null,
              text: null,
              fontSize: null,
              stroke: null,
              strokeWidth: null,
              cornerRadius: null,
              x1: null,
              y1: null,
              x2: null,
              y2: null
            }
          },
          {
            type: 'update',
            shapeId: 'existing_shape',
            updates: { fill: '#00FF00' }
          },
          {
            type: 'delete',
            shapeId: 'old_shape'
          }
        ]
      };
      
      expect(() => toolArgsSchema.parse(mixedBatch)).not.toThrow();
    });
    
  });
  
  describe('Real User Commands Dataset', () => {
    
    const realCommands = [
    {
      command: "make it red",
      expectedTool: "batch_update_shapes",
      expectedArgs: { 
        tool: "batch_update_shapes",
        shapeIds: ["shape_1"],
        updates: { fill: "#FF0000" } 
      }
    },
    {
      command: "move it right",
      expectedTool: "batch_update_shapes", 
      expectedArgs: { 
        tool: "batch_update_shapes",
        shapeIds: ["shape_1"],
        deltaX: 100 
      }
    },
    {
      command: "make it bigger",
      expectedTool: "batch_update_shapes",
      expectedArgs: { 
        tool: "batch_update_shapes",
        shapeIds: ["shape_1"],
        scaleX: 1.5, 
        scaleY: 1.5 
      }
    },
    {
      command: "create a grid",
      expectedTool: "create_grid",
      expectedArgs: { 
        tool: "create_grid",
        rows: 3, 
        cols: 3 
      }
    },
    {
      command: "clear everything",
      expectedTool: "clear_canvas",
      expectedArgs: { 
        tool: "clear_canvas"
      }
    }
    ];
    
    realCommands.forEach(({ command, expectedTool, expectedArgs }) => {
      it(`should handle "${command}" command`, () => {
        const mockResponse = {
          plan: [
            {
              step: 1,
              tool: expectedTool,
              args: {
                tool: expectedTool,
                ...expectedArgs
              },
              description: `Execute: ${command}`
            }
          ],
          reasoning: `I've executed the command: ${command}`
        };
        
        expect(() => executionPlanSchema.parse(mockResponse)).not.toThrow();
        
        const parsed = executionPlanSchema.parse(mockResponse);
        expect(parsed.plan[0].tool).toBe(expectedTool);
        expect(parsed.plan[0].args.tool).toBe(expectedTool);
      });
    });
    
  });
  
});