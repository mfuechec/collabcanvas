// CanvasToolbar Component - Floating toolbar with Draw/Move/Reset modes
import { useCanvasMode } from '../../contexts/CanvasModeContext';
import { useCanvas } from '../../hooks/useCanvas';
import { clearAllShapes, addRandomShapes } from '../../utils/clearCanvas';

const CanvasToolbar = () => {
  const { currentMode, setMode, CANVAS_MODES } = useCanvasMode();
  const { resetView } = useCanvas();

  const handleModeChange = (mode) => {
    setMode(mode);
  };

  const handleReset = () => {
    resetView();
  };

  const handleClearAll = async () => {
    if (window.confirm('⚠️ Clear all shapes from canvas? This cannot be undone.')) {
      try {
        await clearAllShapes();
        console.log('✅ All shapes cleared from canvas');
      } catch (error) {
        console.error('❌ Failed to clear shapes:', error);
        alert('Failed to clear shapes. Please try again.');
      }
    }
  };

  const handleAddRandomShapes = async () => {
    if (window.confirm('🎲 Add 500 random shapes to canvas? This will replace existing shapes.')) {
      try {
        await addRandomShapes(500);
        console.log('✅ Added 500 random shapes to canvas');
      } catch (error) {
        console.error('❌ Failed to add random shapes:', error);
        alert('Failed to add random shapes. Please try again.');
      }
    }
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

      {/* Divider */}
      <div 
        className="w-px h-8 mx-1"
        style={{ backgroundColor: 'var(--border-primary)' }}
      ></div>

      {/* Clear All Button */}
      <button
        onClick={handleClearAll}
        className="btn-modern btn-icon btn-danger"
        title="Clear all shapes from canvas (⚠️ Cannot be undone)"
        aria-label="Clear all shapes"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>

      {/* Add Random Shapes Button */}
      <button
        onClick={handleAddRandomShapes}
        className="btn-modern btn-icon btn-secondary"
        title="Add 500 random shapes for testing"
        aria-label="Add random shapes"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
        </svg>
      </button>
    </div>
  );
};

export default CanvasToolbar;
