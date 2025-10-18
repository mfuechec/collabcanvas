import React, { useState, useEffect } from 'react';
import { SHORTCUTS, KEYBOARD_HINTS } from '../../utils/designSystem';

/**
 * HelpMenu Component
 * Shows comprehensive keyboard shortcuts reference
 */
const HelpMenu = ({ isOpen, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
    } else {
      const timer = setTimeout(() => setIsVisible(false), 200);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isVisible) return null;

  const formatShortcut = (shortcut) => {
    if (Array.isArray(shortcut)) {
      return shortcut.map(s => s.replace('Meta+', '⌘').replace('Control+', 'Ctrl+')).join(' / ');
    }
    return shortcut.replace('Meta+', '⌘').replace('Control+', 'Ctrl+');
  };

  const shortcutCategories = [
    {
      title: 'Tools',
      shortcuts: [
        { name: 'Hand Tool', shortcut: SHORTCUTS.TOOL_HAND },
        { name: 'Rectangle Tool', shortcut: SHORTCUTS.TOOL_RECTANGLE },
        { name: 'Circle Tool', shortcut: SHORTCUTS.TOOL_CIRCLE },
        { name: 'Line Tool', shortcut: SHORTCUTS.TOOL_LINE },
        { name: 'Pen Tool', shortcut: SHORTCUTS.TOOL_PEN },
        { name: 'Text Tool', shortcut: SHORTCUTS.TOOL_TEXT },
      ]
    },
    {
      title: 'Actions',
      shortcuts: [
        { name: 'Delete', shortcut: SHORTCUTS.DELETE },
        { name: 'Copy', shortcut: SHORTCUTS.COPY },
        { name: 'Paste', shortcut: SHORTCUTS.PASTE },
        { name: 'Duplicate', shortcut: SHORTCUTS.DUPLICATE },
        { name: 'Undo', shortcut: SHORTCUTS.UNDO },
        { name: 'Redo', shortcut: SHORTCUTS.REDO },
        { name: 'Select All', shortcut: SHORTCUTS.SELECT_ALL },
      ]
    },
    {
      title: 'View',
      shortcuts: [
        { name: 'Zoom to 100%', shortcut: SHORTCUTS.ZOOM_100 },
        { name: 'Zoom to Fit', shortcut: SHORTCUTS.ZOOM_FIT },
        { name: 'Zoom to Selection', shortcut: SHORTCUTS.ZOOM_SELECTION },
        { name: 'Pan', shortcut: SHORTCUTS.PAN },
      ]
    },
    {
      title: 'Panels',
      shortcuts: [
        { name: 'Toggle Properties', shortcut: SHORTCUTS.TOGGLE_PROPERTIES },
        { name: 'Toggle Layers', shortcut: SHORTCUTS.TOGGLE_LAYERS },
        { name: 'Toggle Minimap', shortcut: SHORTCUTS.TOGGLE_MINIMAP },
      ]
    },
    {
      title: 'Other',
      shortcuts: [
        { name: 'Command Palette', shortcut: SHORTCUTS.COMMAND_PALETTE },
        { name: 'Hide Others', shortcut: SHORTCUTS.HIDE_OTHERS },
        { name: 'Help', shortcut: SHORTCUTS.HELP },
      ]
    }
  ];

  return (
    <div 
      className="help-overlay"
      style={{
        ...KEYBOARD_HINTS.helpOverlay,
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        opacity: isOpen ? 1 : 0,
        transition: 'opacity 200ms ease',
      }}
      onClick={onClose}
    >
      <div 
        className="help-panel"
        style={{
          ...KEYBOARD_HINTS.helpPanel,
          position: 'relative',
          transform: isOpen ? 'scale(1)' : 'scale(0.95)',
          transition: 'transform 200ms ease',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          marginBottom: '24px',
          paddingBottom: '16px',
          borderBottom: '1px solid var(--border-primary)'
        }}>
          <h2 style={{ 
            margin: 0, 
            fontSize: '20px', 
            fontWeight: 600,
            color: 'var(--text-primary)'
          }}>
            Keyboard Shortcuts
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              padding: '4px',
              borderRadius: '4px',
              transition: 'background-color 150ms ease',
            }}
            onMouseEnter={(e) => e.target.style.backgroundColor = 'var(--hover)'}
            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
          >
            ×
          </button>
        </div>

        {/* Shortcuts Grid */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
          gap: '24px' 
        }}>
          {shortcutCategories.map((category, index) => (
            <div key={index}>
              <h3 style={{ 
                margin: '0 0 12px 0', 
                fontSize: '14px', 
                fontWeight: 600,
                color: 'var(--text-primary)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                {category.title}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {category.shortcuts.map((item, itemIndex) => (
                  <div 
                    key={itemIndex}
                    style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'center',
                      padding: '8px 12px',
                      backgroundColor: 'var(--hint-bg)',
                      borderRadius: '6px',
                      border: '1px solid var(--hint-border)',
                    }}
                  >
                    <span style={{ 
                      fontSize: '13px', 
                      color: 'var(--text-primary)',
                      fontWeight: 500
                    }}>
                      {item.name}
                    </span>
                    <span 
                      style={{
                        ...KEYBOARD_HINTS.badge,
                        fontSize: '11px',
                        padding: '4px 8px',
                      }}
                    >
                      {formatShortcut(item.shortcut)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{ 
          marginTop: '24px', 
          paddingTop: '16px', 
          borderTop: '1px solid var(--border-primary)',
          textAlign: 'center',
          color: 'var(--text-secondary)',
          fontSize: '12px'
        }}>
          Press <kbd style={{
            ...KEYBOARD_HINTS.badge,
            fontSize: '10px',
            padding: '2px 6px',
            margin: '0 4px',
          }}>Esc</kbd> to close
        </div>
      </div>
    </div>
  );
};

export default HelpMenu;