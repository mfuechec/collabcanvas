#!/usr/bin/env node

/**
 * Test Real Partial Update Commands
 * 
 * This script simulates real AI responses for partial update commands
 * to ensure they parse correctly and don't cause "Failed to parse AI response" errors.
 */

import { executionPlanSchema } from './src/services/ai/planning/schemas.js';

console.log('🧪 Testing Real Partial Update Commands...\n');

// Simulate AI responses for common partial update commands
const realWorldTests = [
  {
    command: 'make it purple',
    aiResponse: {
      plan: [{
        step: 1,
        tool: 'batch_update_shapes',
        args: {
          tool: 'batch_update_shapes',
          shapeIds: ['shape1'],
          updates: { fill: '#800080' } // Only color change
        },
        description: 'Change color to purple'
      }],
      reasoning: 'I\'ve changed the shape color to purple.'
    }
  },
  {
    command: 'move it right',
    aiResponse: {
      plan: [{
        step: 1,
        tool: 'batch_update_shapes',
        args: {
          tool: 'batch_update_shapes',
          shapeIds: ['shape1'],
          deltaX: 100 // Only X movement
        },
        description: 'Move shape to the right'
      }],
      reasoning: 'I\'ve moved the shape 100 pixels to the right.'
    }
  },
  {
    command: 'make it bigger',
    aiResponse: {
      plan: [{
        step: 1,
        tool: 'batch_update_shapes',
        args: {
          tool: 'batch_update_shapes',
          shapeIds: ['shape1'],
          scaleX: 1.5, // Only scaling
          scaleY: 1.5
        },
        description: 'Make shape bigger'
      }],
      reasoning: 'I\'ve made the shape 50% bigger.'
    }
  },
  {
    command: 'change the text',
    aiResponse: {
      plan: [{
        step: 1,
        tool: 'batch_update_shapes',
        args: {
          tool: 'batch_update_shapes',
          shapeIds: ['shape1'],
          updates: { text: 'New Text' } // Only text change
        },
        description: 'Update text content'
      }],
      reasoning: 'I\'ve updated the text content.'
    }
  },
  {
    command: 'make it transparent',
    aiResponse: {
      plan: [{
        step: 1,
        tool: 'batch_update_shapes',
        args: {
          tool: 'batch_update_shapes',
          shapeIds: ['shape1'],
          updates: { opacity: 0.5 } // Only opacity change
        },
        description: 'Make shape semi-transparent'
      }],
      reasoning: 'I\'ve made the shape 50% transparent.'
    }
  },
  {
    command: 'rotate it 45 degrees',
    aiResponse: {
      plan: [{
        step: 1,
        tool: 'batch_update_shapes',
        args: {
          tool: 'batch_update_shapes',
          shapeIds: ['shape1'],
          deltaRotation: 45 // Only rotation change
        },
        description: 'Rotate shape 45 degrees'
      }],
      reasoning: 'I\'ve rotated the shape 45 degrees clockwise.'
    }
  }
];

let passedTests = 0;
let totalTests = realWorldTests.length;

console.log(`Testing ${totalTests} real-world partial update scenarios...\n`);

for (const test of realWorldTests) {
  try {
    console.log(`🧪 Testing: "${test.command}"`);
    
    // Parse the AI response
    const result = executionPlanSchema.parse(test.aiResponse);
    
    console.log(`✅ PASSED: "${test.command}"`);
    console.log(`   └─ Tool: ${result.plan[0].tool}`);
    console.log(`   └─ Args: ${JSON.stringify(result.plan[0].args, null, 2)}`);
    
    passedTests++;
  } catch (error) {
    console.log(`❌ FAILED: "${test.command}"`);
    console.log(`   └─ Error: ${error.message}`);
    console.log(`   └─ Response: ${JSON.stringify(test.aiResponse, null, 2)}`);
  }
  
  console.log('');
}

console.log('📊 Real-World Test Results:');
console.log(`✅ Passed: ${passedTests}/${totalTests} (${Math.round((passedTests/totalTests)*100)}%)`);

if (passedTests === totalTests) {
  console.log('🎉 All real-world tests passed!');
  console.log('✅ "Failed to parse AI response" errors should be resolved for partial updates.');
  console.log('✅ Users can now use commands like "make it purple", "move it right", etc.');
} else {
  console.log('⚠️  Some real-world tests failed. Further schema fixes needed.');
}

console.log('\n🔧 Schema Changes Made:');
console.log('   ✅ Added .partial() to batchUpdatesSchema');
console.log('   ✅ Made updates field optional in batch_update_shapes');
console.log('   ✅ Added .nullable().optional() to all optional fields');
console.log('   ✅ Added .partial() to individual tool schemas');
console.log('   ✅ Fixed discriminated union for partial updates');