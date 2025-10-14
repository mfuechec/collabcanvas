import { useState } from 'react'
import './App.css'
import { AuthProvider } from './contexts/AuthContext'
import { CanvasProvider } from './contexts/CanvasContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { CanvasModeProvider } from './contexts/CanvasModeContext'
import { ErrorProvider } from './contexts/ErrorContext'
import { useAuth } from './hooks/useAuth'
import { useError } from './contexts/ErrorContext'
import Login from './components/Auth/Login'
import Signup from './components/Auth/Signup'
import Navbar from './components/Layout/Navbar'
import Canvas from './components/Canvas/Canvas'
import CanvasInfo from './components/Canvas/CanvasInfo'
import CanvasToolbar from './components/Canvas/CanvasToolbar'
import ErrorBoundary from './components/Error/ErrorBoundary'
import ErrorToast from './components/Error/ErrorToast'

// Import clear canvas utilities (makes them available in console)
import './utils/clearCanvas'

// Main app content (authenticated view)
const AuthenticatedApp = () => {
  return (
    <CanvasModeProvider>
      <CanvasProvider>
        <div className="h-screen flex flex-col overflow-hidden">
          <Navbar />
          <div className="canvas-container">
            <Canvas />
            {/* Floating overlay panels */}
            <CanvasInfo />
            <CanvasToolbar />
          </div>
        </div>
      </CanvasProvider>
    </CanvasModeProvider>
  )
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
