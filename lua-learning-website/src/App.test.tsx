import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { vi } from 'vitest'
import App from './App'

// Mock IDELayout to avoid complex component tree in routing tests
vi.mock('./components/IDELayout', () => ({
  IDELayout: () => <div data-testid="ide-layout">IDE Layout</div>,
}))

describe('App routing', () => {
  it('should render IDE layout at /editor', async () => {
    render(
      <MemoryRouter initialEntries={['/editor']}>
        <App />
      </MemoryRouter>
    )
    // Wait for lazy-loaded component
    expect(await screen.findByTestId('ide-layout')).toBeInTheDocument()
  })

  it('should redirect root to /editor', async () => {
    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>
    )
    // Should redirect to editor and render IDELayout
    expect(await screen.findByTestId('ide-layout')).toBeInTheDocument()
  })

  it('should redirect unknown routes to /editor', async () => {
    render(
      <MemoryRouter initialEntries={['/unknown-route']}>
        <App />
      </MemoryRouter>
    )
    // Should redirect to editor and render IDELayout
    expect(await screen.findByTestId('ide-layout')).toBeInTheDocument()
  })

  it('renders without crashing', async () => {
    // Simple smoke test - component should render successfully
    const { container } = render(
      <MemoryRouter initialEntries={['/editor']}>
        <App />
      </MemoryRouter>
    )
    expect(container).toBeInTheDocument()
  })
})
