/**
 * Multi-user collaboration helpers for e2e tests
 * Allows testing with multiple browser contexts simultaneously
 */

/**
 * Create two authenticated browser contexts (users)
 * @param {Browser} browser - Playwright browser instance
 * @returns {Promise<{user1: BrowserContext, user2: BrowserContext}>}
 */
export async function createTwoUsers(browser) {
  const user1 = await browser.newContext();
  const user2 = await browser.newContext();
  
  return { user1, user2 };
}

/**
 * Open canvas page for both users
 */
export async function openCanvasForBothUsers(user1Context, user2Context) {
  const page1 = await user1Context.newPage();
  const page2 = await user2Context.newPage();
  
  await page1.goto('/');
  await page2.goto('/');
  
  return { page1, page2 };
}

/**
 * Wait for user's cursor to appear on another user's screen
 */
export async function waitForCursorToAppear(page, userId, timeout = 5000) {
  await page.waitForSelector(`[data-testid="cursor-${userId}"]`, { timeout });
}

/**
 * Get presence count (number of online users)
 */
export async function getPresenceCount(page) {
  const presenceElements = await page.locator('[data-testid^="presence-user-"]').count();
  return presenceElements;
}

/**
 * Check if a shape is locked by another user
 */
export async function isShapeLocked(page, shapeId) {
  return await page.evaluate((id) => {
    const shape = window.__playwright_getShapes?.().find(s => s.id === id);
    return shape?.isLocked || false;
  }, shapeId);
}

/**
 * Get locked by user ID for a shape
 */
export async function getShapeLockedBy(page, shapeId) {
  return await page.evaluate((id) => {
    const shape = window.__playwright_getShapes?.().find(s => s.id === id);
    return shape?.lockedBy || null;
  }, shapeId);
}

/**
 * Move cursor on page (for testing cursor sync)
 */
export async function moveCursor(page, x, y) {
  const canvas = await page.locator('canvas').first();
  const box = await canvas.boundingBox();
  
  await page.mouse.move(box.x + x, box.y + y);
  await page.waitForTimeout(200); // Allow cursor position to sync
}

/**
 * Get cursor position of another user (as seen on this page)
 */
export async function getOtherUserCursorPosition(page, userId) {
  const cursorElement = await page.locator(`[data-testid="cursor-${userId}"]`);
  
  if (await cursorElement.count() === 0) {
    return null;
  }
  
  const box = await cursorElement.boundingBox();
  return { x: box.x, y: box.y };
}

/**
 * Simulate disconnect (close browser) and verify cleanup
 */
export async function simulateDisconnectAndVerifyCleanup(context, otherUserPage, expectedUnlocks = []) {
  // Close the context (simulates browser close)
  await context.close();
  
  // Wait for disconnect cleanup to process
  await otherUserPage.waitForTimeout(2000);
  
  // Verify shapes are unlocked
  for (const shapeId of expectedUnlocks) {
    const isLocked = await isShapeLocked(otherUserPage, shapeId);
    if (isLocked) {
      throw new Error(`Shape ${shapeId} is still locked after disconnect`);
    }
  }
}

/**
 * Test real-time sync by having one user create a shape and another verify it appears
 */
export async function testShapeSync(page1, page2, createShapeFn) {
  // Get initial shape count on page2
  const initialCount = await page2.evaluate(() => 
    window.__playwright_getShapeCount?.() || 0
  );
  
  // User 1 creates a shape
  await createShapeFn(page1);
  
  // Wait for sync to page2
  await page2.waitForFunction(
    (expected) => (window.__playwright_getShapeCount?.() || 0) > expected,
    initialCount,
    { timeout: 3000 }
  );
  
  // Verify count increased
  const newCount = await page2.evaluate(() => 
    window.__playwright_getShapeCount?.() || 0
  );
  
  return newCount > initialCount;
}

