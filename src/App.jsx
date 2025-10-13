import { useState, useEffect } from 'react'
import './App.css'
import { auth, db, rtdb } from './services/firebase'

function App() {
  const [count, setCount] = useState(0)
  const [firebaseStatus, setFirebaseStatus] = useState('connecting...')

  useEffect(() => {
    // Test Firebase connection
    try {
      // Check if Firebase services are initialized
      if (auth && db && rtdb) {
        setFirebaseStatus('✅ Firebase services initialized successfully!')
        console.log('Firebase Auth:', auth)
        console.log('Firestore DB:', db)
        console.log('Realtime DB:', rtdb)
      } else {
        setFirebaseStatus('❌ Firebase initialization failed')
      }
    } catch (error) {
      setFirebaseStatus(`❌ Firebase error: ${error.message}`)
      console.error('Firebase initialization error:', error)
    }
  }, [])

  return (
    <>
      <div>
        <h1 className="text-4xl font-bold text-blue-600 mb-4">CollabCanvas</h1>
        
        {/* Firebase Status Display */}
        <div className="mb-6 p-4 border rounded-lg bg-gray-50">
          <h2 className="text-lg font-semibold mb-2">Firebase Connection Status:</h2>
          <p className="font-mono text-sm">{firebaseStatus}</p>
        </div>

        <div className="card">
          <button 
            className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            onClick={() => setCount((count) => count + 1)}
          >
            count is {count}
          </button>
          <p className="mt-4">
            Edit <code>src/App.jsx</code> and save to test HMR
          </p>
        </div>
        <p className="read-the-docs">
          Ready to build real-time collaborative canvas!
        </p>
      </div>
    </>
  )
}

export default App
