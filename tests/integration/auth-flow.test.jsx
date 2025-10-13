// Integration Test - Complete Authentication Flow
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { onAuthStateChanged } from 'firebase/auth';
import App from '../../src/App';
import * as authService from '../../src/services/auth';

// Mock Firebase auth
vi.mock('firebase/auth');
vi.mock('../../src/services/firebase', () => ({
  auth: { currentUser: null }
}));
vi.mock('../../src/services/auth');

describe('Authentication Flow Integration', () => {
  let mockOnAuthStateChanged;
  let unsubscribeMock;
  let user;

  beforeEach(() => {
    vi.clearAllMocks();
    unsubscribeMock = vi.fn();
    
    // Start with no authenticated user
    mockOnAuthStateChanged = vi.fn((auth, callback) => {
      callback(null);
      return unsubscribeMock;
    });
    onAuthStateChanged.mockImplementation(mockOnAuthStateChanged);
    
    user = userEvent.setup();
  });

  describe('Unauthenticated User Flow', () => {
    it('should show login form by default', () => {
      render(<App />);
      
      expect(screen.getByText('Sign in to CollabCanvas')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter your email')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument();
      expect(screen.getByText('Continue with Google')).toBeInTheDocument();
    });

    it('should allow switching to signup form', async () => {
      render(<App />);
      
      const signupLink = screen.getByText('create a new account');
      await user.click(signupLink);
      
      expect(screen.getByText('Create your account')).toBeInTheDocument();
      expect(screen.getByLabelText('Display name (optional)')).toBeInTheDocument();
    });

    it('should allow switching back to login from signup', async () => {
      render(<App />);
      
      // Go to signup
      await user.click(screen.getByText('create a new account'));
      
      // Go back to login
      await user.click(screen.getByText('Sign in here'));
      
      expect(screen.getByText('Sign in to CollabCanvas')).toBeInTheDocument();
    });
  });

  describe('Email/Password Authentication', () => {
    it('should complete login flow successfully', async () => {
      const mockUser = { 
        uid: 'test-uid', 
        email: 'test@example.com',
        displayName: 'Test User'
      };
      
      authService.signIn.mockResolvedValue(mockUser);
      authService.getUserDisplayName.mockReturnValue('Test User');
      
      render(<App />);
      
      // Fill in login form
      await user.type(screen.getByPlaceholderText('Enter your email'), 'test@example.com');
      await user.type(screen.getByPlaceholderText('Enter your password'), 'password123');
      
      // Submit form
      await user.click(screen.getByText('Sign in'));
      
      // Verify auth service was called
      await waitFor(() => {
        expect(authService.signIn).toHaveBeenCalledWith('test@example.com', 'password123');
      });
    });

    it('should complete signup flow successfully', async () => {
      const mockResult = {
        user: { uid: 'new-uid', email: 'new@example.com' },
        displayName: 'New User'
      };
      
      authService.signUp.mockResolvedValue(mockResult);
      
      render(<App />);
      
      // Switch to signup
      await user.click(screen.getByText('create a new account'));
      
      // Fill in signup form
      await user.type(screen.getByLabelText('Email address *'), 'new@example.com');
      await user.type(screen.getByLabelText('Display name (optional)'), 'New User');
      await user.type(screen.getByLabelText('Password *'), 'password123');
      await user.type(screen.getByLabelText('Confirm password *'), 'password123');
      
      // Submit form
      await user.click(screen.getByText('Create account'));
      
      await waitFor(() => {
        expect(authService.signUp).toHaveBeenCalledWith('new@example.com', 'password123', 'New User');
      });
    });

    it('should show validation errors', async () => {
      render(<App />);
      
      // Switch to signup
      await user.click(screen.getByText('create a new account'));
      
      // Try to submit with mismatched passwords
      await user.type(screen.getByLabelText('Email address *'), 'test@example.com');
      await user.type(screen.getByLabelText('Password *'), 'password123');
      await user.type(screen.getByLabelText('Confirm password *'), 'different');
      
      await user.click(screen.getByText('Create account'));
      
      expect(screen.getByText('Passwords do not match.')).toBeInTheDocument();
    });
  });

  describe('Google Authentication', () => {
    it('should handle Google sign in successfully', async () => {
      const mockResult = {
        user: { uid: 'google-uid', email: 'user@gmail.com' },
        displayName: 'Google User'
      };
      
      authService.signInWithGoogle.mockResolvedValue(mockResult);
      
      render(<App />);
      
      await user.click(screen.getByText('Continue with Google'));
      
      await waitFor(() => {
        expect(authService.signInWithGoogle).toHaveBeenCalled();
      });
    });
  });

  describe('Authenticated User Flow', () => {
    it('should show authenticated app when user is logged in', () => {
      const mockUser = { 
        uid: 'test-uid', 
        email: 'test@example.com',
        displayName: 'Test User'
      };
      
      // Mock auth state as authenticated
      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        callback(mockUser);
        return unsubscribeMock;
      });
      
      authService.getUserDisplayName.mockReturnValue('Test User');
      
      render(<App />);
      
      expect(screen.getByText('Welcome to CollabCanvas!')).toBeInTheDocument();
      expect(screen.getByText('Authentication Complete ✅')).toBeInTheDocument();
    });

    it('should show user info in navbar', () => {
      const mockUser = { 
        uid: 'test-uid', 
        email: 'test@example.com',
        displayName: 'Test User'
      };
      
      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        callback(mockUser);
        return unsubscribeMock;
      });
      
      authService.getUserDisplayName.mockReturnValue('Test User');
      
      render(<App />);
      
      expect(screen.getByText('Test User')).toBeInTheDocument();
      expect(screen.getByText('Welcome,')).toBeInTheDocument();
    });

    it('should handle logout flow', async () => {
      const mockUser = { 
        uid: 'test-uid', 
        email: 'test@example.com',
        displayName: 'Test User'
      };
      
      mockOnAuthStateChanged.mockImplementation((auth, callback) => {
        callback(mockUser);
        return unsubscribeMock;
      });
      
      authService.getUserDisplayName.mockReturnValue('Test User');
      authService.signOutUser.mockResolvedValue();
      
      render(<App />);
      
      const signOutButton = screen.getByText('Sign out');
      await user.click(signOutButton);
      
      await waitFor(() => {
        expect(authService.signOutUser).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('should show error messages for auth failures', async () => {
      const error = new Error('Invalid credentials');
      error.code = 'auth/wrong-password';
      authService.signIn.mockRejectedValue(error);
      
      render(<App />);
      
      await user.type(screen.getByPlaceholderText('Enter your email'), 'test@example.com');
      await user.type(screen.getByPlaceholderText('Enter your password'), 'wrong-password');
      await user.click(screen.getByText('Sign in'));
      
      await waitFor(() => {
        expect(screen.getByText('Incorrect password.')).toBeInTheDocument();
      });
    });

    it('should show loading states during auth operations', async () => {
      // Mock a delayed auth response
      authService.signIn.mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 100))
      );
      
      render(<App />);
      
      await user.type(screen.getByPlaceholderText('Enter your email'), 'test@example.com');
      await user.type(screen.getByPlaceholderText('Enter your password'), 'password123');
      await user.click(screen.getByText('Sign in'));
      
      // Should show loading state - our current implementation shows app-level loading
      await waitFor(() => {
        expect(screen.getByText('Loading CollabCanvas...')).toBeInTheDocument();
      }, { timeout: 200 });
    });
  });
});
