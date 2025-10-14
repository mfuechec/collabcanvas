import { Rect } from 'react-konva';
import { useCanvas } from '../../hooks/useCanvas';
import { useCanvasMode } from '../../contexts/CanvasModeContext';
import { useDragPreviews } from '../../hooks/useDragPreviews';

const Shape = ({ 
  id, 
  x, 
  y, 
  width, 
  height, 
  fill, 
  isSelected, 
  isLocked, 
  lockedBy 
}) => {
  const { 
    selectShape, 
    updateShape, 
    constrainToBounds,
    lockShape,
    unlockShape,
    isShapeLockedByCurrentUser,
    isShapeLockedByOther,
    getCurrentUserId
  } = useCanvas();

  const { currentMode, CANVAS_MODES } = useCanvasMode();
  const { updatePreview, clearPreview, isActive: isDragPreviewActive } = useDragPreviews();

  // Handle shape click for selection
  const handleClick = (e) => {
    // Only allow selection in move mode
    if (currentMode !== CANVAS_MODES.MOVE) {
      return;
    }
    
    // Stop event from bubbling to stage
    e.cancelBubble = true;
    
    // Don't select if locked by another user
    if (isShapeLockedByOther({ id, isLocked, lockedBy })) {
      return;
    }
    
    selectShape(id);
  };

  // Handle shape drag start
  const handleDragStart = (e) => {
    // Only allow dragging in move mode
    if (currentMode !== CANVAS_MODES.MOVE) {
      e.target.stopDrag();
      return;
    }
    
    // Only check local state, no Firebase calls
    if (isLocked && lockedBy && lockedBy !== getCurrentUserId()) {
      e.target.stopDrag();
      return;
    }
    
    // Only do selection - no Firebase operations at all
    selectShape(id);
  };

  // Handle shape drag move with boundary constraints
  const handleDragMove = (e) => {
    const shape = e.target;
    const newPos = shape.position();
    
    // Constrain shape to canvas boundaries
    const constrainedPos = constrainToBounds(
      newPos.x, 
      newPos.y, 
      width, 
      height
    );
    
    // Update position if it was constrained
    if (constrainedPos.x !== newPos.x || constrainedPos.y !== newPos.y) {
      shape.position(constrainedPos);
    }
    
    // Update collaborative drag preview for other users to see
    if (isDragPreviewActive) {
      updatePreview(id, {
        x: constrainedPos.x,
        y: constrainedPos.y,
        width,
        height,
        fill
      });
    }
  };

  // Handle shape drag end - ALL Firebase operations here
  const handleDragEnd = (e) => {
    const shape = e.target;
    const finalPos = shape.position();
    
    // Ensure final position is within bounds
    const constrainedPos = constrainToBounds(
      finalPos.x, 
      finalPos.y, 
      width, 
      height
    );
    
    // Ensure shape is positioned correctly immediately
    shape.position(constrainedPos);
    
    // Clear collaborative drag preview when drag ends
    clearPreview();
    
    // ALL Firebase operations happen here in one go (non-blocking)
    Promise.resolve().then(async () => {
      try {
        // Lock first
        await lockShape(id);
        
        // Then update position
        await updateShape(id, {
          x: constrainedPos.x,
          y: constrainedPos.y
        });
        
        // Finally unlock
        await unlockShape(id);
        
        console.log('Shape updated and synced successfully:', id);
      } catch (error) {
        console.error('Firebase sync failed:', error);
        // Try to unlock even if other operations failed
        try {
          await unlockShape(id);
        } catch (unlockError) {
          console.error('Failed to unlock shape after error:', unlockError);
        }
      }
    });
  };

  // Visual styling based on state
  const getStroke = () => {
    const shape = { id, isLocked, lockedBy };
    
    if (isShapeLockedByOther(shape)) {
      return '#ef4444'; // Red border for locked by others
    }
    if (isSelected) {
      return '#3b82f6'; // Blue border for selected
    }
    return 'transparent';
  };

  const getStrokeWidth = () => {
    const shape = { id, isLocked, lockedBy };
    return (isSelected || isShapeLockedByOther(shape)) ? 2 : 0;
  };

  const getOpacity = () => {
    const shape = { id, isLocked, lockedBy };
    return isShapeLockedByOther(shape) ? 0.6 : 1.0;
  };

  const isDraggable = () => {
    const shape = { id, isLocked, lockedBy };
    return currentMode === CANVAS_MODES.MOVE && !isShapeLockedByOther(shape);
  };

  return (
    <Rect
      x={x}
      y={y}
      width={width}
      height={height}
      fill={fill}
      stroke={getStroke()}
      strokeWidth={getStrokeWidth()}
      opacity={getOpacity()}
      draggable={isDraggable()}
      onClick={handleClick}
      onTap={handleClick} // For mobile
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      // Visual feedback on hover
      onMouseEnter={(e) => {
        const container = e.target.getStage().container();
        const shape = { id, isLocked, lockedBy };
        if (currentMode === CANVAS_MODES.MOVE) {
          container.style.cursor = 
            isShapeLockedByOther(shape) ? 'not-allowed' : 'pointer';
        }
      }}
      onMouseLeave={(e) => {
        const container = e.target.getStage().container();
        container.style.cursor = 'default';
      }}
    />
  );
};

export default Shape;