/**
 * Design System Constants
 * Figma-inspired design tokens for CollabCanvas UI
 */

// Colors
export const COLORS = {
  light: {
    // Canvas
    background: '#FFFFFF',
    canvasBg: '#FFFFFF',
    
    // Sidebars
    sidebar: '#F5F5F5',
    border: '#E5E5E5',
    
    // Text
    textPrimary: '#000000',
    textSecondary: '#666666',
    
    // Interactive
    accent: '#0D99FF',
    selection: '#0D99FF',
    multiSelect: '#7B61FF',
    hover: '#E5E5E5',
    
    // Grid
    gridDot: '#E5E5E5',
  },
  dark: {
    // Canvas
    background: '#1E1E1E',
    canvasBg: '#1E1E1E',
    
    // Sidebars
    sidebar: '#2C2C2C',
    border: '#3C3C3C',
    
    // Text
    textPrimary: '#FFFFFF',
    textSecondary: '#B3B3B3',
    
    // Interactive
    accent: '#0D99FF',
    selection: '#0D99FF',
    multiSelect: '#7B61FF',
    hover: '#3C3C3C',
    
    // Grid
    gridDot: '#3C3C3C',
  }
};

// Typography
export const TYPOGRAPHY = {
  fontFamily: {
    base: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Inter", "Roboto", "Helvetica Neue", Arial, sans-serif',
    mono: '"SF Mono", "Monaco", "Inconsolata", "Fira Code", "Droid Sans Mono", "Source Code Pro", monospace',
  },
  fontSize: {
    sidebarLabel: '11px',
    body: '13px',
    input: '12px',
  },
  fontWeight: {
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  letterSpacing: {
    label: '0.5px',
  },
};

// Spacing (base unit: 4px)
export const SPACING = {
  xs: '4px',
  sm: '8px',
  md: '12px',
  lg: '16px',
  xl: '20px',
  xxl: '24px',
};

// Border Radius
export const BORDER_RADIUS = {
  sm: '4px',
  md: '8px',
  lg: '12px',
  xl: '16px',
  // Aliases for specific use cases
  button: '4px',
  panel: '8px',
  toolbar: '8px',
  modal: '12px',
};

// Shadows
export const SHADOWS = {
  none: 'none',
  sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
  lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  floating: '0 2px 8px rgba(0, 0, 0, 0.1)',
  modal: '0 8px 32px rgba(0, 0, 0, 0.15)',
};

// Layout Dimensions
export const LAYOUT = {
  leftSidebar: {
    width: '60px',
  },
  rightSidebar: {
    width: '280px',
  },
  layersPanel: {
    width: '320px',
    maxHeight: '40vh',
  },
  minimap: {
    width: '200px',
    height: '150px',
  },
  toolButton: {
    size: '40px',
  },
  topToolbar: {
    height: '36px',
  },
};

// Animation Durations
export const ANIMATION = {
  fast: '150ms',
  normal: '200ms',
  slow: '300ms',
};

// Standard Transitions (for consistent animations across components)
export const TRANSITIONS = {
  // General purpose transitions
  all: 'all 150ms ease',
  allNormal: 'all 200ms ease',
  allSlow: 'all 300ms ease',
  
  // Specific property transitions
  transform: 'transform 150ms ease',
  opacity: 'opacity 150ms ease',
  background: 'background-color 150ms ease',
  color: 'color 150ms ease',
  border: 'border 150ms ease',
  
  // Interactive states
  hover: 'background-color 150ms ease, opacity 150ms ease, transform 150ms ease',
  scale: 'transform 150ms cubic-bezier(0.4, 0, 0.2, 1)',
};

// Canvas Constants
export const CANVAS = {
  width: 5000,
  height: 5000,
  gridDotSize: 2,
  gridSpacing: 20,
};

// Z-Index Layers
export const Z_INDEX = {
  canvas: 1,
  sidebar: 10,
  floatingToolbar: 20,
  contextMenu: 30,
  modal: 40,
  tooltip: 50,
};

// Tool Types
export const TOOLS = {
  HAND: 'hand',
  RECTANGLE: 'rectangle',
  CIRCLE: 'circle',
  LINE: 'line',
  PEN: 'pen',
  TEXT: 'text',
};

// Keyboard Shortcuts
export const SHORTCUTS = {
  // Tools
  TOOL_HAND: 'h',
  TOOL_RECTANGLE: 'r',
  TOOL_CIRCLE: 'c',
  TOOL_LINE: 'l',
  TOOL_PEN: 'p',
  TOOL_TEXT: 't',
  
  // Actions
  DELETE: ['Delete', 'Backspace'],
  COPY: ['Meta+c', 'Control+c'],
  PASTE: ['Meta+v', 'Control+v'],
  DUPLICATE: ['Meta+d', 'Control+d'],
  UNDO: ['Meta+z', 'Control+z'],
  REDO: ['Meta+Shift+z', 'Control+Shift+z'],
  SELECT_ALL: ['Meta+a', 'Control+a'],
  
  // View
  ZOOM_100: ['Meta+0', 'Control+0'],
  ZOOM_FIT: ['Meta+1', 'Control+1'],
  ZOOM_SELECTION: ['Meta+2', 'Control+2'],
  
  // Panels
  TOGGLE_PROPERTIES: ['Meta+.', 'Control+.'],
  TOGGLE_LAYERS: ['Meta+Shift+l', 'Control+Shift+l'],
  TOGGLE_MINIMAP: ['Meta+Shift+m', 'Control+Shift+m'],
  
  // Other
  COMMAND_PALETTE: ['Meta+k', 'Control+k'],
  PAN: 'Space',
  HIDE_OTHERS: ['Meta+Shift+h', 'Control+Shift+h'],
  HELP: '?',
};

export default {
  COLORS,
  TYPOGRAPHY,
  SPACING,
  BORDER_RADIUS,
  SHADOWS,
  LAYOUT,
  ANIMATION,
  CANVAS,
  Z_INDEX,
  TOOLS,
  SHORTCUTS,
};

