import { Routes, Route, Link, useLocation } from 'react-router-dom'
import './App.css'
import LuaPlayground from './components/LuaPlayground'
import { IDELayout } from './components/IDELayout'
import { EmbeddableEditorTest, PanelLayoutTest } from './pages/test'

function App() {
  const location = useLocation()

  // Full-screen routes bypass the normal site layout
  if (location.pathname === '/editor') {
    return <IDELayout />
  }

  return (
    <div className="app">
      <header className="header">
        <h1>Learn Lua Programming</h1>
        <nav className="nav">
          <Link
            to="/"
            className={location.pathname === '/' ? 'active' : ''}
          >
            Home
          </Link>
          <Link
            to="/tutorials"
            className={location.pathname === '/tutorials' ? 'active' : ''}
          >
            Tutorials
          </Link>
          <Link
            to="/examples"
            className={location.pathname === '/examples' ? 'active' : ''}
          >
            Examples
          </Link>
          <Link
            to="/playground"
            className={location.pathname === '/playground' ? 'active' : ''}
          >
            Playground
          </Link>
          <Link
            to="/editor"
            className={location.pathname === '/editor' ? 'active' : ''}
          >
            Editor
          </Link>
        </nav>
      </header>

      <main className="main-content">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/tutorials" element={<TutorialsPage />} />
          <Route path="/examples" element={<ExamplesPage />} />
          <Route path="/playground" element={<LuaPlayground />} />
          {/* Test pages - E2E test targets and manual QA sandboxes */}
          {import.meta.env.DEV && (
            <>
              <Route path="/test/embeddable-editor" element={<EmbeddableEditorTest />} />
              <Route path="/test/panel-layout" element={<PanelLayoutTest />} />
            </>
          )}
        </Routes>
      </main>

      <footer className="footer">
        <p>&copy; 2025 Learn Lua Programming. All rights reserved.</p>
      </footer>
    </div>
  )
}

function HomePage() {
  return (
    <>
      <section className="hero">
        <h2>Welcome to Learn Lua</h2>
        <p>Master the powerful and lightweight Lua programming language</p>
        <Link to="/playground" className="cta-button">
          Get Started
        </Link>
      </section>

      <section className="features">
        <div className="feature-card">
          <h3>Interactive Tutorials</h3>
          <p>Learn Lua through hands-on, step-by-step lessons</p>
        </div>
        <div className="feature-card">
          <h3>Code Examples</h3>
          <p>Explore real-world Lua code examples and patterns</p>
        </div>
        <div className="feature-card">
          <h3>Practice Playground</h3>
          <p>Write and execute Lua code directly in your browser</p>
        </div>
      </section>
    </>
  )
}

function TutorialsPage() {
  return (
    <section className="content-section">
      <h2>Tutorials</h2>
      <p>Tutorial content coming soon! This section will contain step-by-step lessons on Lua programming.</p>
    </section>
  )
}

function ExamplesPage() {
  return (
    <section className="content-section">
      <h2>Code Examples</h2>
      <p>Code examples coming soon! This section will showcase real-world Lua code patterns.</p>
    </section>
  )
}

export default App
