# Project Brief: CollabCanvas

## Overview
CollabCanvas is a Figma-like collaborative design tool MVP built for a Gauntlet AI bootcamp with a 24-hour timeline constraint. The project demonstrates real-time multi-user collaboration capabilities with an AI assistant integration.

## Core Requirements

### Canvas System
- 5000×5000px infinite canvas with pan/zoom (12% initial zoom, now 25% default)
- Shape creation: rectangles, circles, lines, pen drawings, text
- Properties: fill color, stroke, opacity, rotation
- Canvas boundaries strictly enforced
- Minimap for navigation

### Real-Time Collaboration
- Multi-user presence indicators with color-coded cursors
- Real-time shape synchronization via Firebase
- Object locking: first-come-first-serve (one user edits at a time)
- Visual feedback for locked objects
- Automatic unlock on disconnect/browser close

### AI Integration
- LangChain + OpenAI GPT-4o powered assistant
- Natural language commands for canvas operations
- Batch operations for performance
- Tools: create, update, move, delete, batch operations

### Undo/Redo
- Full undo/redo stack for all operations
- Shape ID preservation across undo/redo cycles
- Support for create, update, delete, move operations

## Technical Constraints
- **Timeline**: 24-hour bootcamp project (now extended with improvements)
- **Firebase**: Firestore for persistent state, Realtime Database for ephemeral data
- **React**: Modern hooks-based architecture
- **Konva.js**: Canvas rendering library
- **No backend server**: All logic client-side with Firebase

## Success Criteria
1. ✅ Multiple users can collaborate simultaneously
2. ✅ Real-time sync without conflicts
3. ✅ AI assistant successfully executes commands
4. ✅ Shape manipulation feels responsive
5. ✅ Clean, Figma-inspired UI/UX
6. ✅ Persistence across sessions

## Out of Scope (MVP)
- Advanced shape types (polygons, paths, images)
- Layer management (implemented as enhancement)
- Export functionality
- User accounts/teams
- Permissions system
- Version history
- Comments/annotations

