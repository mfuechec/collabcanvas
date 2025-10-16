import { test, expect } from '@playwright/test';
import {
  getCanvas,
  createRectangle,
  selectShape,
  deleteSelectedShape,
  getShapeCount,
  undo,
  redo,
  clearAllShapes,
  injectTestHelpers
} from '../helpers/canvas-helpers.js';

test.describe('Undo/Redo Operations', () => {
  test.beforeEach(async ({ page }) => {
    await injectTestHelpers(page);
    await page.goto('/');
    
    await page.waitForSelector('canvas', { timeout: 10000 });
    await clearAllShapes(page);
    await page.waitForTimeout(1000);
  });

  test('should undo shape creation', async ({ page }) => {
    const initialCount = await getShapeCount(page);
    
    // Create a shape
    await createRectangle(page, { x: 500, y: 500, width: 100, height: 100 });
    const countAfterCreate = await getShapeCount(page);
    expect(countAfterCreate).toBe(initialCount + 1);
    
    // Undo
    await undo(page);
    const countAfterUndo = await getShapeCount(page);
    expect(countAfterUndo).toBe(initialCount);
  });

  test('should redo shape creation', async ({ page }) => {
    const initialCount = await getShapeCount(page);
    
    // Create a shape
    await createRectangle(page, { x: 500, y: 500, width: 100, height: 100 });
    
    // Undo
    await undo(page);
    expect(await getShapeCount(page)).toBe(initialCount);
    
    // Redo
    await redo(page);
    expect(await getShapeCount(page)).toBe(initialCount + 1);
  });

  test('should undo shape deletion', async ({ page }) => {
    // Create a shape
    await createRectangle(page, { x: 500, y: 500, width: 100, height: 100 });
    const countAfterCreate = await getShapeCount(page);
    
    // Delete it
    await selectShape(page, { x: 500, y: 500 });
    await deleteSelectedShape(page);
    const countAfterDelete = await getShapeCount(page);
    expect(countAfterDelete).toBe(countAfterCreate - 1);
    
    // Undo deletion
    await undo(page);
    const countAfterUndo = await getShapeCount(page);
    expect(countAfterUndo).toBe(countAfterCreate);
  });

  test('should redo shape deletion', async ({ page }) => {
    // Create a shape
    await createRectangle(page, { x: 500, y: 500, width: 100, height: 100 });
    const countAfterCreate = await getShapeCount(page);
    
    // Delete it
    await selectShape(page, { x: 500, y: 500 });
    await deleteSelectedShape(page);
    
    // Undo deletion (shape comes back)
    await undo(page);
    expect(await getShapeCount(page)).toBe(countAfterCreate);
    
    // Redo deletion (shape is deleted again)
    await redo(page);
    expect(await getShapeCount(page)).toBe(countAfterCreate - 1);
  });

  test('CRITICAL: should handle undo/redo delete cycle without errors', async ({ page }) => {
    // This test specifically addresses the disconnect cleanup bug
    // where redo after undo of delete would leave orphaned handlers
    
    // Create multiple shapes
    await createRectangle(page, { x: 300, y: 300, width: 100, height: 100 });
    await createRectangle(page, { x: 600, y: 600, width: 100, height: 100 });
    await createRectangle(page, { x: 900, y: 900, width: 100, height: 100 });
    
    const initialCount = await getShapeCount(page);
    
    // Delete one
    await selectShape(page, { x: 600, y: 600 });
    await deleteSelectedShape(page);
    
    // Undo (brings it back)
    await undo(page);
    
    // Redo (deletes it again) - This should NOT leave orphaned handlers
    await redo(page);
    
    // Verify count is correct
    expect(await getShapeCount(page)).toBe(initialCount - 1);
    
    // Refresh page to trigger any orphaned disconnect handlers
    await page.reload();
    await page.waitForSelector('canvas');
    await page.waitForTimeout(2000);
    
    // Listen for console errors
    const errors = [];
    page.on('console', msg => {
      if (msg.type() === 'error' || msg.text().includes('Error unlocking shape')) {
        errors.push(msg.text());
      }
    });
    
    // Wait a bit to see if any disconnect cleanup errors occur
    await page.waitForTimeout(2000);
    
    // Should not have any "Shape not found" or "Error unlocking shape" errors
    const hasDisconnectErrors = errors.some(err => 
      err.includes('Shape not found') || err.includes('Error unlocking shape')
    );
    
    expect(hasDisconnectErrors).toBe(false);
  });

  test('should handle multiple undo/redo cycles', async ({ page }) => {
    const initialCount = await getShapeCount(page);
    
    // Create 3 shapes
    await createRectangle(page, { x: 300, y: 300, width: 100, height: 100 });
    await createRectangle(page, { x: 600, y: 600, width: 100, height: 100 });
    await createRectangle(page, { x: 900, y: 900, width: 100, height: 100 });
    
    expect(await getShapeCount(page)).toBe(initialCount + 3);
    
    // Undo all 3
    await undo(page);
    await undo(page);
    await undo(page);
    
    expect(await getShapeCount(page)).toBe(initialCount);
    
    // Redo 2
    await redo(page);
    await redo(page);
    
    expect(await getShapeCount(page)).toBe(initialCount + 2);
    
    // Undo 1
    await undo(page);
    
    expect(await getShapeCount(page)).toBe(initialCount + 1);
  });

  test('should preserve shape IDs across undo/redo cycles', async ({ page }) => {
    // Create a shape
    await createRectangle(page, { x: 500, y: 500, width: 100, height: 100 });
    
    // Get its ID
    const originalId = await page.evaluate(() => {
      const shapes = window.__playwright_getShapes?.() || [];
      return shapes[0]?.id;
    });
    
    // Delete it
    await selectShape(page, { x: 500, y: 500 });
    await deleteSelectedShape(page);
    
    // Undo deletion (brings it back)
    await undo(page);
    
    // Get ID again
    const restoredId = await page.evaluate(() => {
      const shapes = window.__playwright_getShapes?.() || [];
      return shapes[0]?.id;
    });
    
    // IDs should match (critical for redo to work correctly)
    expect(restoredId).toBe(originalId);
  });

  test('should clear redo stack when new action is performed', async ({ page }) => {
    // Create a shape
    await createRectangle(page, { x: 500, y: 500, width: 100, height: 100 });
    const countAfterFirst = await getShapeCount(page);
    
    // Undo
    await undo(page);
    
    // Create a different shape (should clear redo stack)
    await createRectangle(page, { x: 700, y: 700, width: 100, height: 100 });
    
    // Try to redo - should do nothing since redo stack was cleared
    await redo(page);
    
    // Count should still be countAfterFirst (not countAfterFirst + 1)
    expect(await getShapeCount(page)).toBe(countAfterFirst);
  });
});

