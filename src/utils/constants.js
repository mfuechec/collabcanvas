// Canvas Constants - Core dimensions and settings for the collaborative canvas
// These constants define the canvas workspace boundaries and viewport settings

// Canvas Dimensions (5000x5000px virtual workspace)
export const CANVAS_WIDTH = 5000;
export const CANVAS_HEIGHT = 5000;

// Viewport Dimensions (visible area in browser)
export const VIEWPORT_WIDTH = 1200;
export const VIEWPORT_HEIGHT = 800;

// Zoom Settings
export const MIN_ZOOM = 0.1;
export const MAX_ZOOM = 3.0;
export const ZOOM_STEP = 0.1;
export const DEFAULT_ZOOM = 1.0;

// Canvas Colors and Styling
export const CANVAS_BACKGROUND_COLOR = '#f8fafc'; // Light gray background
export const CANVAS_BORDER_COLOR = '#e2e8f0'; // Subtle border
export const GRID_COLOR = '#f1f5f9'; // Very light grid (optional)
export const GRID_SIZE = 50; // Grid cell size in pixels

// Default Canvas Position (center of viewport)
export const DEFAULT_CANVAS_X = 0;
export const DEFAULT_CANVAS_Y = 0;

// Pan Constraints
export const PAN_BOUNDARY_PADDING = 200; // Allow some padding outside visible canvas

// Performance Settings
export const MAX_SHAPES_WARNING = 500; // Warn when approaching shape limit
export const MAX_SHAPES_LIMIT = 1000; // Hard limit for performance

// Shape Defaults (for when we add shapes later)
export const DEFAULT_SHAPE_WIDTH = 100;
export const DEFAULT_SHAPE_HEIGHT = 100;
export const DEFAULT_SHAPE_FILL = '#cccccc'; // Gray fill as specified in PRD

// Selection and Interaction
export const SELECTION_STROKE_COLOR = '#3b82f6'; // Blue selection border
export const SELECTION_STROKE_WIDTH = 2;
export const LOCKED_SHAPE_OPACITY = 0.6; // Reduced opacity for locked shapes
export const LOCKED_SHAPE_STROKE_COLOR = '#ef4444'; // Red border for locked shapes

// Animation and Performance
export const SMOOTH_TRANSITION_DURATION = 0.2; // Seconds for smooth animations
export const CURSOR_UPDATE_THROTTLE = 16; // ~60 FPS for cursor updates (16ms)
