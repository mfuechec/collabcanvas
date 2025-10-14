// Error Context - Global error state management
import { createContext, useContext, useState, useCallback } from 'react';

const ErrorContext = createContext();

export const useError = () => {
  const context = useContext(ErrorContext);
  if (!context) {
    throw new Error('useError must be used within an ErrorProvider');
  }
  return context;
};

export const ErrorProvider = ({ children }) => {
  const [currentError, setCurrentError] = useState(null);
  const [errorHistory, setErrorHistory] = useState([]);

  // Show error with automatic dismissal
  const showError = useCallback((error, options = {}) => {
    const errorObj = {
      id: Date.now(),
      message: error?.message || error || 'An unexpected error occurred',
      code: error?.code,
      type: options.type || 'error',
      timestamp: new Date().toISOString(),
      ...options
    };

    console.error('Global error:', errorObj);
    
    setCurrentError(errorObj);
    setErrorHistory(prev => [errorObj, ...prev.slice(0, 9)]); // Keep last 10 errors
  }, []);

  // Clear current error
  const clearError = useCallback(() => {
    setCurrentError(null);
  }, []);

  // Show network error with retry option
  const showNetworkError = useCallback((error, retryFn) => {
    showError(error, {
      type: 'network',
      retryFn,
      persistent: true // Don't auto-dismiss network errors
    });
  }, [showError]);

  // Show authentication error
  const showAuthError = useCallback((error) => {
    showError(error, {
      type: 'auth'
    });
  }, [showError]);

  // Show canvas/shape error
  const showCanvasError = useCallback((error) => {
    showError(error, {
      type: 'canvas'
    });
  }, [showError]);

  // Show warning (non-critical)
  const showWarning = useCallback((message) => {
    showError(message, {
      type: 'warning'
    });
  }, [showError]);

  // Enhanced error handler for async operations
  const handleAsyncError = useCallback((operation, errorHandler) => {
    return async (...args) => {
      try {
        return await operation(...args);
      } catch (error) {
        if (errorHandler) {
          errorHandler(error);
        } else {
          showError(error);
        }
        throw error; // Re-throw so calling code can handle if needed
      }
    };
  }, [showError]);

  const value = {
    currentError,
    errorHistory,
    showError,
    clearError,
    showNetworkError,
    showAuthError,
    showCanvasError,
    showWarning,
    handleAsyncError
  };

  return (
    <ErrorContext.Provider value={value}>
      {children}
    </ErrorContext.Provider>
  );
};
