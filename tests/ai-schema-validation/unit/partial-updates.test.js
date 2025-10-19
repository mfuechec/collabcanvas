/**
 * Partial Update Scenario Tests
 * 
 * Tests common user commands that result in partial updates.
 * Ensures schemas properly handle "change only color", "move without rotating", etc.
 */

import { describe, it, expect } from 'vitest';
import { 
  toolArgsSchema, 
  batchOperationSchema, 
  executionPlanSchema 
} from '../../../src/services/ai/planning/schemas.js';

describe('Partial Update Scenarios', () => {
  
  describe('Color Change Commands', () => {
    
    it('should handle "make it purple" - only fill field', () => {
      const purpleUpdate = {
        tool: 'batch_operations',
        operations: [
          {
            type: 'update',
            shapeId: 'shape_123',
            updates: {
              fill: '#800080' // Only color change
            }
          }
        ]
      };
      
      expect(() => toolArgsSchema.parse(purpleUpdate)).not.toThrow();
    });
    
    it('should handle "change color to red" - only fill field', () => {
      const redUpdate = {
        tool: 'batch_operations',
        operations: [
          {
            type: 'update',
            shapeId: 'shape_123',
            updates: {
              fill: '#FF0000' // Only color change
            }
          }
        ]
      };
      
      expect(() => toolArgsSchema.parse(redUpdate)).not.toThrow();
    });
    
    it('should handle "make it blue" - only fill field', () => {
      const blueUpdate = {
        tool: 'batch_operations',
        operations: [
          {
            type: 'update',
            shapeId: 'shape_123',
            updates: {
              fill: '#0000FF' // Only color change
            }
          }
        ]
      };
      
      expect(() => toolArgsSchema.parse(blueUpdate)).not.toThrow();
    });
    
  });
  
  describe('Movement Commands', () => {
    
    it('should handle "move it right" - only deltaX', () => {
      const moveRight = {
        tool: 'batch_update_shapes',
        shapeIds: ['shape_1', 'shape_2'],
        deltaX: 100 // Only X movement
      };
      
      expect(() => toolArgsSchema.parse(moveRight)).not.toThrow();
    });
    
    it('should handle "move it left" - only deltaX', () => {
      const moveLeft = {
        tool: 'batch_update_shapes',
        shapeIds: ['shape_1'],
        deltaX: -100 // Only X movement (negative)
      };
      
      expect(() => toolArgsSchema.parse(moveLeft)).not.toThrow();
    });
    
    it('should handle "move it up" - only deltaY', () => {
      const moveUp = {
        tool: 'batch_update_shapes',
        shapeIds: ['shape_1'],
        deltaY: -50 // Only Y movement (negative)
      };
      
      expect(() => toolArgsSchema.parse(moveUp)).not.toThrow();
    });
    
    it('should handle "move it down" - only deltaY', () => {
      const moveDown = {
        tool: 'batch_update_shapes',
        shapeIds: ['shape_1'],
        deltaY: 50 // Only Y movement
      };
      
      expect(() => toolArgsSchema.parse(moveDown)).not.toThrow();
    });
    
    it('should handle "move to center" - both deltaX and deltaY', () => {
      const moveToCenter = {
        tool: 'batch_update_shapes',
        shapeIds: ['shape_1'],
        deltaX: 100,
        deltaY: -50 // Both X and Y movement
      };
      
      expect(() => toolArgsSchema.parse(moveToCenter)).not.toThrow();
    });
    
  });
  
  describe('Size Change Commands', () => {
    
    it('should handle "make it bigger" - only scaleX and scaleY', () => {
      const makeBigger = {
        tool: 'batch_update_shapes',
        shapeIds: ['shape_1'],
        scaleX: 1.5,
        scaleY: 1.5 // Only scaling
      };
      
      expect(() => toolArgsSchema.parse(makeBigger)).not.toThrow();
    });
    
    it('should handle "make it smaller" - only scaleX and scaleY', () => {
      const makeSmaller = {
        tool: 'batch_update_shapes',
        shapeIds: ['shape_1'],
        scaleX: 0.8,
        scaleY: 0.8 // Only scaling
      };
      
      expect(() => toolArgsSchema.parse(makeSmaller)).not.toThrow();
    });
    
    it('should handle "make it wider" - only scaleX', () => {
      const makeWider = {
        tool: 'batch_update_shapes',
        shapeIds: ['shape_1'],
        scaleX: 2.0 // Only X scaling
      };
      
      expect(() => toolArgsSchema.parse(makeWider)).not.toThrow();
    });
    
    it('should handle "make it taller" - only scaleY', () => {
      const makeTaller = {
        tool: 'batch_update_shapes',
        shapeIds: ['shape_1'],
        scaleY: 1.5 // Only Y scaling
      };
      
      expect(() => toolArgsSchema.parse(makeTaller)).not.toThrow();
    });
    
  });
  
  describe('Text Change Commands', () => {
    
    it('should handle "change the text" - only text field', () => {
      const changeText = {
        tool: 'batch_operations',
        operations: [
          {
            type: 'update',
            shapeId: 'shape_123',
            updates: {
              text: 'New Text' // Only text change
            }
          }
        ]
      };
      
      expect(() => toolArgsSchema.parse(changeText)).not.toThrow();
    });
    
    it('should handle "make text bigger" - only fontSize', () => {
      const biggerText = {
        tool: 'batch_operations',
        operations: [
          {
            type: 'update',
            shapeId: 'shape_123',
            updates: {
              fontSize: 32 // Only fontSize change
            }
          }
        ]
      };
      
      expect(() => toolArgsSchema.parse(biggerText)).not.toThrow();
    });
    
    it('should handle "make text smaller" - only fontSize', () => {
      const smallerText = {
        tool: 'batch_operations',
        operations: [
          {
            type: 'update',
            shapeId: 'shape_123',
            updates: {
              fontSize: 16 // Only fontSize change
            }
          }
        ]
      };
      
      expect(() => toolArgsSchema.parse(smallerText)).not.toThrow();
    });
    
  });
  
  describe('Opacity Commands', () => {
    
    it('should handle "make it transparent" - only opacity', () => {
      const makeTransparent = {
        tool: 'batch_operations',
        operations: [
          {
            type: 'update',
            shapeId: 'shape_123',
            updates: {
              opacity: 0.5 // Only opacity change
            }
          }
        ]
      };
      
      expect(() => toolArgsSchema.parse(makeTransparent)).not.toThrow();
    });
    
    it('should handle "make it opaque" - only opacity', () => {
      const makeOpaque = {
        tool: 'batch_operations',
        operations: [
          {
            type: 'update',
            shapeId: 'shape_123',
            updates: {
              opacity: 1.0 // Only opacity change
            }
          }
        ]
      };
      
      expect(() => toolArgsSchema.parse(makeOpaque)).not.toThrow();
    });
    
  });
  
  describe('Rotation Commands', () => {
    
    it('should handle "rotate it 45 degrees" - only deltaRotation', () => {
      const rotate45 = {
        tool: 'batch_update_shapes',
        shapeIds: ['shape_1'],
        deltaRotation: 45 // Only rotation
      };
      
      expect(() => toolArgsSchema.parse(rotate45)).not.toThrow();
    });
    
    it('should handle "rotate it 90 degrees" - only deltaRotation', () => {
      const rotate90 = {
        tool: 'batch_update_shapes',
        shapeIds: ['shape_1'],
        deltaRotation: 90 // Only rotation
      };
      
      expect(() => toolArgsSchema.parse(rotate90)).not.toThrow();
    });
    
  });
  
  describe('Combined Partial Updates', () => {
    
    it('should handle "make it bigger and blue" - scale + color', () => {
      const biggerAndBlue = {
        tool: 'batch_update_shapes',
        shapeIds: ['shape_1'],
        updates: {
          fill: '#0000FF' // Color change
        },
        scaleX: 1.5,
        scaleY: 1.5 // Size change
      };
      
      expect(() => toolArgsSchema.parse(biggerAndBlue)).not.toThrow();
    });
    
    it('should handle "move it right and make it red" - position + color', () => {
      const moveAndColor = {
        tool: 'batch_update_shapes',
        shapeIds: ['shape_1'],
        updates: {
          fill: '#FF0000' // Color change
        },
        deltaX: 100 // Position change
      };
      
      expect(() => toolArgsSchema.parse(moveAndColor)).not.toThrow();
    });
    
  });
  
  describe('Empty Update Scenarios', () => {
    
    it('should handle empty updates object', () => {
      const emptyUpdates = {
        tool: 'batch_update_shapes',
        shapeIds: ['shape_1'],
        updates: {} // Empty updates
      };
      
      expect(() => toolArgsSchema.parse(emptyUpdates)).not.toThrow();
    });
    
    it('should handle missing updates field', () => {
      const noUpdates = {
        tool: 'batch_update_shapes',
        shapeIds: ['shape_1']
        // No updates field at all
      };
      
      expect(() => toolArgsSchema.parse(noUpdates)).not.toThrow();
    });
    
    it('should handle null updates', () => {
      const nullUpdates = {
        tool: 'batch_update_shapes',
        shapeIds: ['shape_1'],
        updates: null // Null updates
      };
      
      expect(() => toolArgsSchema.parse(nullUpdates)).not.toThrow();
    });
    
  });
  
  describe('Real-World Command Examples', () => {
    
    it('should handle "make it purple" execution plan', () => {
      const executionPlan = {
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
        reasoning: 'I\'ve changed the shape color to purple.'
      };
      
      expect(() => executionPlanSchema.parse(executionPlan)).not.toThrow();
    });
    
    it('should handle "move it right" execution plan', () => {
      const executionPlan = {
        plan: [
          {
            step: 1,
            tool: 'batch_update_shapes',
            args: {
              tool: 'batch_update_shapes',
              shapeIds: ['shape_1'],
              deltaX: 100
            },
            description: 'Move shape to the right'
          }
        ],
        reasoning: 'I\'ve moved the shape 100 pixels to the right.'
      };
      
      expect(() => executionPlanSchema.parse(executionPlan)).not.toThrow();
    });
    
    it('should handle "make it bigger" execution plan', () => {
      const executionPlan = {
        plan: [
          {
            step: 1,
            tool: 'batch_update_shapes',
            args: {
              tool: 'batch_update_shapes',
              shapeIds: ['shape_1'],
              scaleX: 1.5,
              scaleY: 1.5
            },
            description: 'Make shape bigger'
          }
        ],
        reasoning: 'I\'ve made the shape 50% bigger.'
      };
      
      expect(() => executionPlanSchema.parse(executionPlan)).not.toThrow();
    });
    
  });
  
});