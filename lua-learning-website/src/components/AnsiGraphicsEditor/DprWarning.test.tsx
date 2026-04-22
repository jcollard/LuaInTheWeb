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
    render(<DprWarning scaleMode="integer-1x" />)
    expect(screen.queryByTestId('dpr-warning')).toBeNull()
  })

  it('hides when DPR is integer (2.0)', () => {
    setDpr(2.0)
    render(<DprWarning scaleMode="integer-1x" />)
    expect(screen.queryByTestId('dpr-warning')).toBeNull()
  })

  it('shows on fractional DPR at integer-1x', () => {
    setDpr(1.5)
    render(<DprWarning scaleMode="integer-1x" />)
    const el = screen.getByTestId('dpr-warning')
    expect(el.textContent).toContain('1.50× DPR')
  })

  it('shows on fractional DPR at integer-auto', () => {
    setDpr(1.25)
    render(<DprWarning scaleMode="integer-auto" />)
    expect(screen.getByTestId('dpr-warning')).toBeInTheDocument()
  })

  it('hides on fractional DPR at integer-2x (safe scale)', () => {
    setDpr(1.5)
    render(<DprWarning scaleMode="integer-2x" />)
    expect(screen.queryByTestId('dpr-warning')).toBeNull()
  })

  it('hides on fractional DPR at integer-3x (safe scale)', () => {
    setDpr(1.5)
    render(<DprWarning scaleMode="integer-3x" />)
    expect(screen.queryByTestId('dpr-warning')).toBeNull()
  })

  it('hides on fractional DPR at fit mode', () => {
    setDpr(1.75)
    render(<DprWarning scaleMode="fit" />)
    expect(screen.queryByTestId('dpr-warning')).toBeNull()
  })

  it('dismisses on button click and persists across remounts', () => {
    setDpr(1.5)
    const { unmount } = render(<DprWarning scaleMode="integer-1x" />)
    fireEvent.click(screen.getByLabelText('Dismiss warning'))
    expect(screen.queryByTestId('dpr-warning')).toBeNull()
    expect(localStorage.getItem('ansi-editor:dpr-warning-dismissed')).toBe('1')

    unmount()
    render(<DprWarning scaleMode="integer-1x" />)
    expect(screen.queryByTestId('dpr-warning')).toBeNull()
  })

  it('renders again after localStorage is cleared', () => {
    setDpr(1.5)
    const { unmount } = render(<DprWarning scaleMode="integer-1x" />)
    fireEvent.click(screen.getByLabelText('Dismiss warning'))
    unmount()

    localStorage.clear()
    render(<DprWarning scaleMode="integer-1x" />)
    expect(screen.getByTestId('dpr-warning')).toBeInTheDocument()
  })
})
