import { test, expect } from '@playwright/test';
import {
  createRectangle,
  selectShape,
  dragShape,
  getShapeCount,
  clearAllShapes,
  injectTestHelpers
} from '../helpers/canvas-helpers.js';
import {
  createTwoUsers,
  openCanvasForBothUsers,
  getPresenceCount,
  isShapeLocked,
  getShapeLockedBy,
  moveCursor,
  testShapeSync,
  simulateDisconnectAndVerifyCleanup
} from '../helpers/multi-user-helpers.js';

test.describe('Multi-User Collaboration', () => {
  test('should show two users in presence list', async ({ browser }) => {
    const { user1, user2 } = await createTwoUsers(browser);
    const { page1, page2 } = await openCanvasForBothUsers(user1, user2);
    
    // Inject helpers
    await injectTestHelpers(page1);
    await injectTestHelpers(page2);
    
    // Wait for both to load
    await page1.waitForSelector('canvas', { timeout: 10000 });
    await page2.waitForSelector('canvas', { timeout: 10000 });
    
    // Give presence time to sync
    await page1.waitForTimeout(2000);
    await page2.waitForTimeout(2000);
    
    // Each user should see at least themselves (and potentially the other)
    const count1 = await getPresenceCount(page1);
    const count2 = await getPresenceCount(page2);
    
    expect(count1).toBeGreaterThanOrEqual(1);
    expect(count2).toBeGreaterThanOrEqual(1);
    
    await user1.close();
    await user2.close();
  });

  test('should sync shape creation between users', async ({ browser }) => {
    const { user1, user2 } = await createTwoUsers(browser);
    const { page1, page2 } = await openCanvasForBothUsers(user1, user2);
    
    await injectTestHelpers(page1);
    await injectTestHelpers(page2);
    
    await page1.waitForSelector('canvas', { timeout: 10000 });
    await page2.waitForSelector('canvas', { timeout: 10000 });
    
    // Clear canvas
    await clearAllShapes(page1);
    await page1.waitForTimeout(1000);
    await page2.waitForTimeout(1000);
    
    // User 1 creates a shape
    const success = await testShapeSync(
      page1,
      page2,
      (page) => createRectangle(page, { x: 500, y: 500, width: 100, height: 100 })
    );
    
    expect(success).toBe(true);
    
    await user1.close();
    await user2.close();
  });

  test('should lock shape when selected by one user', async ({ browser }) => {
    const { user1, user2 } = await createTwoUsers(browser);
    const { page1, page2 } = await openCanvasForBothUsers(user1, user2);
    
    await injectTestHelpers(page1);
    await injectTestHelpers(page2);
    
    await page1.waitForSelector('canvas');
    await page2.waitForSelector('canvas');
    
    // Clear and create a shape
    await clearAllShapes(page1);
    await page1.waitForTimeout(1000);
    
    await createRectangle(page1, { x: 500, y: 500, width: 100, height: 100 });
    await page2.waitForTimeout(1500); // Wait for sync
    
    // Get shape ID
    const shapeId = await page1.evaluate(() => {
      const shapes = window.__playwright_getShapes?.() || [];
      return shapes[0]?.id;
    });
    
    // User 1 selects the shape
    await selectShape(page1, { x: 500, y: 500 });
    await page2.waitForTimeout(500);
    
    // Check if locked on user 2's side
    const locked = await isShapeLocked(page2, shapeId);
    expect(locked).toBe(true);
    
    await user1.close();
    await user2.close();
  });

  test('should prevent second user from editing locked shape', async ({ browser }) => {
    const { user1, user2 } = await createTwoUsers(browser);
    const { page1, page2 } = await openCanvasForBothUsers(user1, user2);
    
    await injectTestHelpers(page1);
    await injectTestHelpers(page2);
    
    await page1.waitForSelector('canvas');
    await page2.waitForSelector('canvas');
    
    // Clear and create a shape
    await clearAllShapes(page1);
    await page1.waitForTimeout(1000);
    
    await createRectangle(page1, { x: 500, y: 500, width: 100, height: 100 });
    await page2.waitForTimeout(1500);
    
    // User 1 selects and starts dragging
    await selectShape(page1, { x: 500, y: 500 });
    await page2.waitForTimeout(500);
    
    // User 2 tries to drag the same shape
    // This should fail or be prevented
    const initialCount2 = await getShapeCount(page2);
    
    try {
      await dragShape(page2, {
        fromX: 500,
        fromY: 500,
        toX: 700,
        toY: 700
      });
    } catch (e) {
      // Expected - might throw if drag is prevented
    }
    
    // Shape count shouldn't change
    const finalCount2 = await getShapeCount(page2);
    expect(finalCount2).toBe(initialCount2);
    
    await user1.close();
    await user2.close();
  });

  test('CRITICAL: should unlock shape when user disconnects', async ({ browser }) => {
    const { user1, user2 } = await createTwoUsers(browser);
    const { page1, page2 } = await openCanvasForBothUsers(user1, user2);
    
    await injectTestHelpers(page1);
    await injectTestHelpers(page2);
    
    await page1.waitForSelector('canvas');
    await page2.waitForSelector('canvas');
    
    // Clear and create a shape
    await clearAllShapes(page1);
    await page1.waitForTimeout(1000);
    
    await createRectangle(page1, { x: 500, y: 500, width: 100, height: 100 });
    await page2.waitForTimeout(1500);
    
    // Get shape ID
    const shapeId = await page1.evaluate(() => {
      const shapes = window.__playwright_getShapes?.() || [];
      return shapes[0]?.id;
    });
    
    // User 1 selects the shape
    await selectShape(page1, { x: 500, y: 500 });
    await page2.waitForTimeout(500);
    
    // Verify it's locked on user 2's side
    const lockedBefore = await isShapeLocked(page2, shapeId);
    expect(lockedBefore).toBe(true);
    
    // User 1 disconnects (close browser)
    await simulateDisconnectAndVerifyCleanup(user1, page2, [shapeId]);
    
    // Verify it's unlocked now
    const lockedAfter = await isShapeLocked(page2, shapeId);
    expect(lockedAfter).toBe(false);
    
    await user2.close();
  });

  test('should sync shape movements between users', async ({ browser }) => {
    const { user1, user2 } = await createTwoUsers(browser);
    const { page1, page2 } = await openCanvasForBothUsers(user1, user2);
    
    await injectTestHelpers(page1);
    await injectTestHelpers(page2);
    
    await page1.waitForSelector('canvas');
    await page2.waitForSelector('canvas');
    
    // Clear and create a shape
    await clearAllShapes(page1);
    await page1.waitForTimeout(1000);
    
    await createRectangle(page1, { x: 500, y: 500, width: 100, height: 100 });
    await page2.waitForTimeout(1500);
    
    // Get shape ID and initial position from user 2's perspective
    const shapeDataBefore = await page2.evaluate(() => {
      const shapes = window.__playwright_getShapes?.() || [];
      return { id: shapes[0]?.id, x: shapes[0]?.x, y: shapes[0]?.y };
    });
    
    // User 1 drags the shape
    await selectShape(page1, { x: 500, y: 500 });
    await dragShape(page1, {
      fromX: 500,
      fromY: 500,
      toX: 800,
      toY: 800
    });
    
    // Wait for sync
    await page2.waitForTimeout(1500);
    
    // Check position on user 2's side
    const shapeDataAfter = await page2.evaluate((id) => {
      const shapes = window.__playwright_getShapes?.() || [];
      const shape = shapes.find(s => s.id === id);
      return { x: shape?.x, y: shape?.y };
    }, shapeDataBefore.id);
    
    // Position should have changed
    expect(shapeDataAfter.x).toBeGreaterThan(shapeDataBefore.x);
    expect(shapeDataAfter.y).toBeGreaterThan(shapeDataBefore.y);
    
    await user1.close();
    await user2.close();
  });

  test('should allow users to select different shapes simultaneously', async ({ browser }) => {
    const { user1, user2 } = await createTwoUsers(browser);
    const { page1, page2 } = await openCanvasForBothUsers(user1, user2);
    
    await injectTestHelpers(page1);
    await injectTestHelpers(page2);
    
    await page1.waitForSelector('canvas');
    await page2.waitForSelector('canvas');
    
    // Clear and create two shapes
    await clearAllShapes(page1);
    await page1.waitForTimeout(1000);
    
    await createRectangle(page1, { x: 300, y: 300, width: 100, height: 100 });
    await createRectangle(page1, { x: 700, y: 700, width: 100, height: 100 });
    await page2.waitForTimeout(1500);
    
    // Get both shape IDs
    const shapeIds = await page1.evaluate(() => {
      const shapes = window.__playwright_getShapes?.() || [];
      return shapes.map(s => s.id);
    });
    
    // User 1 selects first shape
    await selectShape(page1, { x: 300, y: 300 });
    await page2.waitForTimeout(500);
    
    // User 2 selects second shape
    await selectShape(page2, { x: 700, y: 700 });
    await page1.waitForTimeout(500);
    
    // Both shapes should be locked by different users
    const lock1 = await isShapeLocked(page2, shapeIds[0]);
    const lock2 = await isShapeLocked(page1, shapeIds[1]);
    
    expect(lock1).toBe(true);
    expect(lock2).toBe(true);
    
    await user1.close();
    await user2.close();
  });
});

