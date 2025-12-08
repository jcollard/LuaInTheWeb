import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import App from './App'

// Mock LuaPlayground to avoid xterm/wasmoon issues in tests
vi.mock('./components/LuaPlayground', () => ({
  default: () => <div data-testid="mock-lua-playground">Lua Playground</div>,
}))

describe('App routing', () => {
  // Cycle 3.1: Routes render correct components
  it('should render home page at /', () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    )
    expect(screen.getByText('Welcome to Learn Lua')).toBeInTheDocument()
  })

  // Cycle 3.2: Playground route works
  it('should render playground at /playground', () => {
    render(
      <MemoryRouter initialEntries={['/playground']}>
        <App />
      </MemoryRouter>
    )
    expect(screen.getByText('Lua Playground')).toBeInTheDocument()
  })

  // Cycle 3.3: Navigation links work
  it('should navigate to playground when link clicked', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    )

    await userEvent.click(screen.getByText('Playground'))
    expect(screen.getByText('Lua Playground')).toBeInTheDocument()
  })

  it('should render tutorials at /tutorials', () => {
    render(
      <MemoryRouter initialEntries={['/tutorials']}>
        <App />
      </MemoryRouter>
    )
    expect(screen.getByRole('heading', { name: 'Tutorials' })).toBeInTheDocument()
  })

  it('should render examples at /examples', () => {
    render(
      <MemoryRouter initialEntries={['/examples']}>
        <App />
      </MemoryRouter>
    )
    expect(screen.getByText('Code Examples')).toBeInTheDocument()
  })

  it('should navigate between routes', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    )

    // Start at home
    expect(screen.getByText('Welcome to Learn Lua')).toBeInTheDocument()

    // Navigate to tutorials
    await userEvent.click(screen.getByText('Tutorials'))
    expect(screen.getByText(/Tutorial content coming soon/)).toBeInTheDocument()

    // Navigate to examples
    await userEvent.click(screen.getByText('Examples'))
    expect(screen.getByText(/Code examples coming soon/)).toBeInTheDocument()
  })
})
