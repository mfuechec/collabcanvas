// CanvasToolbar Component - Floating toolbar with Draw/Move/Reset modes
import { useCanvasMode } from '../../contexts/CanvasModeContext';
import { useCanvas } from '../../hooks/useCanvas';

const CanvasToolbar = () => {
  const { currentMode, setMode, CANVAS_MODES } = useCanvasMode();
  const { resetView } = useCanvas();

  const handleModeChange = (mode) => {
    setMode(mode);
  };

  const handleReset = () => {
    resetView();
  };

  return (
    <div 
      className="floating-panel glass-panel animate-fade-in"
      style={{
        top: '20px',
        left: '280px', // Position to the right of CanvasInfo panel
        padding: '12px',
        display: 'flex',
        gap: '8px'
      }}
    >
      {/* Draw Mode Button */}
      <button
        onClick={() => handleModeChange(CANVAS_MODES.DRAW)}
        className={`btn-modern btn-icon ${currentMode === CANVAS_MODES.DRAW ? 'active' : ''}`}
        title="Draw rectangles (D)"
        aria-label="Draw mode - Press D"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
        </svg>
      </button>

      {/* Move Mode Button */}
      <button
        onClick={() => handleModeChange(CANVAS_MODES.MOVE)}
        className={`btn-modern btn-icon ${currentMode === CANVAS_MODES.MOVE ? 'active' : ''}`}
        title="Move and pan canvas (V)"
        aria-label="Move mode - Press V"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M7 16l-4-4m0 0l4-4m-4 4h18M17 8l4 4m0 0l-4 4m4-4H3" />
        </svg>
      </button>

      {/* Divider */}
      <div 
        className="w-px h-8 mx-1"
        style={{ backgroundColor: 'var(--border-primary)' }}
      ></div>

      {/* Reset Button */}
      <button
        onClick={handleReset}
        className="btn-modern btn-icon"
        title="Reset canvas view (R or Ctrl+0)"
        aria-label="Reset view - Press R"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </button>
    </div>
  );
};

export default CanvasToolbar;
