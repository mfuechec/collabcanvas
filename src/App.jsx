import { useState } from 'react'
import './App.css'
import { AuthProvider } from './contexts/AuthContext'
import { useAuth } from './hooks/useAuth'
import Login from './components/Auth/Login'
import Signup from './components/Auth/Signup'
import Navbar from './components/Layout/Navbar'
import ErrorBoundary from './components/Error/ErrorBoundary'

// Main app content (authenticated view)
const AuthenticatedApp = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="text-center">
            <h1 className="text-4xl font-bold text-gray-900 mb-4">
              Welcome to CollabCanvas!
            </h1>
            <p className="text-lg text-gray-600 mb-8">
              Your collaborative design workspace is ready.
            </p>
            <div className="bg-white overflow-hidden shadow rounded-lg p-6">
              <h2 className="text-lg font-medium text-gray-900 mb-4">
                Authentication Complete ✅
              </h2>
              <p className="text-gray-600">
                Canvas features will be implemented in the next phase.
                <br />
                You are successfully signed in and ready to collaborate!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
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
