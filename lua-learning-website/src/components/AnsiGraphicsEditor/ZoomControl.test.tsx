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

  it('restores the displayed value when committing junk input', () => {
    const onSetZoom = vi.fn()
    render(<ZoomControl zoom={2.5} onSetZoom={onSetZoom} onFit={vi.fn()} />)
    const input = screen.getByTestId('zoom-number') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'not-a-number' } })
    fireEvent.blur(input)
    expect(input.value).toBe('2.50')
  })

  it('does not call onSetZoom when committing an empty input', () => {
    const onSetZoom = vi.fn()
    render(<ZoomControl zoom={1} onSetZoom={onSetZoom} onFit={vi.fn()} />)
    const input = screen.getByTestId('zoom-number') as HTMLInputElement
    fireEvent.change(input, { target: { value: '' } })
    fireEvent.blur(input)
    expect(onSetZoom).not.toHaveBeenCalled()
    // Should also restore the displayed value.
    expect(input.value).toBe('1.00')
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

  describe('crispness indicator', () => {
    it('shows the OK indicator when zoom × dpr is integer', () => {
      render(<ZoomControl zoom={2} onSetZoom={vi.fn()} onFit={vi.fn()} dpr={1.5} />)
      expect(screen.getByTestId('zoom-crisp-ok')).toBeTruthy()
      expect(screen.queryByTestId('zoom-crisp-snap')).toBeNull()
    })

    it('shows the snap button when zoom × dpr is fractional', () => {
      render(<ZoomControl zoom={1.22} onSetZoom={vi.fn()} onFit={vi.fn()} dpr={1.5} />)
      expect(screen.getByTestId('zoom-crisp-snap')).toBeTruthy()
      expect(screen.queryByTestId('zoom-crisp-ok')).toBeNull()
    })

    it('snap button calls onSetZoom with the next crisp zoom on click', () => {
      const onSetZoom = vi.fn()
      // zoom=1.22 with DPR=1.5 → next crisp = 4/3 ≈ 1.333
      render(<ZoomControl zoom={1.22} onSetZoom={onSetZoom} onFit={vi.fn()} dpr={1.5} />)
      fireEvent.click(screen.getByTestId('zoom-crisp-snap'))
      expect(onSetZoom).toHaveBeenCalledTimes(1)
      expect(onSetZoom.mock.calls[0][0]).toBeCloseTo(4 / 3, 5)
    })

    it('snap button is disabled when no crisp value fits within MAX_ZOOM', () => {
      // zoom=8.5 (clamped to MAX, but pretend it slipped through) on DPR=1
      // → next integer is 9, > MAX_ZOOM. The button shows but is disabled.
      const onSetZoom = vi.fn()
      render(<ZoomControl zoom={8.5} onSetZoom={onSetZoom} onFit={vi.fn()} dpr={1} />)
      const btn = screen.getByTestId('zoom-crisp-snap') as HTMLButtonElement
      expect(btn.disabled).toBe(true)
      fireEvent.click(btn)
      expect(onSetZoom).not.toHaveBeenCalled()
    })

    it('OK indicator title shows the device-px-per-cell math', () => {
      render(<ZoomControl zoom={2} onSetZoom={vi.fn()} onFit={vi.fn()} dpr={1.5} />)
      const ok = screen.getByTestId('zoom-crisp-ok')
      expect(ok.getAttribute('title')).toContain('Pixel-crisp')
      expect(ok.getAttribute('title')).toContain('1.50')
    })

    it('snap button title surfaces the actual fractional device-px-per-cell value', () => {
      render(<ZoomControl zoom={1.22} onSetZoom={vi.fn()} onFit={vi.fn()} dpr={1.5} />)
      const btn = screen.getByTestId('zoom-crisp-snap')
      // 1.22 × 1.5 = 1.83
      expect(btn.getAttribute('title')).toContain('1.83')
    })

    it('integers are crisp at DPR=1 (default)', () => {
      render(<ZoomControl zoom={2} onSetZoom={vi.fn()} onFit={vi.fn()} />)
      expect(screen.getByTestId('zoom-crisp-ok')).toBeTruthy()
    })

    it('non-integer zoom is not crisp at DPR=1', () => {
      render(<ZoomControl zoom={1.5} onSetZoom={vi.fn()} onFit={vi.fn()} />)
      expect(screen.getByTestId('zoom-crisp-snap')).toBeTruthy()
    })
  })
})
