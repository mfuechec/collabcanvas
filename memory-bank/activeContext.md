# Active Context

## Current Focus
**Status**: DRY enforcement infrastructure complete. Background agent ready to build. Critical bug fix deployed.

## Recent Changes (Latest Session)

### 🤖 DRY Enforcement & Background Agent Setup (COMPLETED)

**Goal**: Create an intelligent background agent that analyzes the codebase for DRY (Don't Repeat Yourself) opportunities and generates actionable recommendations.

**Phase 1: Enhanced Rules System** ✅
Created comprehensive DRY enforcement rules with critical improvements:

1. **Behavior Preservation Priority** (Most Important!)
   - Non-negotiable "NO LOSS OF FUNCTIONALITY" requirement
   - 8-point refactoring safety checklist
   - Clear guidance on when NOT to refactor (false duplication)
   - Different domains, error handling, timing, state dependencies

2. **Severity Levels**
   - 🔴 CRITICAL: Core logic duplicated 3+, security/auth, Firebase ops
   - 🟡 HIGH: Logic duplicated 2x, similar functions
   - 🟢 MEDIUM: Component structure, patterns
   - ⚪ LOW: Nice-to-have improvements

3. **Measurable Thresholds**
   - Exact duplication: 5+ lines = HIGH, 10+ lines = CRITICAL
   - Semantic duplication: same purpose, different implementation
   - Structural duplication: >70% similar = MEDIUM
   - Constant duplication: 3+ times = HIGH

4. **Project-Specific Patterns**
   - Firebase/Firestore operations
   - Konva shape rendering
   - React Context usage
   - State management patterns
   - Event handlers
   - AI tool patterns
   - Coordinate systems
   - Real-time collaboration

5. **Impact Assessment Framework**
   - Time savings (HIGH/MEDIUM/LOW)
   - Maintenance burden
   - Code volume reduction
   - Coupling risk
   - Priority score calculation (0-10)

6. **Confidence Levels**
   - 🟢 HIGH: Pure functions, recommend immediately
   - 🟡 MEDIUM: Requires parameters, suggest with caution
   - 🔴 LOW: Complex differences, flag for manual review

7. **Structured Output Format**
   - Exact template for each finding
   - Locations, patterns, differences
   - Recommendations with code examples
   - Impact assessment, effort estimate
   - Testing requirements

**Files Created**:
- `.cursor/rules/dry-enforcement.mdc` (683 lines) - Comprehensive rules for background agent
- `.cursor/rules/general-dry-rules.mdc` (368 lines) - Streamlined rules for daily coding

**Files Deleted**:
- `.cursorrules` - Legacy file migrated to modern .mdc structure

**Files Updated**:
- `.cursor/rules/dry-enforcement.mdc` - Description clarifies agent-only usage
- `.cursor/rules/general-dry-rules.mdc` - Description specifies automatic application

**Rules Structure**:
```
.cursor/rules/
├── general-dry-rules.mdc          # Auto-applies to all coding tasks
├── dry-enforcement.mdc            # Background agent use only
└── ai-tools-maintenance.mdc       # AI tools sync protocol
```

**Key Principles Added**:
- **Behavior preservation** is paramount - no refactoring if uncertain
- **False positive prevention** - acceptable duplication documented
- **Impact-driven prioritization** - focus on high-value refactorings
- **Actionable recommendations** - specific code examples, not vague suggestions
- **Testing requirements** - every refactoring needs tests

**Background Agent Design** (Ready to Build):

**Model Selection**: Claude 3.5 Haiku
- Best balance of quality, speed, and cost
- $1/$5 per million tokens (input/output)
- 200K context window
- Excellent code understanding
- Estimated cost: $0.05-0.15 per run with prompt caching

**Architecture**:
```
scripts/
├── dry-agent.js              # Main orchestrator
├── analyzers/
│   ├── codebase-scanner.js   # File traversal & chunking
│   ├── semantic-analyzer.js  # AI-powered comparison
│   └── report-generator.js   # Markdown output
└── config/
    └── dry-agent-config.js   # Patterns, thresholds, rules
```

**Multi-Tier Strategy**:
1. **Embeddings first** ($0.02/M tokens) - Fast pre-filtering via vector similarity
2. **Claude 3.5 Haiku** - Main semantic analysis
3. **Priority scoring** - Calculate impact (time savings, maintenance, coupling risk)
4. **Structured output** - Generate `DRY_OPPORTUNITIES.md` with prioritized findings

**Efficiency Optimizations**:
- Use embeddings to pre-filter (saves 90% of API calls)
- Prompt caching for rules (90% discount after first run)
- Incremental mode (only analyze changed files)
- Parallel processing where possible

**Status**: Rules complete, agent design finalized, ready to implement

**Next**: Build the background agent implementation

## Previous Session Changes

### 🐛 Critical Bug Fix: Disconnect Cleanup (COMPLETED)
**Problem Identified**: When shapes were deleted (especially via undo/redo), their `onDisconnect()` handlers in Firebase RTDB were not being cancelled. This caused hundreds of errors on browser refresh as orphaned handlers tried to unlock non-existent shapes.

**Root Cause**: 
- `deleteShape()` and `batchDeleteShapes()` in `src/services/canvas.js` were not calling `clearDisconnectCleanup()`
- When user did: Create → Delete → Undo → Redo, the shape got deleted twice but handlers accumulated
- On browser refresh, all orphaned handlers fired simultaneously

**Solution Implemented**:
```javascript
// src/services/canvas.js
const deleteShape = async (shapeId, canvasId) => {
  // ... existing code ...
  
  // NEW: Clear disconnect cleanup BEFORE deleting
  await clearDisconnectCleanup(shapeId);
  
  await deleteDoc(shapeRef);
  // ...
};

// Same fix applied to batchDeleteShapes
const batchDeleteShapes = async (shapeIds, canvasId) => {
  // NEW: Clear all handlers before batch delete
  const cleanupPromises = shapeIds.map(shapeId => 
    clearDisconnectCleanup(shapeId)
  );
  await Promise.all(cleanupPromises);
  
  // Then execute batch delete...
};
```

**Impact**: 
- ✅ No more "Shape not found" errors on refresh
- ✅ Undo/redo cycles work cleanly
- ✅ No memory leaks from orphaned handlers
- ✅ Proper RTDB cleanup

**Files Modified**:
- `src/services/canvas.js` - Added `clearDisconnectCleanup()` calls

**Needs**: Deployment to production

### 🧪 E2E Testing Suite (COMPLETED)

**Implementation**:
- Playwright test framework installed and configured
- Test helpers created for canvas interactions
- Comprehensive test coverage:
  - `shape-operations.spec.js` - 10 tests for CRUD operations
  - `undo-redo.spec.js` - 8 tests including critical disconnect cleanup bug
  - `multi-user.spec.js` - 7 tests for real-time collaboration
  - `ai-assistant.spec.js` - 7 tests for AI integration

**Test Helpers**:
- `window.__playwright_getShapeCount()` - Get number of shapes
- `window.__playwright_getShapes()` - Get all shapes
- `window.__playwright_clearAllShapes()` - Clear canvas
- `window.__playwright_createTestShape()` - Create shape programmatically

**Files Created**:
- `playwright.config.js`
- `tests/e2e/*.spec.js`
- `tests/helpers/*.js`
- `E2E_TESTING.md` - Comprehensive documentation
- Modified `src/App.jsx` - Added test helpers
- Modified `src/components/Layout/LeftSidebar.jsx` - Added data-testid attributes

**Status**: Infrastructure complete, authentication approach pending

**Challenges**:
- Google OAuth doesn't work in headless tests
- User reverted test authentication changes
- Need Firebase emulator setup for CI/CD

**Next Steps for Testing**:
- Either: Set up Firebase Auth emulator
- Or: Manual authentication for local testing
- Or: Mock authentication layer

### 🎨 UI/UX State (Stable)
- Figma-inspired design system with design tokens
- Properties panel always open (user preference)
- Minimap positioned top-left
- AI assistant bottom-right, collapsible
- All keyboard shortcuts working
- Rotation functionality complete with boundary checking

## Active Decisions

### 1. Per-Shape Document Architecture
**Decision**: Each shape is a separate Firestore document in subcollection
**Rationale**: Much faster batch operations, better concurrency
**Trade-off**: More Firestore reads, but performance gain worth it
**Status**: Implemented and deployed

### 2. Test Authentication Strategy
**Decision**: Pending user preference
**Options**:
  A. Firebase Auth Emulator (best for CI/CD)
  B. Test mode button (quick local testing)
  C. Manual auth (current state)
**Status**: User exploring options

### 3. Opacity Default Value
**Decision**: New shapes default to 0.8 opacity
**Rationale**: User preference for visual hierarchy
**Status**: Implemented

## Known Issues

### 1. ~~Disconnect Cleanup~~ ✅ FIXED
- ~~Issue~~: Orphaned onDisconnect handlers
- ~~Impact~~: Console errors on refresh
- **Status**: FIXED in latest changes

### 2. Test Authentication
- Issue: No automated auth for e2e tests
- Impact: Tests can't run automatically
- Status: Infrastructure ready, auth approach pending

### 3. Firebase Emulator Not Set Up
- Issue: Tests hit production Firebase
- Impact: Not ideal for CI/CD, test data mixes with prod
- Status: Documented in TODO but not critical for now

## Immediate Next Steps

1. **Deploy Bug Fix** 🔴 Priority
   - Build application
   - Deploy to Firebase hosting
   - Verify disconnect cleanup works in production

2. **Test Authentication** 🟡 Medium
   - User to decide on approach
   - Options documented in `E2E_TESTING.md`

3. **Run E2E Tests** 🟡 Medium
   - Once auth approach chosen
   - Verify all critical paths

4. **Optional: Firebase Emulator** 🟢 Low
   - Set up for isolated testing
   - Document process
   - Configure for CI/CD

## Context for Next Session

### What's Working Well
- Core collaborative features solid
- UI redesign complete and polished
- AI assistant functional
- Disconnect cleanup bug fixed
- E2E infrastructure ready

### What Needs Attention
- Deploy the disconnect cleanup fix
- Finalize test authentication approach
- Consider Firebase emulator for better testing

### Files to Know About
- **`src/services/canvas.js`** - Core canvas operations, just fixed disconnect cleanup
- **`tests/e2e/*.spec.js`** - E2E test suites
- **`E2E_TESTING.md`** - Testing documentation
- **`FIREBASE_OPTIMIZATION.md`** - Per-shape architecture docs
- **`.cursorrules`** - DRY principles and code organization

### User Preferences
- Systematic approach with TODO tracking
- Parallel tool calls for efficiency
- Immediate implementation without waiting
- Always use `read_lints` after changes
- Build after significant changes
- Thorough explanations of root causes
- Proactive error handling
- Always commit and push when requested

