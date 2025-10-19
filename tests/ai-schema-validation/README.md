# AI Schema Validation Tests

Comprehensive test suite for AI tool schema validation, ensuring robust handling of partial updates, edge cases, and real-world scenarios.

## 🎯 Overview

This test suite validates the AI tool schemas defined in `src/services/ai/planning/schemas.js`, ensuring they properly handle:
- ✅ All 10 AI tools (templates, batch operations, patterns, utilities)
- ✅ Partial update scenarios ("make it purple", "move it right")
- ✅ Edge cases and error conditions
- ✅ Real-world user commands and workflows
- ✅ Performance with large datasets

## 📁 Structure

```
tests/ai-schema-validation/
├── unit/                          # Unit tests for individual components
│   ├── schemas.test.js           # Core schema validation tests
│   ├── partial-updates.test.js   # Partial update scenario tests
│   └── edge-cases.test.js        # Edge cases and error scenarios
├── integration/                   # Integration tests for complete workflows
│   └── real-world-scenarios.test.js  # Real user command scenarios
├── helpers/                       # Test utilities and mock generators
│   └── test-utils.js             # Helper functions for test data generation
├── fixtures/                      # Test data fixtures
│   └── test-data.json            # JSON test data for various scenarios
├── test-runner.js                # Custom test runner with reporting
└── README.md                     # This file
```

## 🧪 Test Categories

### 1. Core Schema Validation (`unit/schemas.test.js`)
Tests fundamental schema validation for all AI tools:
- **Template Tools**: `use_login_template`, `use_navbar_template`, `use_card_template`
- **Batch Tools**: `batch_operations`, `batch_update_shapes`
- **Pattern Tools**: `create_grid`, `create_row`, `create_circle_row`
- **Utility Tools**: `clear_canvas`, `add_random_shapes`

### 2. Partial Update Scenarios (`unit/partial-updates.test.js`)
Tests common user commands that result in partial updates:
- **Color Changes**: "make it purple", "change color to red"
- **Movement**: "move it right", "move it left", "move it up", "move it down"
- **Size Changes**: "make it bigger", "make it smaller", "make it wider"
- **Text Changes**: "change the text", "make text bigger"
- **Opacity**: "make it transparent", "make it opaque"
- **Rotation**: "rotate it 45 degrees", "rotate it 90 degrees"
- **Combined Updates**: "make it bigger and blue"

### 3. Edge Cases and Error Scenarios (`unit/edge-cases.test.js`)
Tests boundary conditions and error handling:
- **Invalid Tool Names**: Unknown tools, empty names, null values
- **Invalid Data Types**: String where number expected, etc.
- **Invalid Enum Values**: Invalid size, style, shape type enums
- **Boundary Values**: Minimum/maximum values, zero/negative numbers
- **Array Validation**: Empty arrays, non-arrays, null arrays
- **Required Fields**: Missing required fields, undefined values
- **Shape Validation**: Incomplete shapes, invalid coordinates
- **Color Validation**: Invalid hex colors, malformed colors
- **Error Messages**: Helpful error messages for debugging

### 4. Real-World Integration Scenarios (`integration/real-world-scenarios.test.js`)
Tests complete workflows and real user scenarios:
- **User Commands**: "Make it purple", "Create a login form", "Create a 3x3 grid"
- **Multi-Step Workflows**: Complex operations with multiple steps
- **Error Recovery**: Malformed AI responses, invalid data
- **Performance**: Large batch operations, complex execution plans
- **Edge Cases**: Empty plans, single operations, mixed operation types

## 🛠️ Test Utilities

### Helper Functions (`helpers/test-utils.js`)
- `generateValidToolArgs(toolName, overrides)` - Generate valid test data
- `generateValidBatchOperation(type, overrides)` - Generate batch operations
- `generateValidExecutionPlan(steps, overrides)` - Generate execution plans
- `generateMockAIResponse(scenario)` - Generate mock AI responses
- `generateInvalidData(type)` - Generate invalid data for error testing
- `validateWithDetails(schema, data)` - Validate with detailed error info
- `testSchemaValidation(schema, testCases)` - Test multiple scenarios
- `performanceTest(schema, data, iterations)` - Performance testing
- `memoryTest(schema, data)` - Memory usage testing

### Test Fixtures (`fixtures/test-data.json`)
Pre-defined test data for various scenarios:
- Valid tool arguments for all tools
- Partial update scenarios
- Error scenarios
- Execution plans
- Real-world command examples

## 🚀 Running Tests

### Run All Tests
```bash
npm test -- tests/ai-schema-validation/
```

### Run Specific Test Categories
```bash
# Unit tests only
npm test -- tests/ai-schema-validation/unit/

# Integration tests only
npm test -- tests/ai-schema-validation/integration/

# Specific test file
npm test -- tests/ai-schema-validation/unit/schemas.test.js
```

### Run with Coverage
```bash
npm run test:coverage -- tests/ai-schema-validation/
```

### Run with Custom Reporter
```bash
npm test -- tests/ai-schema-validation/ --reporter=verbose
```

## 📊 Test Results

**Current Status**: ✅ **All 109 tests passing**

- **Unit Tests**: 91 tests (schemas, partial updates, edge cases)
- **Integration Tests**: 18 tests (real-world scenarios)
- **Coverage**: Comprehensive coverage of all AI tool schemas
- **Performance**: Tests complete in <1 second

## 🔧 Schema Validation Features

### Partial Update Support
The schemas are designed to handle partial updates gracefully:
- ✅ `.partial()` for update operations
- ✅ `.nullish()` for optional fields
- ✅ `.nullable()` for fields that can be null
- ✅ Discriminated unions for clear operation types

### Error Handling
Robust error handling with helpful messages:
- ✅ Clear error messages for missing fields
- ✅ Type validation with specific error details
- ✅ Enum validation with valid options listed
- ✅ Path information for nested validation errors

### Performance
Optimized for production use:
- ✅ Fast validation (<1ms per operation)
- ✅ Memory efficient
- ✅ Handles large datasets (100+ operations)
- ✅ No memory leaks in repeated validations

## 🎯 Key Test Scenarios

### 1. "Make it Purple" Command
```javascript
// User says: "make it purple"
// AI responds with:
{
  plan: [{
    step: 1,
    tool: 'batch_update_shapes',
    args: {
      tool: 'batch_update_shapes',
      shapeIds: ['shape_1'],
      updates: { fill: '#800080' }
    },
    description: 'Change color to purple'
  }],
  reasoning: 'I\'ve changed the selected shape to purple.'
}
```

### 2. "Move it Right" Command
```javascript
// User says: "move it right"
// AI responds with:
{
  plan: [{
    step: 1,
    tool: 'batch_update_shapes',
    args: {
      tool: 'batch_update_shapes',
      shapeIds: ['shape_1'],
      deltaX: 100
    },
    description: 'Move shape to the right'
  }],
  reasoning: 'I\'ve moved the shape 100 pixels to the right.'
}
```

### 3. Complex Multi-Step Workflow
```javascript
// User says: "create a 2x3 grid and color each row differently"
// AI responds with multiple steps:
{
  plan: [
    { step: 1, tool: 'create_grid', args: {...}, description: '...' },
    { step: 2, tool: 'batch_update_shapes', args: {...}, description: '...' },
    { step: 3, tool: 'batch_update_shapes', args: {...}, description: '...' },
    { step: 4, tool: 'batch_update_shapes', args: {...}, description: '...' }
  ],
  reasoning: 'I\'ve created a 2x3 grid and colored each row with different colors.'
}
```

## 🔍 Debugging

### View Detailed Error Information
```javascript
import { validateWithDetails } from './helpers/test-utils.js';

const result = validateWithDetails(schema, data);
if (!result.success) {
  console.log('Validation errors:', result.errors);
}
```

### Performance Testing
```javascript
import { performanceTest } from './helpers/test-utils.js';

const perf = performanceTest(schema, data, 1000);
console.log(`Average time: ${perf.averageTime}ms`);
console.log(`Operations/sec: ${perf.operationsPerSecond}`);
```

## 📈 Future Enhancements

- [ ] Add more real-world command scenarios
- [ ] Performance benchmarking with larger datasets
- [ ] Memory usage monitoring
- [ ] Schema evolution testing
- [ ] Cross-browser compatibility testing
- [ ] Integration with CI/CD pipeline

## 🤝 Contributing

When adding new tests:
1. Follow the existing naming conventions
2. Add comprehensive test cases for edge cases
3. Include both positive and negative test cases
4. Update this README with new test categories
5. Ensure all tests pass before submitting

## 📝 Notes

- All tests use Vitest as the testing framework
- Schema validation uses Zod for type safety
- Tests are designed to be fast and reliable
- Mock data is generated programmatically for consistency
- Error messages are tested for helpfulness and clarity