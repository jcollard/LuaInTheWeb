import './monacoSetup'
import './wasmSetup'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import { ErrorBoundary, DevErrorTrigger } from './components/ErrorBoundary'
import { logBuildInfo } from './utils/buildInfo'
import './styles/themes.css'
import './index.css'
import App from './App.tsx'

// Global error handlers to catch unhandled errors before they crash the app
// This is especially important for Electron where renderer crashes cause white screens
window.addEventListener('unhandledrejection', (event) => {
  console.error('Unhandled promise rejection:', event.reason)
  // Prevent the default browser behavior (crashing in some environments)
  event.preventDefault()
})

window.onerror = (message, source, lineno, colno, error) => {
  console.error('Uncaught error:', { message, source, lineno, colno, error })
  // Return true to prevent default error handling
  return true
}

logBuildInfo()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <DevErrorTrigger />
      <BrowserRouter>
        <ThemeProvider>
          <App />
        </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>,
)
