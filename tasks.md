# CollabCanvas MVP - Development Task List

## Project File Structure

```
collabcanvas/
├── public/
│   └── index.html
├── src/
│   ├── components/
│   │   ├── Auth/
│   │   │   ├── Login.jsx
│   │   │   ├── Signup.jsx
│   │   │   └── AuthProvider.jsx
│   │   ├── Canvas/
│   │   │   ├── Canvas.jsx
│   │   │   ├── CanvasControls.jsx
│   │   │   └── Shape.jsx
│   │   ├── Collaboration/
│   │   │   ├── Cursor.jsx
│   │   │   ├── UserPresence.jsx
│   │   │   └── PresenceList.jsx
│   │   └── Layout/
│   │       ├── Navbar.jsx
│   │       └── Sidebar.jsx
│   ├── services/
│   │   ├── firebase.js
│   │   ├── auth.js
│   │   ├── canvas.js
│   │   └── presence.js
│   ├── hooks/
│   │   ├── useAuth.js
│   │   ├── useCanvas.js
│   │   ├── useCursors.js
│   │   └── usePresence.js
│   ├── utils/
│   │   ├── constants.js
│   │   └── helpers.js
│   ├── contexts/
│   │   ├── AuthContext.jsx
│   │   └── CanvasContext.jsx
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
├── tests/
│   ├── setup.js
│   ├── unit/
│   │   ├── utils/
│   │   │   └── helpers.test.js
│   │   ├── services/
│   │   │   ├── auth.test.js
│   │   │   └── canvas.test.js
│   │   └── contexts/
│   │       └── CanvasContext.test.js
│   └── integration/
│       ├── auth-flow.test.js
│       ├── canvas-sync.test.js
│       └── multiplayer.test.js
├── .env
├── .env.example
├── .gitignore
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── firebase.json
├── .firebaserc
└── README.md
```

---

## PR #1: Project Setup & Firebase Configuration

**Branch:** `setup/initial-config`  
**Goal:** Initialize project with all dependencies and Firebase configuration

### Tasks:

- [x] **1.1: Initialize React + Vite Project**

  - Files to create: `package.json`, `vite.config.ts`, `index.html`
  - Run: `npm create vite@latest collabcanvas -- --template react-ts`
  - Verify dev server runs

- [x] **1.2: Install Core Dependencies**

  - Files to update: `package.json`
  - Install:
    ```bash
    npm install firebase konva react-konva
    npm install -D tailwindcss postcss autoprefixer
    ```

- [x] **1.3: Configure Tailwind CSS**

  - Files to create: `tailwind.config.js`, `postcss.config.js`
  - Files to update: `src/index.css`
  - Run: `npx tailwindcss init -p`
  - Add Tailwind directives to `index.css`

- [x] **1.4: Set Up Firebase Project**

  - Create Firebase project in console
  - Enable Authentication (Email/Password AND Google)
  - Create Firestore database
  - Create Realtime Database
  - Files to create: `.env`, `.env.example`
  - Add Firebase config keys to `.env`

- [x] **1.5: Create Firebase Service File**

  - Files to create: `src/services/firebase.js`
  - Initialize Firebase app
  - Export `auth`, `db` (Firestore), `rtdb` (Realtime Database)

- [x] **1.6: Configure Git & .gitignore**

  - Files to create/update: `.gitignore`
  - Ensure `.env` is ignored
  - Add `node_modules/`, `dist/`, `.firebase/` to `.gitignore`

- [x] **1.7: Create README with Setup Instructions**
  - Files to create: `README.md`
  - Include setup steps, env variables needed, run commands

**PR Checklist:**

- [x] Dev server runs successfully
- [x] Firebase initialized without errors
- [x] Tailwind classes work in test component
- [x] `.env` is in `.gitignore`

---

## PR #2: Authentication System

**Branch:** `feature/authentication`  
**Goal:** Complete user authentication with login/signup flows

### Tasks:

- [x] **2.1: Create Auth Context**

  - Files to create: `src/contexts/AuthContext.jsx`
  - Provide: `currentUser`, `loading`, `login()`, `signup()`, `logout()`

- [x] **2.2: Create Auth Service**

  - Files to create: `src/services/auth.js`
  - Functions: `signUp(email, password, displayName)`, `signIn(email, password)`, `signInWithGoogle()`, `signOut()`, `updateUserProfile(displayName)`
  - Display name logic: Extract from Google profile or use email prefix

- [x] **2.3: Create Auth Hook**

  - Files to create: `src/hooks/useAuth.js`
  - Return auth context values

- [x] **2.4: Build Signup Component**

  - Files to create: `src/components/Auth/Signup.jsx`
  - Form fields: email, password, display name
  - Handle signup errors
  - Redirect to canvas on success

- [x] **2.5: Build Login Component**

  - Files to create: `src/components/Auth/Login.jsx`
  - Form fields: email, password
  - Add "Sign in with Google" button
  - Handle login errors
  - Link to signup page

- [x] **2.6: Create Auth Provider Wrapper**

  - Files to create: `src/components/Auth/AuthProvider.jsx`
  - Wrap entire app with AuthContext
  - Show loading state during auth check

- [x] **2.7: Update App.jsx with Protected Routes**

  - Files to update: `src/App.jsx`
  - Show Login/Signup if not authenticated
  - Show Canvas if authenticated
  - Basic routing logic

- [x] **2.8: Create Navbar Component**
  - Files to create: `src/components/Layout/Navbar.jsx`
  - Display current user name
  - Logout button

**PR Checklist:**

- [x] Can create new account with email/password
- [x] Can login with existing account
- [x] Can sign in with Google
- [x] Display name appears correctly (Google name or email prefix)
- [x] Display name truncates at 20 chars if too long
- [x] Logout works and redirects to login
- [x] Auth state persists on page refresh

---

## PR #3: Basic Canvas Rendering

**Branch:** `feature/canvas-basic`  
**Goal:** Canvas with pan, zoom, and basic stage setup

### Tasks:

- [x] **3.1: Create Canvas Constants**

  - Files to create: `src/utils/constants.js`
  - Define: `CANVAS_WIDTH = 5000`, `CANVAS_HEIGHT = 5000`, `VIEWPORT_WIDTH`, `VIEWPORT_HEIGHT`

- [x] **3.2: Create Canvas Context**

  - Files to create: `src/contexts/CanvasContext.jsx`
  - State: `shapes`, `selectedId`, `stageRef`
  - Provide methods to add/update/delete shapes

- [x] **3.3: Build Base Canvas Component**

  - Files to create: `src/components/Canvas/Canvas.jsx`
  - Set up Konva Stage and Layer
  - Container div with fixed dimensions
  - Background color/grid (optional)

- [x] **3.4: Implement Pan Functionality**

  - Files to update: `src/components/Canvas/Canvas.jsx`
  - Handle `onDragMove` on Stage
  - Constrain panning to canvas bounds (5000x5000px)
  - Strictly prevent objects from being placed/moved outside boundaries (no crossing)

- [x] **3.5: Implement Zoom Functionality**

  - Files to update: `src/components/Canvas/Canvas.jsx`
  - Handle `onWheel` event
  - Zoom to cursor position
  - Min zoom: 0.1, Max zoom: 3

- [x] **3.6: Create Canvas Controls Component**

  - Files to create: `src/components/Canvas/CanvasControls.jsx`
  - Buttons: "Zoom In", "Zoom Out", "Reset View", "Add Shape"
  - Position: Fixed/floating on canvas

- [x] **3.7: Add Canvas to App**
  - Files to update: `src/App.jsx`
  - Wrap Canvas in CanvasContext
  - Include Navbar and Canvas

**PR Checklist:**

- [x] Canvas renders at correct size (5000x5000px)
- [x] Can pan by dragging canvas background
- [x] Can zoom with mousewheel
- [x] Zoom centers on cursor position
- [x] Reset view button works
- [x] Canvas boundaries are enforced (optional: visual indicators)
- [x] 60 FPS maintained during pan/zoom

---

## PR #4: Shape Creation & Manipulation

**Branch:** `feature/shapes`  
**Goal:** Create, select, and move shapes on canvas

### Tasks:

- [x] **4.1: Create Shape Component**

  - Files to create: `src/components/Canvas/Shape.jsx`
  - Support: **Rectangles only for MVP**
  - Props: `id`, `x`, `y`, `width`, `height`, `fill`, `isSelected`, `isLocked`, `lockedBy`

- [x] **4.2: Add Shape Creation Logic**

  - Files to update: `src/contexts/CanvasContext.jsx`
  - Function: `addShape(type, position)`
  - Generate unique ID for each shape
  - Default properties: 100x100px, fixed gray fill (#cccccc)

- [x] **4.3: Implement Shape Rendering**

  - Files to update: `src/components/Canvas/Canvas.jsx`
  - Map over `shapes` array
  - Render Shape component for each

- [x] **4.4: Add Shape Selection**

  - Files to update: `src/components/Canvas/Shape.jsx`
  - Handle `onClick` to set selected
  - Visual feedback: border/outline when selected
  - Files to update: `src/contexts/CanvasContext.jsx`
  - State: `selectedId`

- [x] **4.5: Implement Shape Dragging**

  - Files to update: `src/components/Canvas/Shape.jsx`
  - Enable `draggable={true}`
  - Handle `onDragEnd` to update position
  - Strictly enforce canvas boundaries during drag (prevent crossing)
  - Files to update: `src/contexts/CanvasContext.jsx`
  - Function: `updateShape(id, updates)`

- [x] **4.6: Add Click-to-Deselect**

  - Files to update: `src/components/Canvas/Canvas.jsx`
  - Handle Stage `onClick` to deselect when clicking background

- [x] **4.7: Connect "Add Shape" Button**

  - Files to update: `src/components/Canvas/CanvasControls.jsx`
  - Button creates shape at center of current viewport

- [x] **4.8: Add Delete Functionality & Basic Unit Tests**
  - Files to update: `src/contexts/CanvasContext.jsx`
  - Function: `deleteShape(id)`
  - Files to update: `src/components/Canvas/Canvas.jsx`
  - Add keyboard listener for Delete/Backspace key
  - Delete selected shape when key pressed
  - Cannot delete shapes locked by other users
  - Files to create: `tests/unit/contexts/CanvasContext.test.js` (basic tests)

**PR Checklist:**

- [x] Can create rectangles via button
- [x] Rectangles render at correct positions with gray fill
- [x] Can select rectangles by clicking
- [x] Can drag rectangles smoothly
- [x] Selection state shows visually
- [x] Can delete selected rectangle with Delete/Backspace key
- [x] Clicking another shape deselects the previous one
- [x] Clicking empty canvas deselects current selection
- [x] Objects cannot be moved outside canvas boundaries
- [x] No lag with 20+ shapes

---

## PR #5: Real-Time Shape Synchronization

**Branch:** `feature/realtime-sync`  
**Goal:** Sync shape changes across all connected users

### Tasks:

- [x] **5.1: Design Firestore Schema**

  - Collection: `canvas` (single document: `global-canvas-v1`)
  - Document structure:
    ```
    {
      canvasId: "global-canvas-v1",
      shapes: [
        {
          id: string,
          type: 'rectangle',
          x: number,
          y: number,
          width: number,
          height: number,
          fill: string,
          createdBy: string (userId),
          createdAt: timestamp,
          lastModifiedBy: string,
          lastModifiedAt: timestamp,
          isLocked: boolean,
          lockedBy: string (userId) or null
        }
      ],
      lastUpdated: timestamp
    }
    ```

- [x] **5.2: Create Canvas Service**

  - Files to create: `src/services/canvas.js`
  - Function: `subscribeToShapes(canvasId, callback)`
  - Function: `createShape(canvasId, shapeData)`
  - Function: `updateShape(canvasId, shapeId, updates)`
  - Function: `deleteShape(canvasId, shapeId)`

- [x] **5.3: Create Canvas Hook**

  - Files to create: `src/hooks/useFirebaseCanvas.js`
  - Subscribe to Firestore on mount
  - Sync local state with Firestore
  - Return: `shapes`, `addShape()`, `updateShape()`, `deleteShape()`

- [x] **5.4: Integrate Real-Time Updates in Context**

  - Files to update: `src/contexts/CanvasContext.jsx`
  - Replace local state with `useFirebaseCanvas` hook
  - Listen to Firestore changes
  - Update local shapes array on remote changes

- [x] **5.5: Implement Object Locking**

  - Files to update: `src/services/canvas.js`
  - Strategy: First user to select/drag acquires lock
  - Function: `lockShape(canvasId, shapeId, userId)`
  - Function: `unlockShape(canvasId, shapeId)`
  - Auto-release lock after drag completes or timeout (5 seconds)
  - Visual feedback: Different border color + reduced opacity for locked objects
  - Other users cannot move locked objects
  - Files to create: `tests/unit/locking/shape-locking.test.jsx` (comprehensive locking tests)

- [x] **5.6: Add Loading States**

  - Files to update: `src/contexts/CanvasContext.jsx`
  - Show loading spinner while initial shapes load
  - Files to update: `src/components/Canvas/Canvas.jsx`
  - Display "Loading canvas..." message

- [x] **5.7: Handle Offline/Reconnection**
  - Files to update: `src/hooks/useFirebaseCanvas.js`
  - Enable Firestore offline persistence
  - Show reconnection status

**PR Checklist:**

- [x] Open two browsers: creating shape in one appears in other
- [x] User A starts dragging shape → shape locks for User A
- [x] User B cannot move shape while User A has it locked
- [x] Lock shows visual indicator (e.g., different border color)
- [x] Lock releases automatically when User A stops dragging
- [x] Lock releases after timeout (5 seconds) if User A disconnects mid-drag
- [x] Moving shape in one browser updates in other (<100ms)
- [x] Deleting shape in one removes from other
- [x] Cannot delete shapes locked by other users
- [x] Page refresh loads all existing shapes
- [x] All users leave and return: shapes still there
- [x] No duplicate shapes or sync issues

---

## PR #6: Multiplayer Cursors

**Branch:** `feature/cursors`  
**Goal:** Real-time cursor tracking for all connected users

### Tasks:

- [x] **6.1: Design Realtime Database Schema**

  - Path: `/sessions/global-canvas-v1/{userId}`
  - Data structure:
    ```
    {
      displayName: string,
      cursorColor: string,
      cursorX: number,
      cursorY: number,
      lastSeen: timestamp
    }
    ```

- [x] **6.2: Create Cursor Service**

  - Files to create: `src/services/cursors.js`
  - Function: `updateCursorPosition(canvasId, userId, x, y, name, color)`
  - Function: `subscribeToCursors(canvasId, callback)`
  - Function: `removeCursor(canvasId, userId)` (on disconnect)

- [x] **6.3: Create Cursors Hook**

  - Files to create: `src/hooks/useCursors.js`
  - Track mouse position on canvas
  - Convert screen coords to canvas coords
  - Throttle updates to ~60Hz (16ms)
  - Return: `cursors` object (keyed by userId)

- [x] **6.4: Build Cursor Component**

  - Files to create: `src/components/Collaboration/Cursor.jsx`
  - SVG cursor icon with user color
  - Name label next to cursor
  - Smooth CSS transitions for movement

- [x] **6.5: Integrate Cursors into Canvas**

  - Files to update: `src/components/Canvas/Canvas.jsx`
  - Add `onMouseMove` handler to Stage
  - Update cursor position in RTDB
  - Render Cursor components for all other users

- [x] **6.6: Assign User Colors**

  - Files to create: `src/utils/helpers.js`
  - Function: `generateUserColor(userId)` - randomly assigned on join
  - Color palette: 8-10 distinct colors with sufficient contrast
  - Maintain color consistency per user throughout session

- [x] **6.7: Handle Cursor Cleanup**

  - Files to update: `src/hooks/useCursors.js`
  - Remove cursor on component unmount
  - Use `onDisconnect()` in RTDB to auto-cleanup

- [x] **6.8: Optimize Cursor Updates**
  - Files to update: `src/hooks/useCursors.js`
  - Throttle mouse events to 20-30 FPS (not full 60Hz)
  - Only send if position changed significantly (>2px)

**PR Checklist:**

- [x] Moving mouse shows cursor to other users
- [x] Cursor has correct user name and color
- [x] Cursors move smoothly without jitter
- [x] Cursor disappears when user leaves
- [x] Updates happen within 50ms
- [x] No performance impact with 5 concurrent cursors

---

## PR #7: User Presence System

**Branch:** `feature/presence`  
**Goal:** Show who's online and active on the canvas

### Tasks:

- [x] **7.1: Design Presence Schema**

  - Path: `/sessions/global-canvas-v1/{userId}` (same as cursors)
  - Data structure (combined with cursor data):
    ```
    {
      displayName: string,
      cursorColor: string,
      cursorX: number,
      cursorY: number,
      lastSeen: timestamp,
      isOnline: boolean
    }
    ```
  - Note: Presence and cursor data share same RTDB location

- [x] **7.2: Create Presence Service**

  - Files to create: `src/services/presence.js`
  - Function: `setUserOnline(displayName, cursorColor)`
  - Function: `setUserOffline()`
  - Function: `subscribeToPresence(callback)`
  - Function: `removeUserPresence()` (on logout)
  - Use `onDisconnect()` to auto-set offline

- [x] **7.3: Create Presence Hook**

  - Files to create: `src/hooks/usePresence.js`
  - Set user online on mount
  - Subscribe to presence changes
  - Return: `onlineUsers` array, `totalUsers`, `isOnline`
  - Heartbeat every 30 seconds
  - Handle page visibility changes

- [x] **7.4: Build Presence List Component**

  - Files to create: `src/components/Collaboration/PresenceList.jsx`
  - Display list of online users
  - Show user color dot + name
  - Show count: "3 users online"
  - Limit visible users with overflow indicator

- [x] **7.5: Build User Presence Badge**

  - Files to create: `src/components/Collaboration/UserPresence.jsx`
  - Avatar/initial with user color
  - Tooltip with full name
  - Online indicator dot
  - Current user indicator

- [x] **7.6: Add Presence to Navbar**

  - Files to update: `src/components/Layout/Navbar.jsx`
  - Include PresenceList component
  - Position in center of navbar
  - Show when users are online

- [x] **7.7: Integrate Presence System**
  - Files to update: `src/components/Layout/Navbar.jsx`
  - Initialize presence when user is authenticated
  - Automatic cleanup on logout/disconnect

**PR Checklist:**

- [x] Current user appears in presence list
- [x] Other users appear when they join
- [x] Users disappear when they leave
- [x] User count is accurate
- [x] Colors match cursor colors
- [x] Updates happen in real-time

---

## PR #8: Testing, Polish & Bug Fixes

**Branch:** `fix/testing-polish`  
**Goal:** Ensure MVP requirements are met and fix critical bugs

### Tasks:

- [ ] **8.1: Multi-User Testing**

  - Test with 2-5 concurrent users
  - Create shapes simultaneously
  - Move shapes simultaneously
  - Check for race conditions

- [ ] **8.2: Performance Validation (Time Permitting)**

  - Quick validation with 100+ shapes
  - Brief FPS check during interactions
  - Note: Defer comprehensive performance testing post-MVP

- [ ] **8.3: Persistence Testing**

  - All users leave canvas
  - Return and verify shapes remain
  - Test page refresh mid-edit
  - Test browser close and reopen

- [ ] **8.4: Basic Error Handling**

  - Files to update: Core service files (auth.js, canvas.js)
  - Add basic try/catch blocks
  - Display simple user-friendly error messages
  - Basic network failure handling

- [ ] **8.5: UI Polish**

  - Files to update: All component files
  - Consistent spacing and colors
  - Responsive button states
  - Loading states for all async operations

- [ ] **8.6: Verify Keyboard Shortcuts**

  - Files to verify: `src/components/Canvas/Canvas.jsx`
  - Delete/Backspace key: delete selected shape (already implemented in PR #4)
  - Escape key: deselect (optional enhancement)
  - Note: Undo/redo is out of scope for MVP

- [ ] **8.7: Cross-Browser Testing**

  - Test in Chrome, Firefox, Safari
  - Fix any compatibility issues

- [ ] **8.8: Document Known Issues**
  - Files to update: `README.md`
  - List any known bugs or limitations
  - Add troubleshooting section

**PR Checklist:**

- [ ] All MVP requirements pass
- [ ] No console errors
- [ ] Smooth performance on test devices
- [ ] Works in multiple browsers
- [ ] Error messages are helpful

---

## PR #9: Deployment & Final Prep

**Branch:** `deploy/production`  
**Goal:** Deploy to production and finalize documentation

### Tasks:

- [ ] **9.1: Configure Firebase Hosting**

  - Files to create: `firebase.json`, `.firebaserc`
  - Run: `firebase init hosting`
  - Set public directory to `dist`

- [ ] **9.2: Update Environment Variables**

  - Create production Firebase project (or use same)
  - Files to update: `.env.example`
  - Document all required env vars

- [ ] **9.3: Build Production Bundle**

  - Run: `npm run build`
  - Test production build locally
  - Check bundle size

- [ ] **9.4: Deploy to Firebase Hosting**

  - Run: `firebase deploy --only hosting`
  - Test deployed URL
  - Verify all features work in production

- [ ] **9.5: Set Up Firestore Security Rules**

  - Files to create: `firestore.rules`
  - Allow authenticated users to read/write
  - Validate shape schema
  - Deploy rules: `firebase deploy --only firestore:rules`

- [ ] **9.6: Set Up Realtime Database Rules**

  - Files to create: `database.rules.json`
  - Allow authenticated users read/write
  - Deploy rules: `firebase deploy --only database`

- [ ] **9.7: Update README with Deployment Info**

  - Files to update: `README.md`
  - Add live demo link
  - Add deployment instructions
  - Add architecture diagram (optional)

- [ ] **9.8: Final Production Testing**

  - Test with 5 concurrent users on deployed URL
  - Verify auth works
  - Verify shapes sync
  - Verify cursors work
  - Verify presence works

- [ ] **9.9: Create Demo Video Script**
  - Outline key features to demonstrate
  - Prepare 2-3 browser windows for demo

**PR Checklist:**

- [ ] App deployed and accessible via public URL
- [ ] Auth works in production
- [ ] Real-time features work in production
- [ ] 5+ concurrent users tested successfully
- [ ] README has deployment link and instructions
- [ ] Security rules deployed and working

---

## MVP Completion Checklist

### Required Features:

- [ ] Basic canvas with pan/zoom (5000x5000px with boundaries)
- [ ] Rectangle shapes with gray fill (#cccccc)
- [ ] Ability to create, move, and delete objects
- [ ] Object locking (first user to drag locks the object)
- [ ] Real-time sync between 2+ users (<100ms)
- [ ] Multiplayer cursors with name labels and unique colors
- [ ] Presence awareness (who's online)
- [ ] User authentication (email/password AND Google login)
- [ ] Deployed and publicly accessible

### Performance Targets:

- [ ] 60 FPS during all interactions
- [ ] Shape changes sync in <100ms
- [ ] Cursor positions sync in <50ms
- [ ] Support 500+ simple objects without FPS drops
- [ ] Support 5+ concurrent users without degradation

### Testing Scenarios:

- [ ] 2 users editing simultaneously in different browsers
- [ ] User A drags shape → User B sees it locked and cannot move it
- [ ] Lock releases when User A stops dragging → User B can now move it
- [ ] User A deletes shape → disappears for User B immediately
- [ ] One user refreshing mid-edit confirms state persistence
- [ ] Multiple shapes created and moved rapidly to test sync performance
- [ ] Test with 500+ rectangles to verify performance target

---

## Post-MVP: Phase 2 Preparation

**Next PRs (After MVP Deadline):**

- PR #10: Multiple shape types (circles, text)
- PR #11: Shape styling (colors, borders)
- PR #12: Resize and rotate functionality
- PR #13: AI agent integration
- PR #14: Multi-select and grouping
- PR #15: Undo/redo system