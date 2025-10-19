/**
 * Test Utilities and Mock Generators
 * 
 * Provides helper functions for generating test data,
 * validating schemas, and creating mock AI responses.
 */

import { 
  toolArgsSchema, 
  batchOperationSchema, 
  executionPlanSchema 
} from '../../../src/services/ai/planning/schemas.js';

/**
 * Generate a valid tool arguments object for testing
 */
export function generateValidToolArgs(toolName, overrides = {}) {
  const baseArgs = {
    tool: toolName,
    ...overrides
  };
  
  // Add tool-specific required fields
  switch (toolName) {
    case 'use_login_template':
      return {
        ...baseArgs,
        primaryColor: '#8B5CF6',
        size: 'normal',
        style: 'modern',
        ...overrides
      };
      
    case 'use_navbar_template':
      return {
        ...baseArgs,
        primaryColor: '#3B82F6',
        size: 'normal',
        style: 'modern',
        ...overrides
      };
      
    case 'use_card_template':
      return {
        ...baseArgs,
        primaryColor: '#10B981',
        size: 'normal',
        style: 'modern',
        ...overrides
      };
      
    case 'batch_operations':
      return {
        ...baseArgs,
        operations: [
          {
            type: 'create',
            shape: {
              type: 'rectangle',
              x: 100,
              y: 100,
              width: 200,
              height: 150,
              fill: '#FF0000'
            }
          }
        ],
        ...overrides
      };
      
    case 'batch_update_shapes':
      return {
        ...baseArgs,
        shapeIds: ['shape_1', 'shape_2'],
        deltaX: 100,
        ...overrides
      };
      
    case 'create_grid':
      return {
        ...baseArgs,
        rows: 3,
        cols: 3,
        ...overrides
      };
      
    case 'create_row':
      return {
        ...baseArgs,
        count: 5,
        ...overrides
      };
      
    case 'create_circle_row':
      return {
        ...baseArgs,
        count: 5,
        ...overrides
      };
      
    case 'clear_canvas':
      return {
        ...baseArgs,
        ...overrides
      };
      
    case 'add_random_shapes':
      return {
        ...baseArgs,
        count: 10,
        ...overrides
      };
      
    default:
      return baseArgs;
  }
}

/**
 * Generate a valid batch operation for testing
 */
export function generateValidBatchOperation(type, overrides = {}) {
  const baseOperation = {
    type,
    ...overrides
  };
  
  switch (type) {
    case 'create':
      return {
        ...baseOperation,
        shape: {
          type: 'rectangle',
          x: 100,
          y: 100,
          width: 200,
          height: 150,
          fill: '#FF0000',
          ...overrides.shape
        }
      };
      
    case 'update':
      return {
        ...baseOperation,
        shapeId: 'shape_123',
        updates: {
          fill: '#00FF00',
          ...overrides.updates
        }
      };
      
    case 'delete':
      return {
        ...baseOperation,
        shapeId: 'shape_123',
        ...overrides
      };
      
    default:
      return baseOperation;
  }
}

/**
 * Generate a valid execution plan for testing
 */
export function generateValidExecutionPlan(steps = 1, overrides = {}) {
  const plan = [];
  
  for (let i = 1; i <= steps; i++) {
    plan.push({
      step: i,
      tool: 'clear_canvas',
      args: { tool: 'clear_canvas' },
      description: `Step ${i} description`,
      ...overrides[`step${i}`]
    });
  }
  
  return {
    plan,
    reasoning: 'Generated test execution plan',
    ...overrides
  };
}

/**
 * Generate mock AI response data
 */
export function generateMockAIResponse(scenario = 'basic') {
  const scenarios = {
    basic: {
      tool: 'clear_canvas',
      args: { tool: 'clear_canvas' }
    },
    
    partialUpdate: {
      tool: 'batch_update_shapes',
      shapeIds: ['shape_1'],
      updates: { fill: '#FF0000' }
    },
    
    multiStep: {
      plan: [
        {
          step: 1,
          tool: 'create_grid',
          args: { tool: 'create_grid', rows: 3, cols: 3 },
          description: 'Create a 3x3 grid'
        },
        {
          step: 2,
          tool: 'batch_update_shapes',
          args: { 
            tool: 'batch_update_shapes', 
            shapeIds: ['shape_1', 'shape_2'],
            updates: { fill: '#00FF00' }
          },
          description: 'Make shapes green'
        }
      ],
      reasoning: 'Created grid and colored shapes'
    },
    
    templateUsage: {
      tool: 'use_login_template',
      primaryColor: '#8B5CF6',
      size: 'normal',
      style: 'modern'
    },
    
    batchOperations: {
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
            fill: '#FF0000'
          }
        },
        {
          type: 'update',
          shapeId: 'shape_123',
          updates: { fill: '#00FF00' }
        }
      ]
    }
  };
  
  return scenarios[scenario] || scenarios.basic;
}

/**
 * Generate invalid data for error testing
 */
export function generateInvalidData(type = 'missingRequired') {
  const invalidData = {
    missingRequired: {
      tool: 'create_grid'
      // Missing required fields
    },
    
    wrongType: {
      tool: 'create_grid',
      rows: 'not_a_number',
      cols: 3
    },
    
    invalidEnum: {
      tool: 'use_login_template',
      size: 'invalid_size'
    },
    
    invalidTool: {
      tool: 'unknown_tool',
      someArg: 'value'
    },
    
    malformedShape: {
      tool: 'batch_operations',
      operations: [
        {
          type: 'create',
          shape: {
            type: 'rectangle'
            // Missing required fields
          }
        }
      ]
    },
    
    invalidColor: {
      tool: 'use_login_template',
      primaryColor: 'not_a_color'
    }
  };
  
  return invalidData[type] || invalidData.missingRequired;
}

/**
 * Validate schema and return detailed error information
 */
export function validateWithDetails(schema, data) {
  try {
    const result = schema.parse(data);
    return {
      success: true,
      data: result,
      errors: []
    };
  } catch (error) {
    return {
      success: false,
      data: null,
      errors: error.errors || [error.message]
    };
  }
}

/**
 * Test schema validation with multiple data sets
 */
export function testSchemaValidation(schema, testCases) {
  const results = [];
  
  for (const testCase of testCases) {
    const result = validateWithDetails(schema, testCase.data);
    results.push({
      name: testCase.name,
      expectedValid: testCase.expectedValid,
      actualValid: result.success,
      passed: testCase.expectedValid === result.success,
      errors: result.errors
    });
  }
  
  return results;
}

/**
 * Generate comprehensive test data for all tools
 */
export function generateAllToolTestData() {
  const tools = [
    'use_login_template',
    'use_navbar_template', 
    'use_card_template',
    'batch_operations',
    'batch_update_shapes',
    'create_grid',
    'create_row',
    'create_circle_row',
    'clear_canvas',
    'add_random_shapes'
  ];
  
  return tools.map(tool => ({
    tool,
    validData: generateValidToolArgs(tool),
    invalidData: generateInvalidData('wrongType')
  }));
}

/**
 * Create test fixtures for common scenarios
 */
export function createTestFixtures() {
  return {
    // Valid scenarios
    validToolArgs: generateValidToolArgs('use_login_template'),
    validBatchOperation: generateValidBatchOperation('create'),
    validExecutionPlan: generateValidExecutionPlan(2),
    
    // Partial update scenarios
    partialUpdates: {
      colorOnly: generateValidToolArgs('batch_update_shapes', {
        updates: { fill: '#FF0000' }
      }),
      positionOnly: generateValidToolArgs('batch_update_shapes', {
        deltaX: 100
      }),
      sizeOnly: generateValidToolArgs('batch_update_shapes', {
        scaleX: 1.5,
        scaleY: 1.5
      })
    },
    
    // Error scenarios
    errorScenarios: {
      missingRequired: generateInvalidData('missingRequired'),
      wrongType: generateInvalidData('wrongType'),
      invalidEnum: generateInvalidData('invalidEnum'),
      invalidTool: generateInvalidData('invalidTool')
    },
    
    // Edge cases
    edgeCases: {
      emptyArray: generateValidToolArgs('batch_operations', {
        operations: []
      }),
      minValues: generateValidToolArgs('create_grid', {
        rows: 1,
        cols: 1
      }),
      maxValues: generateValidToolArgs('create_grid', {
        rows: 100,
        cols: 100
      })
    }
  };
}

/**
 * Performance testing utilities
 */
export function performanceTest(schema, data, iterations = 1000) {
  const start = performance.now();
  
  for (let i = 0; i < iterations; i++) {
    schema.parse(data);
  }
  
  const end = performance.now();
  return {
    iterations,
    totalTime: end - start,
    averageTime: (end - start) / iterations,
    operationsPerSecond: iterations / ((end - start) / 1000)
  };
}

/**
 * Memory usage testing utilities
 */
export function memoryTest(schema, data) {
  const initialMemory = process.memoryUsage();
  
  // Parse data multiple times to see memory impact
  for (let i = 0; i < 1000; i++) {
    schema.parse(data);
  }
  
  const finalMemory = process.memoryUsage();
  
  return {
    initialMemory,
    finalMemory,
    memoryDelta: {
      rss: finalMemory.rss - initialMemory.rss,
      heapUsed: finalMemory.heapUsed - initialMemory.heapUsed,
      heapTotal: finalMemory.heapTotal - initialMemory.heapTotal
    }
  };
}