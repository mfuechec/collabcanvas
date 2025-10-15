import { useState, useEffect, useRef } from 'react'
import './App.css'
import { AuthProvider } from './contexts/AuthContext'
import { CanvasProvider } from './contexts/CanvasContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { CanvasModeProvider } from './contexts/CanvasModeContext'
import { ErrorProvider } from './contexts/ErrorContext'
import { useAuth } from './hooks/useAuth'
import { useError } from './contexts/ErrorContext'
import { useCanvasMode } from './contexts/CanvasModeContext'
import { useCanvas } from './hooks/useCanvas'
import useKeyboardShortcuts from './hooks/useKeyboardShortcuts'
import Login from './components/Auth/Login'
import Signup from './components/Auth/Signup'
import LeftSidebar from './components/Layout/LeftSidebar'
import FloatingUserMenu from './components/Layout/FloatingUserMenu'
import PropertiesPanel from './components/Layout/PropertiesPanel'
import LayersPanel from './components/Layout/LayersPanel'
import Canvas from './components/Canvas/Canvas'
import Minimap from './components/Canvas/Minimap'
import ErrorBoundary from './components/Error/ErrorBoundary'
import ErrorToast from './components/Error/ErrorToast'

// Import clear canvas utilities (makes them available in console)
import './utils/clearCanvas'

// Inner component with access to all contexts
const AppLayout = ({ showProperties, setShowProperties, showLayers, setShowLayers }) => {
  const { setMode, CANVAS_MODES, SHAPE_TYPES } = useCanvasMode();
  const { deleteShape, duplicateShape, selectedShapeId, deselectAll, resetView, undo, redo, canUndo, canRedo } = useCanvas();
  
  // Global keyboard shortcuts
  useKeyboardShortcuts({
    // Tool switching
    onHandTool: () => setMode(CANVAS_MODES.MOVE),
    onRectangleTool: () => setMode(CANVAS_MODES.DRAW, SHAPE_TYPES.RECTANGLE),
    onCircleTool: () => setMode(CANVAS_MODES.DRAW, SHAPE_TYPES.CIRCLE),
    onLineTool: () => setMode(CANVAS_MODES.DRAW, SHAPE_TYPES.LINE),
    onPenTool: () => setMode(CANVAS_MODES.DRAW, SHAPE_TYPES.PEN),
    onTextTool: () => setMode(CANVAS_MODES.DRAW, SHAPE_TYPES.TEXT),
    
    // Actions
    onDelete: () => {
      if (selectedShapeId) {
        deleteShape(selectedShapeId);
        deselectAll();
      }
    },
    onDuplicate: () => {
      if (selectedShapeId) {
        duplicateShape(selectedShapeId);
      }
    },
    onUndo: () => undo(),
    onRedo: () => redo(),
    onSelectAll: () => console.log('Select all - coming soon'),
    onEscape: () => deselectAll(),
    
    // Zoom
    onZoomIn: () => console.log('Zoom in - coming soon'),
    onZoomOut: () => console.log('Zoom out - coming soon'),
    onZoomReset: () => resetView(), // Cmd+0 to reset view
    onZoomFit: () => console.log('Zoom fit - coming soon'),
    onZoomSelection: () => console.log('Zoom selection - coming soon'),
    
    // Panels
    onToggleProperties: () => setShowProperties(prev => !prev),
    onToggleLayers: () => setShowLayers(prev => !prev),
    onCommandPalette: () => console.log('Command palette - coming soon'),
  });
  
  // Calculate canvas margin based on open panels
  const leftMargin = 60 + (showLayers ? 320 : 0);
  const rightMargin = showProperties ? 280 : 0;
  
  return (
    <div className="h-screen flex overflow-hidden" style={{ position: 'relative' }}>
      {/* Left Sidebar - Fixed 60px */}
      <LeftSidebar 
        onToggleLayers={() => setShowLayers(!showLayers)}
        layersOpen={showLayers}
      />
      
      {/* Layers Panel - Collapsible */}
      <LayersPanel isOpen={showLayers} onToggle={() => setShowLayers(!showLayers)} />
      
      {/* Main Canvas Area - Takes remaining space */}
      <div 
        className="canvas-container" 
        style={{ 
          marginLeft: `${leftMargin}px`, 
          marginRight: `${rightMargin}px`,
          width: `calc(100% - ${leftMargin + rightMargin}px)`, 
          height: '100vh',
          position: 'relative',
          transition: 'margin 200ms ease, width 200ms ease',
        }}
      >
        <Canvas />
        
        {/* Floating overlay panels */}
        <FloatingUserMenu propertiesPanelOpen={showProperties} />
        <Minimap propertiesPanelOpen={showProperties} />
      </div>
      
      {/* Properties Panel - Collapsible */}
      <PropertiesPanel isOpen={showProperties} onToggle={() => setShowProperties(!showProperties)} />
    </div>
  );
};

// Main app content (authenticated view) - Figma-style layout
const AuthenticatedApp = () => {
  const [showProperties, setShowProperties] = useState(true);
  const [showLayers, setShowLayers] = useState(false);
  
  return (
    <CanvasModeProvider>
      <CanvasProvider>
        <AppLayout 
          showProperties={showProperties}
          setShowProperties={setShowProperties}
          showLayers={showLayers}
          setShowLayers={setShowLayers}
        />
      </CanvasProvider>
    </CanvasModeProvider>
  );
}

// Unauthenticated app content (login/signup views)
const UnauthenticatedApp = () => {
  const [isLogin, setIsLogin] = useState(true)

  return (
    <div>
      {isLogin ? (
        <Login onSwitchToSignup={() => setIsLogin(false)} />
      ) : (
        <Signup onSwitchToLogin={() => setIsLogin(true)} />
      )}
    </div>
  )
}

// Loading component
const LoadingScreen = () => {
  return (
    <div 
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: 'var(--bg-primary)' }}
    >
      <div className="text-center">
        <div 
          className="animate-spin rounded-full h-12 w-12 border-b-2 mx-auto"
          style={{ borderColor: 'var(--accent-primary)' }}
        ></div>
        <p 
          className="mt-4"
          style={{ color: 'var(--text-secondary)' }}
        >
          Loading CollabCanvas...
        </p>
      </div>
    </div>
  )
}

// App router component (inside AuthProvider)
const AppRouter = () => {
  const { currentUser, loading } = useAuth()
  const { currentError, clearError } = useError()

  if (loading) {
    return <LoadingScreen />
  }

  return (
    <>
      {currentUser ? <AuthenticatedApp /> : <UnauthenticatedApp />}
      {currentError && (
        <ErrorToast 
          error={currentError} 
          onClose={clearError}
          duration={currentError.persistent ? 0 : 5000}
        />
      )}
    </>
  )
}

// Main App component
function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <ErrorProvider>
          <AuthProvider>
            <AppRouter />
          </AuthProvider>
        </ErrorProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}

export default App
