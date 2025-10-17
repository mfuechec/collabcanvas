import { useState, useEffect } from 'react';
import { useCanvas } from '../../hooks/useCanvas';
import { useTheme } from '../../contexts/ThemeContext';
import { COLORS, LAYOUT, SPACING, BORDER_RADIUS, TYPOGRAPHY } from '../../utils/designSystem';
import { CANVAS_WIDTH, CANVAS_HEIGHT } from '../../utils/constants';

const PropertiesPanel = () => {
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
    strokeWidth: 2,
    text: '',
    fontSize: 48,
    rotation: 0,
    cornerRadius: 0,
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
        strokeWidth: selectedShape.strokeWidth || 2,
        text: selectedShape.text || 'Text',
        fontSize: selectedShape.fontSize || 48,
        rotation: Math.round(selectedShape.rotation || 0),
        cornerRadius: Math.round(selectedShape.cornerRadius || 0),
      });
    }
  }, [selectedShape]);
  
  const handleInputChange = (field, value) => {
    setLocalValues(prev => ({ ...prev, [field]: value }));
  };

  // Check if a rotation would keep the shape within bounds
  const isRotationValid = (shape, rotation) => {
    // For lines and pen, check actual points rotation
    if ((shape.type === 'line' || shape.type === 'pen') && shape.points && shape.points.length >= 4) {
      const radians = (rotation * Math.PI) / 180;
      const cos = Math.cos(radians);
      const sin = Math.sin(radians);
      
      // Calculate center of the shape
      const xCoords = shape.points.filter((_, i) => i % 2 === 0);
      const yCoords = shape.points.filter((_, i) => i % 2 === 1);
      const centerX = (Math.min(...xCoords) + Math.max(...xCoords)) / 2;
      const centerY = (Math.min(...yCoords) + Math.max(...yCoords)) / 2;
      
      // Rotate all points around the center
      for (let i = 0; i < shape.points.length; i += 2) {
        const px = shape.points[i];
        const py = shape.points[i + 1];
        
        // Translate to origin (relative to center)
        const relX = px - centerX;
        const relY = py - centerY;
        
        // Rotate
        const rotatedX = relX * cos - relY * sin;
        const rotatedY = relX * sin + relY * cos;
        
        // Translate back
        const finalX = rotatedX + centerX;
        const finalY = rotatedY + centerY;
        
        // Check if this point is within canvas bounds
        if (finalX < 0 || finalX > CANVAS_WIDTH || finalY < 0 || finalY > CANVAS_HEIGHT) {
          return false;
        }
      }
      
      return true;
    }
    
    // For rectangles, circles, and text, use bounding box approach
    const radians = (rotation * Math.PI) / 180;
    const cos = Math.cos(radians);
    const sin = Math.sin(radians);
    
    // For text shapes, estimate dimensions based on text content
    // Text auto-sizes, so we need to approximate width/height
    let shapeWidth = shape.width;
    let shapeHeight = shape.height;
    
    if (shape.type === 'text') {
      // Rough estimation: 0.6 * fontSize per character for width
      const text = shape.text || 'Text';
      const fontSize = shape.fontSize || 48;
      shapeWidth = text.length * fontSize * 0.6;
      shapeHeight = fontSize * 1.2; // Height is roughly 1.2x fontSize
    }
    
    // Four corners of the unrotated rectangle (relative to top-left)
    const corners = [
      { x: 0, y: 0 },
      { x: shapeWidth, y: 0 },
      { x: shapeWidth, y: shapeHeight },
      { x: 0, y: shapeHeight }
    ];
    
    // Rotate each corner and find the bounding box
    const rotatedCorners = corners.map(corner => ({
      x: corner.x * cos - corner.y * sin,
      y: corner.x * sin + corner.y * cos
    }));
    
    const minX = Math.min(...rotatedCorners.map(c => c.x));
    const maxX = Math.max(...rotatedCorners.map(c => c.x));
    const minY = Math.min(...rotatedCorners.map(c => c.y));
    const maxY = Math.max(...rotatedCorners.map(c => c.y));
    
    // Check if rotated bounding box fits within canvas
    const adjustedX = shape.x + minX;
    const adjustedY = shape.y + minY;
    const rotatedWidth = maxX - minX;
    const rotatedHeight = maxY - minY;
    
    return (
      adjustedX >= 0 &&
      adjustedY >= 0 &&
      adjustedX + rotatedWidth <= CANVAS_WIDTH &&
      adjustedY + rotatedHeight <= CANVAS_HEIGHT
    );
  };

  // Find the maximum valid rotation in the direction of targetRotation
  const findMaxValidRotation = (shape, currentRotation, targetRotation) => {
    // If target is valid, return it
    if (isRotationValid(shape, targetRotation)) {
      return targetRotation;
    }
    
    // Binary search for the maximum valid rotation
    let low = currentRotation;
    let high = targetRotation;
    
    // Determine direction
    const direction = targetRotation > currentRotation ? 1 : -1;
    
    // Handle wrapping around 360
    if (Math.abs(targetRotation - currentRotation) > 180) {
      // User is rotating the "short way" around the circle
      if (direction > 0) {
        high = targetRotation - 360;
      } else {
        high = targetRotation + 360;
      }
    }
    
    let maxValid = currentRotation;
    const iterations = 20; // Precision: ~0.18 degrees with 360/2^20
    
    for (let i = 0; i < iterations; i++) {
      const mid = (low + high) / 2;
      const normalizedMid = ((mid % 360) + 360) % 360;
      
      if (isRotationValid(shape, normalizedMid)) {
        maxValid = normalizedMid;
        if (direction > 0) {
          low = mid;
        } else {
          high = mid;
        }
      } else {
        if (direction > 0) {
          high = mid;
        } else {
          low = mid;
        }
      }
    }
    
    return Math.round(maxValid);
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
    
    // For lines and pen, update stroke color as well
    if (selectedShape.type === 'line' || selectedShape.type === 'pen') {
      updateShape(selectedShape.id, { fill: color, stroke: color });
    } else {
      updateShape(selectedShape.id, { fill: color });
    }
  };
  
  const handleOpacityChange = (opacity) => {
    if (!selectedShape) return;
    const opacityValue = opacity / 100;
    setLocalValues(prev => ({ ...prev, opacity }));
    updateShape(selectedShape.id, { opacity: opacityValue });
  };
  
  const handleStrokeWidthChange = (strokeWidth) => {
    if (!selectedShape) return;
    setLocalValues(prev => ({ ...prev, strokeWidth }));
    updateShape(selectedShape.id, { strokeWidth });
  };
  
  const handleTextChange = (text) => {
    if (!selectedShape) return;
    setLocalValues(prev => ({ ...prev, text }));
    // ✅ Instant update - sync to Firebase immediately (like font size)
    updateShape(selectedShape.id, { text });
  };
  
  const handleFontSizeChange = (fontSize) => {
    if (!selectedShape) return;
    setLocalValues(prev => ({ ...prev, fontSize }));
    updateShape(selectedShape.id, { fontSize });
  };
  
  const panelStyle = {
    width: LAYOUT.rightSidebar.width,
    height: '65vh',
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
    padding: `${SPACING.sm} ${SPACING.md}`, // Reduced padding for compact layout
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
    padding: `${SPACING.sm} ${SPACING.md}`, // Reduced padding for compact layout
    borderBottom: `1px solid ${colors.border}`,
  };
  
  const labelStyle = {
    fontSize: '10px',
    fontWeight: 600,
    color: colors.textSecondary,
    marginBottom: '4px', // Reduced margin
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  };
  
  const inputStyle = {
    width: '100%',
    padding: '6px 8px', // Reduced padding for compact layout
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
    gap: '8px', // Reduced gap for compact layout
    marginBottom: '8px', // Reduced margin
  };
  
  // Don't render panel if nothing is selected
  if (!selectedShape) {
    return null;
  }
  
  return (
    <div style={panelStyle}>
      {/* Header */}
      <div style={headerStyle}>
        <span>Properties</span>
        {selectedShape.isLocked && selectedShape.lockedBy !== selectedShape.createdBy && (
          <span style={{ 
            fontSize: '10px', 
            color: colors.warning || '#f59e0b',
            fontWeight: 'normal',
            textTransform: 'none'
          }}>
            🔒 Locked
          </span>
        )}
      </div>
      
      {/* Content */}
      <div style={{ flex: 1 }}>
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
            
            {/* Size Section - Hidden for text (auto-sized) */}
            {selectedShape.type !== 'text' && (
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
            )}
            
            {/* Fill Section */}
            <div style={sectionStyle}>
              <div style={labelStyle}>Fill</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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
                  fontSize: '11px',
                  fontFamily: TYPOGRAPHY.fontFamily.mono,
                  color: colors.textSecondary,
                  minWidth: '35px',
                  textAlign: 'right',
                }}>
                  {localValues.opacity}%
                </span>
              </div>
            </div>
            
            {/* Rotation Section */}
            <div style={sectionStyle}>
              <div style={labelStyle}>Rotation</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="range"
                  min="0"
                  max="360"
                  value={localValues.rotation}
                  onChange={(e) => {
                    const targetRotation = parseInt(e.target.value);
                    const currentRotation = selectedShape.rotation || 0;
                    
                    // Find max valid rotation in the target direction
                    const validRotation = findMaxValidRotation(selectedShape, currentRotation, targetRotation);
                    
                    handleInputChange('rotation', validRotation);
                    updateShape(selectedShape.id, { rotation: validRotation });
                  }}
                  style={{
                    flex: 1,
                    accentColor: colors.accent,
                  }}
                />
                <input
                  type="number"
                  min="0"
                  max="360"
                  value={localValues.rotation}
                  onChange={(e) => handleInputChange('rotation', e.target.value)}
                  onBlur={() => {
                    let targetRotation = parseInt(localValues.rotation);
                    if (isNaN(targetRotation)) targetRotation = 0;
                    targetRotation = ((targetRotation % 360) + 360) % 360; // Normalize to 0-360
                    
                    const currentRotation = selectedShape.rotation || 0;
                    
                    // Find max valid rotation in the target direction
                    const validRotation = findMaxValidRotation(selectedShape, currentRotation, targetRotation);
                    
                    handleInputChange('rotation', validRotation);
                    updateShape(selectedShape.id, { rotation: validRotation });
                  }}
                  style={{
                    ...inputStyle,
                    width: '50px',
                    fontSize: '11px',
                  }}
                />
                <span style={{
                  fontSize: '11px',
                  fontFamily: TYPOGRAPHY.fontFamily.mono,
                  color: colors.textSecondary,
                }}>
                  °
                </span>
              </div>
            </div>
            
            {/* Corner Radius Section - Only for rectangles */}
            {selectedShape.type === 'rectangle' && (
              <div style={sectionStyle}>
                <div style={labelStyle}>Corner Radius</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="range"
                    min="0"
                    max="50"
                    value={localValues.cornerRadius}
                    onChange={(e) => {
                      const value = parseInt(e.target.value);
                      handleInputChange('cornerRadius', value);
                      updateShape(selectedShape.id, { cornerRadius: value }).catch(error => {
                        console.warn('Failed to update corner radius:', error.message);
                        // Revert local value on error
                        handleInputChange('cornerRadius', selectedShape.cornerRadius || 0);
                      });
                    }}
                    style={{
                      flex: 1,
                      accentColor: colors.accent,
                    }}
                  />
                  <input
                    type="number"
                    min="0"
                    max="50"
                    value={localValues.cornerRadius}
                    onChange={(e) => handleInputChange('cornerRadius', e.target.value)}
                    onBlur={() => {
                      let value = parseInt(localValues.cornerRadius);
                      if (isNaN(value)) value = 0;
                      value = Math.max(0, Math.min(50, value)); // Clamp to 0-50
                      handleInputChange('cornerRadius', value);
                      updateShape(selectedShape.id, { cornerRadius: value }).catch(error => {
                        console.warn('Failed to update corner radius:', error.message);
                        // Revert local value on error
                        handleInputChange('cornerRadius', selectedShape.cornerRadius || 0);
                      });
                    }}
                    style={{
                      ...inputStyle,
                      width: '50px',
                      fontSize: '11px',
                    }}
                  />
                  <span style={{
                    fontSize: '11px',
                    fontFamily: TYPOGRAPHY.fontFamily.mono,
                    color: colors.textSecondary,
                  }}>
                    px
                  </span>
                </div>
              </div>
            )}
            
            {/* Stroke Width Section - Only for lines/pen */}
            {(selectedShape.type === 'line' || selectedShape.type === 'pen') && (
              <div style={sectionStyle}>
                <div style={labelStyle}>Stroke Width</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="range"
                    min="1"
                    max="20"
                    value={localValues.strokeWidth}
                    onChange={(e) => handleStrokeWidthChange(parseInt(e.target.value))}
                    style={{
                      flex: 1,
                      accentColor: colors.accent,
                    }}
                  />
                  <span style={{
                    fontSize: '11px',
                    fontFamily: TYPOGRAPHY.fontFamily.mono,
                    color: colors.textSecondary,
                    minWidth: '35px',
                    textAlign: 'right',
                  }}>
                    {localValues.strokeWidth}px
                  </span>
                </div>
              </div>
            )}
            
            {/* Text Content Section - Only for text */}
            {selectedShape.type === 'text' && (
              <>
                <div style={sectionStyle}>
                  <div style={labelStyle}>Text Content</div>
                  <textarea
                    value={localValues.text}
                    onChange={(e) => handleTextChange(e.target.value)}
                    style={{
                      ...inputStyle,
                      minHeight: '80px',
                      resize: 'vertical',
                      fontFamily: TYPOGRAPHY.fontFamily.base,
                    }}
                  />
                </div>
                
                <div style={sectionStyle}>
                  <div style={labelStyle}>Font Size</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                      type="range"
                      min="8"
                      max="500"
                      value={localValues.fontSize}
                      onChange={(e) => handleFontSizeChange(parseInt(e.target.value))}
                      style={{
                        flex: 1,
                        accentColor: colors.accent,
                      }}
                    />
                    <span style={{
                      fontSize: '11px',
                      fontFamily: TYPOGRAPHY.fontFamily.mono,
                      color: colors.textSecondary,
                      minWidth: '45px',
                      textAlign: 'right',
                    }}>
                      {localValues.fontSize}px
                    </span>
                  </div>
                </div>
              </>
            )}
          </>
      </div>
    </div>
  );
};

export default PropertiesPanel;

