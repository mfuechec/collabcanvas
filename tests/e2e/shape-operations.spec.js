import { test, expect } from '@playwright/test';
import {
  getCanvas,
  createRectangle,
  createCircle,
  selectShape,
  dragShape,
  deleteSelectedShape,
  getShapeCount,
  getShapeProperties,
  updateShapeProperty,
  clearAllShapes,
  injectTestHelpers
} from '../helpers/canvas-helpers.js';

test.describe('Shape Operations', () => {
  test.beforeEach(async ({ page }) => {
    await injectTestHelpers(page);
    await page.goto('/');
    
    // Wait for canvas to load
    await page.waitForSelector('canvas', { timeout: 10000 });
    
    // Clear any existing shapes
    await clearAllShapes(page);
    await page.waitForTimeout(1000);
  });

  test('should create a rectangle shape', async ({ page }) => {
    const initialCount = await getShapeCount(page);
    
    await createRectangle(page, { x: 500, y: 500, width: 200, height: 100 });
    
    const newCount = await getShapeCount(page);
    expect(newCount).toBe(initialCount + 1);
  });

  test('should create a circle shape', async ({ page }) => {
    const initialCount = await getShapeCount(page);
    
    await createCircle(page, { x: 600, y: 600, radius: 75 });
    
    const newCount = await getShapeCount(page);
    expect(newCount).toBe(initialCount + 1);
  });

  test('should select a shape and show properties panel', async ({ page }) => {
    // Create a rectangle
    await createRectangle(page, { x: 500, y: 500, width: 200, height: 100 });
    
    // Select it
    await selectShape(page, { x: 500, y: 500 });
    
    // Check properties panel is visible
    await expect(page.locator('[data-testid="properties-panel"]')).toBeVisible();
  });

  test('should drag a shape to new position', async ({ page }) => {
    // Create a rectangle
    await createRectangle(page, { x: 500, y: 500, width: 100, height: 100 });
    
    // Select it
    await selectShape(page, { x: 500, y: 500 });
    
    // Get initial position
    const initialProps = await getShapeProperties(page);
    
    // Drag it
    await dragShape(page, {
      fromX: 500,
      fromY: 500,
      toX: 700,
      toY: 700
    });
    
    // Wait for update
    await page.waitForTimeout(500);
    
    // Re-select and check new position
    await selectShape(page, { x: 700, y: 700 });
    const newProps = await getShapeProperties(page);
    
    expect(newProps.x).toBeGreaterThan(initialProps.x);
    expect(newProps.y).toBeGreaterThan(initialProps.y);
  });

  test('should respect canvas boundaries when dragging', async ({ page }) => {
    // Create a rectangle near the edge
    await createRectangle(page, { x: 4900, y: 4900, width: 100, height: 100 });
    
    // Select it
    await selectShape(page, { x: 4900, y: 4900 });
    
    // Try to drag it beyond boundary
    await dragShape(page, {
      fromX: 4900,
      fromY: 4900,
      toX: 5100,  // Beyond 5000px boundary
      toY: 5100
    });
    
    // Re-select and check position is constrained
    await selectShape(page, { x: 4900, y: 4900 });
    const props = await getShapeProperties(page);
    
    // Shape should be constrained within canvas (0-5000)
    expect(props.x).toBeLessThanOrEqual(5000);
    expect(props.y).toBeLessThanOrEqual(5000);
  });

  test('should delete a selected shape', async ({ page }) => {
    // Create a shape
    await createRectangle(page, { x: 500, y: 500, width: 100, height: 100 });
    
    const countAfterCreate = await getShapeCount(page);
    
    // Select it
    await selectShape(page, { x: 500, y: 500 });
    
    // Delete it
    await deleteSelectedShape(page);
    
    const countAfterDelete = await getShapeCount(page);
    expect(countAfterDelete).toBe(countAfterCreate - 1);
  });

  test('should update shape fill color via properties panel', async ({ page }) => {
    // Create a shape
    await createRectangle(page, { x: 500, y: 500, width: 100, height: 100 });
    
    // Select it
    await selectShape(page, { x: 500, y: 500 });
    
    // Change fill color
    await updateShapeProperty(page, 'fill', '#FF0000');
    
    // Verify color changed
    const props = await getShapeProperties(page);
    expect(props.fill.toLowerCase()).toBe('#ff0000');
  });

  test('should update shape opacity via properties panel', async ({ page }) => {
    // Create a shape
    await createRectangle(page, { x: 500, y: 500, width: 100, height: 100 });
    
    // Select it
    await selectShape(page, { x: 500, y: 500 });
    
    // Change opacity
    await updateShapeProperty(page, 'opacity', '0.5');
    
    // Verify opacity changed
    const props = await getShapeProperties(page);
    expect(props.opacity).toBe(0.5);
  });

  test('should create multiple shapes', async ({ page }) => {
    const initialCount = await getShapeCount(page);
    
    // Create multiple shapes
    await createRectangle(page, { x: 300, y: 300, width: 100, height: 100 });
    await createCircle(page, { x: 600, y: 600, radius: 50 });
    await createRectangle(page, { x: 900, y: 900, width: 150, height: 75 });
    
    const finalCount = await getShapeCount(page);
    expect(finalCount).toBe(initialCount + 3);
  });

  test('should persist shapes after page refresh', async ({ page }) => {
    // Create a shape
    await createRectangle(page, { x: 500, y: 500, width: 100, height: 100 });
    
    const countBeforeRefresh = await getShapeCount(page);
    
    // Refresh page
    await page.reload();
    await page.waitForSelector('canvas');
    await page.waitForTimeout(2000); // Wait for Firebase load
    
    const countAfterRefresh = await getShapeCount(page);
    expect(countAfterRefresh).toBe(countBeforeRefresh);
  });
});

