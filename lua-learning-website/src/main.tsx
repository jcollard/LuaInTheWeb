import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ThemeProvider } from './contexts/ThemeContext'
import { ErrorBoundary, DevErrorTrigger } from './components/ErrorBoundary'
import { logBuildInfo } from './utils/buildInfo'
import './styles/themes.css'
import './index.css'
import App from './App.tsx'

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
