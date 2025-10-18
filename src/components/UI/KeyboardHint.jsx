import React from 'react';
import { KEYBOARD_HINTS } from '../../utils/designSystem';

/**
 * KeyboardHint Component
 * Displays keyboard shortcuts in a consistent, subtle way
 */
const KeyboardHint = ({ 
  shortcut, 
  variant = 'badge', // 'badge' | 'tooltip' | 'inline'
  className = '',
  showOnHover = false,
  children 
}) => {
  if (!shortcut) return children || null;

  const formatShortcut = (shortcut) => {
    if (Array.isArray(shortcut)) {
      return shortcut[0]; // Use first shortcut for display
    }
    return shortcut;
  };

  const renderShortcut = () => {
    const formattedShortcut = formatShortcut(shortcut);
    
    if (variant === 'badge') {
      return (
        <span 
          className={`keyboard-hint-badge ${className}`}
          style={KEYBOARD_HINTS.badge}
        >
          {formattedShortcut}
        </span>
      );
    }
    
    if (variant === 'inline') {
      return (
        <span 
          className={`keyboard-hint-inline ${className}`}
          style={{
            ...KEYBOARD_HINTS.badge,
            fontSize: '9px',
            padding: '1px 4px',
            marginLeft: '4px',
            opacity: 0.6,
          }}
        >
          {formattedShortcut}
        </span>
      );
    }
    
    return null;
  };

  if (variant === 'tooltip' && children) {
    return (
      <div className="keyboard-hint-tooltip-container">
        {children}
        <div 
          className="keyboard-hint-tooltip"
          style={{
            ...KEYBOARD_HINTS.tooltip,
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: '8px',
            whiteSpace: 'nowrap',
            opacity: showOnHover ? 0 : 1,
            pointerEvents: 'none',
            transition: 'opacity 150ms ease',
          }}
        >
          {children}
          <div 
            style={{
              ...KEYBOARD_HINTS.badge,
              marginTop: '4px',
              display: 'inline-block',
            }}
          >
            {formatShortcut(shortcut)}
          </div>
        </div>
      </div>
    );
  }

  if (children) {
    return (
      <div className="keyboard-hint-wrapper" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
        {children}
        {renderShortcut()}
      </div>
    );
  }

  return renderShortcut();
};

export default KeyboardHint;