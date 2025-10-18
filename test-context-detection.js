#!/usr/bin/env node

/**
 * Test Context Detection Fix
 * 
 * This script tests that "make the text bigger" is correctly detected
 * as an UPDATE operation instead of a CREATE operation.
 */

import { buildSmartContext } from './src/services/ai/context/contextBuilder.js';

console.log('🧪 Testing Context Detection Fix...\n');

// Mock canvas shapes
const mockShapes = [
  { id: 'shape_abc123', type: 'text', x: 100, y: 100, fontSize: 24, fill: '#000000' },
  { id: 'shape_def456', type: 'rectangle', x: 200, y: 200, width: 100, height: 50, fill: '#ff0000' }
];

// Test cases that should be UPDATE operations (not CREATE)
const updateTestCases = [
  'make the text bigger',
  'make the rectangle smaller', 
  'make the circle red',
  'make the text transparent',
  'change the text color',
  'update the rectangle size',
  'resize the text',
  'make it bigger',
  'make it red'
];

// Test cases that should be CREATE operations
const createTestCases = [
  'create a text',
  'make a rectangle',
  'add a circle',
  'draw a line',
  'create 5 shapes',
  'make random shapes'
];

console.log('🔍 Testing UPDATE operation detection...\n');

let updatePassed = 0;
let updateTotal = updateTestCases.length;

for (const query of updateTestCases) {
  const context = buildSmartContext(query, mockShapes, false);
  const isUpdate = context.includes('ID:') && context.includes('shape_');
  
  if (isUpdate) {
    console.log(`✅ PASSED: "${query}" → UPDATE operation`);
    console.log(`   └─ Context includes shape IDs: ${context.includes('ID:')}`);
    updatePassed++;
  } else {
    console.log(`❌ FAILED: "${query}" → Not detected as UPDATE`);
    console.log(`   └─ Context: ${context.trim()}`);
  }
  console.log('');
}

console.log('🔍 Testing CREATE operation detection...\n');

let createPassed = 0;
let createTotal = createTestCases.length;

for (const query of createTestCases) {
  const context = buildSmartContext(query, mockShapes, false);
  const isCreate = !context.includes('ID:') && context.includes('existing shape');
  
  if (isCreate) {
    console.log(`✅ PASSED: "${query}" → CREATE operation`);
    console.log(`   └─ Context: ${context.trim()}`);
    createPassed++;
  } else {
    console.log(`❌ FAILED: "${query}" → Not detected as CREATE`);
    console.log(`   └─ Context: ${context.trim()}`);
  }
  console.log('');
}

console.log('📊 Test Results:');
console.log(`✅ UPDATE operations: ${updatePassed}/${updateTotal} (${Math.round((updatePassed/updateTotal)*100)}%)`);
console.log(`✅ CREATE operations: ${createPassed}/${createTotal} (${Math.round((createPassed/createTotal)*100)}%)`);

const totalPassed = updatePassed + createPassed;
const totalTests = updateTotal + createTotal;

console.log(`\n🎯 Overall: ${totalPassed}/${totalTests} (${Math.round((totalPassed/totalTests)*100)}%)`);

if (updatePassed === updateTotal) {
  console.log('🎉 All UPDATE tests passed! "make the text bigger" should now work correctly.');
  console.log('✅ The AI will now receive actual shape IDs instead of hardcoded ones.');
} else {
  console.log('⚠️  Some UPDATE tests failed. Context detection needs further fixes.');
}