import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  createShape,
  updateShape,
  deleteShape,
  lockShape,
  unlockShape,
  getUserId
} from '../../../src/services/canvas';

// Mock Firebase Firestore
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => ({ id: 'mock-doc-ref' })),
  getDoc: vi.fn(() => Promise.resolve({
    exists: () => true,
    data: () => ({
      shapes: [
        {
          id: 'test-shape-1',
          type: 'rectangle',
          x: 100,
          y: 100,
          width: 150,
          height: 100,
          fill: '#cccccc',
          isLocked: false,
          lockedBy: null
        }
      ]
    })
  })),
  setDoc: vi.fn(() => Promise.resolve()),
  updateDoc: vi.fn(() => Promise.resolve()),
  arrayUnion: vi.fn((item) => ({ _arrayUnion: item })),
  arrayRemove: vi.fn((item) => ({ _arrayRemove: item })),
  serverTimestamp: vi.fn(() => ({ _serverTimestamp: true })),
  onSnapshot: vi.fn(),
  enableNetwork: vi.fn(() => Promise.resolve()),
  disableNetwork: vi.fn(() => Promise.resolve())
}));

// Mock Firebase service
vi.mock('../../../src/services/firebase', () => ({
  db: { _mockDb: true }
}));

describe('Canvas Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset user ID for each test
    delete window.canvasUserId;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getUserId', () => {
    it('generates consistent user ID', () => {
      const userId1 = getUserId();
      const userId2 = getUserId();
      
      expect(userId1).toBe(userId2);
      expect(userId1).toMatch(/^user_\d+_[a-z0-9]+$/);
    });
  });

  describe('createShape', () => {
    it('creates shape with correct default properties', async () => {
      const mockUpdateDoc = await import('firebase/firestore').then(m => m.updateDoc);
      
      const shapeData = {
        x: 200,
        y: 150,
        width: 100,
        height: 80
      };

      const result = await createShape(shapeData);

      expect(result).toMatchObject({
        type: 'rectangle',
        x: 200,
        y: 150,
        width: 100,
        height: 80,
        fill: '#cccccc',
        isLocked: false,
        lockedBy: null
      });

      expect(result.id).toMatch(/^shape_\d+_[a-z0-9]+$/);
      expect(result.createdBy).toBeDefined();
      expect(mockUpdateDoc).toHaveBeenCalled();
    });

    it('applies default values for missing properties', async () => {
      const result = await createShape({});

      expect(result).toMatchObject({
        type: 'rectangle',
        x: 100,
        y: 100,
        width: 100,
        height: 100,
        fill: '#cccccc'
      });
    });
  });

  describe('updateShape', () => {
    it('updates shape properties successfully', async () => {
      const mockGetDoc = await import('firebase/firestore').then(m => m.getDoc);
      const mockUpdateDoc = await import('firebase/firestore').then(m => m.updateDoc);

      const updates = { x: 250, y: 200 };
      const result = await updateShape('test-shape-1', updates);

      expect(mockGetDoc).toHaveBeenCalled();
      expect(mockUpdateDoc).toHaveBeenCalled();
      expect(result).toMatchObject({
        id: 'test-shape-1',
        x: 250,
        y: 200
      });
    });

    it('throws error when shape is locked by another user', async () => {
      const mockGetDoc = await import('firebase/firestore').then(m => m.getDoc);
      
      // Mock shape locked by another user
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          shapes: [{
            id: 'test-shape-1',
            isLocked: true,
            lockedBy: 'other-user-id'
          }]
        })
      });

      await expect(updateShape('test-shape-1', { x: 300 }))
        .rejects.toThrow('Shape is locked by another user');
    });
  });

  describe('deleteShape', () => {
    it('deletes shape successfully', async () => {
      const mockGetDoc = await import('firebase/firestore').then(m => m.getDoc);
      const mockUpdateDoc = await import('firebase/firestore').then(m => m.updateDoc);

      const result = await deleteShape('test-shape-1');

      expect(mockGetDoc).toHaveBeenCalled();
      expect(mockUpdateDoc).toHaveBeenCalled();
      expect(result).toBe('test-shape-1');
    });

    it('throws error when trying to delete locked shape', async () => {
      const mockGetDoc = await import('firebase/firestore').then(m => m.getDoc);
      
      // Mock shape locked by another user
      mockGetDoc.mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          shapes: [{
            id: 'test-shape-1',
            isLocked: true,
            lockedBy: 'other-user-id'
          }]
        })
      });

      await expect(deleteShape('test-shape-1'))
        .rejects.toThrow('Cannot delete shape locked by another user');
    });
  });

  describe('Shape Locking', () => {
    it('locks shape successfully', async () => {
      const result = await lockShape('test-shape-1');
      expect(result).toBe(true);
    });

    it('unlocks shape successfully', async () => {
      const result = await unlockShape('test-shape-1');
      expect(result).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('handles Firestore errors gracefully', async () => {
      const mockUpdateDoc = await import('firebase/firestore').then(m => m.updateDoc);
      mockUpdateDoc.mockRejectedValueOnce(new Error('Network error'));

      await expect(createShape({}))
        .rejects.toThrow('Failed to create shape. Please try again.');
    });
  });
});
