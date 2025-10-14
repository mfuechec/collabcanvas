// ErrorToast Component - Global error notification system
import { useEffect, useState } from 'react';

const ErrorToast = ({ error, onClose, duration = 5000 }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    if (error) {
      setIsVisible(true);
      setIsExiting(false);
      
      const timer = setTimeout(() => {
        handleClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [error, duration]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      setIsVisible(false);
      onClose();
    }, 300); // Match animation duration
  };

  if (!error || !isVisible) return null;

  const getErrorType = (error) => {
    if (error.code?.startsWith('auth/')) return 'auth';
    if (error.message?.includes('network') || error.message?.includes('connection')) return 'network';
    if (error.message?.includes('locked')) return 'warning';
    return 'error';
  };

  const getErrorIcon = (type) => {
    switch (type) {
      case 'auth':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        );
      case 'network':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
        );
      default:
        return (
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" 
              d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
    }
  };

  const errorType = getErrorType(error);
  const errorMessage = error.message || 'An unexpected error occurred';

  return (
    <div 
      className={`fixed top-4 right-4 z-50 max-w-sm w-full transition-all duration-300 ease-in-out ${
        isExiting ? 'opacity-0 transform translate-x-full' : 'opacity-100 transform translate-x-0'
      }`}
      style={{
        animation: isExiting ? 'slideOut 0.3s ease-in-out' : 'slideIn 0.3s ease-in-out'
      }}
    >
      <div 
        className="rounded-lg border shadow-lg p-4"
        style={{
          backgroundColor: 'var(--bg-primary)',
          borderColor: 'var(--danger)',
          boxShadow: 'var(--shadow-lg)'
        }}
      >
        <div className="flex items-start">
          <div 
            className="flex-shrink-0 mr-3"
            style={{ color: 'var(--danger)' }}
          >
            {getErrorIcon(errorType)}
          </div>
          
          <div className="flex-1 min-w-0">
            <p 
              className="text-sm font-medium"
              style={{ color: 'var(--text-primary)' }}
            >
              {errorType === 'auth' && 'Authentication Error'}
              {errorType === 'network' && 'Connection Error'}
              {errorType === 'warning' && 'Warning'}
              {errorType === 'error' && 'Error'}
            </p>
            <p 
              className="text-sm mt-1"
              style={{ color: 'var(--text-secondary)' }}
            >
              {errorMessage}
            </p>
          </div>
          
          <button
            onClick={handleClose}
            className="ml-3 flex-shrink-0 rounded-md p-1 hover:opacity-75 focus:outline-none focus:ring-2 focus:ring-offset-2"
            style={{ 
              color: 'var(--text-tertiary)',
              focusRingColor: 'var(--accent-primary)'
            }}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default ErrorToast;
