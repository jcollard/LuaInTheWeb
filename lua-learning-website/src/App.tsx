import { useState } from 'react'
import './App.css'
import LuaPlayground from './components/LuaPlayground'

type View = 'home' | 'tutorials' | 'examples' | 'playground'

function App() {
  const [currentView, setCurrentView] = useState<View>('home')

  return (
    <div className="app">
      <header className="header">
        <h1>Learn Lua Programming</h1>
        <nav className="nav">
          <a
            href="#home"
            onClick={(e) => { e.preventDefault(); setCurrentView('home') }}
            className={currentView === 'home' ? 'active' : ''}
          >
            Home
          </a>
          <a
            href="#tutorials"
            onClick={(e) => { e.preventDefault(); setCurrentView('tutorials') }}
            className={currentView === 'tutorials' ? 'active' : ''}
          >
            Tutorials
          </a>
          <a
            href="#examples"
            onClick={(e) => { e.preventDefault(); setCurrentView('examples') }}
            className={currentView === 'examples' ? 'active' : ''}
          >
            Examples
          </a>
          <a
            href="#playground"
            onClick={(e) => { e.preventDefault(); setCurrentView('playground') }}
            className={currentView === 'playground' ? 'active' : ''}
          >
            Playground
          </a>
        </nav>
      </header>

      <main className="main-content">
        {currentView === 'home' && (
          <>
            <section className="hero">
              <h2>Welcome to Learn Lua</h2>
              <p>Master the powerful and lightweight Lua programming language</p>
              <button
                className="cta-button"
                onClick={() => setCurrentView('playground')}
              >
                Get Started
              </button>
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
        )}

        {currentView === 'tutorials' && (
          <section className="content-section">
            <h2>Tutorials</h2>
            <p>Tutorial content coming soon! This section will contain step-by-step lessons on Lua programming.</p>
          </section>
        )}

        {currentView === 'examples' && (
          <section className="content-section">
            <h2>Code Examples</h2>
            <p>Code examples coming soon! This section will showcase real-world Lua code patterns.</p>
          </section>
        )}

        {currentView === 'playground' && <LuaPlayground />}
      </main>

      <footer className="footer">
        <p>&copy; 2025 Learn Lua Programming. All rights reserved.</p>
      </footer>
    </div>
  )
}

export default App
