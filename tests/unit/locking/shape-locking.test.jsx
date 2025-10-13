import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { CanvasProvider } from '../../../src/contexts/CanvasContext';
import { AuthProvider } from '../../../src/contexts/AuthContext';
import { useCanvas } from '../../../src/hooks/useCanvas';

// Mock Firebase and services
vi.mock('../../../src/services/firebase', () => ({
  db: {},
  auth: {},
  rtdb: {},
}));

// Mock useAuth hook to provide different test users
const mockUsers = {
  user1: { uid: 'user-1', displayName: 'User One' },
  user2: { uid: 'user-2', displayName: 'User Two' },
};

let currentMockUser = mockUsers.user1;

vi.mock('../../../src/hooks/useAuth', () => ({
  useAuth: () => ({
    currentUser: currentMockUser,
    loading: false,
    login: vi.fn(),
    signup: vi.fn(),
    logout: vi.fn(),
    googleSignIn: vi.fn(),
    getDisplayName: vi.fn(() => currentMockUser?.displayName || 'Test User'),
  }),
}));

// Mock the useFirebaseCanvas hook with more realistic locking behavior
const mockShapes = [];
const mockFirebaseOperations = {
  addShape: vi.fn(),
  updateShape: vi.fn(),
  deleteShape: vi.fn(),
  lockShape: vi.fn(),
  unlockShape: vi.fn(),
};

vi.mock('../../../src/hooks/useFirebaseCanvas', () => ({
  useFirebaseCanvas: vi.fn(() => ({
    shapes: mockShapes,
    isLoading: false,
    error: null,
    isConnected: true,
    addShape: mockFirebaseOperations.addShape,
    updateShape: mockFirebaseOperations.updateShape,
    deleteShape: mockFirebaseOperations.deleteShape,
    lockShape: mockFirebaseOperations.lockShape,
    unlockShape: mockFirebaseOperations.unlockShape,
    isShapeLockedByCurrentUser: vi.fn((shape) => shape.isLocked && shape.lockedBy === currentMockUser.uid),
    isShapeLockedByOther: vi.fn((shape) => shape.isLocked && shape.lockedBy !== currentMockUser.uid),
    getCurrentUserId: vi.fn(() => currentMockUser.uid),
    retryConnection: vi.fn(),
  })),
}));

const wrapper = ({ children }) => (
  <AuthProvider>
    <CanvasProvider>{children}</CanvasProvider>
  </AuthProvider>
);

describe('Shape Locking Mechanism', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockShapes.length = 0; // Clear shapes array
    currentMockUser = mockUsers.user1;
  });

  it('should allow user to lock their own shapes', () => {
    // Add a test shape
    const testShape = {
      id: 'shape-1',
      x: 100,
      y: 100,
      width: 100,
      height: 100,
      isLocked: true,
      lockedBy: 'user-1',
    };
    mockShapes.push(testShape);

    const { result } = renderHook(() => useCanvas(), { wrapper });

    // User 1 should be able to interact with their own locked shape
    expect(result.current.isShapeLockedByCurrentUser(testShape)).toBe(true);
    expect(result.current.isShapeLockedByOther(testShape)).toBe(false);
  });

  it('should prevent user from interacting with shapes locked by others', () => {
    // Add a test shape locked by user 2
    const testShape = {
      id: 'shape-1',
      x: 100,
      y: 100,
      width: 100,
      height: 100,
      isLocked: true,
      lockedBy: 'user-2',
    };
    mockShapes.push(testShape);

    const { result } = renderHook(() => useCanvas(), { wrapper });

    // User 1 should NOT be able to interact with user 2's locked shape
    expect(result.current.isShapeLockedByCurrentUser(testShape)).toBe(false);
    expect(result.current.isShapeLockedByOther(testShape)).toBe(true);
  });

  it('should handle lock/unlock operations', async () => {
    const { result } = renderHook(() => useCanvas(), { wrapper });

    // Test locking
    await act(async () => {
      await result.current.lockShape('shape-1');
    });

    expect(mockFirebaseOperations.lockShape).toHaveBeenCalledWith('shape-1');

    // Test unlocking
    await act(async () => {
      await result.current.unlockShape('shape-1');
    });

    expect(mockFirebaseOperations.unlockShape).toHaveBeenCalledWith('shape-1');
  });

  it('should simulate multi-user locking scenario', () => {
    const { result } = renderHook(() => useCanvas(), { wrapper });
    
    const testShape = {
      id: 'shape-1',
      x: 100,
      y: 100,
      width: 100,
      height: 100,
      isLocked: false,
      lockedBy: null,
    };

    // Initially unlocked - both users can interact
    expect(result.current.isShapeLockedByOther(testShape)).toBe(false);

    // User 2 locks the shape
    testShape.isLocked = true;
    testShape.lockedBy = 'user-2';

    // Now user 1 cannot interact
    expect(result.current.isShapeLockedByOther(testShape)).toBe(true);

    // User 2 unlocks the shape
    testShape.isLocked = false;
    testShape.lockedBy = null;

    // Now user 1 can interact again
    expect(result.current.isShapeLockedByOther(testShape)).toBe(false);
  });

  it('should handle getCurrentUserId correctly', () => {
    const { result } = renderHook(() => useCanvas(), { wrapper });
    
    expect(result.current.getCurrentUserId()).toBe('user-1');

    // Switch to user 2
    currentMockUser = mockUsers.user2;
    
    const { result: result2 } = renderHook(() => useCanvas(), { wrapper });
    expect(result2.current.getCurrentUserId()).toBe('user-2');
  });
});
