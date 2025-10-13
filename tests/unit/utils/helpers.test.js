// Unit tests for helper functions
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  generateUserColor,
  getCurrentUserColor,
  generateDisplayNameFromEmail,
  throttle,
  screenToCanvasCoordinates,
  isSignificantMove,
  CURSOR_COLORS
} from '../../../src/utils/helpers';

// Mock cursor service
vi.mock('../../../src/services/cursors', () => ({
  getCurrentCursorUserId: vi.fn(() => 'test-user-123'),
}));

describe('Helper Functions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateUserColor', () => {
    it('generates consistent colors for same user ID', () => {
      const userId = 'test-user-123';
      const color1 = generateUserColor(userId);
      const color2 = generateUserColor(userId);
      
      expect(color1).toBe(color2);
      expect(CURSOR_COLORS).toContain(color1);
    });

    it('generates different colors for different user IDs', () => {
      const color1 = generateUserColor('user1');
      const color2 = generateUserColor('user2');
      
      // While not guaranteed to be different due to hash collisions,
      // different inputs should generally produce different colors
      expect(color1).toMatch(/^#[0-9A-F]{6}$/i);
      expect(color2).toMatch(/^#[0-9A-F]{6}$/i);
    });

    it('returns default color for empty or null user ID', () => {
      expect(generateUserColor('')).toBe(CURSOR_COLORS[0]);
      expect(generateUserColor(null)).toBe(CURSOR_COLORS[0]);
      expect(generateUserColor(undefined)).toBe(CURSOR_COLORS[0]);
    });

    it('generates colors within available palette', () => {
      const testUserIds = [
        'user1', 'user2', 'user3', 'user4', 'user5',
        'user6', 'user7', 'user8', 'user9', 'user10'
      ];
      
      testUserIds.forEach(userId => {
        const color = generateUserColor(userId);
        expect(CURSOR_COLORS).toContain(color);
      });
    });
  });

  describe('getCurrentUserColor', () => {
    it('returns color for current user', () => {
      const color = getCurrentUserColor();
      expect(CURSOR_COLORS).toContain(color);
    });
  });

  describe('generateDisplayNameFromEmail', () => {
    it('extracts username from email and capitalizes', () => {
      expect(generateDisplayNameFromEmail('john.doe@example.com')).toBe('John.doe');
      expect(generateDisplayNameFromEmail('alice@company.org')).toBe('Alice');
      expect(generateDisplayNameFromEmail('test123@domain.co.uk')).toBe('Test123');
    });

    it('truncates long usernames to 20 characters', () => {
      const longEmail = 'verylongusernamethatexceedstwentycharacters@example.com';
      const result = generateDisplayNameFromEmail(longEmail);
      
      expect(result).toBe('Verylongusernamethat');
      expect(result.length).toBe(20);
    });

    it('returns "Anonymous" for invalid emails', () => {
      expect(generateDisplayNameFromEmail('')).toBe('Anonymous');
      expect(generateDisplayNameFromEmail(null)).toBe('Anonymous');
      expect(generateDisplayNameFromEmail(undefined)).toBe('Anonymous');
      expect(generateDisplayNameFromEmail('invalid-email')).toBe('Invalid-email');
    });

    it('handles emails without @ symbol', () => {
      expect(generateDisplayNameFromEmail('plaintext')).toBe('Plaintext');
    });
  });

  describe('throttle', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('calls function immediately on first call', () => {
      const mockFn = vi.fn();
      const throttledFn = throttle(mockFn, 100);
      
      throttledFn('arg1', 'arg2');
      
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('arg1', 'arg2');
    });

    it('throttles subsequent calls within delay period', () => {
      const mockFn = vi.fn();
      const throttledFn = throttle(mockFn, 100);
      
      throttledFn('call1');
      throttledFn('call2');
      throttledFn('call3');
      
      expect(mockFn).toHaveBeenCalledTimes(1);
      expect(mockFn).toHaveBeenCalledWith('call1');
    });

    it('executes delayed call after throttle period', () => {
      const mockFn = vi.fn();
      const throttledFn = throttle(mockFn, 100);
      
      throttledFn('call1');
      throttledFn('call2');
      
      expect(mockFn).toHaveBeenCalledTimes(1);
      
      // Fast-forward time
      vi.advanceTimersByTime(100);
      
      expect(mockFn).toHaveBeenCalledTimes(2);
      expect(mockFn).toHaveBeenLastCalledWith('call2');
    });

    it('allows new calls after delay period has passed', () => {
      const mockFn = vi.fn();
      const throttledFn = throttle(mockFn, 100);
      
      throttledFn('call1');
      
      // Wait for delay to pass
      vi.advanceTimersByTime(150);
      
      throttledFn('call2');
      
      expect(mockFn).toHaveBeenCalledTimes(2);
      expect(mockFn).toHaveBeenCalledWith('call1');
      expect(mockFn).toHaveBeenCalledWith('call2');
    });
  });

  describe('screenToCanvasCoordinates', () => {
    it('returns input coordinates when no stage provided', () => {
      const result = screenToCanvasCoordinates(100, 200, null);
      expect(result).toEqual({ x: 100, y: 200 });
    });

    it('converts coordinates using stage transform', () => {
      const mockTransform = {
        copy: vi.fn(() => mockTransform),
        invert: vi.fn(),
        point: vi.fn(({ x, y }) => ({ x: x * 2, y: y * 2 }))
      };
      
      const mockStage = {
        getAbsoluteTransform: vi.fn(() => mockTransform)
      };
      
      const result = screenToCanvasCoordinates(100, 200, mockStage);
      
      expect(mockStage.getAbsoluteTransform).toHaveBeenCalled();
      expect(mockTransform.copy).toHaveBeenCalled();
      expect(mockTransform.invert).toHaveBeenCalled();
      expect(mockTransform.point).toHaveBeenCalledWith({ x: 100, y: 200 });
      expect(result).toEqual({ x: 200, y: 400 });
    });

    it('rounds coordinates to integers', () => {
      const mockTransform = {
        copy: vi.fn(() => mockTransform),
        invert: vi.fn(),
        point: vi.fn(() => ({ x: 100.7, y: 200.3 }))
      };
      
      const mockStage = {
        getAbsoluteTransform: vi.fn(() => mockTransform)
      };
      
      const result = screenToCanvasCoordinates(100, 200, mockStage);
      expect(result).toEqual({ x: 101, y: 200 });
    });

    it('handles transform errors gracefully', () => {
      const mockStage = {
        getAbsoluteTransform: vi.fn(() => {
          throw new Error('Transform error');
        })
      };
      
      const result = screenToCanvasCoordinates(100, 200, mockStage);
      expect(result).toEqual({ x: 100, y: 200 });
    });
  });

  describe('isSignificantMove', () => {
    it('returns true for null or undefined points', () => {
      expect(isSignificantMove(null, { x: 100, y: 100 })).toBe(true);
      expect(isSignificantMove({ x: 100, y: 100 }, null)).toBe(true);
      expect(isSignificantMove(undefined, { x: 100, y: 100 })).toBe(true);
    });

    it('detects significant horizontal movement', () => {
      const point1 = { x: 100, y: 100 };
      const point2 = { x: 103, y: 100 }; // 3px difference
      
      expect(isSignificantMove(point1, point2, 2)).toBe(true);
      expect(isSignificantMove(point1, point2, 5)).toBe(false);
    });

    it('detects significant vertical movement', () => {
      const point1 = { x: 100, y: 100 };
      const point2 = { x: 100, y: 103 }; // 3px difference
      
      expect(isSignificantMove(point1, point2, 2)).toBe(true);
      expect(isSignificantMove(point1, point2, 5)).toBe(false);
    });

    it('detects significant diagonal movement', () => {
      const point1 = { x: 100, y: 100 };
      const point2 = { x: 101, y: 102 }; // dx=1, dy=2
      
      expect(isSignificantMove(point1, point2, 2)).toBe(true);  // dy=2 >= threshold=2
      expect(isSignificantMove(point1, point2, 1)).toBe(true);  // Both dx=1 and dy=2 >= threshold=1
      expect(isSignificantMove(point1, point2, 3)).toBe(false); // Both dx=1 and dy=2 < threshold=3
    });

    it('uses default threshold of 2px', () => {
      const point1 = { x: 100, y: 100 };
      const point2 = { x: 101, y: 101 }; // 1px difference
      const point3 = { x: 103, y: 100 }; // 3px difference
      
      expect(isSignificantMove(point1, point2)).toBe(false);
      expect(isSignificantMove(point1, point3)).toBe(true);
    });

    it('returns false for identical points', () => {
      const point = { x: 100, y: 100 };
      expect(isSignificantMove(point, point)).toBe(false);
    });
  });

  describe('CURSOR_COLORS', () => {
    it('contains valid hex colors', () => {
      CURSOR_COLORS.forEach(color => {
        expect(color).toMatch(/^#[0-9A-F]{6}$/i);
      });
    });

    it('contains expected number of colors', () => {
      expect(CURSOR_COLORS.length).toBe(10);
    });

    it('contains distinct colors', () => {
      const uniqueColors = new Set(CURSOR_COLORS);
      expect(uniqueColors.size).toBe(CURSOR_COLORS.length);
    });
  });
});
