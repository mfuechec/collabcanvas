# System Patterns

## Architecture Overview

### Client-Side React Application
```
┌─────────────────────────────────────────────┐
│           React Application (Vite)          │
├─────────────────────────────────────────────┤
│  Components  │  Contexts  │  Hooks          │
│  - UI        │  - Canvas  │  - useCanvas    │
│  - Canvas    │  - Auth    │  - usePresence  │
│  - AI        │  - Theme   │  - useCursors   │
├─────────────────────────────────────────────┤
│              Services Layer                  │
│  - canvas.js (Firestore ops)                │
│  - presence.js (RTDB ops)                   │
│  - cursors.js (RTDB ops)                    │
│  - aiAgent.js (LangChain)                   │
├─────────────────────────────────────────────┤
│            Firebase SDK                      │
│  Firestore  │  RTDB  │  Auth               │
└─────────────────────────────────────────────┘
```

## Key Technical Decisions

### 1. Dual Firebase Strategy

#### Firestore (Persistent State)
**Purpose**: Shape data, canvas metadata
**Structure**: 
```
canvas/
  global-canvas-v1/              # Main canvas document
    shapes/                      # Subcollection (PER-SHAPE!)
      {shapeId}/                 # Individual shape document
        - type, x, y, width, height, fill, etc.
        - isLocked, lockedBy
        - createdAt, createdBy
        - lastModifiedAt, lastModifiedBy
        - rotation, opacity
```

**Why Per-Shape Documents**:
- OLD: All shapes in one array → slow batch operations
- NEW: Each shape = 1 document → parallel reads/writes
- Uses `writeBatch()` for atomic multi-shape operations
- Offline persistence with `enableIndexedDbPersistence()`

#### Realtime Database (Ephemeral State)
**Purpose**: Cursors, presence, drag previews, drawing previews, disconnect cleanup

**Structure**:
```
sessions/
  global-canvas-v1/
    {userId}/
      - displayName, cursorColor
      - cursorX, cursorY
      - isOnline, isActive
      - lastSeen, lastActivity

cursors/
  global-canvas-v1/
    {userId}/
      - x, y (throttled updates)

drag-previews/
  global-canvas-v1/
    {userId}/
      {shapeId}/
        - x, y, width, height, rotation

disconnect-cleanup/
  global-canvas-v1/
    {userId}/
      {shapeId}/
        - action: 'unlock' | 'unlock_and_revert'
        - originalPosition (if drag)
        - timestamp
```

**Why RTDB for These**:
- Sub-100ms latency (vs Firestore's ~1 second)
- `onDisconnect()` for automatic cleanup
- Cheaper for high-frequency updates
- Ephemeral data doesn't need persistence

### 2. Object Locking Strategy

**Pattern**: First-Come-First-Serve with Visual Feedback

**Implementation**:
```javascript
// On select
lockShape(shapeId) {
  1. Query all shapes locked by this user
  2. Use writeBatch() to:
     - Unlock all previous shapes
     - Lock new shape
  3. Set onDisconnect() handler to unlock on browser close
  4. Update Firestore: isLocked=true, lockedBy=userId
}

// On deselect/delete
unlockShape(shapeId) {
  1. Clear onDisconnect() handler (CRITICAL!)
  2. Update Firestore: isLocked=false, lockedBy=null
}
```

**Atomic Auto-Unlock**: One user can only lock ONE shape at a time. Selecting new shape automatically unlocks previous.

**Disconnect Cleanup**: 
- `setupDisconnectCleanup()` when shape is selected/dragged
- `clearDisconnectCleanup()` when shape is deselected/deleted (FIXED!)
- Monitors RTDB for disconnect events
- Processes unlock/revert on detection

### 3. Undo/Redo Stack

**Pattern**: Local stack with Firebase sync

**Stack Structure**:
```javascript
undoStack = [
  { action: 'ADD_SHAPE', shapeId, shapeData },
  { action: 'UPDATE_SHAPE', shapeId, oldData, newData },
  { action: 'DELETE_SHAPE', shapeId, shapeData }
]
```

**Critical Rules**:
1. **Shape ID Preservation**: When undoing delete, recreate with SAME ID
   - `createShape()` checks if `shapeData.id` exists before generating new one
   - Ensures redo operations target correct document

2. **Action Recording**: 
   - Set `isUndoRedoAction` ref before Firebase operations
   - Prevents re-recording during undo/redo execution

3. **Cleanup Integration**:
   - `clearDisconnectCleanup()` called on delete
   - Prevents orphaned handlers across undo/redo cycles

### 4. Coordinate Systems

**Canvas Coordinates**: Top-left origin (0,0), extends to (5000, 5000)

**Shape Coordinates**:
- **Rectangles & Text**: x,y = top-left corner
- **Circles**: x,y = center point (converted for Konva rendering)
- **Lines & Pen**: x,y = 0,0, absolute coordinates in `points` array

**Rotation**: 
- All shapes rotate around their calculated center
- Lines/pen rotate around visual center of bounding box
- Boundary checking uses rotated bounding box

**Konva vs Storage**:
```javascript
// Circle: Storage (bounding box) vs Render (center)
Storage: { x: 100, y: 100, radius: 50 }  // Top-left of bounding box
Konva:   { x: 125, y: 125, radius: 50 }  // Center point

// Line: Storage (absolute) vs Render (relative)
Storage: { x: 0, y: 0, points: [100, 100, 200, 200] }
Konva:   { x: 0, y: 0, points: [100, 100, 200, 200] }
```

### 5. AI Agent Architecture

**Framework**: LangChain + OpenAI GPT-4o

**Pattern**: 3-tier performance optimization system

**3-Tier Execution Strategy**:

**Tier 1: Heuristic Path** (instant, <10ms)
- Simple, unambiguous commands
- Pattern matching: "clear", "make a circle", "create a text"
- Direct execution without LLM
- Fastest response time

**Tier 2: AI-Guided Templates** (fast, ~3s total)
- Common UI patterns: login forms, navbars, cards
- AI extracts parameters from natural language
- Template generates professional layouts instantly
- 100-300x faster than full GPT generation
- Examples:
  - "create a purple login form" → AI calls `use_login_template` with `{primaryColor: '#8B5CF6'}`
  - "create a navbar with 5 items" → AI calls `use_navbar_template` with `{itemCount: 5}`

**Tier 3: GPT Freeform** (full custom, 6-8s)
- Novel designs, complex layouts
- Full AI creativity with `batch_operations`
- Used when templates don't match

**Template System Architecture**:
```
src/services/ai/templates/
├── index.js              # Orchestrator: detectTemplate(), executeTemplate()
├── helpers.js            # Reusable shape creation functions
├── extractors.js         # Parameter extraction (color, size, style)
├── positioning.js        # Smart positioning with collision detection
├── loginForm.js          # Login template: 21+ shapes, customizable
├── navbar.js             # Navbar template: 8+ shapes, customizable
└── card.js               # Card template: 6-10 shapes, customizable

src/services/ai/tools/templates/
├── useLoginTemplate.js   # AI tool wrapper for login
├── useNavbarTemplate.js  # AI tool wrapper for navbar
└── useCardTemplate.js    # AI tool wrapper for card
```

**Template Structure**:
```javascript
export const LOGIN_FORM_TEMPLATE = {
  patterns: [/\b(create|make).*login.*(form|screen)\b/i],
  
  defaults: {
    primaryColor: '#0D99FF',
    cardWidth: 442,
    cardHeight: 580,
    fields: ['email', 'password'],
    socialProviders: [],
    style: 'modern'
  },
  
  extract(message) {
    // Extract parameters from user message
    const params = { ...this.defaults };
    const color = paramExtractors.color(message);
    if (color) params.primaryColor = color;
    // ... more extraction
    return params;
  },
  
  generate(params, position) {
    // Generate batch_operations JSON
    const operations = [];
    // ... shape creation logic
    return {
      plan: [{ step: 1, tool: 'batch_operations', args: { operations } }],
      reasoning: 'Generated login form with custom parameters'
    };
  }
};
```

**Parameter Extractors**:
- `color(message)` - Detects blue, red, green, purple, etc.
- `size(message)` - Extracts large, small, normal
- `style(message)` - Detects modern, minimal, bold
- `count(message)` - Parses numbers (e.g., "5 items")
- `fields(message)` - Finds email, password, username, phone
- `socialAuth(message)` - Detects google, facebook, twitter, github

**AI Tool Integration**:
```javascript
// src/services/ai/tools/templates/useLoginTemplate.js
export const USE_LOGIN_TEMPLATE_TOOL = {
  name: 'use_login_template',
  description: 'Instantly generate professional login forms',
  schema: z.object({
    primaryColor: z.string().nullable(),
    size: z.enum(['small', 'normal', 'large']).nullable(),
    style: z.enum(['modern', 'minimal', 'bold']).nullable(),
    fields: z.array(z.enum(['email', 'username', 'password', 'phone'])).nullable(),
    socialProviders: z.array(z.enum(['google', 'facebook', 'twitter', 'github'])).nullable(),
    titleText: z.string().nullable(),
    subtitleText: z.string().nullable()
  }),
  async execute(args, context) {
    const params = { ...LOGIN_FORM_TEMPLATE.defaults, ...args };
    const position = calculateOptimalPosition({ ... });
    const templatePlan = LOGIN_FORM_TEMPLATE.generate(params, position);
    return {
      action: 'batch_operations',
      data: { operations: templatePlan.plan[0].args.operations },
      response: templatePlan.reasoning
    };
  }
};
```

**Legacy Tool Structure** (still used for Tier 3):
```javascript
const createRectangleTool = new DynamicStructuredTool({
  name: "create_rectangle",
  description: "Creates a rectangle at specified position",
  schema: z.object({
    x: z.number().describe("X coordinate (0-5000)"),
    y: z.number().describe("Y coordinate (0-5000)"),
    width: z.number(),
    height: z.number(),
    fill: z.string().optional()
  }),
  func: async ({ x, y, width, height, fill }) => {
    // Converts center coords to top-left
    // Calls canvas.addShape()
    // Returns success message
  }
});
```

**Batch Operations**:
- `batch_operations` - Unified create/update/delete
- `batch_update_shapes` - Update multiple shapes with relative transforms
- `create_grid` - Grid layout pattern
- `create_row` - Horizontal row pattern
- `create_circle_row` - Circle row pattern
- `clear_canvas` - Remove all shapes
- `add_random_shapes` - Generate random shapes
- `use_login_template` - AI-guided login form **[NEW]**
- `use_navbar_template` - AI-guided navigation bar **[NEW]**
- `use_card_template` - AI-guided card layout **[NEW]**

**Context Awareness**:
- AI receives current `shapes` array with each command
- Can reference shapes by ID, color, type, position
- Understands spatial relationships
- Style inference from existing shapes (prepared for future)

**Execution Flow**:
1. User types command in chat
2. **Tier 1 Check**: Heuristic pattern match → instant execution
3. **Tier 2 Check**: Template pattern match → AI extracts params, template generates
4. **Tier 3**: Full GPT reasoning → tool selection → execution
5. `AIChat.jsx` receives actions and applies to canvas
6. All users see changes via Firebase sync

**Performance Comparison**:
- Heuristic: <10ms total
- Template: ~3s AI + ~15ms generation = ~3s total
- GPT Freeform: ~6-8s total
- **Speedup for common patterns: 2-3x overall, 100-300x for template execution**

### 6. React Context Architecture

**State Management**: Context API with custom hooks

**Context Hierarchy**:
```
<AuthProvider>                  // User authentication
  <ErrorProvider>              // Global error handling
    <ThemeProvider>            // Light/dark mode
      <CanvasModeProvider>     // Tool selection
        <CanvasProvider>       // Canvas state + operations
          <App />
        </CanvasProvider>
      </CanvasModeProvider>
    </ThemeProvider>
  </ErrorProvider>
</AuthProvider>
```

**CanvasContext** (Most Important):
- Combines `useFirebaseCanvas` hook
- Exposes: shapes, selectedShapeId, addShape, updateShape, deleteShape, etc.
- Handles: undo/redo, selection, locking, boundary constraints
- Manages: optimistic updates, Firebase sync

**Separation of Concerns**:
- **Services**: Pure Firebase operations
- **Hooks**: Subscribe to data, expose operations
- **Contexts**: Combine hooks, manage derived state
- **Components**: UI only, no direct Firebase calls

### 7. Performance Optimizations

#### Throttling
- Cursor updates: 50ms (20 updates/sec)
- Drag previews: On drag events only
- Zoom updates: On zoom events only

#### Batch Operations
- `writeBatch()` for multi-shape Firestore operations
- Single transaction vs N sequential writes
- Dramatically faster for AI batch commands

#### Optimistic Updates
- Update local state immediately
- Sync to Firebase in background
- Prevents perceived lag

#### Offline Persistence
- Firestore cache with `enableIndexedDbPersistence()`
- Faster reads from local cache
- Automatic sync when online

#### Viewport Culling (Can Disable)
- Only render shapes within viewport
- User prefers it disabled for simplicity
- Toggle available if performance issues arise

### 8. Error Handling Strategy

**Pattern**: Centralized ErrorContext with toast notifications

**Categories**:
- `auth` - Authentication failures
- `network` - Connection issues
- `canvas` - Shape operations
- `warning` - Non-critical issues

**User Experience**:
- Friendly messages (not technical errors)
- Retry buttons for recoverable errors
- Automatic dismissal for transient issues
- Console logging for debugging

**Service-Level Handling**:
```javascript
async function operationWithErrorHandling() {
  try {
    await riskyOperation();
  } catch (error) {
    if (error.code === 'not-found') {
      console.warn('Expected: document already deleted');
      return null; // Graceful
    }
    throw new Error('User-friendly message');
  }
}
```

## Code Organization Principles

### DRY (Don't Repeat Yourself)
- Extract common logic to `utils/`
- Shared constants in `utils/constants.js`
- Design system tokens in `utils/designSystem.js`
- Canvas operations in `services/canvas.js`

**Enforcement Infrastructure**:
- **General rules**: `.cursor/rules/general-dry-rules.mdc` - Auto-applies to all coding
- **Enforcement rules**: `.cursor/rules/dry-enforcement.mdc` - Background agent analysis
- **Behavior preservation**: Refactoring must NEVER change functionality
- **Impact assessment**: Priority scoring based on time savings, maintenance burden, coupling risk
- **Confidence levels**: 🟢 HIGH (pure functions) → 🟡 MEDIUM (requires params) → 🔴 LOW (manual review)

**Background Agent Architecture** (Designed, Ready to Build):
```
Analysis Pipeline:
1. Embeddings → Fast similarity pre-filtering (90% cost savings)
2. Claude 3.5 Haiku → Semantic analysis with project rules
3. Priority Scoring → Calculate impact (0-10)
4. Report Generation → DRY_OPPORTUNITIES.md with actionable recommendations

Model: Claude 3.5 Haiku ($1/$5 per M tokens)
Cost: ~$0.05-0.15 per run (with prompt caching)
Output: Prioritized, categorized findings with code examples
```

**DRY Severity Levels**:
- 🔴 CRITICAL: Core logic 3+, security/auth, Firebase ops, constants 5+
- 🟡 HIGH: Logic 2x, similar functions, geometry calculations
- 🟢 MEDIUM: Component structure, patterns, validation
- ⚪ LOW: Nice-to-have standardization

### Single Responsibility
- Each file < 300 lines (with exceptions)
- Each function does ONE thing
- Clear naming: `createShape`, not `doStuff`

### Type Safety
- TypeScript-style JSDoc comments
- Prop validation in components
- Zod schemas for AI tools

### Testing Strategy
- **Unit tests**: Vitest for isolated functions
- **E2E tests**: Playwright for critical user paths
- **Manual testing**: User handles multi-user scenarios

## Key Files to Know

### Core Services
- `src/services/canvas.js` - All Firestore shape operations
- `src/services/presence.js` - RTDB presence/activity
- `src/services/cursors.js` - RTDB cursor sync
- `src/services/ai/index.js` - AI orchestration (refactored from `aiAgent.js`)
- `src/services/ai/templates/` - Template system for common UI patterns **[NEW]**
- `src/services/ai/tools/templates/` - AI tool wrappers for templates **[NEW]**

### State Management
- `src/contexts/CanvasContext.jsx` - Canvas state + operations
- `src/hooks/useFirebaseCanvas.js` - Firebase subscription
- `src/hooks/usePresence.js` - Presence subscription

### Canvas Rendering
- `src/components/Canvas/Canvas.jsx` - Konva Stage wrapper
- `src/components/Canvas/Shape.jsx` - Individual shape rendering
- `src/components/Canvas/Minimap.jsx` - Canvas overview

### UI Components
- `src/components/Layout/LeftSidebar.jsx` - Tool selection
- `src/components/Layout/PropertiesPanel.jsx` - Shape properties
- `src/components/AI/AIChat.jsx` - AI assistant interface

## Common Patterns

### Firebase Operation
```javascript
// 1. Optimistic update
setShapes(prev => [...prev, newShape]);

// 2. Firebase operation
await addShapeFirebase(newShape);

// 3. Subscription handles sync
// (useFirebaseCanvas auto-updates from Firestore)
```

### Error Handling
```javascript
try {
  await operation();
} catch (error) {
  showError('User-friendly message', 'category');
  console.error('Technical details:', error);
}
```

### Context Hook
```javascript
const { shapes, addShape, updateShape } = useCanvas();
```

### Tool Definition
```javascript
const tool = new DynamicStructuredTool({
  name: "tool_name",
  description: "What it does",
  schema: z.object({ /* params */ }),
  func: async (params) => { /* implementation */ }
});
```

