// Test setup file - runs before all tests
import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Firebase to avoid actual Firebase calls during testing
vi.mock('../src/services/firebase', () => ({
  auth: {
    currentUser: null,
    onAuthStateChanged: vi.fn(),
  },
  db: {},
  rtdb: {},
}));

// Mock Firebase Auth functions
vi.mock('firebase/auth', () => ({
  createUserWithEmailAndPassword: vi.fn(),
  signInWithEmailAndPassword: vi.fn(), 
  signInWithPopup: vi.fn(),
  GoogleAuthProvider: vi.fn(),
  signOut: vi.fn(),
  updateProfile: vi.fn(),
  onAuthStateChanged: vi.fn(),
  getAuth: vi.fn(() => ({
    currentUser: null,
    onAuthStateChanged: vi.fn(),
  })),
}));

// Global test utilities
global.beforeEach(() => {
  vi.clearAllMocks();
});
