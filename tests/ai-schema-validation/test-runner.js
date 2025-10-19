#!/usr/bin/env node

/**
 * AI Schema Validation Test Runner
 * 
 * Runs all schema validation tests and provides comprehensive reporting.
 * This script can be used for CI/CD and local development.
 */

import { run } from 'vitest';
import { performance } from 'perf_hooks';

const TEST_DIR = './tests/ai-schema-validation';

async function runSchemaValidationTests() {
  console.log('🧪 Running AI Schema Validation Tests...\n');
  
  const startTime = performance.now();
  
  try {
    // Run all tests in the ai-schema-validation directory
    const result = await run({
      include: [`${TEST_DIR}/**/*.test.js`],
      reporter: 'verbose',
      coverage: {
        enabled: true,
        reporter: ['text', 'json', 'html'],
        include: ['src/services/ai/planning/schemas.js']
      }
    });
    
    const endTime = performance.now();
    const duration = endTime - startTime;
    
    console.log(`\n⏱️  Test execution completed in ${duration.toFixed(2)}ms`);
    
    if (result.success) {
      console.log('✅ All tests passed!');
      process.exit(0);
    } else {
      console.log('❌ Some tests failed!');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('💥 Test runner error:', error);
    process.exit(1);
  }
}

// Run tests if this script is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runSchemaValidationTests();
}

export { runSchemaValidationTests };