// Canvas Controls Component - Floating controls for canvas interaction
import { useCanvas } from '../../hooks/useCanvas';
import { 
  ZOOM_STEP, 
  MIN_ZOOM, 
  MAX_ZOOM, 
  DEFAULT_SHAPE_WIDTH, 
  DEFAULT_SHAPE_HEIGHT,
  VIEWPORT_WIDTH,
  VIEWPORT_HEIGHT 
} from '../../utils/constants';

const CanvasControls = () => {
  const {
    zoom,
    updateZoom,
    resetView,
    addShape,
    getVisibleArea,
    canvasWidth,
    canvasHeight
  } = useCanvas();

  // Handle zoom in
  const handleZoomIn = () => {
    const newZoom = Math.min(MAX_ZOOM, zoom + ZOOM_STEP);
    updateZoom(newZoom);
  };

  // Handle zoom out
  const handleZoomOut = () => {
    const newZoom = Math.max(MIN_ZOOM, zoom - ZOOM_STEP);
    updateZoom(newZoom);
  };

  // Handle adding a new shape at center of visible area
  const handleAddShape = () => {
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

    addShape({
      x: centerX,
      y: centerY,
      width: DEFAULT_SHAPE_WIDTH,
      height: DEFAULT_SHAPE_HEIGHT
    });
  };

  const controlButtonClass = "flex items-center justify-center w-10 h-10 bg-white border border-gray-200 rounded-md shadow-sm hover:bg-gray-50 hover:border-gray-300 transition-colors duration-200 text-gray-700 hover:text-gray-900 disabled:opacity-50 disabled:cursor-not-allowed";

  return (
    <div className="absolute top-4 right-4 z-20 flex flex-col gap-2">
      {/* Zoom Controls */}
      <div className="flex flex-col gap-1 bg-white bg-opacity-95 p-3 rounded-lg shadow-lg border border-gray-200">
        <h3 className="text-xs font-medium text-gray-600 mb-2">Zoom</h3>
        
        <button
          onClick={handleZoomIn}
          disabled={zoom >= MAX_ZOOM}
          className={controlButtonClass}
          title="Zoom In"
          aria-label="Zoom In"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>

        <button
          onClick={handleZoomOut}
          disabled={zoom <= MIN_ZOOM}
          className={controlButtonClass}
          title="Zoom Out"
          aria-label="Zoom Out"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
          </svg>
        </button>

        {/* Zoom Level Display */}
        <div className="text-xs text-center text-gray-500 mt-1 font-mono">
          {Math.round(zoom * 100)}%
        </div>
      </div>

      {/* View Controls */}
      <div className="flex flex-col gap-1 bg-white bg-opacity-95 p-3 rounded-lg shadow-lg border border-gray-200">
        <h3 className="text-xs font-medium text-gray-600 mb-2">View</h3>
        
        <button
          onClick={resetView}
          className={controlButtonClass}
          title="Reset View (Center & 100%)"
          aria-label="Reset View"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>

      {/* Shape Controls */}
      <div className="flex flex-col gap-1 bg-white bg-opacity-95 p-3 rounded-lg shadow-lg border border-gray-200">
        <h3 className="text-xs font-medium text-gray-600 mb-2">Shapes</h3>
        
        <button
          onClick={handleAddShape}
          className={`${controlButtonClass} bg-blue-50 border-blue-200 hover:bg-blue-100 hover:border-blue-300 text-blue-700 hover:text-blue-800`}
          title="Add Rectangle"
          aria-label="Add Rectangle Shape"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}/>
          </svg>
        </button>
      </div>

      {/* Keyboard Shortcuts Help */}
      <div className="bg-white bg-opacity-90 p-2 rounded-md shadow-sm border border-gray-200">
        <div className="text-xs text-gray-500 space-y-1">
          <div className="font-medium mb-1">Shortcuts:</div>
          <div>Scroll: Zoom</div>
          <div>Drag: Pan</div>
          <div>Del: Delete</div>
        </div>
      </div>
    </div>
  );
};

export default CanvasControls;
