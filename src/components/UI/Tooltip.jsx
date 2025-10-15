import { useState, useRef, useEffect, cloneElement, isValidElement } from 'react';
import { COLORS, SPACING, BORDER_RADIUS, SHADOWS, TYPOGRAPHY } from '../../utils/designSystem';
import { useTheme } from '../../contexts/ThemeContext';

const Tooltip = ({ children, text, shortcut, delay = 500 }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const timeoutRef = useRef(null);
  const targetRef = useRef(null);
  const tooltipRef = useRef(null);
  const { theme } = useTheme();
  const colors = COLORS[theme];
  
  const showTooltip = (e) => {
    // Store the bounding rect immediately, before the timeout
    const rect = e.currentTarget?.getBoundingClientRect();
    if (!rect) return;
    
    timeoutRef.current = setTimeout(() => {
      const tooltipWidth = 200; // Approximate width
      const tooltipHeight = 32; // Approximate height
      
      // Position below the element by default
      let top = rect.bottom + 8;
      let left = rect.left + (rect.width / 2) - (tooltipWidth / 2);
      
      // Ensure tooltip stays within viewport
      if (left < 8) left = 8;
      if (left + tooltipWidth > window.innerWidth - 8) {
        left = window.innerWidth - tooltipWidth - 8;
      }
      
      // If tooltip would go below viewport, position above
      if (top + tooltipHeight > window.innerHeight - 8) {
        top = rect.top - tooltipHeight - 8;
      }
      
      setPosition({ top, left });
      setIsVisible(true);
    }, delay);
  };
  
  const hideTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    setIsVisible(false);
  };
  
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  
  // Format keyboard shortcut for display
  const formatShortcut = (shortcut) => {
    if (!shortcut) return null;
    
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    
    // Replace platform-specific keys
    let formatted = shortcut
      .replace('Cmd', isMac ? '⌘' : 'Ctrl')
      .replace('Meta', isMac ? '⌘' : 'Ctrl')
      .replace('Alt', isMac ? '⌥' : 'Alt')
      .replace('Shift', '⇧')
      .replace('Control', 'Ctrl');
    
    return formatted;
  };
  
  const tooltipStyle = {
    position: 'fixed',
    top: `${position.top}px`,
    left: `${position.left}px`,
    backgroundColor: colors.sidebar,
    color: colors.textPrimary,
    padding: `${SPACING.xs} ${SPACING.md}`,
    borderRadius: BORDER_RADIUS.button,
    fontSize: '12px',
    fontFamily: TYPOGRAPHY.fontFamily.base,
    boxShadow: SHADOWS.modal,
    border: `1px solid ${colors.border}`,
    zIndex: 1000,
    pointerEvents: 'none',
    whiteSpace: 'nowrap',
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.sm,
    opacity: isVisible ? 1 : 0,
    transition: 'opacity 150ms ease',
  };
  
  const shortcutBadgeStyle = {
    backgroundColor: colors.background,
    border: `1px solid ${colors.border}`,
    borderRadius: '3px',
    padding: '2px 6px',
    fontSize: '11px',
    fontFamily: TYPOGRAPHY.fontFamily.mono,
    color: colors.textSecondary,
    marginLeft: SPACING.xs,
  };
  
  // Clone the child element and add mouse event handlers
  if (!isValidElement(children)) {
    return <>{children}</>;
  }
  
  const clonedChild = cloneElement(children, {
    ref: targetRef,
    onMouseEnter: (e) => {
      showTooltip(e);
      children.props?.onMouseEnter?.(e);
    },
    onMouseLeave: (e) => {
      hideTooltip();
      children.props?.onMouseLeave?.(e);
    },
  });
  
  return (
    <>
      {clonedChild}
      
      {isVisible && (
        <div ref={tooltipRef} style={tooltipStyle}>
          <span>{text}</span>
          {shortcut && (
            <span style={shortcutBadgeStyle}>
              {formatShortcut(shortcut)}
            </span>
          )}
        </div>
      )}
    </>
  );
};

export default Tooltip;

