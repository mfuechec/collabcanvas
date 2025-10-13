// Unit tests for cursor service
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Mock Firebase Realtime Database - use vi.hoisted for proper hoisting
const {
  mockRef,
  mockSet,
  mockOnValue,
  mockOff,
  mockOnDisconnect,
  mockServerTimestamp,
  mockRemove
} = vi.hoisted(() => ({
  mockRef: vi.fn(),
  mockSet: vi.fn(),
  mockOnValue: vi.fn(),
  mockOff: vi.fn(),
  mockOnDisconnect: vi.fn(),
  mockServerTimestamp: vi.fn(() => ({ '.sv': 'timestamp' })),
  mockRemove: vi.fn(),
}));

vi.mock('firebase/database', () => ({
  ref: mockRef,
  set: mockSet,
  onValue: mockOnValue,
  off: mockOff,
  onDisconnect: mockOnDisconnect,
  serverTimestamp: mockServerTimestamp,
}));

// Mock Firebase service
vi.mock('../../../src/services/firebase', () => ({
  rtdb: {}, // Mock Realtime Database instance
}));

// Mock Firebase Auth
const mockCurrentUser = { uid: 'test-user-123' };
const mockAuth = { currentUser: mockCurrentUser };

vi.mock('firebase/auth', () => ({
  getAuth: vi.fn(() => mockAuth),
}));

// Now import the module being tested
import {
  updateCursorPosition,
  subscribeToCursors,
  setupCursorCleanup,
  removeCursor,
  getCurrentCursorUserId,
  SESSIONS_PATH,
  CANVAS_SESSION_ID
} from '../../../src/services/cursors';

describe('Cursor Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    
    // Reset session storage
    sessionStorage.clear();
    
    // Ensure mock auth returns the expected user
    mockAuth.currentUser = mockCurrentUser;
    
    // Setup default mock returns
    mockRef.mockReturnValue('mock-ref');
    mockSet.mockResolvedValue(undefined);
    mockOnDisconnect.mockReturnValue({ remove: mockRemove });
    mockRemove.mockResolvedValue(undefined);
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  describe('getCurrentCursorUserId', () => {
    it('returns Firebase Auth user ID when authenticated', () => {
      const userId = getCurrentCursorUserId();
      expect(userId).toBe('test-user-123');
    });

    it('generates and stores session ID when no auth user', () => {
      mockAuth.currentUser = null;
      
      const userId1 = getCurrentCursorUserId();
      const userId2 = getCurrentCursorUserId();
      
      // Should be consistent across calls
      expect(userId1).toBe(userId2);
      expect(userId1).toMatch(/^user_\d+_[a-z0-9]+$/);
      expect(sessionStorage.getItem('cursor_user_id')).toBe(userId1);
    });

    it('reuses existing session ID', () => {
      mockAuth.currentUser = null;
      sessionStorage.setItem('cursor_user_id', 'existing-session-id');
      
      const userId = getCurrentCursorUserId();
      expect(userId).toBe('existing-session-id');
    });
  });

  describe('updateCursorPosition', () => {
    it('updates cursor position successfully', async () => {
      const x = 150;
      const y = 200;
      const displayName = 'Test User';
      const cursorColor = '#FF5733';

      await updateCursorPosition(x, y, displayName, cursorColor);

      expect(mockRef).toHaveBeenCalledWith({}, `${SESSIONS_PATH}/${CANVAS_SESSION_ID}/test-user-123`);
      expect(mockSet).toHaveBeenCalledWith('mock-ref', {
        displayName: 'Test User',
        cursorColor: '#FF5733',
        cursorX: 150,
        cursorY: 200,
        lastSeen: { '.sv': 'timestamp' }
      });
    });

    it('uses default values for missing parameters', async () => {
      await updateCursorPosition(100, 100);

      expect(mockSet).toHaveBeenCalledWith('mock-ref', {
        displayName: 'Anonymous',
        cursorColor: '#3B82F6',
        cursorX: 100,
        cursorY: 100,
        lastSeen: { '.sv': 'timestamp' }
      });
    });

    it('rounds coordinates to integers', async () => {
      await updateCursorPosition(150.7, 200.3, 'Test User', '#FF5733');

      expect(mockSet).toHaveBeenCalledWith('mock-ref', expect.objectContaining({
        cursorX: 151,
        cursorY: 200,
      }));
    });

    it('handles errors gracefully without throwing', async () => {
      mockSet.mockRejectedValueOnce(new Error('Firebase error'));
      
      // Should not throw
      await expect(updateCursorPosition(100, 100)).resolves.toBeUndefined();
    });
  });

  describe('subscribeToCursors', () => {
    it('sets up cursor subscription correctly', () => {
      const mockCallback = vi.fn();
      
      subscribeToCursors(mockCallback);

      expect(mockRef).toHaveBeenCalledWith({}, `${SESSIONS_PATH}/${CANVAS_SESSION_ID}`);
      expect(mockOnValue).toHaveBeenCalledWith('mock-ref', expect.any(Function));
    });

    it('filters out current user from cursor data', () => {
      const mockCallback = vi.fn();
      let snapshotHandler;

      mockOnValue.mockImplementation((ref, handler) => {
        snapshotHandler = handler;
      });

      subscribeToCursors(mockCallback);

      // Simulate snapshot data
      const mockSnapshot = {
        val: () => ({
          'test-user-123': { displayName: 'Current User', cursorX: 100, cursorY: 100 },
          'other-user-456': { displayName: 'Other User', cursorX: 200, cursorY: 200 },
          'another-user-789': { displayName: 'Another User', cursorX: 300, cursorY: 300 }
        })
      };

      snapshotHandler(mockSnapshot);

      expect(mockCallback).toHaveBeenCalledWith({
        'other-user-456': { displayName: 'Other User', cursorX: 200, cursorY: 200 },
        'another-user-789': { displayName: 'Another User', cursorX: 300, cursorY: 300 }
      });
    });

    it('handles empty snapshot data', () => {
      const mockCallback = vi.fn();
      let snapshotHandler;

      mockOnValue.mockImplementation((ref, handler) => {
        snapshotHandler = handler;
      });

      subscribeToCursors(mockCallback);

      // Simulate empty snapshot
      const mockSnapshot = { val: () => null };
      snapshotHandler(mockSnapshot);

      expect(mockCallback).toHaveBeenCalledWith({});
    });

    it('returns unsubscribe function', () => {
      const mockCallback = vi.fn();
      
      const unsubscribe = subscribeToCursors(mockCallback);
      
      expect(typeof unsubscribe).toBe('function');
      
      // Call unsubscribe
      unsubscribe();
      
      expect(mockOff).toHaveBeenCalledWith('mock-ref', 'value', expect.any(Function));
    });

    it('handles subscription errors gracefully', () => {
      mockOnValue.mockImplementation(() => {
        throw new Error('Subscription error');
      });

      const mockCallback = vi.fn();
      const unsubscribe = subscribeToCursors(mockCallback);

      // Should return a function even on error
      expect(typeof unsubscribe).toBe('function');
      expect(unsubscribe).not.toThrow();
    });
  });

  describe('setupCursorCleanup', () => {
    it('sets up automatic cleanup on disconnect', async () => {
      const displayName = 'Test User';
      const cursorColor = '#FF5733';

      await setupCursorCleanup(displayName, cursorColor);

      expect(mockRef).toHaveBeenCalledWith({}, `${SESSIONS_PATH}/${CANVAS_SESSION_ID}/test-user-123`);
      expect(mockOnDisconnect).toHaveBeenCalledWith('mock-ref');
      expect(mockRemove).toHaveBeenCalled();
      
      // Should set initial presence
      expect(mockSet).toHaveBeenCalledWith('mock-ref', {
        displayName: 'Test User',
        cursorColor: '#FF5733',
        cursorX: 0,
        cursorY: 0,
        lastSeen: { '.sv': 'timestamp' }
      });
    });

    it('uses default values when parameters are missing', async () => {
      await setupCursorCleanup();

      expect(mockSet).toHaveBeenCalledWith('mock-ref', {
        displayName: 'Anonymous',
        cursorColor: '#3B82F6',
        cursorX: 0,
        cursorY: 0,
        lastSeen: { '.sv': 'timestamp' }
      });
    });

    it('handles errors gracefully', async () => {
      mockOnDisconnect.mockImplementation(() => {
        throw new Error('Disconnect setup error');
      });

      // Should not throw
      await expect(setupCursorCleanup('Test User', '#FF5733')).resolves.toBeUndefined();
    });
  });

  describe('removeCursor', () => {
    it('removes cursor by setting to null', async () => {
      await removeCursor();

      expect(mockRef).toHaveBeenCalledWith({}, `${SESSIONS_PATH}/${CANVAS_SESSION_ID}/test-user-123`);
      expect(mockSet).toHaveBeenCalledWith('mock-ref', null);
    });

    it('handles removal errors gracefully', async () => {
      mockSet.mockRejectedValueOnce(new Error('Removal error'));

      // Should not throw
      await expect(removeCursor()).resolves.toBeUndefined();
    });
  });

  describe('Constants', () => {
    it('exports correct session path constants', () => {
      expect(SESSIONS_PATH).toBe('sessions');
      expect(CANVAS_SESSION_ID).toBe('global-canvas-v1');
    });
  });
});
