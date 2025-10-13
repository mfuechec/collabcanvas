// Sidebar Component - Left sidebar with tools and canvas info
import { useCanvas } from '../../hooks/useCanvas';
import { useAuth } from '../../hooks/useAuth';
import { clearAllShapes } from '../../utils/clearCanvas';
import { 
  ZOOM_STEP, 
  MIN_ZOOM, 
  MAX_ZOOM, 
  DEFAULT_SHAPE_WIDTH, 
  DEFAULT_SHAPE_HEIGHT
} from '../../utils/constants';

const Sidebar = () => {
  const {
    zoom,
    updateZoom,
    resetView,
    addShape,
    getVisibleArea,
    canvasWidth,
    canvasHeight,
    canvasPosition,
    shapes,
    selectedShapeId,
    stageRef,
    updateCanvasPosition
  } = useCanvas();

  const { currentUser, getDisplayName } = useAuth();

  // Shared function to constrain stage position to ensure canvas stays visible
  // This matches the logic in Canvas.jsx
  const constrainPosition = (position, scale, stageWidth, stageHeight) => {
    // Ensure at least 100px of canvas edge is always visible
    const minVisibleEdge = 100;
    
    // Calculate the bounds of the scaled canvas
    const scaledCanvasWidth = canvasWidth * scale;
    const scaledCanvasHeight = canvasHeight * scale;
    
    // Maximum position: canvas can be moved right/down until its left/top edge reaches minVisibleEdge from right/bottom of viewport
    const maxX = stageWidth - minVisibleEdge;
    const maxY = stageHeight - minVisibleEdge;
    
    // Minimum position: canvas can be moved left/up until its right/bottom edge reaches minVisibleEdge from left/top of viewport  
    const minX = -(scaledCanvasWidth - minVisibleEdge);
    const minY = -(scaledCanvasHeight - minVisibleEdge);
    
    return {
      x: Math.max(minX, Math.min(maxX, position.x)),
      y: Math.max(minY, Math.min(maxY, position.y))
    };
  };

  // Handle zoom in with position constraints
  const handleZoomIn = () => {
    const newZoom = Math.min(MAX_ZOOM, zoom + ZOOM_STEP);
    
    if (stageRef.current) {
      const stage = stageRef.current;
      const currentPos = stage.position();
      const stageWidth = stage.width();
      const stageHeight = stage.height();
      
      // Apply constraints to current position with new zoom
      const constrainedPos = constrainPosition(currentPos, newZoom, stageWidth, stageHeight);
      
      // Update both zoom and position
      updateZoom(newZoom);
      stage.scale({ x: newZoom, y: newZoom });
      stage.position(constrainedPos);
      updateCanvasPosition(constrainedPos);
    } else {
      // Fallback if stage not available
      updateZoom(newZoom);
    }
  };

  // Handle zoom out with position constraints
  const handleZoomOut = () => {
    const newZoom = Math.max(MIN_ZOOM, zoom - ZOOM_STEP);
    
    if (stageRef.current) {
      const stage = stageRef.current;
      const currentPos = stage.position();
      const stageWidth = stage.width();
      const stageHeight = stage.height();
      
      // Apply constraints to current position with new zoom
      const constrainedPos = constrainPosition(currentPos, newZoom, stageWidth, stageHeight);
      
      // Update both zoom and position
      updateZoom(newZoom);
      stage.scale({ x: newZoom, y: newZoom });
      stage.position(constrainedPos);
      updateCanvasPosition(constrainedPos);
    } else {
      // Fallback if stage not available
      updateZoom(newZoom);
    }
  };

  // Handle clearing all shapes
  const handleClearAllShapes = async () => {
    if (shapes.length === 0) {
      alert('No shapes to clear!');
      return;
    }
    
    const confirmed = window.confirm(
      `Are you sure you want to delete all ${shapes.length} shapes? This cannot be undone.`
    );
    
    if (!confirmed) return;
    
    try {
      await clearAllShapes();
      console.log('All shapes cleared successfully');
    } catch (error) {
      console.error('Failed to clear shapes:', error);
      alert('Failed to clear shapes. Please try again.');
    }
  };

  // Handle adding a new shape at center of visible area
  const handleAddShape = async () => {
    const visibleArea = getVisibleArea();
    
    let centerX, centerY;
    
    if (visibleArea) {
      // Place shape at center of visible area
      centerX = visibleArea.x + (visibleArea.width / 2) - (DEFAULT_SHAPE_WIDTH / 2);
      centerY = visibleArea.y + (visibleArea.height / 2) - (DEFAULT_SHAPE_HEIGHT / 2);
    } else {
      // Fallback to canvas center
      centerX = (canvasWidth / 2) - (DEFAULT_SHAPE_WIDTH / 2);
      centerY = (canvasHeight / 2) - (DEFAULT_SHAPE_HEIGHT / 2);
    }

    // Ensure shape is within canvas bounds
    centerX = Math.max(0, Math.min(centerX, canvasWidth - DEFAULT_SHAPE_WIDTH));
    centerY = Math.max(0, Math.min(centerY, canvasHeight - DEFAULT_SHAPE_HEIGHT));

    try {
      await addShape({
        x: centerX,
        y: centerY,
        width: DEFAULT_SHAPE_WIDTH,
        height: DEFAULT_SHAPE_HEIGHT
      });
      console.log('Shape created successfully');
    } catch (error) {
      console.error('Failed to create shape:', error);
      // You could add error toast notification here
    }
  };

  const buttonClass = "w-full flex items-center justify-center py-3 px-4 bg-white border border-gray-200 rounded-md shadow-sm hover:bg-gray-50 hover:border-gray-300 transition-colors duration-200 text-gray-700 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed text-sm";
  const primaryButtonClass = "w-full flex items-center justify-center py-3 px-4 bg-blue-600 border border-blue-600 rounded-md shadow-sm hover:bg-blue-700 hover:border-blue-700 transition-colors duration-200 text-white disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium";
  const dangerButtonClass = "w-full flex items-center justify-center py-3 px-4 bg-red-600 border border-red-600 rounded-md shadow-sm hover:bg-red-700 hover:border-red-700 transition-colors duration-200 text-white disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium";

  return (
    <div className="w-72 h-full bg-gray-50 border-r border-gray-200 flex flex-col overflow-y-auto">
      {/* Header */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <h2 className="text-lg font-semibold text-gray-900">CollabCanvas</h2>
        <p className="text-sm text-gray-500 mt-1">
          Welcome, {getDisplayName()}
        </p>
      </div>

      {/* Canvas Info */}
      <div className="p-4 bg-white border-b border-gray-200">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Canvas Info</h3>
        <div className="space-y-2 text-xs text-gray-600">
          <div className="flex justify-between">
            <span>Zoom:</span>
            <span className="font-mono">{Math.round(zoom * 100)}%</span>
          </div>
          <div className="flex justify-between">
            <span>Position:</span>
            <span className="font-mono">({Math.round(canvasPosition.x)}, {Math.round(canvasPosition.y)})</span>
          </div>
          <div className="flex justify-between">
            <span>Shapes:</span>
            <span className="font-mono">{shapes.length}</span>
          </div>
              <div className="flex justify-between">
                <span>Selected:</span>
                <span className="font-mono">{selectedShapeId ? '1' : '0'}</span>
              </div>
        </div>
      </div>

      {/* Tools Section */}
      <div className="p-4 flex-1">
        <h3 className="text-sm font-medium text-gray-900 mb-3">Tools</h3>
        
        {/* Shape Creation */}
        <div className="space-y-3 mb-6">
          <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wider">Create</h4>
          <button
            onClick={handleAddShape}
            className={primaryButtonClass}
            title="Add Rectangle"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}/>
            </svg>
            Add Rectangle
          </button>
        </div>

        {/* View Controls */}
        <div className="space-y-3 mb-6">
          <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wider">View</h4>
          
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleZoomIn}
              disabled={zoom >= MAX_ZOOM}
              className={buttonClass}
              title="Zoom In"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Zoom In
            </button>

            <button
              onClick={handleZoomOut}
              disabled={zoom <= MIN_ZOOM}
              className={buttonClass}
              title="Zoom Out"
            >
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
              Zoom Out
            </button>
          </div>

          <button
            onClick={resetView}
            className={buttonClass}
            title="Reset View (Center & 100%)"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Reset View
          </button>
        </div>

        {/* Danger Zone */}
        <div className="space-y-3 mb-6">
          <h4 className="text-xs font-medium text-red-600 uppercase tracking-wider">Danger Zone</h4>
          <button
            onClick={handleClearAllShapes}
            disabled={shapes.length === 0}
            className={dangerButtonClass}
            title={shapes.length === 0 ? "No shapes to clear" : `Clear all ${shapes.length} shapes`}
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Clear All Shapes
          </button>
        </div>

        {/* Instructions */}
        <div className="mt-auto">
          <h4 className="text-xs font-medium text-gray-600 uppercase tracking-wider mb-3">Controls</h4>
          <div className="text-xs text-gray-500 space-y-2">
            <div className="flex justify-between">
              <span>Pan canvas:</span>
              <span>Drag</span>
            </div>
            <div className="flex justify-between">
              <span>Zoom:</span>
              <span>Scroll</span>
            </div>
            <div className="flex justify-between">
              <span>Select shape:</span>
              <span>Click</span>
            </div>
            <div className="flex justify-between">
              <span>Move shape:</span>
              <span>Drag</span>
            </div>
            <div className="flex justify-between">
              <span>Delete:</span>
              <span>Del key</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
