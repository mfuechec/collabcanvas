/**
 * Canvas interaction helpers for e2e tests
 */

/**
 * Get the canvas element
 */
export async function getCanvas(page) {
  return await page.locator('canvas').first();
}

/**
 * Wait for shapes to load from Firebase
 */
export async function waitForShapesLoad(page, expectedCount = null, timeout = 5000) {
  if (expectedCount !== null) {
    await page.waitForFunction(
      (count) => {
        return window.__playwright_getShapeCount && window.__playwright_getShapeCount() === count;
      },
      expectedCount,
      { timeout }
    );
  } else {
    // Just wait for initial load
    await page.waitForTimeout(2000);
  }
}

/**
 * Get shape count from the canvas
 */
export async function getShapeCount(page) {
  return await page.evaluate(() => {
    // Access React state via window helper (we'll inject this)
    return window.__playwright_getShapeCount ? window.__playwright_getShapeCount() : 0;
  });
}

/**
 * Create a rectangle shape
 */
export async function createRectangle(page, { x = 500, y = 500, width = 100, height = 100 } = {}) {
  // Select rectangle tool
  await page.click('[data-testid="tool-rectangle"]');
  
  const canvas = await getCanvas(page);
  const box = await canvas.boundingBox();
  
  // Calculate canvas coordinates
  const startX = box.x + x;
  const startY = box.y + y;
  const endX = startX + width;
  const endY = startY + height;
  
  // Draw rectangle
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(endX, endY);
  await page.mouse.up();
  
  // Wait for shape to be created
  await page.waitForTimeout(500);
}

/**
 * Create a circle shape
 */
export async function createCircle(page, { x = 500, y = 500, radius = 50 } = {}) {
  // Select circle tool
  await page.click('[data-testid="tool-circle"]');
  
  const canvas = await getCanvas(page);
  const box = await canvas.boundingBox();
  
  // Calculate canvas coordinates
  const centerX = box.x + x;
  const centerY = box.y + y;
  const edgeX = centerX + radius;
  const edgeY = centerY;
  
  // Draw circle
  await page.mouse.move(centerX, centerY);
  await page.mouse.down();
  await page.mouse.move(edgeX, edgeY);
  await page.mouse.up();
  
  // Wait for shape to be created
  await page.waitForTimeout(500);
}

/**
 * Select a shape at given coordinates
 */
export async function selectShape(page, { x, y }) {
  // Switch to move/select tool
  await page.click('[data-testid="tool-hand"]');
  
  const canvas = await getCanvas(page);
  const box = await canvas.boundingBox();
  
  // Click on shape
  await page.mouse.click(box.x + x, box.y + y);
  
  // Wait for selection
  await page.waitForTimeout(300);
}

/**
 * Drag a shape from one position to another
 */
export async function dragShape(page, { fromX, fromY, toX, toY }) {
  const canvas = await getCanvas(page);
  const box = await canvas.boundingBox();
  
  const startX = box.x + fromX;
  const startY = box.y + fromY;
  const endX = box.x + toX;
  const endY = box.y + toY;
  
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(endX, endY);
  await page.mouse.up();
  
  // Wait for drag to complete
  await page.waitForTimeout(500);
}

/**
 * Delete selected shape
 */
export async function deleteSelectedShape(page) {
  await page.keyboard.press('Delete');
  await page.waitForTimeout(300);
}

/**
 * Undo last action
 */
export async function undo(page) {
  await page.keyboard.press('Meta+Z'); // Cmd+Z on Mac, Ctrl+Z on Windows
  await page.waitForTimeout(500);
}

/**
 * Redo last undone action
 */
export async function redo(page) {
  await page.keyboard.press('Meta+Shift+Z'); // Cmd+Shift+Z
  await page.waitForTimeout(500);
}

/**
 * Clear all shapes on canvas
 */
export async function clearAllShapes(page) {
  await page.evaluate(() => {
    if (window.__playwright_clearAllShapes) {
      window.__playwright_clearAllShapes();
    }
  });
  await page.waitForTimeout(1000);
}

/**
 * Get shape properties from properties panel
 */
export async function getShapeProperties(page) {
  // Wait for properties panel to be visible
  await page.waitForSelector('[data-testid="properties-panel"]', { state: 'visible', timeout: 2000 });
  
  const x = await page.locator('input[name="x"]').inputValue();
  const y = await page.locator('input[name="y"]').inputValue();
  const fill = await page.locator('input[name="fill"]').inputValue();
  const opacity = await page.locator('input[name="opacity"]').inputValue();
  
  return {
    x: parseFloat(x),
    y: parseFloat(y),
    fill,
    opacity: parseFloat(opacity)
  };
}

/**
 * Update shape property via properties panel
 */
export async function updateShapeProperty(page, property, value) {
  await page.locator(`input[name="${property}"]`).fill(value.toString());
  await page.keyboard.press('Enter');
  await page.waitForTimeout(300);
}

/**
 * Inject test helpers into the page
 * This gives us access to React state for assertions
 */
export async function injectTestHelpers(page) {
  await page.addInitScript(() => {
    // These will be set by the app when it loads
    window.__playwright_getShapeCount = null;
    window.__playwright_clearAllShapes = null;
    window.__playwright_getShapes = null;
  });
}

