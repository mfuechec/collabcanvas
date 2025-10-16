# Product Context

## Why This Exists
CollabCanvas was built as a bootcamp project to demonstrate:
1. Real-time collaborative systems architecture
2. Integration of AI capabilities into productivity tools
3. Handling complex state synchronization across clients
4. Building intuitive design tool interfaces

## Problems It Solves

### 1. Real-Time Collaboration Complexity
**Problem**: Multiple users editing the same canvas simultaneously creates race conditions, conflicts, and data inconsistency.

**Solution**: 
- Object locking prevents simultaneous edits
- Firebase Realtime Database for instant cursor/presence updates
- Firestore with per-shape documents for optimized batch operations
- Automatic cleanup of locks on disconnect

### 2. AI-Assisted Design
**Problem**: Design tools require manual, repetitive actions for batch operations.

**Solution**:
- Natural language interface via LangChain
- Batch operations (create 50 circles, move all red shapes, etc.)
- AI understands spatial relationships and canvas context

### 3. Complex State Management
**Problem**: Undo/redo with real-time sync is difficult to implement correctly.

**Solution**:
- Local undo/redo stack with shape ID preservation
- Optimistic updates with Firebase sync
- Graceful handling of conflicts

## User Experience Goals

### Feels Like Figma
- Floating panels and sidebars
- Keyboard shortcuts for tools (H, R, C, L, P, T)
- Properties panel with live updates
- Minimap for navigation
- Smooth zoom and pan

### Collaborative by Default
- See other users' cursors in real-time
- Visual indicators for who's editing what
- Presence list shows active users
- No mode switching needed

### AI-Enhanced Workflow
- Chat interface for commands
- Works alongside manual editing
- Handles tedious bulk operations
- Suggests and executes complex arrangements

## Key User Flows

### Creating Shapes
1. Select tool from sidebar (or keyboard shortcut)
2. Draw on canvas
3. Shape appears for all users instantly
4. Modify via properties panel

### Collaborative Editing
1. User A selects a shape → locks it
2. User B sees it's locked, selects different shape
3. User A closes browser → shape auto-unlocks
4. User B can now edit it

### AI Commands
1. Open AI chat panel
2. Type: "Create 10 blue circles in a row"
3. AI executes batch operation
4. All users see results instantly

### Undo/Redo Flow
1. User creates shape → appears on canvas
2. User deletes shape → removed from canvas
3. User hits Cmd+Z → shape reappears with same ID
4. User hits Cmd+Shift+Z → shape deleted again
5. No orphaned handlers or memory leaks

## Design Principles

### 1. Real-Time First
Every action syncs immediately. No "save" button. Firebase handles persistence.

### 2. Visual Feedback
Users see what others are doing: cursors, selections, locks, presence.

### 3. Forgiving UX
- Undo/redo for mistakes
- Boundary constraints prevent shapes leaving canvas
- Error toasts with retry actions
- Graceful degradation on network issues

### 4. Performance Matters
- Viewport culling (can be disabled)
- Throttled cursor updates
- Batch Firebase operations
- Optimistic updates

### 5. Developer Experience
- Clear separation of concerns
- Comprehensive error handling
- Detailed logging for debugging
- E2E tests for critical paths

