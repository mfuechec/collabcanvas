import { useTheme } from '../../contexts/ThemeContext';
import { useCanvasMode } from '../../contexts/CanvasModeContext';
import { useCanvas } from '../../hooks/useCanvas';
import { COLORS, LAYOUT, SPACING, BORDER_RADIUS, TOOLS } from '../../utils/designSystem';
import Tooltip from '../UI/Tooltip';
import './LeftSidebar.css';

const LeftSidebar = ({ onToggleLayers, layersOpen }) => {
  const { theme } = useTheme();
  const { currentMode, setMode } = useCanvasMode();
  const { deleteShape, selectedShapeId, deselectAll } = useCanvas();
  
  const colors = COLORS[theme];
  
  const handleToolClick = (tool) => {
    if (tool === TOOLS.HAND) {
      setMode('move');
    } else if (tool === TOOLS.RECTANGLE) {
      setMode('draw');
    }
    // TODO: Add handlers for other tools when implemented
  };
  
  const sidebarStyle = {
    width: LAYOUT.leftSidebar.width,
    height: '100vh',
    backgroundColor: colors.sidebar,
    borderRight: `1px solid ${colors.border}`,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: `${SPACING.sm} 0`,
    position: 'fixed',
    left: 0,
    top: 0,
    zIndex: 10,
  };
  
  const logoStyle = {
    height: '40px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
    fontSize: '20px',
    fontWeight: 600,
    color: colors.accent,
  };
  
  const toolButtonStyle = (isActive) => ({
    width: LAYOUT.toolButton.size,
    height: LAYOUT.toolButton.size,
    borderRadius: BORDER_RADIUS.button,
    backgroundColor: isActive ? colors.accent : 'transparent',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.sm,
    transition: 'background-color 150ms ease',
    color: isActive ? '#FFFFFF' : colors.textPrimary,
  });
  
  const dividerStyle = {
    width: '32px',
    height: '1px',
    backgroundColor: colors.border,
    margin: `${SPACING.sm} 0`,
  };
  
  return (
    <div style={sidebarStyle}>
      {/* Logo */}
      <div style={logoStyle}>
        CC
      </div>
      
      {/* Layers Toggle Button */}
      <Tooltip text="Toggle Layers" shortcut="Cmd+\">
        <button
          style={{
            ...toolButtonStyle(layersOpen),
            marginBottom: SPACING.lg,
          }}
          onClick={onToggleLayers}
          className="tool-button"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
        </button>
      </Tooltip>
      
      {/* Tool Section */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* Hand/Pan Tool (V key) */}
        <Tooltip text="Hand Tool" shortcut="H">
          <button
            style={toolButtonStyle(currentMode === 'move')}
            onClick={() => handleToolClick(TOOLS.HAND)}
            className="tool-button"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 11V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v0"/>
              <path d="M14 10V4a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v2"/>
              <path d="M10 10.5V6a2 2 0 0 0-2-2v0a2 2 0 0 0-2 2v8"/>
              <path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>
            </svg>
          </button>
        </Tooltip>
        
        {/* Rectangle Tool (R key) */}
        <Tooltip text="Rectangle Tool" shortcut="R">
          <button
            style={toolButtonStyle(currentMode === 'draw')}
            onClick={() => handleToolClick(TOOLS.RECTANGLE)}
            className="tool-button"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2"/>
            </svg>
          </button>
        </Tooltip>
        
        {/* Circle Tool (C key) - Coming soon */}
        <Tooltip text="Circle Tool - Coming Soon" shortcut="C">
          <button
            style={{...toolButtonStyle(false), opacity: 0.5, cursor: 'not-allowed'}}
            disabled
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/>
            </svg>
          </button>
        </Tooltip>
        
        {/* Line Tool (L key) - Coming soon */}
        <Tooltip text="Line Tool - Coming Soon" shortcut="L">
          <button
            style={{...toolButtonStyle(false), opacity: 0.5, cursor: 'not-allowed'}}
            disabled
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 19 19 5"/>
            </svg>
          </button>
        </Tooltip>
        
        {/* Pen Tool (P key) - Coming soon */}
        <Tooltip text="Pen Tool - Coming Soon" shortcut="P">
          <button
            style={{...toolButtonStyle(false), opacity: 0.5, cursor: 'not-allowed'}}
            disabled
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 19l7-7 3 3-7 7-3-3z"/>
              <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>
              <path d="M2 2l7.586 7.586"/>
              <circle cx="11" cy="11" r="2"/>
            </svg>
          </button>
        </Tooltip>
        
        {/* Text Tool (T key) - Coming soon */}
        <Tooltip text="Text Tool - Coming Soon" shortcut="T">
          <button
            style={{...toolButtonStyle(false), opacity: 0.5, cursor: 'not-allowed'}}
            disabled
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 7V4h16v3"/>
              <path d="M9 20h6"/>
              <path d="M12 4v16"/>
            </svg>
          </button>
        </Tooltip>
      </div>
      
      <div style={dividerStyle} />
      
      {/* Action Section */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* Delete Button */}
        <Tooltip text="Delete" shortcut="Delete">
          <button
            style={{
              ...toolButtonStyle(false),
              opacity: selectedShapeId ? 1 : 0.5,
              cursor: selectedShapeId ? 'pointer' : 'not-allowed'
            }}
            onClick={() => {
              if (selectedShapeId) {
                deleteShape(selectedShapeId);
                deselectAll();
              }
            }}
            disabled={!selectedShapeId}
            className="tool-button"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 6h18"/>
              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
            </svg>
          </button>
        </Tooltip>
        
        {/* Duplicate Button */}
        <Tooltip text="Duplicate" shortcut="Cmd+D">
          <button
            style={{...toolButtonStyle(false), opacity: 0.5, cursor: 'not-allowed'}}
            disabled
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2"/>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
            </svg>
          </button>
        </Tooltip>
        
        {/* Undo Button */}
        <Tooltip text="Undo" shortcut="Cmd+Z">
          <button
            style={{...toolButtonStyle(false), opacity: 0.5, cursor: 'not-allowed'}}
            disabled
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 7v6h6"/>
              <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>
            </svg>
          </button>
        </Tooltip>
        
        {/* Redo Button */}
        <Tooltip text="Redo" shortcut="Cmd+Shift+Z">
          <button
            style={{...toolButtonStyle(false), opacity: 0.5, cursor: 'not-allowed'}}
            disabled
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 7v6h-6"/>
              <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"/>
            </svg>
          </button>
        </Tooltip>
      </div>
      
      {/* Bottom Section - Zoom Controls */}
      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: SPACING.xs, paddingBottom: SPACING.lg }}>
        {/* Zoom Out Button */}
        <Tooltip text="Zoom Out" shortcut="Cmd+-">
          <button
            style={{
              width: '36px',
              height: '28px',
              borderRadius: BORDER_RADIUS.button,
              backgroundColor: 'transparent',
              border: `1px solid ${colors.border}`,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: colors.textPrimary,
              fontSize: '16px',
              fontWeight: 600,
            }}
            onClick={() => {
              // This will be wired up later
              console.log('Zoom out');
            }}
            className="tool-button"
          >
            −
          </button>
        </Tooltip>
        
        {/* Zoom Percentage Display */}
        <div style={{
          fontSize: '10px',
          color: colors.textSecondary,
          fontWeight: 500,
          fontFamily: 'monospace',
        }}>
          100%
        </div>
        
        {/* Zoom In Button */}
        <Tooltip text="Zoom In" shortcut="Cmd++">
          <button
            style={{
              width: '36px',
              height: '28px',
              borderRadius: BORDER_RADIUS.button,
              backgroundColor: 'transparent',
              border: `1px solid ${colors.border}`,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: colors.textPrimary,
              fontSize: '16px',
              fontWeight: 600,
            }}
            onClick={() => {
              // This will be wired up later
              console.log('Zoom in');
            }}
            className="tool-button"
          >
            +
          </button>
        </Tooltip>
      </div>
    </div>
  );
};

export default LeftSidebar;

