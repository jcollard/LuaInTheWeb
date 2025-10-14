import './App.css'

function App() {
  return (
    <div className="app">
      <header className="header">
        <h1>Learn Lua Programming</h1>
        <nav className="nav">
          <a href="#home">Home</a>
          <a href="#tutorials">Tutorials</a>
          <a href="#examples">Examples</a>
          <a href="#playground">Playground</a>
        </nav>
      </header>

      <main className="main-content">
        <section className="hero">
          <h2>Welcome to Learn Lua</h2>
          <p>Master the powerful and lightweight Lua programming language</p>
          <button className="cta-button">Get Started</button>
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
      </main>

      <footer className="footer">
        <p>&copy; 2025 Learn Lua Programming. All rights reserved.</p>
      </footer>
    </div>
  )
}

export default App
