// Test script to verify schema validation works for partial updates
import { z } from 'zod';
import { toolArgsSchema, batchOperationSchema } from './src/services/ai/planning/schemas.js';

console.log('Testing schema validation for partial updates...\n');

// Test 1: "Make it purple" - should only require fill field
console.log('Test 1: "Make it purple" - batch_operations with only fill update');
try {
  const purpleUpdate = {
    tool: 'batch_operations',
    operations: [{
      type: 'update',
      shapeId: 'test-shape-123',
      updates: {
        fill: '#800080'  // Only fill field, no other fields required
      }
    }]
  };
  
  const result1 = toolArgsSchema.parse(purpleUpdate);
  console.log('✅ PASS: Purple update validation successful');
  console.log('   Result:', JSON.stringify(result1, null, 2));
} catch (error) {
  console.log('❌ FAIL: Purple update validation failed');
  console.log('   Error:', error.message);
}

console.log('\n' + '='.repeat(50) + '\n');

// Test 2: "Move shapes right" - should only require deltaX
console.log('Test 2: "Move shapes right" - batch_update_shapes with only deltaX');
try {
  const moveRight = {
    tool: 'batch_update_shapes',
    shapeIds: ['shape1', 'shape2'],
    deltaX: 100  // Only deltaX, no other fields required
  };
  
  const result2 = toolArgsSchema.parse(moveRight);
  console.log('✅ PASS: Move right validation successful');
  console.log('   Result:', JSON.stringify(result2, null, 2));
} catch (error) {
  console.log('❌ FAIL: Move right validation failed');
  console.log('   Error:', error.message);
}

console.log('\n' + '='.repeat(50) + '\n');

// Test 3: "Create a grid" - should work with minimal fields
console.log('Test 3: "Create a grid" - create_grid with only required fields');
try {
  const createGrid = {
    tool: 'create_grid',
    rows: 3,
    cols: 3
    // No optional fields provided - should use defaults
  };
  
  const result3 = toolArgsSchema.parse(createGrid);
  console.log('✅ PASS: Create grid validation successful');
  console.log('   Result:', JSON.stringify(result3, null, 2));
} catch (error) {
  console.log('❌ FAIL: Create grid validation failed');
  console.log('   Error:', error.message);
}

console.log('\n' + '='.repeat(50) + '\n');

// Test 4: "Add random shapes" - should work with only count
console.log('Test 4: "Add random shapes" - add_random_shapes with only count');
try {
  const addRandom = {
    tool: 'add_random_shapes',
    count: 5
    // No optional fields provided
  };
  
  const result4 = toolArgsSchema.parse(addRandom);
  console.log('✅ PASS: Add random shapes validation successful');
  console.log('   Result:', JSON.stringify(result4, null, 2));
} catch (error) {
  console.log('❌ FAIL: Add random shapes validation failed');
  console.log('   Error:', error.message);
}

console.log('\n' + '='.repeat(50) + '\n');

// Test 5: "Create login form" - should work with only required fields
console.log('Test 5: "Create login form" - use_login_template with minimal fields');
try {
  const createLogin = {
    tool: 'use_login_template'
    // No optional fields provided - should use defaults
  };
  
  const result5 = toolArgsSchema.parse(createLogin);
  console.log('✅ PASS: Create login form validation successful');
  console.log('   Result:', JSON.stringify(result5, null, 2));
} catch (error) {
  console.log('❌ FAIL: Create login form validation failed');
  console.log('   Error:', error.message);
}

console.log('\n' + '='.repeat(50) + '\n');
console.log('Schema validation test completed!');