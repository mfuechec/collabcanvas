import { useState, useMemo } from 'react';
import { useCanvas } from '../../hooks/useCanvas';
import { useTheme } from '../../contexts/ThemeContext';
import { COLORS, SPACING, BORDER_RADIUS, TYPOGRAPHY } from '../../utils/designSystem';

const LayersPanel = ({ isOpen, onToggle }) => {
  const { shapes, selectedShapeId, selectShape, deleteShape } = useCanvas();
  const { theme } = useTheme();
  const colors = COLORS[theme];
  const [searchQuery, setSearchQuery] = useState('');
  
  // Filter shapes based on search
  const filteredShapes = useMemo(() => {
    if (!searchQuery) return shapes;
    return shapes.filter(shape => 
      shape.id.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [shapes, searchQuery]);
  
  // Sort shapes by creation time (newest first)
  const sortedShapes = useMemo(() => {
    return [...filteredShapes].reverse();
  }, [filteredShapes]);
  
  if (!isOpen) return null;
  
  const panelStyle = {
    width: '320px',
    height: '100vh',
    backgroundColor: colors.sidebar,
    borderRight: `1px solid ${colors.border}`,
    position: 'fixed',
    left: '60px', // After left sidebar
    top: 0,
    zIndex: 10,
    display: 'flex',
    flexDirection: 'column',
  };
  
  const headerStyle = {
    padding: SPACING.lg,
    borderBottom: `1px solid ${colors.border}`,
    fontFamily: TYPOGRAPHY.fontFamily.base,
    fontSize: TYPOGRAPHY.fontSize.sidebarLabel,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    textTransform: 'uppercase',
    letterSpacing: TYPOGRAPHY.letterSpacing.label,
    color: colors.textSecondary,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  };
  
  const searchStyle = {
    width: '100%',
    padding: `${SPACING.xs} ${SPACING.sm}`,
    backgroundColor: colors.background,
    border: `1px solid ${colors.border}`,
    borderRadius: BORDER_RADIUS.button,
    color: colors.textPrimary,
    fontSize: '12px',
    outline: 'none',
    marginBottom: SPACING.sm,
  };
  
  const layerItemStyle = (isSelected) => ({
    padding: `${SPACING.sm} ${SPACING.md}`,
    display: 'flex',
    alignItems: 'center',
    gap: SPACING.sm,
    cursor: 'pointer',
    backgroundColor: isSelected ? colors.accent + '20' : 'transparent',
    borderLeft: isSelected ? `2px solid ${colors.accent}` : '2px solid transparent',
    transition: 'background-color 150ms ease',
    fontSize: '13px',
    color: colors.textPrimary,
  });
  
  const getShapeIcon = () => {
    return (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="3" width="18" height="18" rx="2"/>
      </svg>
    );
  };
  
  const getShapeName = (shape) => {
    // Extract a simple name from the ID
    const parts = shape.id.split('_');
    return `Rectangle ${parts[parts.length - 1].slice(0, 4)}`;
  };
  
  return (
    <div style={panelStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <span>Layers ({sortedShapes.length})</span>
        <button
          onClick={onToggle}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: colors.textSecondary,
            padding: SPACING.xs,
          }}
          title="Close (Cmd+\)"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
      
      {/* Search */}
      <div style={{ padding: SPACING.lg, paddingBottom: 0 }}>
        <input
          type="text"
          placeholder="Search layers..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={searchStyle}
        />
      </div>
      
      {/* Layers List */}
      <div style={{ flex: 1, overflowY: 'auto', padding: `${SPACING.sm} 0` }}>
        {sortedShapes.length === 0 ? (
          <div style={{
            padding: SPACING.xxl,
            textAlign: 'center',
            color: colors.textSecondary,
            fontSize: '13px',
          }}>
            {searchQuery ? 'No layers match your search' : 'No layers yet'}
          </div>
        ) : (
          sortedShapes.map((shape) => (
            <div
              key={shape.id}
              style={layerItemStyle(shape.id === selectedShapeId)}
              onClick={() => selectShape(shape.id)}
              onMouseEnter={(e) => {
                if (shape.id !== selectedShapeId) {
                  e.currentTarget.style.backgroundColor = colors.hover;
                }
              }}
              onMouseLeave={(e) => {
                if (shape.id !== selectedShapeId) {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }
              }}
            >
              {/* Shape Icon */}
              <div style={{ flexShrink: 0, display: 'flex', opacity: 0.7 }}>
                {getShapeIcon()}
              </div>
              
              {/* Shape Name */}
              <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {getShapeName(shape)}
              </div>
              
              {/* Lock Indicator */}
              {shape.isLocked && (
                <div style={{ flexShrink: 0, opacity: 0.5 }} title="Locked">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2"/>
                    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                  </svg>
                </div>
              )}
              
              {/* Visibility Toggle - Coming Soon */}
              <div style={{ flexShrink: 0, opacity: 0.3 }} title="Visibility (Coming Soon)">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              </div>
            </div>
          ))
        )}
      </div>
      
      {/* Footer Info */}
      <div style={{
        padding: SPACING.md,
        borderTop: `1px solid ${colors.border}`,
        fontSize: '11px',
        color: colors.textSecondary,
        textAlign: 'center',
      }}>
        Click to select • Drag to reorder (coming soon)
      </div>
    </div>
  );
};

export default LayersPanel;

