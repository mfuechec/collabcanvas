/**
 * Edge Cases and Error Scenario Tests
 * 
 * Tests boundary conditions, invalid inputs, and error handling.
 * Ensures robust validation and proper error messages.
 */

import { describe, it, expect } from 'vitest';
import { 
  toolArgsSchema, 
  batchOperationSchema, 
  executionPlanSchema 
} from '../../../src/services/ai/planning/schemas.js';

describe('Edge Cases and Error Scenarios', () => {
  
  describe('Invalid Tool Names', () => {
    
    it('should reject unknown tool names', () => {
      const invalidTool = {
        tool: 'unknown_tool',
        someArg: 'value'
      };
      
      expect(() => toolArgsSchema.parse(invalidTool)).toThrow();
    });
    
    it('should reject empty tool name', () => {
      const emptyTool = {
        tool: '',
        someArg: 'value'
      };
      
      expect(() => toolArgsSchema.parse(emptyTool)).toThrow();
    });
    
    it('should reject null tool name', () => {
      const nullTool = {
        tool: null,
        someArg: 'value'
      };
      
      expect(() => toolArgsSchema.parse(nullTool)).toThrow();
    });
    
    it('should reject missing tool field', () => {
      const noTool = {
        someArg: 'value'
      };
      
      expect(() => toolArgsSchema.parse(noTool)).toThrow();
    });
    
  });
  
  describe('Invalid Data Types', () => {
    
    it('should reject string where number expected', () => {
      const invalidNumber = {
        tool: 'create_grid',
        rows: 'not_a_number',
        cols: 3
      };
      
      expect(() => toolArgsSchema.parse(invalidNumber)).toThrow();
    });
    
    it('should reject number where string expected', () => {
      const invalidString = {
        tool: 'use_login_template',
        primaryColor: 12345 // Should be string
      };
      
      expect(() => toolArgsSchema.parse(invalidString)).toThrow();
    });
    
    it('should reject object where string expected', () => {
      const invalidString = {
        tool: 'use_login_template',
        primaryColor: { r: 255, g: 0, b: 0 } // Should be string
      };
      
      expect(() => toolArgsSchema.parse(invalidString)).toThrow();
    });
    
    it('should reject array where string expected', () => {
      const invalidString = {
        tool: 'use_login_template',
        primaryColor: ['#FF0000'] // Should be string
      };
      
      expect(() => toolArgsSchema.parse(invalidString)).toThrow();
    });
    
  });
  
  describe('Invalid Enum Values', () => {
    
    it('should reject invalid size enum', () => {
      const invalidSize = {
        tool: 'use_login_template',
        size: 'extra_large' // Invalid enum value
      };
      
      expect(() => toolArgsSchema.parse(invalidSize)).toThrow();
    });
    
    it('should reject invalid style enum', () => {
      const invalidStyle = {
        tool: 'use_login_template',
        style: 'futuristic' // Invalid enum value
      };
      
      expect(() => toolArgsSchema.parse(invalidStyle)).toThrow();
    });
    
    it('should reject invalid shape type enum', () => {
      const invalidShapeType = {
        tool: 'batch_operations',
        operations: [
          {
            type: 'create',
            shape: {
              type: 'hexagon', // Invalid shape type
              x: 100,
              y: 100,
              width: 200,
              height: 150
            }
          }
        ]
      };
      
      expect(() => toolArgsSchema.parse(invalidShapeType)).toThrow();
    });
    
  });
  
  describe('Boundary Value Testing', () => {
    
    it('should handle minimum valid values', () => {
      const minValues = {
        tool: 'create_grid',
        rows: 1,
        cols: 1
      };
      
      expect(() => toolArgsSchema.parse(minValues)).not.toThrow();
    });
    
    it('should handle maximum reasonable values', () => {
      const maxValues = {
        tool: 'create_grid',
        rows: 100,
        cols: 100
      };
      
      expect(() => toolArgsSchema.parse(maxValues)).not.toThrow();
    });
    
    it('should accept zero values (schema allows any number)', () => {
      const zeroRows = {
        tool: 'create_grid',
        rows: 0, // Schema allows any number
        cols: 3
      };
      
      expect(() => toolArgsSchema.parse(zeroRows)).not.toThrow();
    });
    
    it('should accept negative values (schema allows any number)', () => {
      const negativeRows = {
        tool: 'create_grid',
        rows: -1, // Schema allows any number
        cols: 3
      };
      
      expect(() => toolArgsSchema.parse(negativeRows)).not.toThrow();
    });
    
  });
  
  describe('Array Validation', () => {
    
    it('should handle empty arrays', () => {
      const emptyArray = {
        tool: 'batch_operations',
        operations: []
      };
      
      expect(() => toolArgsSchema.parse(emptyArray)).not.toThrow();
    });
    
    it('should reject non-array where array expected', () => {
      const notArray = {
        tool: 'batch_operations',
        operations: 'not_an_array'
      };
      
      expect(() => toolArgsSchema.parse(notArray)).toThrow();
    });
    
    it('should reject null where array expected', () => {
      const nullArray = {
        tool: 'batch_operations',
        operations: null
      };
      
      expect(() => toolArgsSchema.parse(nullArray)).toThrow();
    });
    
  });
  
  describe('Required Field Validation', () => {
    
    it('should reject missing required fields', () => {
      const missingRequired = {
        tool: 'create_grid'
        // Missing required 'rows' and 'cols'
      };
      
      expect(() => toolArgsSchema.parse(missingRequired)).toThrow();
    });
    
    it('should reject undefined required fields', () => {
      const undefinedRequired = {
        tool: 'create_grid',
        rows: undefined,
        cols: 3
      };
      
      expect(() => toolArgsSchema.parse(undefinedRequired)).toThrow();
    });
    
  });
  
  describe('Shape Validation Edge Cases', () => {
    
    it('should reject shape with missing required fields', () => {
      const incompleteShape = {
        tool: 'batch_operations',
        operations: [
          {
            type: 'create',
            shape: {
              type: 'rectangle'
              // Missing required x, y, width, height
            }
          }
        ]
      };
      
      expect(() => toolArgsSchema.parse(incompleteShape)).toThrow();
    });
    
    it('should reject shape with invalid coordinates', () => {
      const invalidCoords = {
        tool: 'batch_operations',
        operations: [
          {
            type: 'create',
            shape: {
              type: 'rectangle',
              x: 'not_a_number',
              y: 100,
              width: 200,
              height: 150
            }
          }
        ]
      };
      
      expect(() => toolArgsSchema.parse(invalidCoords)).toThrow();
    });
    
    it('should reject shape with invalid dimensions', () => {
      const invalidDims = {
        tool: 'batch_operations',
        operations: [
          {
            type: 'create',
            shape: {
              type: 'rectangle',
              x: 100,
              y: 100,
              width: -200, // Negative width
              height: 150
            }
          }
        ]
      };
      
      expect(() => toolArgsSchema.parse(invalidDims)).toThrow();
    });
    
  });
  
  describe('Update Operation Edge Cases', () => {
    
    it('should reject update with missing shapeId', () => {
      const noShapeId = {
        tool: 'batch_operations',
        operations: [
          {
            type: 'update',
            updates: {
              fill: '#FF0000'
            }
          }
        ]
      };
      
      expect(() => toolArgsSchema.parse(noShapeId)).toThrow();
    });
    
    it('should accept update with empty shapeId (schema allows empty strings)', () => {
      const emptyShapeId = {
        tool: 'batch_operations',
        operations: [
          {
            type: 'update',
            shapeId: '', // Schema allows empty strings
            updates: {
              fill: '#FF0000'
            }
          }
        ]
      };
      
      expect(() => toolArgsSchema.parse(emptyShapeId)).not.toThrow();
    });
    
    it('should reject update with null shapeId', () => {
      const nullShapeId = {
        tool: 'batch_operations',
        operations: [
          {
            type: 'update',
            shapeId: null,
            updates: {
              fill: '#FF0000'
            }
          }
        ]
      };
      
      expect(() => toolArgsSchema.parse(nullShapeId)).toThrow();
    });
    
  });
  
  describe('Execution Plan Edge Cases', () => {
    
    it('should reject execution plan with invalid step numbers', () => {
      const invalidSteps = {
        plan: [
          {
            step: 'not_a_number',
            tool: 'clear_canvas',
            args: { tool: 'clear_canvas' },
            description: 'Clear canvas'
          }
        ],
        reasoning: 'This should fail'
      };
      
      expect(() => executionPlanSchema.parse(invalidSteps)).toThrow();
    });
    
    it('should reject execution plan with missing required fields', () => {
      const incompletePlan = {
        plan: [
          {
            step: 1,
            tool: 'clear_canvas'
            // Missing required 'args' and 'description'
          }
        ],
        reasoning: 'This should fail'
      };
      
      expect(() => executionPlanSchema.parse(incompletePlan)).toThrow();
    });
    
    it('should reject execution plan with non-array plan', () => {
      const notArrayPlan = {
        plan: 'not_an_array',
        reasoning: 'This should fail'
      };
      
      expect(() => executionPlanSchema.parse(notArrayPlan)).toThrow();
    });
    
    it('should handle empty execution plan', () => {
      const emptyPlan = {
        plan: [],
        reasoning: 'No operations needed'
      };
      
      expect(() => executionPlanSchema.parse(emptyPlan)).not.toThrow();
    });
    
  });
  
  describe('Color Validation Edge Cases', () => {
    
    it('should accept any string as color (schema allows any string)', () => {
      const invalidHex = {
        tool: 'use_login_template',
        primaryColor: 'not_a_color'
      };
      
      expect(() => toolArgsSchema.parse(invalidHex)).not.toThrow();
    });
    
    it('should accept malformed hex colors (schema allows any string)', () => {
      const malformedHex = {
        tool: 'use_login_template',
        primaryColor: '#GGGGGG' // Schema allows any string
      };
      
      expect(() => toolArgsSchema.parse(malformedHex)).not.toThrow();
    });
    
    it('should accept short hex colors (schema allows any string)', () => {
      const shortHex = {
        tool: 'use_login_template',
        primaryColor: '#FF' // Schema allows any string
      };
      
      expect(() => toolArgsSchema.parse(shortHex)).not.toThrow();
    });
    
    it('should accept valid hex colors', () => {
      const validHex = {
        tool: 'use_login_template',
        primaryColor: '#FF0000'
      };
      
      expect(() => toolArgsSchema.parse(validHex)).not.toThrow();
    });
    
  });
  
  describe('Nested Object Validation', () => {
    
    it('should reject deeply nested invalid objects', () => {
      const deeplyNested = {
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
              metadata: {
                invalid: {
                  deeply: {
                    nested: 'invalid_value'
                  }
                }
              }
            }
          }
        ]
      };
      
      // This should either be rejected or the extra fields ignored
      // depending on schema configuration
      expect(() => toolArgsSchema.parse(deeplyNested)).toThrow();
    });
    
  });
  
  describe('Error Message Quality', () => {
    
    it('should provide helpful error messages for missing fields', () => {
      const missingField = {
        tool: 'create_grid'
        // Missing required fields
      };
      
      expect(() => toolArgsSchema.parse(missingField)).toThrow(/required/i);
    });
    
    it('should provide helpful error messages for invalid types', () => {
      const invalidType = {
        tool: 'create_grid',
        rows: 'not_a_number',
        cols: 3
      };
      
      expect(() => toolArgsSchema.parse(invalidType)).toThrow(/number/i);
    });
    
    it('should provide helpful error messages for invalid enums', () => {
      const invalidEnum = {
        tool: 'use_login_template',
        size: 'invalid_size'
      };
      
      expect(() => toolArgsSchema.parse(invalidEnum)).toThrow(/invalid/i);
    });
    
  });
  
});