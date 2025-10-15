import { useState, useEffect } from 'react';
import { useCanvas } from '../../hooks/useCanvas';
import { useTheme } from '../../contexts/ThemeContext';
import { COLORS, LAYOUT, SPACING, BORDER_RADIUS, TYPOGRAPHY } from '../../utils/designSystem';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../../utils/constants';

const PropertiesPanel = ({ isOpen, onToggle }) => {
  const { shapes, selectedShapeId, updateShape } = useCanvas();
  const { theme } = useTheme();
  const colors = COLORS[theme];
  
  // Get selected shape
  const selectedShape = shapes.find(s => s.id === selectedShapeId);
  
  // Local state for inputs (to allow typing without immediate updates)
  const [localValues, setLocalValues] = useState({
    x: '',
    y: '',
    width: '',
    height: '',
    fill: '',
    opacity: 100,
  });
  
  // Update local values when selection changes
  useEffect(() => {
    if (selectedShape) {
      setLocalValues({
        x: Math.round(selectedShape.x).toString(),
        y: Math.round(selectedShape.y).toString(),
        width: Math.round(selectedShape.width).toString(),
        height: Math.round(selectedShape.height).toString(),
        fill: selectedShape.fill || '#3b82f6',
        opacity: Math.round((selectedShape.opacity || 1) * 100),
      });
    }
  }, [selectedShape]);
  
  const handleInputChange = (field, value) => {
    setLocalValues(prev => ({ ...prev, [field]: value }));
  };
  
  const handleInputBlur = (field) => {
    if (!selectedShape) return;
    
    let numValue = parseFloat(localValues[field]);
    if (isNaN(numValue)) {
      // Reset to current shape value if invalid
      setLocalValues(prev => ({
        ...prev,
        [field]: Math.round(selectedShape[field]).toString()
      }));
      return;
    }
    
    // Constrain to canvas boundaries (5000x5000)
    if (field === 'x') {
      numValue = Math.max(0, Math.min(CANVAS_WIDTH - selectedShape.width, numValue));
    } else if (field === 'y') {
      numValue = Math.max(0, Math.min(CANVAS_HEIGHT - selectedShape.height, numValue));
    } else if (field === 'width') {
      numValue = Math.max(1, Math.min(CANVAS_WIDTH - selectedShape.x, numValue));
    } else if (field === 'height') {
      numValue = Math.max(1, Math.min(CANVAS_HEIGHT - selectedShape.y, numValue));
    }
    
    // Update local value to show constrained value
    setLocalValues(prev => ({
      ...prev,
      [field]: Math.round(numValue).toString()
    }));
    
    // Update shape in Firebase
    updateShape(selectedShape.id, { [field]: numValue });
  };
  
  const handleColorChange = (color) => {
    if (!selectedShape) return;
    setLocalValues(prev => ({ ...prev, fill: color }));
    updateShape(selectedShape.id, { fill: color });
  };
  
  const handleOpacityChange = (opacity) => {
    if (!selectedShape) return;
    const opacityValue = opacity / 100;
    setLocalValues(prev => ({ ...prev, opacity }));
    updateShape(selectedShape.id, { opacity: opacityValue });
  };
  
  if (!isOpen) return null;
  
  const panelStyle = {
    width: LAYOUT.rightSidebar.width,
    height: '100vh',
    backgroundColor: colors.sidebar,
    borderLeft: `1px solid ${colors.border}`,
    position: 'fixed',
    right: 0,
    top: 0,
    zIndex: 10,
    display: 'flex',
    flexDirection: 'column',
    overflowY: 'auto',
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
  
  const sectionStyle = {
    padding: SPACING.lg,
    borderBottom: `1px solid ${colors.border}`,
  };
  
  const labelStyle = {
    fontSize: '11px',
    fontWeight: 600,
    color: colors.textSecondary,
    marginBottom: SPACING.xs,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  };
  
  const inputStyle = {
    width: '100%',
    padding: `${SPACING.xs} ${SPACING.sm}`,
    backgroundColor: colors.background,
    border: `1px solid ${colors.border}`,
    borderRadius: BORDER_RADIUS.button,
    color: colors.textPrimary,
    fontSize: '12px',
    fontFamily: TYPOGRAPHY.fontFamily.mono,
    outline: 'none',
  };
  
  const rowStyle = {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  };
  
  return (
    <div style={panelStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <span>Properties</span>
        <button
          onClick={onToggle}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: colors.textSecondary,
            padding: SPACING.xs,
          }}
          title="Close (Cmd+.)"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12"/>
          </svg>
        </button>
      </div>
      
      {/* Content */}
      <div style={{ flex: 1 }}>
        {!selectedShape ? (
          // Nothing selected state
          <div style={{
            ...sectionStyle,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: SPACING.xxl,
            textAlign: 'center',
            color: colors.textSecondary,
            fontSize: '13px',
          }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ marginBottom: SPACING.lg, opacity: 0.5 }}>
              <rect x="3" y="3" width="7" height="7"/>
              <rect x="14" y="3" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/>
              <rect x="3" y="14" width="7" height="7"/>
            </svg>
            <p style={{ marginBottom: SPACING.sm, fontWeight: 500 }}>No selection</p>
            <p style={{ fontSize: '12px', opacity: 0.8 }}>Select a shape to view its properties</p>
          </div>
        ) : (
          <>
            {/* Position Section */}
            <div style={sectionStyle}>
              <div style={labelStyle}>Position</div>
              <div style={rowStyle}>
                <div>
                  <label style={{ fontSize: '11px', color: colors.textSecondary, display: 'block', marginBottom: '4px' }}>X</label>
                  <input
                    type="text"
                    value={localValues.x}
                    onChange={(e) => handleInputChange('x', e.target.value)}
                    onBlur={() => handleInputBlur('x')}
                    onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: colors.textSecondary, display: 'block', marginBottom: '4px' }}>Y</label>
                  <input
                    type="text"
                    value={localValues.y}
                    onChange={(e) => handleInputChange('y', e.target.value)}
                    onBlur={() => handleInputBlur('y')}
                    onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
                    style={inputStyle}
                  />
                </div>
              </div>
            </div>
            
            {/* Size Section */}
            <div style={sectionStyle}>
              <div style={labelStyle}>Size</div>
              <div style={rowStyle}>
                <div>
                  <label style={{ fontSize: '11px', color: colors.textSecondary, display: 'block', marginBottom: '4px' }}>W</label>
                  <input
                    type="text"
                    value={localValues.width}
                    onChange={(e) => handleInputChange('width', e.target.value)}
                    onBlur={() => handleInputBlur('width')}
                    onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '11px', color: colors.textSecondary, display: 'block', marginBottom: '4px' }}>H</label>
                  <input
                    type="text"
                    value={localValues.height}
                    onChange={(e) => handleInputChange('height', e.target.value)}
                    onBlur={() => handleInputBlur('height')}
                    onKeyDown={(e) => e.key === 'Enter' && e.target.blur()}
                    style={inputStyle}
                  />
                </div>
              </div>
            </div>
            
            {/* Fill Section */}
            <div style={sectionStyle}>
              <div style={labelStyle}>Fill</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.sm }}>
                <input
                  type="color"
                  value={localValues.fill}
                  onChange={(e) => handleColorChange(e.target.value)}
                  style={{
                    width: '40px',
                    height: '40px',
                    border: `1px solid ${colors.border}`,
                    borderRadius: BORDER_RADIUS.button,
                    cursor: 'pointer',
                  }}
                />
                <input
                  type="text"
                  value={localValues.fill}
                  onChange={(e) => handleColorChange(e.target.value)}
                  style={{
                    ...inputStyle,
                    textTransform: 'uppercase',
                  }}
                />
              </div>
            </div>
            
            {/* Opacity Section */}
            <div style={sectionStyle}>
              <div style={labelStyle}>Opacity</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: SPACING.sm }}>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={localValues.opacity}
                  onChange={(e) => handleOpacityChange(parseInt(e.target.value))}
                  style={{
                    flex: 1,
                    accentColor: colors.accent,
                  }}
                />
                <span style={{
                  fontSize: '12px',
                  fontFamily: TYPOGRAPHY.fontFamily.mono,
                  color: colors.textSecondary,
                  minWidth: '40px',
                  textAlign: 'right',
                }}>
                  {localValues.opacity}%
                </span>
              </div>
            </div>
            
            {/* Rotation Section - Coming Soon */}
            <div style={{...sectionStyle, opacity: 0.5}}>
              <div style={labelStyle}>Rotation</div>
              <input
                type="text"
                value="0°"
                disabled
                style={{...inputStyle, cursor: 'not-allowed'}}
              />
              <div style={{ fontSize: '11px', color: colors.textSecondary, marginTop: SPACING.xs }}>
                Coming soon
              </div>
            </div>
            
            {/* Stroke Section - Coming Soon */}
            <div style={{...sectionStyle, opacity: 0.5}}>
              <div style={labelStyle}>Stroke</div>
              <div style={{ fontSize: '11px', color: colors.textSecondary }}>
                Coming soon
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PropertiesPanel;

