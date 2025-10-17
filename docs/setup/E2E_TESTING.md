# CollabCanvas E2E Testing Guide

## Overview

This project uses **Playwright** for end-to-end testing. Tests cover:
- ✅ Shape operations (create, move, delete, properties)
- ✅ Undo/Redo functionality (including disconnect cleanup bug fix)
- ✅ Multi-user collaboration (real-time sync, locking, cursor tracking)
- ✅ AI Assistant integration
- ✅ Persistence and state management

## Setup

### Prerequisites
- Node.js 18+ installed
- npm or yarn
- Firebase project with Firestore and Realtime Database configured

### Installation

Playwright and dependencies are already installed. If you need to reinstall:

```bash
npm install -D @playwright/test
npx playwright install
```

## Running Tests

### Run All Tests
```bash
npx playwright test
```

### Run Specific Test File
```bash
npx playwright test tests/e2e/shape-operations.spec.js
npx playwright test tests/e2e/undo-redo.spec.js
npx playwright test tests/e2e/multi-user.spec.js
npx playwright test tests/e2e/ai-assistant.spec.js
```

### Run Tests in UI Mode (Interactive)
```bash
npx playwright test --ui
```

### Run Tests in Debug Mode
```bash
npx playwright test --debug
```

### Run Tests in Headed Mode (See Browser)
```bash
npx playwright test --headed
```

### Run Specific Test by Name
```bash
npx playwright test -g "should undo shape creation"
```

## Test Structure

```
tests/
├── e2e/                          # E2E test files
│   ├── shape-operations.spec.js  # Shape CRUD operations
│   ├── undo-redo.spec.js         # Undo/redo + disconnect cleanup
│   ├── multi-user.spec.js        # Multi-user collaboration
│   └── ai-assistant.spec.js      # AI assistant integration
└── helpers/                      # Test helper functions
    ├── auth-helpers.js           # Authentication helpers
    ├── canvas-helpers.js         # Canvas interaction helpers
    └── multi-user-helpers.js     # Multi-user test helpers
```

## Key Test Scenarios

### Shape Operations (`shape-operations.spec.js`)
- Create rectangles and circles
- Select and move shapes
- Update properties (fill, opacity, rotation)
- Delete shapes
- Boundary constraints
- Persistence after refresh

### Undo/Redo (`undo-redo.spec.js`)
- Undo/redo shape creation
- Undo/redo shape deletion
- **CRITICAL**: Undo→Redo delete cycle without orphaned handlers
- Multiple undo/redo cycles
- Shape ID preservation across cycles

### Multi-User Collaboration (`multi-user.spec.js`)
- Presence tracking
- Real-time shape sync
- Shape locking when selected
- Preventing simultaneous edits
- **CRITICAL**: Automatic unlock on disconnect
- Cursor synchronization
- Shape movement sync

### AI Assistant (`ai-assistant.spec.js`)
- Open/close AI panel
- Send commands
- Create shapes via AI
- Delete shapes via AI
- Batch operations
- Move shapes via AI
- Error handling

## Important Notes

### Authentication
Currently, tests use **real Firebase authentication**. For production CI/CD, you should:
1. Set up Firebase Auth Emulator
2. Create test users in the emulator
3. Update `auth-helpers.js` to use emulator authentication

### Test Isolation
- Tests clear the canvas before each run
- Some tests may interfere with each other if run in parallel
- Current config runs tests sequentially (`workers: 1`)

### Firebase State
- Tests interact with **real Firebase** (Firestore + RTDB)
- Shapes are created and deleted during tests
- For CI/CD, set up Firebase emulators

### Test Helpers
The app exposes these functions via `window` object for testing:
- `window.__playwright_getShapeCount()` - Get number of shapes
- `window.__playwright_getShapes()` - Get all shapes
- `window.__playwright_clearAllShapes()` - Clear canvas
- `window.__playwright_createTestShape(data)` - Create shape programmatically

## Viewing Test Results

### HTML Report
After running tests:
```bash
npx playwright show-report
```

### Screenshots and Videos
Failed tests automatically capture:
- Screenshots: `test-results/**/*-retry1.png`
- Videos: `test-results/**/*.webm`
- Traces: `test-results/**/*.zip` (view with `npx playwright show-trace`)

## CI/CD Integration

### GitHub Actions Example
```yaml
name: E2E Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npx playwright test
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
```

## Debugging Tips

### 1. Use UI Mode
```bash
npx playwright test --ui
```
Best way to debug tests interactively.

### 2. Add Console Logs
```javascript
await page.evaluate(() => console.log('Debug info:', window.__playwright_getShapes()));
```

### 3. Pause Execution
```javascript
await page.pause();
```

### 4. Slow Down Tests
```javascript
test.use({ slowMo: 1000 }); // 1 second delay between actions
```

### 5. Check Network
```javascript
page.on('request', request => console.log('>>', request.method(), request.url()));
page.on('response', response => console.log('<<', response.status(), response.url()));
```

## Known Issues

### 1. Google OAuth in CI/CD
Real Google sign-in doesn't work in headless CI environments. Solution:
- Use Firebase Auth Emulator for tests
- Or skip auth tests in CI and run them manually

### 2. Timing Issues
Firebase operations can be slow. If tests fail intermittently:
- Increase timeouts in `playwright.config.js`
- Add more `waitForTimeout()` calls in tests
- Use `waitForFunction()` for Firebase sync

### 3. Multi-User Tests
Multi-user tests create multiple browser contexts, which can be resource-intensive:
- Run on machines with adequate RAM
- Reduce number of simultaneous users if needed

## Test Coverage

Current coverage:
- ✅ Shape CRUD operations
- ✅ Undo/Redo with disconnect cleanup fix
- ✅ Multi-user collaboration
- ✅ AI Assistant basic operations
- ⏳ Authentication flows (requires emulator setup)
- ⏳ Keyboard shortcuts (partially covered)
- ⏳ Properties panel edge cases
- ⏳ Canvas zoom/pan operations

## Contributing

When adding new features:
1. Add corresponding e2e tests
2. Add `data-testid` attributes to new UI elements
3. Update test helpers if needed
4. Document any new test patterns

## Resources

- [Playwright Documentation](https://playwright.dev/docs/intro)
- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Firebase Emulators](https://firebase.google.com/docs/emulator-suite)

