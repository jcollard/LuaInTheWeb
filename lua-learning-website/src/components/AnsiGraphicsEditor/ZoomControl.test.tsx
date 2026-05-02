/**
 * @vitest-environment jsdom
 */
import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { ZoomControl } from './ZoomControl'

describe('ZoomControl', () => {
  it('renders the zoom label in Nx form for integers', () => {
    render(<ZoomControl zoom={2} onSetZoom={vi.fn()} onFit={vi.fn()} />)
    expect(screen.getByTestId('zoom-label').textContent).toBe('2x')
  })

  it('renders the zoom label with one decimal for non-integers above 1x', () => {
    render(<ZoomControl zoom={2.5} onSetZoom={vi.fn()} onFit={vi.fn()} />)
    expect(screen.getByTestId('zoom-label').textContent).toBe('2.5x')
  })

  it('renders sub-1x zooms with two decimals so 0.25x stays exact', () => {
    render(<ZoomControl zoom={0.25} onSetZoom={vi.fn()} onFit={vi.fn()} />)
    expect(screen.getByTestId('zoom-label').textContent).toBe('0.25x')
  })

  it('trims trailing zeros below 1x (0.5x not 0.50x)', () => {
    render(<ZoomControl zoom={0.5} onSetZoom={vi.fn()} onFit={vi.fn()} />)
    expect(screen.getByTestId('zoom-label').textContent).toBe('0.5x')
  })

  it('calls onSetZoom when the slider is moved', () => {
    const onSetZoom = vi.fn()
    render(<ZoomControl zoom={1} onSetZoom={onSetZoom} onFit={vi.fn()} />)
    const slider = screen.getByTestId('zoom-slider') as HTMLInputElement
    fireEvent.change(slider, { target: { value: '3' } })
    expect(onSetZoom).toHaveBeenCalledWith(3)
  })

  it('commits a typed numeric value on blur', () => {
    const onSetZoom = vi.fn()
    render(<ZoomControl zoom={1} onSetZoom={onSetZoom} onFit={vi.fn()} />)
    const input = screen.getByTestId('zoom-number') as HTMLInputElement
    fireEvent.change(input, { target: { value: '2.5' } })
    fireEvent.blur(input)
    expect(onSetZoom).toHaveBeenCalledWith(2.5)
  })

  it('clamps a typed value above MAX_ZOOM on blur', () => {
    const onSetZoom = vi.fn()
    render(<ZoomControl zoom={1} onSetZoom={onSetZoom} onFit={vi.fn()} />)
    const input = screen.getByTestId('zoom-number') as HTMLInputElement
    fireEvent.change(input, { target: { value: '99' } })
    fireEvent.blur(input)
    expect(onSetZoom).toHaveBeenCalledWith(8)
  })

  it('does not call onSetZoom when the typed value is non-numeric', () => {
    const onSetZoom = vi.fn()
    render(<ZoomControl zoom={1} onSetZoom={onSetZoom} onFit={vi.fn()} />)
    const input = screen.getByTestId('zoom-number') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'abc' } })
    fireEvent.blur(input)
    expect(onSetZoom).not.toHaveBeenCalled()
  })

  it('commits typed value on Enter key', () => {
    const onSetZoom = vi.fn()
    render(<ZoomControl zoom={1} onSetZoom={onSetZoom} onFit={vi.fn()} />)
    const input = screen.getByTestId('zoom-number') as HTMLInputElement
    fireEvent.change(input, { target: { value: '4' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    // Enter triggers blur which fires the commit.
    expect(onSetZoom).toHaveBeenCalledWith(4)
  })

  it('calls onFit when the Fit button is clicked', () => {
    const onFit = vi.fn()
    render(<ZoomControl zoom={1} onSetZoom={vi.fn()} onFit={onFit} />)
    fireEvent.click(screen.getByTestId('zoom-fit'))
    expect(onFit).toHaveBeenCalledTimes(1)
  })

  it('reflects external zoom prop changes in the numeric input', () => {
    const { rerender } = render(<ZoomControl zoom={1} onSetZoom={vi.fn()} onFit={vi.fn()} />)
    const input = screen.getByTestId('zoom-number') as HTMLInputElement
    expect(input.value).toBe('1.00')
    rerender(<ZoomControl zoom={2.5} onSetZoom={vi.fn()} onFit={vi.fn()} />)
    expect(input.value).toBe('2.50')
  })
})
