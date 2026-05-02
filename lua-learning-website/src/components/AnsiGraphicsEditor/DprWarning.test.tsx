/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DprWarning } from './DprWarning'

vi.mock('./DprWarning.module.css', () => ({
  default: { banner: 'banner', message: 'message', dismiss: 'dismiss' },
}))

function setDpr(v: number): void {
  Object.defineProperty(window, 'devicePixelRatio', {
    value: v,
    configurable: true,
    writable: true,
  })
}

// jsdom returns a stub matchMedia; provide one that accepts add/removeEventListener.
function stubMatchMedia(): void {
  window.matchMedia = vi.fn().mockImplementation(() => ({
    matches: false,
    media: '',
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}

beforeEach(() => {
  localStorage.clear()
  stubMatchMedia()
})

describe('DprWarning', () => {
  it('hides when DPR is integer (1.0)', () => {
    setDpr(1.0)
    render(<DprWarning zoom={1} />)
    expect(screen.queryByTestId('dpr-warning')).toBeNull()
  })

  it('hides when DPR is integer (2.0)', () => {
    setDpr(2.0)
    render(<DprWarning zoom={1} />)
    expect(screen.queryByTestId('dpr-warning')).toBeNull()
  })

  it('shows on fractional DPR at zoom=1', () => {
    setDpr(1.5)
    render(<DprWarning zoom={1} />)
    const el = screen.getByTestId('dpr-warning')
    expect(el.textContent).toContain('1.50× DPR')
  })

  it('shows on fractional DPR at zoom=1.2 (still under threshold)', () => {
    setDpr(1.25)
    render(<DprWarning zoom={1.2} />)
    expect(screen.getByTestId('dpr-warning')).toBeInTheDocument()
  })

  it('hides on fractional DPR at zoom=2 (safe)', () => {
    setDpr(1.5)
    render(<DprWarning zoom={2} />)
    expect(screen.queryByTestId('dpr-warning')).toBeNull()
  })

  it('hides on fractional DPR at zoom=3 (safe)', () => {
    setDpr(1.5)
    render(<DprWarning zoom={3} />)
    expect(screen.queryByTestId('dpr-warning')).toBeNull()
  })

  it('hides on fractional DPR at zoom=1.5 (boundary, no longer at risk)', () => {
    setDpr(1.75)
    render(<DprWarning zoom={1.5} />)
    expect(screen.queryByTestId('dpr-warning')).toBeNull()
  })

  it('dismisses on button click and persists across remounts', () => {
    setDpr(1.5)
    const { unmount } = render(<DprWarning zoom={1} />)
    fireEvent.click(screen.getByLabelText('Dismiss warning'))
    expect(screen.queryByTestId('dpr-warning')).toBeNull()
    expect(localStorage.getItem('ansi-editor:dpr-warning-dismissed')).toBe('1')

    unmount()
    render(<DprWarning zoom={1} />)
    expect(screen.queryByTestId('dpr-warning')).toBeNull()
  })

  it('renders again after localStorage is cleared', () => {
    setDpr(1.5)
    const { unmount } = render(<DprWarning zoom={1} />)
    fireEvent.click(screen.getByLabelText('Dismiss warning'))
    unmount()

    localStorage.clear()
    render(<DprWarning zoom={1} />)
    expect(screen.getByTestId('dpr-warning')).toBeInTheDocument()
  })

  it('hides when dprCompensate is true (user has already acted on the warning)', () => {
    setDpr(1.5)
    render(<DprWarning zoom={1} dprCompensate={true} />)
    expect(screen.queryByTestId('dpr-warning')).toBeNull()
  })
})
