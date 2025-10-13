import { Rect } from 'react-konva';
import { useCanvas } from '../../hooks/useCanvas';

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
    constrainToBounds 
  } = useCanvas();

  // Handle shape click for selection
  const handleClick = (e) => {
    // Stop event from bubbling to stage
    e.cancelBubble = true;
    
    // Don't select if locked by another user
    if (isLocked && lockedBy !== 'current-user') {
      return;
    }
    
    selectShape(id);
  };

  // Handle shape drag start
  const handleDragStart = (e) => {
    // Only allow dragging if not locked by another user
    if (isLocked && lockedBy !== 'current-user') {
      e.target.stopDrag();
      return;
    }
    
    // Auto-select shape when starting to drag
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
  };

  // Handle shape drag end - update position in context
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
    
    // Update shape position in context
    updateShape(id, {
      x: constrainedPos.x,
      y: constrainedPos.y
    });
    
    // Ensure shape is positioned correctly
    shape.position(constrainedPos);
  };

  // Visual styling based on state
  const getStroke = () => {
    if (isLocked && lockedBy !== 'current-user') {
      return '#ef4444'; // Red border for locked by others
    }
    if (isSelected) {
      return '#3b82f6'; // Blue border for selected
    }
    return 'transparent';
  };

  const getStrokeWidth = () => {
    return (isSelected || (isLocked && lockedBy !== 'current-user')) ? 2 : 0;
  };

  const getOpacity = () => {
    return (isLocked && lockedBy !== 'current-user') ? 0.6 : 1.0;
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
      draggable={!isLocked || lockedBy === 'current-user'}
      onClick={handleClick}
      onTap={handleClick} // For mobile
      onDragStart={handleDragStart}
      onDragMove={handleDragMove}
      onDragEnd={handleDragEnd}
      // Visual feedback on hover
      onMouseEnter={(e) => {
        const container = e.target.getStage().container();
        container.style.cursor = 
          (isLocked && lockedBy !== 'current-user') ? 'not-allowed' : 'pointer';
      }}
      onMouseLeave={(e) => {
        const container = e.target.getStage().container();
        container.style.cursor = 'default';
      }}
    />
  );
};

export default Shape;
