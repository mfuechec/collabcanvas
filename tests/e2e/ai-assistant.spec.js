import { test, expect } from '@playwright/test';
import {
  getShapeCount,
  clearAllShapes,
  injectTestHelpers
} from '../helpers/canvas-helpers.js';

test.describe('AI Assistant', () => {
  test.beforeEach(async ({ page }) => {
    await injectTestHelpers(page);
    await page.goto('/');
    
    await page.waitForSelector('canvas', { timeout: 10000 });
    await clearAllShapes(page);
    await page.waitForTimeout(1000);
  });

  test('should open and close AI assistant panel', async ({ page }) => {
    // Check if AI assistant toggle exists
    const aiToggle = page.locator('[data-testid="ai-assistant-toggle"]');
    await expect(aiToggle).toBeVisible();
    
    // Open AI panel
    await aiToggle.click();
    
    // Check panel is visible
    const aiPanel = page.locator('[data-testid="ai-assistant-panel"]');
    await expect(aiPanel).toBeVisible();
    
    // Close panel
    const closeButton = page.locator('[data-testid="ai-assistant-close"]');
    await closeButton.click();
    
    // Panel should be minimized/hidden
    await page.waitForTimeout(500);
  });

  test('should send message to AI assistant', async ({ page }) => {
    // Open AI panel
    await page.click('[data-testid="ai-assistant-toggle"]');
    
    // Type a message
    const input = page.locator('[data-testid="ai-assistant-input"]');
    await input.fill('Create a red rectangle');
    
    // Send
    await page.keyboard.press('Enter');
    
    // Wait for AI response
    await page.waitForSelector('[data-testid="ai-message"]', { timeout: 15000 });
    
    // Check for response
    const messages = await page.locator('[data-testid="ai-message"]').count();
    expect(messages).toBeGreaterThan(0);
  });

  test('should create shape via AI command', async ({ page }) => {
    const initialCount = await getShapeCount(page);
    
    // Open AI panel
    await page.click('[data-testid="ai-assistant-toggle"]');
    
    // Send command to create a shape
    const input = page.locator('[data-testid="ai-assistant-input"]');
    await input.fill('Create a 200x200 blue rectangle at the center of the canvas');
    await page.keyboard.press('Enter');
    
    // Wait for AI to process and create shape
    await page.waitForTimeout(5000);
    
    // Check if shape was created
    const newCount = await getShapeCount(page);
    expect(newCount).toBeGreaterThan(initialCount);
  });

  test('should delete shapes via AI command', async ({ page }) => {
    // First, create some shapes manually
    const createShapes = async (count) => {
      for (let i = 0; i < count; i++) {
        await page.evaluate(() => {
          window.__playwright_createTestShape?.({
            type: 'rectangle',
            x: 300 + i * 150,
            y: 300,
            width: 100,
            height: 100,
            fill: '#FF0000'
          });
        });
      }
    };
    
    await createShapes(3);
    await page.waitForTimeout(1000);
    
    const initialCount = await getShapeCount(page);
    expect(initialCount).toBeGreaterThanOrEqual(3);
    
    // Open AI panel
    await page.click('[data-testid="ai-assistant-toggle"]');
    
    // Send delete command
    const input = page.locator('[data-testid="ai-assistant-input"]');
    await input.fill('Delete all red rectangles');
    await page.keyboard.press('Enter');
    
    // Wait for AI to process
    await page.waitForTimeout(5000);
    
    // Check if shapes were deleted
    const newCount = await getShapeCount(page);
    expect(newCount).toBeLessThan(initialCount);
  });

  test('should batch create multiple shapes via AI', async ({ page }) => {
    const initialCount = await getShapeCount(page);
    
    // Open AI panel
    await page.click('[data-testid="ai-assistant-toggle"]');
    
    // Send batch create command
    const input = page.locator('[data-testid="ai-assistant-input"]');
    await input.fill('Create 5 random colored circles');
    await page.keyboard.press('Enter');
    
    // Wait for AI to process
    await page.waitForTimeout(8000);
    
    // Check if shapes were created
    const newCount = await getShapeCount(page);
    expect(newCount).toBeGreaterThanOrEqual(initialCount + 5);
  });

  test('should move shapes via AI command', async ({ page }) => {
    // Create a test shape
    await page.evaluate(() => {
      window.__playwright_createTestShape?.({
        type: 'rectangle',
        x: 500,
        y: 500,
        width: 100,
        height: 100,
        fill: '#00FF00'
      });
    });
    await page.waitForTimeout(1000);
    
    // Get initial position
    const initialPos = await page.evaluate(() => {
      const shapes = window.__playwright_getShapes?.() || [];
      return { x: shapes[0]?.x, y: shapes[0]?.y };
    });
    
    // Open AI panel
    await page.click('[data-testid="ai-assistant-toggle"]');
    
    // Send move command
    const input = page.locator('[data-testid="ai-assistant-input"]');
    await input.fill('Move the green rectangle to x:1000, y:1000');
    await page.keyboard.press('Enter');
    
    // Wait for AI to process
    await page.waitForTimeout(5000);
    
    // Get new position
    const newPos = await page.evaluate(() => {
      const shapes = window.__playwright_getShapes?.() || [];
      return { x: shapes[0]?.x, y: shapes[0]?.y };
    });
    
    // Position should have changed
    expect(newPos.x).not.toBe(initialPos.x);
    expect(newPos.y).not.toBe(initialPos.y);
  });

  test('should handle invalid AI commands gracefully', async ({ page }) => {
    // Open AI panel
    await page.click('[data-testid="ai-assistant-toggle"]');
    
    // Send invalid/nonsense command
    const input = page.locator('[data-testid="ai-assistant-input"]');
    await input.fill('asdfghjkl qwerty');
    await page.keyboard.press('Enter');
    
    // Wait for response
    await page.waitForTimeout(5000);
    
    // AI should respond (even if it's to say it can't do that)
    const messages = await page.locator('[data-testid="ai-message"]').count();
    expect(messages).toBeGreaterThan(0);
    
    // App should not crash
    const canvas = await page.locator('canvas');
    await expect(canvas).toBeVisible();
  });
});

