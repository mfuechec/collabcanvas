/**
 * Core Schema Validation Tests
 * 
 * Tests the fundamental schema validation for all AI tools.
 * Ensures proper validation of tool arguments, types, and constraints.
 */

import { describe, it, expect } from 'vitest';
import { 
  toolArgsSchema, 
  batchOperationSchema, 
  batchUpdatesSchema,
  executionPlanSchema 
} from '../../../src/services/ai/planning/schemas.js';

describe('AI Tool Schema Validation', () => {
  
  describe('Tool Arguments Schema', () => {
    
    describe('Template Tools', () => {
      
      it('should validate use_login_template with minimal arguments', () => {
        const validArgs = {
          tool: 'use_login_template'
        };
        
        expect(() => toolArgsSchema.parse(validArgs)).not.toThrow();
        const result = toolArgsSchema.parse(validArgs);
        expect(result.tool).toBe('use_login_template');
      });
      
      it('should validate use_login_template with all arguments', () => {
        const validArgs = {
          tool: 'use_login_template',
          primaryColor: '#8B5CF6',
          size: 'normal',
          style: 'modern',
          fields: ['email', 'password'],
          socialProviders: ['google'],
          titleText: 'Welcome Back',
          subtitleText: 'Sign in to continue',
          buttonText: 'Sign In'
        };
        
        expect(() => toolArgsSchema.parse(validArgs)).not.toThrow();
      });
      
      it('should validate use_navbar_template with minimal arguments', () => {
        const validArgs = {
          tool: 'use_navbar_template'
        };
        
        expect(() => toolArgsSchema.parse(validArgs)).not.toThrow();
      });
      
      it('should validate use_card_template with minimal arguments', () => {
        const validArgs = {
          tool: 'use_card_template'
        };
        
        expect(() => toolArgsSchema.parse(validArgs)).not.toThrow();
      });
      
      it('should reject invalid template tool arguments', () => {
        const invalidArgs = {
          tool: 'use_login_template',
          size: 'invalid_size', // Invalid enum value
          style: 'invalid_style' // Invalid enum value
        };
        
        expect(() => toolArgsSchema.parse(invalidArgs)).toThrow();
      });
      
    });
    
    describe('Batch Tools', () => {
      
      it('should validate batch_operations with valid operations', () => {
        const validArgs = {
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
              shapeId: 'shape_123',
              updates: {
                fill: '#00FF00'
              }
            },
            {
              type: 'delete',
              shapeId: 'shape_456'
            }
          ]
        };
        
        expect(() => toolArgsSchema.parse(validArgs)).not.toThrow();
      });
      
      it('should validate batch_update_shapes with minimal arguments', () => {
        const validArgs = {
          tool: 'batch_update_shapes',
          shapeIds: ['shape_1', 'shape_2'],
          deltaX: 100
        };
        
        expect(() => toolArgsSchema.parse(validArgs)).not.toThrow();
      });
      
      it('should validate batch_update_shapes with all arguments', () => {
        const validArgs = {
          tool: 'batch_update_shapes',
          shapeIds: ['shape_1', 'shape_2'],
          updates: {
            fill: '#FF0000',
            fontSize: 24,
            opacity: 0.8
          },
          deltaX: 100,
          deltaY: 50,
          deltaRotation: 45,
          scaleX: 1.5,
          scaleY: 1.5
        };
        
        expect(() => toolArgsSchema.parse(validArgs)).not.toThrow();
      });
      
    });
    
    describe('Pattern Tools', () => {
      
      it('should validate create_grid with minimal arguments', () => {
        const validArgs = {
          tool: 'create_grid',
          rows: 3,
          cols: 3
        };
        
        expect(() => toolArgsSchema.parse(validArgs)).not.toThrow();
      });
      
      it('should validate create_grid with all arguments', () => {
        const validArgs = {
          tool: 'create_grid',
          startX: 100,
          startY: 100,
          rows: 5,
          cols: 5,
          cellWidth: 80,
          cellHeight: 80,
          spacing: 10,
          fill: '#3B82F6'
        };
        
        expect(() => toolArgsSchema.parse(validArgs)).not.toThrow();
      });
      
      it('should validate create_row with minimal arguments', () => {
        const validArgs = {
          tool: 'create_row',
          count: 5
        };
        
        expect(() => toolArgsSchema.parse(validArgs)).not.toThrow();
      });
      
      it('should validate create_circle_row with minimal arguments', () => {
        const validArgs = {
          tool: 'create_circle_row',
          count: 5
        };
        
        expect(() => toolArgsSchema.parse(validArgs)).not.toThrow();
      });
      
    });
    
    describe('Utility Tools', () => {
      
      it('should validate clear_canvas with no arguments', () => {
        const validArgs = {
          tool: 'clear_canvas'
        };
        
        expect(() => toolArgsSchema.parse(validArgs)).not.toThrow();
      });
      
      it('should validate add_random_shapes with minimal arguments', () => {
        const validArgs = {
          tool: 'add_random_shapes',
          count: 10
        };
        
        expect(() => toolArgsSchema.parse(validArgs)).not.toThrow();
      });
      
      it('should validate add_random_shapes with all arguments', () => {
        const validArgs = {
          tool: 'add_random_shapes',
          count: 50,
          types: ['circle', 'rectangle'],
          balanced: true
        };
        
        expect(() => toolArgsSchema.parse(validArgs)).not.toThrow();
      });
      
    });
    
  });
  
  describe('Batch Operation Schema', () => {
    
    it('should validate create operation with all shape types', () => {
      const rectangleOp = {
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
      };
      
      const circleOp = {
        type: 'create',
        shape: {
          type: 'circle',
          x: 100,
          y: 100,
          radius: 50,
          fill: '#00FF00',
          // Add all required nullable fields
          width: null,
          height: null,
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
      };
      
      const textOp = {
        type: 'create',
        shape: {
          type: 'text',
          x: 100,
          y: 100,
          text: 'Hello World',
          fontSize: 24,
          fill: '#0000FF',
          // Add all required nullable fields
          width: null,
          height: null,
          radius: null,
          stroke: null,
          strokeWidth: null,
          cornerRadius: null,
          x1: null,
          y1: null,
          x2: null,
          y2: null
        }
      };
      
      const lineOp = {
        type: 'create',
        shape: {
          type: 'line',
          x1: 100,
          y1: 100,
          x2: 200,
          y2: 200,
          stroke: '#FF00FF',
          strokeWidth: 2,
          // Add all required nullable fields
          x: 100,
          y: 100,
          width: null,
          height: null,
          radius: null,
          text: null,
          fontSize: null,
          fill: null,
          cornerRadius: null
        }
      };
      
      expect(() => batchOperationSchema.parse(rectangleOp)).not.toThrow();
      expect(() => batchOperationSchema.parse(circleOp)).not.toThrow();
      expect(() => batchOperationSchema.parse(textOp)).not.toThrow();
      expect(() => batchOperationSchema.parse(lineOp)).not.toThrow();
    });
    
    it('should validate update operation with partial updates', () => {
      const updateOp = {
        type: 'update',
        shapeId: 'shape_123',
        updates: {
          fill: '#FF0000',
          opacity: 0.8
        }
      };
      
      expect(() => batchOperationSchema.parse(updateOp)).not.toThrow();
    });
    
    it('should validate delete operation', () => {
      const deleteOp = {
        type: 'delete',
        shapeId: 'shape_123'
      };
      
      expect(() => batchOperationSchema.parse(deleteOp)).not.toThrow();
    });
    
    it('should reject invalid operation types', () => {
      const invalidOp = {
        type: 'invalid_type',
        shapeId: 'shape_123'
      };
      
      expect(() => batchOperationSchema.parse(invalidOp)).toThrow();
    });
    
  });
  
  describe('Batch Updates Schema', () => {
    
    it('should validate partial updates', () => {
      const partialUpdates = {
        fill: '#FF0000'
      };
      
      expect(() => batchUpdatesSchema.parse(partialUpdates)).not.toThrow();
    });
    
    it('should validate empty updates object', () => {
      const emptyUpdates = {};
      
      expect(() => batchUpdatesSchema.parse(emptyUpdates)).not.toThrow();
    });
    
    it('should validate null updates', () => {
      const nullUpdates = null;
      
      expect(() => batchUpdatesSchema.parse(nullUpdates)).not.toThrow();
    });
    
    it('should validate all update fields', () => {
      const allUpdates = {
        fill: '#FF0000',
        fontSize: 24,
        opacity: 0.8
      };
      
      expect(() => batchUpdatesSchema.parse(allUpdates)).not.toThrow();
    });
    
  });
  
  describe('Execution Plan Schema', () => {
    
    it('should validate complete execution plan', () => {
      const validPlan = {
        plan: [
          {
            step: 1,
            tool: 'batch_operations',
            args: {
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
                }
              ]
            },
            description: 'Create a red rectangle'
          }
        ],
        reasoning: 'I\'ve created a red rectangle at position (100, 100) with dimensions 200x150.'
      };
      
      expect(() => executionPlanSchema.parse(validPlan)).not.toThrow();
    });
    
    it('should validate multi-step execution plan', () => {
      const multiStepPlan = {
        plan: [
          {
            step: 1,
            tool: 'create_grid',
            args: {
              tool: 'create_grid',
              rows: 3,
              cols: 3
            },
            description: 'Create a 3x3 grid'
          },
          {
            step: 2,
            tool: 'batch_update_shapes',
            args: {
              tool: 'batch_update_shapes',
              shapeIds: ['shape_1', 'shape_2'],
              updates: {
                fill: '#00FF00'
              }
            },
            description: 'Make first two shapes green'
          }
        ],
        reasoning: 'I\'ve created a 3x3 grid and colored the first two shapes green.'
      };
      
      expect(() => executionPlanSchema.parse(multiStepPlan)).not.toThrow();
    });
    
    it('should reject invalid execution plan', () => {
      const invalidPlan = {
        plan: [
          {
            step: 1,
            tool: 'invalid_tool', // Invalid tool name
            args: {},
            description: 'Invalid operation'
          }
        ],
        reasoning: 'This should fail'
      };
      
      expect(() => executionPlanSchema.parse(invalidPlan)).toThrow();
    });
    
  });
  
});