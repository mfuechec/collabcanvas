# Shape Logic Consolidation Audit
**Generated:** 2024-10-18  
**Purpose:** Document all shape calculations before consolidation into `src/utils/shapes/`

---

## Executive Summary

**Total Files with Shape Logic:** 8 files  
**Critical Issues Found:** 
- ❌ **17 duplicate coordinate conversion patterns** (center ↔ top-left)
- ❌ **5 different text dimension estimation formulas**
- ❌ **Inconsistent circle handling** (radius vs diameter confusion in positioning.js)
- ❌ **Rotation calculations spread across 3+ files**

**Consolidation Opportunity:** ~500+ lines of duplicate logic can be reduced to ~150 lines of utilities

---

## 1. Coordinate System Summary

### Storage Format (Firebase/State)
```javascript
// ALL shapes stored with TOP-LEFT coordinates
{
  type: 'rectangle' | 'circle' | 'text' | 'line' | 'pen',
  x: number,      // Top-left X
  y: number,      // Top-left Y
  width: number,  // Width (for circles: diameter)
  height: number, // Height (for circles: diameter)
  rotation: number // Degrees, rotates around center
}
```

### Special Cases
- **Circle**: Stored as `{x: topLeft, y: topLeft, width: diameter, height: diameter}` (no `radius` field)
- **Text**: Stored as `{x: topLeft, y: topLeft}` (NO width/height - auto-sized)
- **Line/Pen**: Stored as `{x: topLeft, y: topLeft, points: [x1,y1,x2,y2,...]}` where points are absolute

### Rendering Format (Konva Components)
```javascript
// Rectangle, Circle, Text: Positioned at CENTER with offsetX/offsetY
<Rect
  x={x + width / 2}
  y={y + height / 2}
  width={width}
  height={height}
  offsetX={width / 2}  // Rotation pivot
  offsetY={height / 2} // Rotation pivot
  rotation={rotation}
/>

// Text: Auto-sizes, then centered via callback ref
<Text
  ref={(node) => {
    const actualWidth = node.width();
    const actualHeight = node.height();
    node.offsetX(actualWidth / 2);
    node.offsetY(actualHeight / 2);
    node.x(x + actualWidth / 2);
    node.y(y + actualHeight / 2);
  }}
/>

// Line/Pen: Positioned at center of bounding box
<Line
  points={points}
  x={centerX}
  y={centerY}
  offsetX={centerX}
  offsetY={centerY}
/>
```

### AI Input Format
```javascript
// AI provides CENTER coordinates, we convert to TOP-LEFT for storage
// See: src/services/ai/tools/create/*.js
createRectangle({x: centerX, y: centerY, width, height})
  → stored as {x: centerX - width/2, y: centerY - height/2, width, height}
```

---

## 2. Calculation Inventory

### A. Center ↔ Top-Left Conversions (MOST DUPLICATED)

#### Pattern: **Rectangle/Circle Center → Top-Left**
```javascript
// DUPLICATE #1: Shape.jsx line 189-190
boundingBoxX = shapePos.x - width / 2;
boundingBoxY = shapePos.y - height / 2;

// DUPLICATE #2: Shape.jsx line 288-289  
boundingBoxX = newPos.x - actualWidth / 2;
boundingBoxY = newPos.y - actualHeight / 2;

// DUPLICATE #3: Shape.jsx line 459-460
boundingBoxX = finalPos.x - actualWidth / 2;
boundingBoxY = finalPos.y - actualHeight / 2;

// DUPLICATE #4: Shape.jsx line 469-470
boundingBoxX = finalPos.x - width / 2;
boundingBoxY = finalPos.y - height / 2;

// DUPLICATE #5: Minimap.jsx line 86-87 (inverted for rendering)
ctx.translate(x + width / 2, y + height / 2);

// DUPLICATE #6: Canvas.jsx line 764-765 (drag preview)
const centerX = dragPreview.x + dragPreview.width / 2;
const centerY = dragPreview.y + dragPreview.height / 2;

// DUPLICATE #7: Canvas.jsx line 808-813 (drag preview rendering)
x={dragPreview.x + dragPreview.width / 2}
y={dragPreview.y + dragPreview.height / 2}
offsetX={dragPreview.width / 2}
offsetY={dragPreview.height / 2}

// DUPLICATE #8: Canvas.jsx line 930-931 (drag label positioning)
centerX = dragPreview.x + (dragPreview.width || 0) / 2;
centerY = dragPreview.y + (dragPreview.height || 0) / 2;
```

**Frequency:** 8 duplicates  
**Target Utility:** `centerToTopLeft(centerX, centerY, width, height)` and `topLeftToCenter(x, y, width, height)`

---

#### Pattern: **Circle Center → Top-Left (with radius)**
```javascript
// DUPLICATE #1: AI circle tool (circle.js line 11-12)
const topLeftX = x - radius;
const topLeftY = y - radius;

// DUPLICATE #2: canvas.js executeSmartOperation line 977-978
const topLeftX = x - radius;
const topLeftY = y - radius;

// DUPLICATE #3: canvas.js batchOperations line 550-551
x: (shapeData.x !== undefined ? shapeData.x : 100) - (shapeData.radius || 50),
y: (shapeData.y !== undefined ? shapeData.y : 100) - (shapeData.radius || 50),

// DUPLICATE #4: canvas.js create_circle_row line 1215-1216
const topLeftX = centerX - radius;
const topLeftY = startY - radius;

// WRONG IMPLEMENTATION: positioning.js line 129-134 (INCONSISTENT!)
// This code assumes circle has radius field AND that x,y are center
// But our storage format doesn't have radius field!
if (shape.type === 'circle') {
  const radius = shape.radius || shape.width / 2 || 50;
  x = x - radius;  // ❌ Bug: x is already top-left!
  y = y - radius;  // ❌ Bug: y is already top-left!
}
```

**Frequency:** 4 correct duplicates + 1 wrong implementation  
**Target Utility:** `circleCenterToTopLeft(centerX, centerY, radius)` → `{x, y, width: diameter, height: diameter}`

---

#### Pattern: **Text Center → Top-Left (with estimation)**
```javascript
// DUPLICATE #1: AI text tool (text.js line 10-14)
const estimatedWidth = text.length * fontSize * 0.6;
const height = fontSize + 8;
const topLeftX = x - (estimatedWidth / 2);
const topLeftY = y - (height / 2);

// DUPLICATE #2: PropertiesPanel.jsx line 104-108 (different formula!)
const fontSize = shape.fontSize || 48;
shapeWidth = text.length * fontSize * 0.6;
shapeHeight = fontSize * 1.2; // ⚠️ Different from above (+ 8)

// DUPLICATE #3: Minimap.jsx line 69-73 (matches PropertiesPanel)
const textContent = shape.text || 'Text';
const fontSize = shape.fontSize || 48;
width = (textContent.length * fontSize * 0.6) * scale;
height = (fontSize * 1.2) * scale;

// DUPLICATE #4: positioning.js line 138-142 (another formula!)
const fontSize = shape.fontSize || 16; // Different default!
const textLength = (shape.text || '').length;
width = textLength * fontSize * 0.6;
height = fontSize * 1.2;
```

**Frequency:** 4 duplicates with **3 different formulas!**  
**Issue:** Inconsistent text dimension estimation  
**Target Utility:** `estimateTextDimensions(text, fontSize)` → `{width, height}`

---

### B. Line/Pen Bounding Box Calculations (COMPLEX)

#### Pattern: **Line Center and Bounding Box**
```javascript
// DUPLICATE #1: Shape.jsx lines 267-273
const centerX = (points[0] + points[2]) / 2;
const centerY = (points[1] + points[3]) / 2;
const minX = Math.min(points[0], points[2]);
const minY = Math.min(points[1], points[3]);
boundingBoxX = newPos.x - (centerX - minX);
boundingBoxY = newPos.y - (centerY - minY);

// DUPLICATE #2: Shape.jsx lines 312-320 (same pattern)
const centerX = (points[0] + points[2]) / 2;
const centerY = (points[1] + points[3]) / 2;
const minX = Math.min(points[0], points[2]);
const minY = Math.min(points[1], points[3]);
constrainedPos = {
  x: constrainedBoundingBox.x + (centerX - minX),
  y: constrainedBoundingBox.y + (centerY - minY)
};

// DUPLICATE #3: Shape.jsx lines 438-444 (drag end)
const centerX = (points[0] + points[2]) / 2;
const centerY = (points[1] + points[3]) / 2;
const minX = Math.min(points[0], points[2]);
const minY = Math.min(points[1], points[3]);
boundingBoxX = finalPos.x - (centerX - minX);
boundingBoxY = finalPos.y - (centerY - minY);

// DUPLICATE #4: Shape.jsx lines 520-526 (optimistic update)
const newCenterX = (translatedPoints[0] + translatedPoints[2]) / 2;
const newCenterY = (translatedPoints[1] + translatedPoints[3]) / 2;
shape.position({ x: newCenterX, y: newCenterY });
shape.offsetX(newCenterX);
shape.offsetY(newCenterY);

// DUPLICATE #5: Canvas.jsx lines 770-771 (drag preview)
const centerX = (dragPreview.points[0] + dragPreview.points[2]) / 2;
const centerY = (dragPreview.points[1] + dragPreview.points[3]) / 2;

// DUPLICATE #6: Canvas.jsx lines 922-924 (label positioning)
centerX = (dragPreview.points[0] + dragPreview.points[2]) / 2;
centerY = (dragPreview.points[1] + dragPreview.points[3]) / 2;

// DUPLICATE #7: Shape.jsx lines 748-749 (rendering)
const centerX = (points[0] + points[2]) / 2;
const centerY = (points[1] + points[3]) / 2;
```

**Frequency:** 7 duplicates  
**Target Utility:** `getLineBounds(points)` → `{x, y, width, height, centerX, centerY}`

---

#### Pattern: **Pen Bounding Box (Complex Points Array)**
```javascript
// DUPLICATE #1: Shape.jsx lines 276-284
const xCoords = points.filter((_, i) => i % 2 === 0);
const yCoords = points.filter((_, i) => i % 2 === 1);
const centerX = (Math.min(...xCoords) + Math.max(...xCoords)) / 2;
const centerY = (Math.min(...yCoords) + Math.max(...yCoords)) / 2;
const minX = Math.min(...xCoords);
const minY = Math.min(...yCoords);
boundingBoxX = newPos.x - (centerX - minX);
boundingBoxY = newPos.y - (centerY - minY);

// DUPLICATE #2: Shape.jsx lines 323-333 (same)
const xCoords = points.filter((_, i) => i % 2 === 0);
const yCoords = points.filter((_, i) => i % 2 === 1);
const centerX = (Math.min(...xCoords) + Math.max(...xCoords)) / 2;
const centerY = (Math.min(...yCoords) + Math.max(...yCoords)) / 2;
const minX = Math.min(...xCoords);
const minY = Math.min(...yCoords);
constrainedPos = {
  x: constrainedBoundingBox.x + (centerX - minX),
  y: constrainedBoundingBox.y + (centerY - minY)
};

// DUPLICATE #3: Shape.jsx lines 447-455
const xCoords = points.filter((_, i) => i % 2 === 0);
const yCoords = points.filter((_, i) => i % 2 === 1);
const centerX = (Math.min(...xCoords) + Math.max(...xCoords)) / 2;
const centerY = (Math.min(...yCoords) + Math.max(...yCoords)) / 2;
const minX = Math.min(...xCoords);
const minY = Math.min(...yCoords);

// DUPLICATE #4: Shape.jsx lines 527-535 (optimistic update)
const xCoords = translatedPoints.filter((_, i) => i % 2 === 0);
const yCoords = translatedPoints.filter((_, i) => i % 2 === 1);
const newCenterX = (Math.min(...xCoords) + Math.max(...xCoords)) / 2;
const newCenterY = (Math.min(...yCoords) + Math.max(...yCoords)) / 2;

// DUPLICATE #5: Shape.jsx lines 573-578 (Firebase update)
const xCoords = updatedPoints.filter((_, i) => i % 2 === 0);
const yCoords = updatedPoints.filter((_, i) => i % 2 === 1);
updates.x = Math.min(...xCoords);
updates.y = Math.min(...yCoords);
updates.width = Math.max(...xCoords) - updates.x;
updates.height = Math.max(...yCoords) - updates.y;

// DUPLICATE #6: Shape.jsx lines 774-777 (rendering)
const xCoords = points.filter((_, i) => i % 2 === 0);
const yCoords = points.filter((_, i) => i % 2 === 1);
const centerX = (Math.min(...xCoords) + Math.max(...xCoords)) / 2;
const centerY = (Math.min(...yCoords) + Math.max(...yCoords)) / 2;

// DUPLICATE #7: Canvas.jsx lines 785-788 (drag preview)
const xCoords = dragPreview.points.filter((_, i) => i % 2 === 0);
const yCoords = dragPreview.points.filter((_, i) => i % 2 === 1);
const centerX = (Math.min(...xCoords) + Math.max(...xCoords)) / 2;
const centerY = (Math.min(...yCoords) + Math.max(...yCoords)) / 2;

// DUPLICATE #8: Canvas.jsx lines 925-928 (label positioning)
const xCoords = dragPreview.points.filter((_, i) => i % 2 === 0);
const yCoords = dragPreview.points.filter((_, i) => i % 2 === 1);
centerX = (Math.min(...xCoords) + Math.max(...xCoords)) / 2;
centerY = (Math.min(...yCoords) + Math.max(...yCoords)) / 2;

// DUPLICATE #9: PropertiesPanel.jsx lines 62-65 (rotation validation)
const xCoords = shape.points.filter((_, i) => i % 2 === 0);
const yCoords = shape.points.filter((_, i) => i % 2 === 1);
const centerX = (Math.min(...xCoords) + Math.max(...xCoords)) / 2;
const centerY = (Math.min(...yCoords) + Math.max(...yCoords)) / 2;
```

**Frequency:** 9 duplicates (!)  
**Target Utility:** `getPenBounds(points)` → `{x, y, width, height, centerX, centerY}`

---

### C. Rotation Calculations

#### Pattern: **Rotated Bounding Box Calculation**
```javascript
// PropertiesPanel.jsx lines 94-134 (complex rotation matrix)
const radians = (rotation * Math.PI) / 180;
const cos = Math.cos(radians);
const sin = Math.sin(radians);

// For rectangles/circles/text:
const corners = [
  { x: 0, y: 0 },
  { x: shapeWidth, y: 0 },
  { x: shapeWidth, y: shapeHeight },
  { x: 0, y: shapeHeight }
];

const rotatedCorners = corners.map(corner => ({
  x: corner.x * cos - corner.y * sin,
  y: corner.x * sin + corner.y * cos
}));

const minX = Math.min(...rotatedCorners.map(c => c.x));
const maxX = Math.max(...rotatedCorners.map(c => c.x));
const minY = Math.min(...rotatedCorners.map(c => c.y));
const maxY = Math.max(...rotatedCorners.map(c => c.y));

// For lines/pen:
const relX = px - centerX;
const relY = py - centerY;
const rotatedX = relX * cos - relY * sin;
const rotatedY = relX * sin + relY * cos;
const finalX = rotatedX + centerX;
const finalY = rotatedY + centerY;
```

**Frequency:** 1 complex implementation  
**Target Utility:** 
- `getRotatedBounds(shape, rotation)` → `{x, y, width, height}` (axis-aligned bounding box)
- `rotatePoint(point, angle, origin)` → `{x, y}` (single point rotation)

---

### D. Actual Dimensions (Text Auto-Sizing)

#### Pattern: **Get Actual Width/Height from Konva**
```javascript
// DUPLICATE #1: Shape.jsx line 82-83
const actualWidth = node.width();
const actualHeight = node.height();

// DUPLICATE #2: Shape.jsx line 258-259
const actualWidth = type === 'text' ? shape.width() : width;
const actualHeight = type === 'text' ? shape.height() : height;

// DUPLICATE #3: Shape.jsx line 431-432
const actualWidth = type === 'text' ? shape.width() : width;
const actualHeight = type === 'text' ? shape.height() : height;
```

**Frequency:** 3 duplicates  
**Target Utility:** `getActualDimensions(shapeData, konvaNode?)` → `{width, height}`

---

### E. Rendering Props (Konva Components)

#### Pattern: **Calculate Konva Rendering Props**
```javascript
// DUPLICATE #1: Shape.jsx lines 831-838 (rectangle rendering)
<Rect
  x={x + width / 2}
  y={y + height / 2}
  width={width}
  height={height}
  offsetX={width / 2}
  offsetY={height / 2}
/>

// DUPLICATE #2: Shape.jsx lines 732-734 (circle rendering)
const centerX = x + width / 2;
const centerY = y + height / 2;
const radius = Math.min(width, height) / 2;

// DUPLICATE #3: Shape.jsx lines 753-758 (line rendering)
x: centerX,
y: centerY,
offsetX: centerX,
offsetY: centerY,

// DUPLICATE #4: Shape.jsx lines 782-786 (pen rendering)
x: centerX,
y: centerY,
offsetX: centerX,
offsetY: centerY,

// DUPLICATE #5: Canvas.jsx lines 808-813 (drag preview)
x={dragPreview.x + dragPreview.width / 2}
y={dragPreview.y + dragPreview.height / 2}
width={dragPreview.width}
height={dragPreview.height}
offsetX={dragPreview.width / 2}
offsetY={dragPreview.height / 2}
```

**Frequency:** 5 duplicates  
**Target Utility:** `getKonvaRenderProps(shapeData)` → `{x, y, width, height, offsetX, offsetY}` (or radius for circles)

---

### F. Bounds Validation

#### Pattern: **Check if Shape Fits in Canvas**
```javascript
// positioning.js lines 103-117 (collision detection)
function hasCollision(x, y, width, height, shapes, padding = 50) {
  const rect1 = { x: x - padding, y: y - padding, width: width + padding * 2, height: height + padding * 2 };
  for (const shape of shapes) {
    const rect2 = getShapeBounds(shape); // ⚠️ BUGGY implementation
    if (rectanglesIntersect(rect1, rect2)) return true;
  }
  return false;
}

// positioning.js lines 151-158
function rectanglesIntersect(rect1, rect2) {
  return !(
    rect1.x + rect1.width < rect2.x ||
    rect2.x + rect2.width < rect1.x ||
    rect1.y + rect1.height < rect2.y ||
    rect2.y + rect2.height < rect1.y
  );
}

// PropertiesPanel.jsx lines 136-141
return (
  adjustedX >= 0 &&
  adjustedY >= 0 &&
  adjustedX + rotatedWidth <= CANVAS_WIDTH &&
  adjustedY + rotatedHeight <= CANVAS_HEIGHT
);
```

**Frequency:** 2 different implementations  
**Target Utility:** 
- `isWithinCanvas(x, y, width, height)` → boolean
- `rectanglesIntersect(rect1, rect2)` → boolean
- `hasCollision(bounds, shapes, padding)` → boolean

---

## 3. Duplicate Patterns Priority

### 🔴 **CRITICAL (Most Duplicated)**
1. **Pen bounding box calculation** - 9 duplicates, complex logic
2. **Center ↔ top-left conversion** - 8+ duplicates, simple but everywhere
3. **Line bounding box calculation** - 7 duplicates

### 🟡 **HIGH (Complex or Buggy)**
4. **Text dimension estimation** - 4 duplicates with INCONSISTENT formulas
5. **Rendering props calculation** - 5 duplicates, needed everywhere
6. **Circle coordinate handling** - 4 correct + 1 BUGGY implementation

### 🟢 **MEDIUM (Important but Less Frequent)**
7. **Rotation matrix calculations** - 1 complex implementation, should be reusable
8. **Actual dimensions (text auto-size)** - 3 duplicates
9. **Collision detection** - 2 implementations

---

## 4. Edge Cases Documented

### Text Auto-Sizing
- **Problem:** Text doesn't have stored width/height - it auto-sizes based on content + fontSize
- **Solution:** Must get actual dimensions from Konva node after rendering
- **Locations:** Shape.jsx lines 76-101, 258-259, 431-432

### Circle Storage Format Confusion
- **Problem:** positioning.js assumes circles have `radius` field and x,y are center
- **Reality:** Circles store `{x: topLeft, y: topLeft, width: diameter, height: diameter}`
- **Bug Location:** positioning.js lines 129-134 - doubles the offset!

### Text Dimension Formula Inconsistency
- **Formula 1:** `height = fontSize + 8` (AI text tool)
- **Formula 2:** `height = fontSize * 1.2` (PropertiesPanel, Minimap)
- **Problem:** Different parts of app calculate different text bounds
- **Recommendation:** Use Formula 2 (`fontSize * 1.2`) - more accurate

### Rotation Pivot Points
- **All shapes rotate around their CENTER**
- **Konva pattern:** `x = center, y = center, offsetX = width/2, offsetY = height/2`
- **Lines/Pen special:** offsetX/offsetY are absolute coordinates (centerX/centerY), not half-dimensions

### Line vs Pen
- **Line:** Always 4 points `[x1, y1, x2, y2]`
- **Pen:** Variable length points array `[x1, y1, x2, y2, ..., xn, yn]`
- **Both:** Points are absolute canvas coordinates, not relative to x,y

---

## 5. Recommendations: What Goes Where

### `src/utils/shapes/bounds.js`
```javascript
export function getShapeBounds(shape)
export function getShapeBoundsWithRotation(shape)
export function getLineBounds(points)
export function getPenBounds(points)
export function isWithinCanvas(x, y, width, height)
export function constrainToCanvas(x, y, width, height)
```

### `src/utils/shapes/coordinates.js`
```javascript
export function centerToTopLeft(centerX, centerY, width, height)
export function topLeftToCenter(x, y, width, height)
export function circleCenterToTopLeft(centerX, centerY, radius)
export function circleTopLeftToCenter(x, y, diameter)
```

### `src/utils/shapes/rendering.js`
```javascript
export function getKonvaRenderProps(shapeData)
export function getActualDimensions(shapeData, konvaNode?)
export function estimateTextDimensions(text, fontSize)
export function konvaPositionToStorage(konvaNode, shapeData)
```

### `src/utils/shapes/rotation.js`
```javascript
export function getRotatedBounds(shape, rotation)
export function rotatePoint(point, angle, origin)
export function canRotateWithoutClipping(shape, newRotation)
```

### `src/utils/shapes/collision.js`
```javascript
export function rectanglesIntersect(rect1, rect2)
export function hasCollision(bounds, shapes, padding)
export function findEmptySpace(width, height, preferredPos, shapes)
```

### `src/utils/shapes/validation.js`
```javascript
export function validateShape(shape)
export function normalizeShape(shape) // Ensure canonical format
```

### `src/utils/shapes/constants.js`
```javascript
export const SHAPE_TYPES = { RECTANGLE: 'rectangle', CIRCLE: 'circle', TEXT: 'text', LINE: 'line', PEN: 'pen' }
export const MIN_SHAPE_SIZE = { width: 10, height: 10 }
export const TEXT_DIMENSION_FORMULA = { WIDTH_PER_CHAR: 0.6, HEIGHT_MULTIPLIER: 1.2 }
```

### `src/utils/shapes/index.js`
```javascript
// Public API - exports everything
export * from './bounds.js'
export * from './coordinates.js'
export * from './rendering.js'
export * from './rotation.js'
export * from './collision.js'
export * from './validation.js'
export * from './constants.js'
```

---

## 6. Migration Priority

### Phase 1: High-Impact, Low-Risk (Week 1)
1. **Create utility structure** - Build all utilities without touching existing code
2. **Move `positioning.js` functions** - Already isolated, easy to extract
3. **Fix circle bug in positioning.js** - Critical bug fix

### Phase 2: Shape.jsx Drag Handlers (Week 2)
4. **Migrate line/pen bounds** - 16 duplicates removed
5. **Migrate center conversions** - 8+ duplicates removed
6. **Migrate actual dimensions** - 3 duplicates removed

### Phase 3: Rendering (Week 2-3)
7. **Migrate Canvas.jsx drag previews** - Uses all the above utilities
8. **Migrate Minimap.jsx** - Canvas 2D rendering calculations
9. **Migrate AI tools** - Simple coordinate conversions

### Phase 4: Complex Logic (Week 3)
10. **Migrate PropertiesPanel rotation** - Complex matrix math
11. **Add rotation utilities** - Reusable for future features

---

## 7. Success Metrics

### Before Consolidation
- **Lines of shape logic:** ~843 lines across 8 files
- **Duplicate patterns:** 17 major duplicates
- **Known bugs:** 1 critical (circle positioning), 1 minor (text dimension inconsistency)

### After Consolidation Target
- **Lines of utilities:** ~200 lines in `src/utils/shapes/`
- **Lines of consumer code:** ~450 lines (using utilities)
- **Duplicate patterns:** 0
- **Known bugs:** 0
- **Test coverage:** 100% of utilities

### Reduction
- **~40% less code overall**
- **~80% reduction in duplicate logic**
- **100% of shape calculations in ONE place**

---

## 8. Known Issues to Fix During Migration

### 🐛 **Bug #1: Circle Position in positioning.js**
**Location:** `src/services/ai/templates/positioning.js:129-134`  
**Issue:** Assumes `shape.radius` exists and that `shape.x/y` are CENTER coordinates  
**Reality:** Circles store `{x: topLeft, y: topLeft, width: diameter, height: diameter}`  
**Impact:** Collision detection for circles is WRONG (doubles the offset)  
**Fix:** Use `getShapeBounds()` utility that handles all shape types correctly

### ⚠️ **Inconsistency #2: Text Dimension Formulas**
**Issue:** Three different formulas for estimating text dimensions  
**Locations:** 
- `text.js`: `height = fontSize + 8`
- `PropertiesPanel.jsx`: `height = fontSize * 1.2`
- `Minimap.jsx`: `height = fontSize * 1.2`
**Impact:** Text bounds calculations might not match between AI creation and rendering  
**Fix:** Standardize on `height = fontSize * 1.2` (more accurate)

### ⚠️ **Inconsistency #3: Text Default Font Size**
**Issue:** Different defaults in different files
- `positioning.js`: `fontSize = 16`
- Most other files: `fontSize = 48`
**Impact:** Text dimension estimates might be off
**Fix:** Use consistent default of `48` everywhere

---

## Next Steps

1. ✅ **Discovery Complete** - This document
2. ⏭️ **Build Utilities** - Create `src/utils/shapes/` with all functions
3. ⏭️ **Write Tests** - Ensure new utilities match old behavior exactly
4. ⏭️ **Migrate File by File** - Start with positioning.js, then Shape.jsx
5. ⏭️ **Add Runtime Validation** - Catch any remaining bugs in development

---

**Document Status:** Ready for Phase 1 Implementation  
**Estimated Consolidation Time:** 2-3 weeks (following the safe, phased approach)

