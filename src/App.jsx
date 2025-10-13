import { useState } from 'react'
import './App.css'
import { AuthProvider } from './contexts/AuthContext'
import { CanvasProvider } from './contexts/CanvasContext'
import { useAuth } from './hooks/useAuth'
import Login from './components/Auth/Login'
import Signup from './components/Auth/Signup'
import Navbar from './components/Layout/Navbar'
import Sidebar from './components/Layout/Sidebar'
import Canvas from './components/Canvas/Canvas'
import ErrorBoundary from './components/Error/ErrorBoundary'

// Main app content (authenticated view)
const AuthenticatedApp = () => {
  return (
    <CanvasProvider>
      <div className="h-screen flex flex-col overflow-hidden">
        <Navbar />
        <div className="flex-1 flex overflow-hidden">
          <Sidebar />
          <div className="flex-1 overflow-hidden">
            <Canvas />
          </div>
        </div>
      </div>
    </CanvasProvider>
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
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading CollabCanvas...</p>
      </div>
    </div>
  )
}

// App router component (inside AuthProvider)
const AppRouter = () => {
  const { currentUser, loading } = useAuth()

  if (loading) {
    return <LoadingScreen />
  }

  return currentUser ? <AuthenticatedApp /> : <UnauthenticatedApp />
}

// Main App component
function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App
