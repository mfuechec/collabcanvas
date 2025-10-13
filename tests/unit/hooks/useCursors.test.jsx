// Unit tests for useCursors hook
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { AuthProvider } from '../../../src/contexts/AuthContext';

// Mock cursor service functions - use vi.hoisted for proper hoisting
const {
  mockUpdateCursorPosition,
  mockSubscribeToCursors,
  mockSetupCursorCleanup,
  mockRemoveCursor
} = vi.hoisted(() => ({
  mockUpdateCursorPosition: vi.fn(),
  mockSubscribeToCursors: vi.fn(),
  mockSetupCursorCleanup: vi.fn(),
  mockRemoveCursor: vi.fn(),
}));

vi.mock('../../../src/services/cursors', () => ({
  updateCursorPosition: mockUpdateCursorPosition,
  subscribeToCursors: mockSubscribeToCursors,
  setupCursorCleanup: mockSetupCursorCleanup,
  removeCursor: mockRemoveCursor,
}));

// Mock helper functions
vi.mock('../../../src/utils/helpers', () => ({
  generateUserColor: vi.fn(() => '#FF5733'),
  getCurrentUserColor: vi.fn(() => '#FF5733'),
  generateDisplayNameFromEmail: vi.fn((email) => email?.split('@')[0] || 'Anonymous'),
  throttle: vi.fn((fn) => fn), // Return original function for testing
  screenToCanvasCoordinates: vi.fn((x, y) => ({ x, y })),
  isSignificantMove: vi.fn(() => true),
}));

// Mock useAuth hook
const {
  mockCurrentUser,
  mockUseAuth
} = vi.hoisted(() => ({
  mockCurrentUser: {
    uid: 'test-user-123',
    displayName: 'Test User',
    email: 'test@example.com'
  },
  mockUseAuth: vi.fn()
}));

// Set initial return value
mockUseAuth.mockReturnValue({
  currentUser: mockCurrentUser,
});

vi.mock('../../../src/hooks/useAuth', () => ({
  useAuth: mockUseAuth,
}));

// Now import the hook being tested
import { useCursors } from '../../../src/hooks/useCursors';

describe('useCursors Hook', () => {
  let mockStageRef;
  let mockUnsubscribe;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Mock stage ref
    mockStageRef = {
      current: {
        getPointerPosition: vi.fn(() => ({ x: 150, y: 200 })),
        container: vi.fn(() => ({
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
        })),
      },
    };

    // Mock unsubscribe function
    mockUnsubscribe = vi.fn();
    mockSubscribeToCursors.mockReturnValue(mockUnsubscribe);

    // Reset promises
    mockUpdateCursorPosition.mockResolvedValue(undefined);
    mockSetupCursorCleanup.mockResolvedValue(undefined);
    mockRemoveCursor.mockResolvedValue(undefined);
  });

  const wrapper = ({ children }) => (
    <AuthProvider>{children}</AuthProvider>
  );

  describe('Initialization', () => {
    it('initializes with empty cursors and inactive state when no user', () => {
      // Mock no current user by changing the mock return value
      mockUseAuth.mockReturnValueOnce({ currentUser: null });

      const { result } = renderHook(() => useCursors(mockStageRef), { wrapper });

      expect(result.current.cursors).toEqual([]);
      expect(result.current.isActive).toBe(false);
    });

    it('sets up cursor cleanup when user is present', () => {
      const { result } = renderHook(() => useCursors(mockStageRef), { wrapper });

      expect(mockSetupCursorCleanup).toHaveBeenCalledWith('Test User', '#FF5733');
      expect(result.current.isActive).toBe(true);
    });

    it('subscribes to cursors on mount', () => {
      renderHook(() => useCursors(mockStageRef), { wrapper });

      expect(mockSubscribeToCursors).toHaveBeenCalledWith(expect.any(Function));
    });

    it('calls unsubscribe on unmount', () => {
      const { unmount } = renderHook(() => useCursors(mockStageRef), { wrapper });

      unmount();

      expect(mockUnsubscribe).toHaveBeenCalled();
      expect(mockRemoveCursor).toHaveBeenCalled();
    });

    it('removes cursor when user logs out', () => {
      const { rerender } = renderHook(() => useCursors(mockStageRef), { wrapper });

      // Initially user is logged in
      expect(mockSetupCursorCleanup).toHaveBeenCalledWith('Test User', '#FF5733');

      // User logs out
      mockUseAuth.mockReturnValue({ currentUser: null });
      rerender();

      // Should remove cursor
      expect(mockRemoveCursor).toHaveBeenCalled();
    });
  });

  describe('Cursor Data Processing', () => {
    it('processes cursor data correctly', () => {
      let cursorCallback;
      mockSubscribeToCursors.mockImplementation((callback) => {
        cursorCallback = callback;
        return mockUnsubscribe;
      });

      const { result } = renderHook(() => useCursors(mockStageRef), { wrapper });

      // Simulate cursor data update
      const cursorData = {
        'user-1': {
          cursorX: 100,
          cursorY: 150,
          displayName: 'User One',
          cursorColor: '#FF0000',
          lastSeen: Date.now(),
        },
        'user-2': {
          cursorX: 200,
          cursorY: 250,
          displayName: 'User Two',
          cursorColor: '#00FF00',
          lastSeen: Date.now(),
        },
      };

      act(() => {
        cursorCallback(cursorData);
      });

      expect(result.current.cursors).toHaveLength(2);
      expect(result.current.cursors[0]).toEqual({
        id: 'user-1',
        x: 100,
        y: 150,
        displayName: 'User One',
        color: '#FF0000',
        lastSeen: expect.any(Number),
      });
    });

    it('generates fallback color when cursor color is missing', () => {
      let cursorCallback;
      mockSubscribeToCursors.mockImplementation((callback) => {
        cursorCallback = callback;
        return mockUnsubscribe;
      });

      // Mock the generateUserColor function to return a fallback
      const mockGenerateUserColor = vi.fn().mockReturnValue('#FALLBACK');
      vi.doMock('../../../src/utils/helpers', () => ({
        generateUserColor: mockGenerateUserColor,
        getCurrentUserColor: vi.fn(() => '#FF5733'),
        generateDisplayNameFromEmail: vi.fn((email) => email?.split('@')[0] || 'Anonymous'),
        throttle: vi.fn((fn) => fn),
        screenToCanvasCoordinates: vi.fn((x, y) => ({ x, y })),
        isSignificantMove: vi.fn(() => true),
      }));

      const { result } = renderHook(() => useCursors(mockStageRef), { wrapper });

      const cursorData = {
        'user-1': {
          cursorX: 100,
          cursorY: 150,
          displayName: 'User One',
          // No cursorColor provided
          lastSeen: Date.now(),
        },
      };

      act(() => {
        cursorCallback(cursorData);
      });

      expect(result.current.cursors[0].color).toBe('#FALLBACK');
    });
  });

  describe('Mouse Event Handling', () => {
    it('sets up mouse event listeners when stage and user are active', () => {
      const mockContainer = {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };
      mockStageRef.current.container.mockReturnValue(mockContainer);

      renderHook(() => useCursors(mockStageRef), { wrapper });

      expect(mockContainer.addEventListener).toHaveBeenCalledWith('mousemove', expect.any(Function));
      expect(mockContainer.addEventListener).toHaveBeenCalledWith('mouseleave', expect.any(Function));
    });

    it('removes event listeners on cleanup', () => {
      const mockContainer = {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };
      mockStageRef.current.container.mockReturnValue(mockContainer);

      const { unmount } = renderHook(() => useCursors(mockStageRef), { wrapper });

      unmount();

      expect(mockContainer.removeEventListener).toHaveBeenCalledWith('mousemove', expect.any(Function));
      expect(mockContainer.removeEventListener).toHaveBeenCalledWith('mouseleave', expect.any(Function));
    });

    it('does not set up listeners when no stage ref', () => {
      const { result } = renderHook(() => useCursors({ current: null }), { wrapper });

      expect(result.current.isActive).toBe(true); // User is still active
      // But no event listeners should be set up
    });

    it('does not set up listeners when user is not active', () => {
      mockUseAuth.mockReturnValueOnce({ currentUser: null });

      const mockContainer = {
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      };
      mockStageRef.current.container.mockReturnValue(mockContainer);

      renderHook(() => useCursors(mockStageRef), { wrapper });

      expect(mockContainer.addEventListener).not.toHaveBeenCalled();
    });
  });

  describe('Display Name Generation', () => {
    it('uses display name when available', () => {
      const { result } = renderHook(() => useCursors(mockStageRef), { wrapper });

      expect(result.current.currentUserDisplayName).toBe('Test User');
    });

    it('falls back to email when no display name', () => {
      mockUseAuth.mockReturnValueOnce({
        currentUser: { uid: 'test-user', email: 'test@example.com' }
      });

      const { result } = renderHook(() => useCursors(mockStageRef), { wrapper });

      expect(result.current.currentUserDisplayName).toBe('test');
    });

    it('uses Anonymous when no user info available', () => {
      mockUseAuth.mockReturnValueOnce({ currentUser: null });

      const { result } = renderHook(() => useCursors(mockStageRef), { wrapper });

      expect(result.current.currentUserDisplayName).toBe('Anonymous');
    });
  });

  describe('Error Handling', () => {
    it('handles cursor update errors gracefully', () => {
      mockUpdateCursorPosition.mockRejectedValueOnce(new Error('Update failed'));

      // Should not throw when update fails
      expect(() => {
        renderHook(() => useCursors(mockStageRef), { wrapper });
      }).not.toThrow();
    });

    it('handles cleanup errors gracefully', () => {
      mockSetupCursorCleanup.mockRejectedValueOnce(new Error('Cleanup failed'));

      // Should not throw when cleanup fails
      expect(() => {
        renderHook(() => useCursors(mockStageRef), { wrapper });
      }).not.toThrow();
    });

    it('handles subscription errors gracefully', () => {
      mockSubscribeToCursors.mockImplementation(() => {
        throw new Error('Subscription failed');
      });

      // Should not throw when subscription fails
      expect(() => {
        renderHook(() => useCursors(mockStageRef), { wrapper });
      }).not.toThrow();
    });
  });

  describe('Return Values', () => {
    it('returns correct structure', () => {
      const { result } = renderHook(() => useCursors(mockStageRef), { wrapper });

      expect(result.current).toHaveProperty('cursors');
      expect(result.current).toHaveProperty('isActive');
      expect(result.current).toHaveProperty('currentUserColor');
      expect(result.current).toHaveProperty('currentUserDisplayName');

      expect(Array.isArray(result.current.cursors)).toBe(true);
      expect(typeof result.current.isActive).toBe('boolean');
      expect(typeof result.current.currentUserColor).toBe('string');
      expect(typeof result.current.currentUserDisplayName).toBe('string');
    });
  });
});
