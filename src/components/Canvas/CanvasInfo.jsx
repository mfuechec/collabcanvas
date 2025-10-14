// CanvasInfo Component - Floating panel showing canvas statistics
import { useCanvas } from '../../hooks/useCanvas';

const CanvasInfo = () => {
  const { canvasPosition, zoom, shapes, selectedShapeId } = useCanvas();
  
  const selectedCount = selectedShapeId ? 1 : 0;
  const shapesCount = shapes.length;

  return (
    <div 
      className="floating-panel glass-panel animate-fade-in"
      style={{
        top: '20px',
        left: '20px',
        minWidth: '240px',
        padding: '16px',
        fontSize: '14px'
      }}
    >
      <div className="space-y-2">
        <div className="flex justify-between items-center">
          <span style={{ color: 'var(--text-secondary)' }}>Zoom:</span>
          <span style={{ color: 'var(--text-primary)' }} className="font-medium">
            {Math.round(zoom * 100)}%
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span style={{ color: 'var(--text-secondary)' }}>Position:</span>
          <span style={{ color: 'var(--text-primary)' }} className="font-medium">
            ({Math.round(canvasPosition.x)}, {Math.round(canvasPosition.y)})
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span style={{ color: 'var(--text-secondary)' }}>Shapes:</span>
          <span style={{ color: 'var(--text-primary)' }} className="font-medium">
            {shapesCount}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span style={{ color: 'var(--text-secondary)' }}>Selected:</span>
          <span style={{ color: 'var(--text-primary)' }} className="font-medium">
            {selectedCount}
          </span>
        </div>
      </div>
    </div>
  );
};

export default CanvasInfo;
