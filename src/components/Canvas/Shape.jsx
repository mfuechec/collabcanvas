import { Rect } from 'react-konva';
import { useRef } from 'react';
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

  // Track if we've already locked this shape during current drag session
  const lockAttemptedRef = useRef(false);

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
      console.log('🚫 [LOCKING] Cannot select shape - locked by another user:', { id, lockedBy });
      return;
    }
    
    // Select the shape
    selectShape(id);
    
    // Lock the shape when selected (as per PR#5 requirements)
    // This gives the user temporary ownership for editing
    console.log('🔒 [LOCKING] Attempting to lock shape on selection:', id);
    lockShape(id).catch((error) => {
      console.error('❌ [LOCKING] Failed to lock shape on selection:', error);
    });
  };

  // Handle shape drag start
  const handleDragStart = (e) => {
    // Only allow dragging in move mode
    if (currentMode !== CANVAS_MODES.MOVE) {
      e.target.stopDrag();
      return;
    }
    
    // Check if shape is already locked by another user
    if (isLocked && lockedBy && lockedBy !== getCurrentUserId()) {
      console.log('🚫 [LOCKING] Cannot drag shape - locked by another user:', { id, lockedBy });
      e.target.stopDrag();
      return;
    }
    
    // Select the shape
    selectShape(id);
    
    // Reset lock attempt flag for new drag session
    lockAttemptedRef.current = false;
    
    console.log('🎯 [LOCKING] Drag started for shape:', id, '- will lock on first move');
  };

  // Handle shape drag move with boundary constraints
  const handleDragMove = (e) => {
    const shape = e.target;
    const newPos = shape.position();
    
    // Lock the shape on first move (after drag is confirmed to be working)
    // Only lock if: 1) shape is unlocked, 2) we haven't attempted to lock yet, 3) not already locked by current user
    if (!isLocked && !lockAttemptedRef.current && !isShapeLockedByCurrentUser({ id, isLocked, lockedBy })) {
      lockAttemptedRef.current = true; // Prevent multiple lock attempts
      console.log('🔒 [LOCKING] Locking unlocked shape during first move:', id, { 
        isLocked, 
        lockedBy, 
        currentUser: getCurrentUserId(),
        isCurrentUserLocked: isShapeLockedByCurrentUser({ id, isLocked, lockedBy })
      });
      lockShape(id).catch((error) => {
        console.error('❌ [LOCKING] Failed to lock shape during move:', error);
        lockAttemptedRef.current = false; // Reset flag on failure so we can try again
      });
    } else if (isLocked && lockedBy && lockedBy !== getCurrentUserId()) {
      // This shouldn't happen due to handleDragStart check, but log it for debugging
      console.warn('⚠️ [LOCKING] Attempting to move shape locked by another user:', { 
        id, 
        lockedBy, 
        currentUser: getCurrentUserId() 
      });
    }
    
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
    
    // Update position and unlock (shape was locked in handleDragStart)
    Promise.resolve().then(async () => {
      try {
        // Update position
        await updateShape(id, {
          x: constrainedPos.x,
          y: constrainedPos.y
        });
        
        // Unlock the shape after successful update
        console.log('🔓 [LOCKING] Attempting to unlock shape after drag end:', id);
        await unlockShape(id);
        
        console.log('✅ [LOCKING] Shape updated and unlocked successfully:', id);
      } catch (error) {
        console.error('Firebase sync failed:', error);
        // Always try to unlock, even if update failed
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