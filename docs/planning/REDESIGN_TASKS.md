# CollabCanvas UI/UX Redesign - UPDATED Task List

## Phase 1: Layout Foundation (Critical Path)
**Goal:** Restructure the basic layout without breaking existing functionality

### 1.1 Left Sidebar Setup
- [ ] Create new `LeftSidebar` component (60px width)
- [ ] Implement sidebar background/styling (light/dark mode)
- [ ] Add logo/app name at top
- [ ] Migrate existing tools from top bar to vertical layout
  - [ ] Hand/Pan tool (H) - *already exists*
  - [ ] Rectangle tool (R) - *already exists*
- [ ] **NEW: Create additional drawing tools with full functionality:**
  - [ ] Circle tool (C) - *create from scratch*
    - [ ] Click and drag to create circle
    - [ ] Shift+drag for perfect circle
    - [ ] Add to canvas state
  - [ ] Line tool (L) - *create from scratch*
    - [ ] Click two points to create line
    - [ ] Show preview while drawing
    - [ ] Add stroke styling
  - [ ] Pen tool (P) - *create from scratch*
    - [ ] Freehand drawing
    - [ ] Capture mouse/touch path
    - [ ] Smooth path rendering
    - [ ] Add to canvas as path/polyline
  - [ ] Text tool (T) - *create from scratch*
    - [ ] Click to place text box
    - [ ] Inline editing
    - [ ] Font size/family options
- [ ] Add divider line
- [ ] Add action buttons section
  - [ ] Delete button
  - [ ] Duplicate button
  - [ ] Undo button
  - [ ] Redo button
- [ ] Style buttons (40x40px, 8px radius, hover states)
- [ ] Implement active tool highlighting (#0D99FF)
- [ ] Add icons (use whatever icon library you prefer - SVG, Font Awesome, Heroicons, etc.)
  - Note: Any modern icon library works fine across Safari, Firefox, Chrome

### 1.2 Remove Top Bar
- [ ] Identify all functionality in current top bar
- [ ] Move user avatars to top-right floating position
- [ ] Remove top bar component
- [ ] Update layout to use full viewport height

### 1.3 Top-Right Floating Elements
- [ ] Create `FloatingUserMenu` component
- [ ] Position user avatars (ME, N, M) with proper spacing
- [ ] Add semi-transparent background with backdrop blur
- [ ] Create dropdown menu on avatar click
  - [ ] Display user name
  - [ ] Theme toggle (light/dark)
  - [ ] Settings option
  - [ ] Sign out button
- [ ] Style with 16px margin from top/right

### 1.4 Canvas Updates
- [ ] **Set canvas to exactly 5000px × 5000px (REQUIRED)**
- [ ] Update canvas to pure white background (#FFFFFF light, #1E1E1E dark)
- [ ] Add dot grid pattern (2px dots, 20px spacing)
- [ ] Ensure canvas fills remaining space after sidebars with scrolling
- [ ] Test that existing shape rendering still works

**Checkpoint:** App should be functional with new layout, all tools working

---

## Phase 2: Properties & Layers Panels
**Goal:** Add information and control panels

### 2.1 Right Sidebar (Properties Panel)
- [ ] Create `PropertiesPanel` component (280px width)
- [ ] Add "Properties" header
- [ ] Implement collapsible functionality (Cmd+.)
- [ ] Add "nothing selected" state with tips
- [ ] Add "shape selected" state with inputs:
  - [ ] Position (X, Y)
  - [ ] Size (W, H)
  - [ ] Rotation
  - [ ] **NEW: Build color picker functionality**
    - [ ] Create color picker component (hex input + visual picker)
    - [ ] Recent colors palette
    - [ ] Eyedropper tool (if browser supports)
  - [ ] Fill color picker
  - [ ] **NEW: Build stroke functionality**
    - [ ] Stroke color picker
    - [ ] Stroke width slider/input
    - [ ] Stroke style (solid, dashed, dotted)
  - [ ] **NEW: Build opacity functionality**
    - [ ] Opacity slider (0-100%)
    - [ ] Live preview while dragging
- [ ] Style inputs with proper spacing
- [ ] Wire up to shape state (two-way binding)
- [ ] Add keyboard shortcuts for inputs (Tab navigation, Enter to confirm)

### 2.2 Layers Panel
- [ ] Create `LayersPanel` component
- [ ] Decide on placement (bottom of left sidebar OR separate panel)
- [ ] Add "Layers" header with search box
- [ ] Implement hierarchical list rendering
  - [ ] Shape type icon
  - [ ] Editable shape name (double-click)
  - [ ] Visibility toggle (eye icon)
  - [ ] Lock toggle
- [ ] Implement virtual scrolling for performance
- [ ] Add selection highlighting
- [ ] Implement multi-select (Cmd/Shift+click)
- [ ] Add drag-to-reorder z-index functionality
- [ ] Create right-click context menu
  - [ ] Duplicate
  - [ ] Delete
  - [ ] Rename
  - [ ] Group/Ungroup
- [ ] Add keyboard navigation (arrow keys)
- [ ] Implement collapsible groups/folders
- [ ] Add search/filter functionality

### 2.3 Zoom Controls Migration
- [ ] Move zoom controls to bottom of left sidebar
- [ ] Add +/- buttons
- [ ] Add zoom percentage display (clickable for dropdown)
- [ ] Add zoom dropdown options (25%, 50%, 100%, 200%, etc.)
- [ ] Keep position display nearby

**Checkpoint:** Full panel system working, can inspect/edit all shapes

---

## Phase 3: Enhanced Features
**Goal:** Add power-user features that improve workflow

### 3.1 Top-Center Floating Toolbar
- [ ] Create `TopToolbar` component
- [ ] Position centered, 16px from top
- [ ] Add semi-transparent background with backdrop blur
- [ ] Implement View dropdown
  - [ ] Zoom to 100% (Cmd+0)
  - [ ] Zoom to fit (Cmd+1)
  - [ ] Zoom to selection (Cmd+2)
- [ ] Add Present mode toggle
- [ ] Add Share button
- [ ] Style as pills with dividers (36px height)

### 3.2 Floating Context Toolbar
- [ ] Create `ContextToolbar` component
- [ ] Implement show/hide logic (appears when shapes selected)
- [ ] Position above selection, centered
- [ ] Add quick action buttons:
  - [ ] Duplicate
  - [ ] Delete
  - [ ] Bring to front
  - [ ] Send to back
  - [ ] Group (multi-select only)
  - [ ] Color picker (uses color picker built in Phase 2)
  - [ ] Alignment tools (multi-select only)
- [ ] Add smooth fade in/out animations
- [ ] Implement smart positioning (avoid overlapping selection)
- [ ] Style with pills design and backdrop blur

### 3.3 Minimap
- [ ] Create `Minimap` component (200x150px)
- [ ] Position bottom-right, 16px margin
- [ ] Render canvas overview (showing 5000×5000px canvas)
- [ ] Highlight current viewport with blue rectangle
- [ ] Implement click-to-navigate
- [ ] Implement drag-to-pan
- [ ] Add toggle visibility (Cmd+Shift+M)
- [ ] Style with semi-transparent background
- [ ] Optimize rendering performance

### 3.4 Command Palette
- [ ] Create `CommandPalette` component
- [ ] Implement trigger (Cmd+K / Ctrl+K)
- [ ] Create searchable command list
  - [ ] All tools
  - [ ] All actions
  - [ ] All layers/shapes
  - [ ] Settings
- [ ] Implement fuzzy search
- [ ] Add keyboard navigation (arrows, Enter, Escape)
- [ ] Show recent commands at top
- [ ] Group results by category
- [ ] Style as centered modal (600px wide, max 400px tall)
- [ ] Add blur/darken background overlay

**Checkpoint:** All major features implemented and functional

---

## Phase 4: Interactions & Polish
**Goal:** Refine interactions and add finishing touches

### 4.1 Keyboard Shortcuts System
- [ ] Create global keyboard shortcut handler
- [ ] Implement tool shortcuts (H, R, C, L, P, T)
- [ ] Implement action shortcuts (Cmd+D, Delete, Cmd+Z, Cmd+Shift+Z)
- [ ] Implement view shortcuts (Cmd+0, Cmd+1, Cmd+2)
- [ ] Implement panel toggles (Cmd+., Cmd+Shift+L, Cmd+Shift+M)
- [ ] Implement Cmd+K (command palette)
- [ ] Implement Space+drag for panning
- [ ] Implement Cmd+A (select all)
- [ ] Create keyboard shortcuts reference modal (accessible via ?)

### 4.2 Tooltip System
- [ ] Create `Tooltip` component
- [ ] Add keyboard shortcut display in tooltips
- [ ] Set 500ms delay before showing
- [ ] Style to match Figma aesthetic
- [ ] Apply to all interactive elements

### 4.3 Canvas Interaction Improvements
- [ ] Implement marquee selection (drag to select multiple)
- [ ] Add Cmd+click multi-select
- [ ] Add Shift+drag (constrain to axis)
- [ ] Add Alt+drag (duplicate while dragging)
- [ ] Create right-click context menu for shapes
- [ ] Implement smart snapping with guide lines
- [ ] Add "Hide others" mode (Cmd+Shift+H)
  - [ ] Reduce unselected shapes to 10% opacity
  - [ ] Add toggle indicator
- [ ] Show selection count badge for multi-select
- [ ] Update selection styling
  - [ ] Blue outline for single select (#0D99FF)
  - [ ] Purple outline for multi-select (#7B61FF)
  - [ ] 80% opacity for unselected shapes

### 4.4 Visual Polish
- [ ] Audit all colors for light/dark mode consistency
- [ ] Add smooth transitions (150-200ms) to all state changes
- [ ] Ensure all border radius values are consistent (4px, 8px, 12px)
- [ ] Apply proper shadows to floating elements
- [ ] Verify typography (Inter/System UI, proper sizes/weights)
- [ ] Test all hover states
- [ ] Add loading states where appropriate
- [ ] Add empty states with helpful messaging

**Checkpoint:** All interactions polished, app feels professional and ready to ship!

---

## Estimated Timeline
- **Phase 1:** 3-4 days (includes building new tool functionality)
- **Phase 2:** 3-4 days (includes building color picker, stroke, opacity systems)
- **Phase 3:** 3-4 days
- **Phase 4:** 2-3 days

**Total:** ~11-15 days for full implementation

---

## Key Changes Made:
✅ Removed selection tool (hand tool handles selection)  
✅ Added tasks to build functionality for Circle, Line, Pen, Text tools  
✅ Added tasks to build Color Picker functionality  
✅ Added tasks to build Stroke functionality  
✅ Added tasks to build Opacity functionality  
✅ Changed from "lucide-react" to "any icon library" (all are cross-browser compatible)  
✅ Added requirement for 5000×5000px canvas  
✅ Removed Performance Stats Overlay  
✅ Removed Phase 5 (Performance & Optimization)  
✅ Removed Phase 6 (Testing & Bug Fixes - you'll do manual testing)  

Ready to start building! 🚀

