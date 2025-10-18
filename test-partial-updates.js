#!/usr/bin/env node

/**
 * Test Partial Update Schema Support
 * 
 * This script tests that the AI tool schemas properly support partial updates
 * and don't fail with "Failed to parse AI response" errors.
 */

import { executionPlanSchema, batchOperationSchema, batchUpdatesSchema } from './src/services/ai/planning/schemas.js';

console.log('🧪 Testing Partial Update Schema Support...\n');

// Test cases that should work with partial updates
const testCases = [
  {
    name: 'Partial Color Update',
    data: {
      plan: [{
        step: 1,
        tool: 'batch_update_shapes',
        args: {
          tool: 'batch_update_shapes',
          shapeIds: ['shape1'],
          updates: { fill: '#FF0000' } // Only color, missing other fields
        },
        description: 'Change color to red'
      }],
      reasoning: 'Changed the shape color to red'
    }
  },
  {
    name: 'Partial Position Update',
    data: {
      plan: [{
        step: 1,
        tool: 'batch_update_shapes',
        args: {
          tool: 'batch_update_shapes',
          shapeIds: ['shape1'],
          deltaX: 100 // Only X movement, missing other fields
        },
        description: 'Move shape right'
      }],
      reasoning: 'Moved the shape 100 pixels to the right'
    }
  },
  {
    name: 'Partial Size Update',
    data: {
      plan: [{
        step: 1,
        tool: 'batch_update_shapes',
        args: {
          tool: 'batch_update_shapes',
          shapeIds: ['shape1'],
          scaleX: 2 // Only X scaling, missing other fields
        },
        description: 'Make shape wider'
      }],
      reasoning: 'Made the shape twice as wide'
    }
  },
  {
    name: 'Empty Updates Object',
    data: {
      plan: [{
        step: 1,
        tool: 'batch_update_shapes',
        args: {
          tool: 'batch_update_shapes',
          shapeIds: ['shape1'],
          updates: {} // Empty updates object
        },
        description: 'No property updates'
      }],
      reasoning: 'No property updates applied'
    }
  },
  {
    name: 'Null Updates',
    data: {
      plan: [{
        step: 1,
        tool: 'batch_update_shapes',
        args: {
          tool: 'batch_update_shapes',
          shapeIds: ['shape1'],
          updates: null // Null updates
        },
        description: 'No property updates'
      }],
      reasoning: 'No property updates applied'
    }
  },
  {
    name: 'Undefined Updates',
    data: {
      plan: [{
        step: 1,
        tool: 'batch_update_shapes',
        args: {
          tool: 'batch_update_shapes',
          shapeIds: ['shape1']
          // Missing updates field entirely
        },
        description: 'No property updates'
      }],
      reasoning: 'No property updates applied'
    }
  }
];

let passedTests = 0;
let totalTests = testCases.length;

console.log(`Running ${totalTests} test cases...\n`);

for (const testCase of testCases) {
  try {
    console.log(`🧪 Testing: ${testCase.name}`);
    
    // Test the execution plan schema
    const result = executionPlanSchema.parse(testCase.data);
    
    console.log(`✅ PASSED: ${testCase.name}`);
    console.log(`   └─ Parsed successfully with ${result.plan.length} step(s)`);
    
    passedTests++;
  } catch (error) {
    console.log(`❌ FAILED: ${testCase.name}`);
    console.log(`   └─ Error: ${error.message}`);
    console.log(`   └─ Data: ${JSON.stringify(testCase.data, null, 2)}`);
  }
  
  console.log('');
}

// Test individual schemas
console.log('🔍 Testing Individual Schemas...\n');

// Test batchUpdatesSchema
try {
  const partialUpdates = { fill: '#FF0000' };
  const result = batchUpdatesSchema.parse(partialUpdates);
  console.log('✅ batchUpdatesSchema: Partial updates work');
} catch (error) {
  console.log(`❌ batchUpdatesSchema: ${error.message}`);
}

// Test batchOperationSchema with partial updates
try {
  const partialUpdateOp = {
    type: 'update',
    shapeId: 'shape1',
    updates: { fill: '#FF0000' }
  };
  const result = batchOperationSchema.parse(partialUpdateOp);
  console.log('✅ batchOperationSchema: Partial update operations work');
} catch (error) {
  console.log(`❌ batchOperationSchema: ${error.message}`);
}

console.log('\n📊 Test Results:');
console.log(`✅ Passed: ${passedTests}/${totalTests} (${Math.round((passedTests/totalTests)*100)}%)`);

if (passedTests === totalTests) {
  console.log('🎉 All tests passed! Partial update support is working correctly.');
} else {
  console.log('⚠️  Some tests failed. Schema validation needs further fixes.');
}

console.log('\n💡 This should resolve "Failed to parse AI response" errors for partial updates like:');
console.log('   - "make it purple" (only changes color)');
console.log('   - "move it right" (only changes position)');
console.log('   - "make it bigger" (only changes size)');