import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'

// Lazy load the IDE layout component
const IDELayout = lazy(() => import('./components/IDELayout').then(m => ({ default: m.IDELayout })))

function App() {
  return (
    <Suspense fallback={<div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      backgroundColor: 'var(--bg-primary)',
      color: 'var(--text-primary)'
    }}>Loading editor...</div>}>
      <Routes>
        <Route path="/editor" element={<IDELayout />} />
        {/* Redirect all other routes to /editor */}
        <Route path="*" element={<Navigate to="/editor" replace />} />
      </Routes>
    </Suspense>
  )
}

export default App
