# Product Requirements Document: CollabCanvas UI/UX Redesign

## Objective
Redesign CollabCanvas to match Figma's professional design tool aesthetic and improve usability for handling complex multi-shape canvases.

## 1. Layout Restructuring

### 1.1 Remove Top Bar
- Eliminate the existing top navigation bar entirely
- Redistribute all functionality to sidebars and floating elements

### 1.2 Left Sidebar (Primary Toolbar)
**Structure (top to bottom):**
- Logo/app name at top (small, 40px height)
- Tool section:
  - Selection tool (V key)
  - Hand/Pan tool (H key)
  - Rectangle tool (R key)
  - Circle tool (C key)
  - Line tool (L key)
  - Pen tool (P key)
  - Text tool (T key)
- Divider line
- Action buttons:
  - Delete (Delete/Backspace key)
  - Duplicate (Cmd+D)
  - Undo (Cmd+Z)
  - Redo (Cmd+Shift+Z)
- Bottom section:
  - Zoom controls (-, zoom %, +)
  - Position display (X, Y coordinates)

**Specs:**
- Width: 60px
- Background: #F5F5F5 (light mode), #2C2C2C (dark mode)
- Tool buttons: 40x40px, 8px border radius
- Active tool: #0D99FF background with white icon
- Hover state: slight background color change (#E5E5E5 light, #3C3C3C dark)
- Icons: lucide-react, 20-24px size
- 8px padding between buttons

### 1.3 Right Sidebar (Properties Panel)
**Content:**
- "Properties" header
- When shape(s) selected:
  - Position (X, Y inputs)
  - Size (W, H inputs)
  - Rotation
  - Fill color
  - Stroke color/width
  - Opacity slider
- When nothing selected: show canvas properties or tips
- Collapsible sections with chevron icons

**Specs:**
- Width: 280px
- Same styling as left sidebar
- Collapsible (toggle with Cmd+.)
- Number inputs with unit labels
- Color pickers with recent colors

### 1.4 Layers Panel
**Location:** Bottom of left sidebar OR separate collapsible left panel (320px wide when open)

**Content:**
- "Layers" header with search box
- Hierarchical list of all shapes:
  - Shape type icon
  - Shape name (editable on double-click)
  - Visibility toggle (eye icon)
  - Lock toggle
- Current selection highlighted
- Multi-select with Cmd/Shift+click
- Drag to reorder z-index
- Right-click context menu (duplicate, delete, rename, group)

**Specs:**
- Max height: 40% of viewport
- Resizable divider
- Virtual scrolling for performance with 500+ items
- Group shapes in collapsible folders

### 1.5 Top-Right Floating Elements
- User avatars (ME, N, M) - keep existing style
- Click avatar for menu:
  - User name
  - Theme toggle (light/dark)
  - Settings
  - Sign out
- Position: 16px from top and right
- Semi-transparent background with backdrop blur

### 1.6 Top-Center Floating Toolbar
**Content:**
- View dropdown:
  - Zoom to 100%
  - Zoom to fit
  - Zoom to selection
- Present mode toggle
- Share button

**Specs:**
- Floating, centered, 16px from top
- Pills-style buttons with dividers
- Semi-transparent background (#FFFFFF/90 with backdrop blur)
- 36px height

## 2. Canvas Improvements

### 2.1 Visual Design
- Background: Pure white (#FFFFFF) in light mode, #1E1E1E in dark
- Add subtle dot grid pattern (2px dots, 20px spacing, #E5E5E5 color)
- Infinite canvas with smooth panning
- Shapes display optimization:
  - Unselected shapes: 80% opacity
  - Selected shapes: 100% opacity with blue outline (#0D99FF)
  - Multi-select: purple outline (#7B61FF)

### 2.2 Minimap
**Location:** Bottom-right corner, 16px margin

**Features:**
- Shows full canvas overview (200x150px)
- Current viewport highlighted with blue rectangle
- Click/drag to navigate
- Toggle visibility (Cmd+Shift+M)
- Semi-transparent background

### 2.3 Performance Stats (Developer Mode)
- Move current stats (zoom, position, shapes, selected) to a toggleable overlay (Cmd+Shift+I)
- Bottom-left corner when visible
- Include FPS counter and render time

## 3. Floating Context Toolbar

### 3.1 Quick Actions Bar
**Trigger:** Appears when shape(s) selected

**Location:** Floating above selection, centered

**Content:**
- Duplicate
- Delete  
- Bring to front
- Send to back
- Group (if multiple selected)
- Color picker quick access
- Alignment tools (if multiple selected)

**Specs:**
- Pills-style design
- Semi-transparent background with backdrop blur
- Smooth fade in/out animation
- Auto-positions to avoid overlapping selection

## 4. Command Palette

### 4.1 Implementation
**Trigger:** Cmd+K (Mac) / Ctrl+K (Windows)

**Features:**
- Fuzzy search through:
  - All tools
  - All actions
  - All layers/shapes
  - Settings
- Keyboard navigation (up/down arrows, Enter to execute)
- Recent commands at top
- Grouped results (Tools, Actions, Layers, etc.)

**Specs:**
- Centered modal overlay
- 600px wide, max 400px tall
- Blur/darken background
- Escape to close

## 5. Keyboard Shortcuts

### 5.1 Core Shortcuts
- Tools: V, H, R, C, L, P, T (as defined above)
- Actions: Cmd+D (duplicate), Delete (delete), Cmd+Z/Shift+Z (undo/redo)
- View: Cmd+0 (zoom to 100%), Cmd+1 (zoom to fit), Cmd+2 (zoom to selection)
- Panels: Cmd+. (toggle properties), Cmd+Shift+L (toggle layers), Cmd+Shift+M (toggle minimap)
- Other: Cmd+K (command palette), Space+drag (pan), Cmd+A (select all)

### 5.2 Tooltip System
- Show keyboard shortcut in tooltip on hover
- 500ms delay before showing
- Clean design matching Figma's tooltips

## 6. Visual Design System

### 6.1 Colors
**Light Mode:**
- Background: #FFFFFF
- Sidebar: #F5F5F5
- Border: #E5E5E5
- Text primary: #000000
- Text secondary: #666666
- Accent: #0D99FF
- Selection: #0D99FF

**Dark Mode:**
- Background: #1E1E1E
- Sidebar: #2C2C2C
- Border: #3C3C3C
- Text primary: #FFFFFF
- Text secondary: #B3B3B3
- Accent: #0D99FF
- Selection: #0D99FF

### 6.2 Typography
- Font: Inter or System UI
- Sidebar labels: 11px, 600 weight, uppercase, letter-spacing 0.5px
- Body text: 13px
- Input values: 12px, monospace

### 6.3 Spacing
- Base unit: 4px
- Standard padding: 8px, 12px, 16px
- Component gaps: 8px
- Section gaps: 16px

### 6.4 Shadows
- Sidebar: none (use border instead)
- Floating elements: 0 2px 8px rgba(0,0,0,0.1)
- Modals: 0 8px 32px rgba(0,0,0,0.15)

### 6.5 Border Radius
- Buttons/inputs: 4px
- Panels: 8px
- Floating toolbars: 8px
- Modal: 12px

## 7. Interaction Improvements

### 7.1 Shape Management
- Click to select
- Cmd+click to multi-select
- Drag to move
- Shift+drag to constrain to axis
- Alt+drag to duplicate
- Right-click for context menu

### 7.2 Hide Others Mode
- Add "Hide others" option (Cmd+Shift+H)
- Grays out unselected shapes to 10% opacity
- Easy to focus on current work

### 7.3 Selection Improvements
- Marquee selection with drag
- Show selection count badge when multiple selected
- Smart snapping to other shapes (with guides)

## 8. Technical Requirements

### 8.1 Performance
- Virtual scrolling for layers panel (500+ items)
- Canvas virtualization (only render visible shapes)
- Debounced property updates
- Smooth 60fps animations

### 8.2 Responsive Design
- Minimum width: 1024px
- Collapsible panels on smaller screens
- Touch-friendly hit targets (minimum 44x44px)

### 8.3 Accessibility
- Full keyboard navigation
- ARIA labels on all interactive elements
- Focus indicators
- Screen reader support for layer tree

## 9. Implementation Notes

- Keep all existing WebSocket collaboration functionality
- Maintain current shape rendering performance
- Use Tailwind for styling consistency
- Use lucide-react for all icons
- Add smooth transitions (150-200ms) for all state changes
- Test with 500+ shapes to ensure performance

## Success Metrics
- Tool selection time reduced by 50%
- Shape navigation/selection improved
- Professional appearance matching Figma quality
- No performance degradation with 500+ shapes

---

**Implementation approach:** Start with layout restructuring (sections 1-2), then add enhanced features (sections 3-4), then polish (sections 5-7). All existing functionality must continue working throughout.

