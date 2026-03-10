import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CrtTabContent, type CrtTabContentProps, CRT_STORAGE_KEY } from './CrtTabContent'
import { CRT_DEFAULTS } from '@lua-learning/lua-runtime'

function defaultProps(overrides?: Partial<CrtTabContentProps>): CrtTabContentProps {
  return {
    crtConfig: null,
    onSetCrtConfig: vi.fn(),
    ...overrides,
  }
}

describe('CrtTabContent', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('checkbox is unchecked when crtConfig is null', () => {
    render(<CrtTabContent {...defaultProps()} />)
    const checkbox = screen.getByTestId('crt-enabled-checkbox') as HTMLInputElement
    expect(checkbox.checked).toBe(false)
  })

  it('checkbox is checked when crtConfig is provided', () => {
    render(<CrtTabContent {...defaultProps({ crtConfig: { ...CRT_DEFAULTS } })} />)
    const checkbox = screen.getByTestId('crt-enabled-checkbox') as HTMLInputElement
    expect(checkbox.checked).toBe(true)
  })

  it('toggling checkbox on calls onSetCrtConfig with defaults', () => {
    const onSetCrtConfig = vi.fn()
    render(<CrtTabContent {...defaultProps({ onSetCrtConfig })} />)
    fireEvent.click(screen.getByTestId('crt-enabled-checkbox'))
    expect(onSetCrtConfig).toHaveBeenCalledWith({ ...CRT_DEFAULTS })
  })

  it('toggling checkbox off calls onSetCrtConfig with null', () => {
    const onSetCrtConfig = vi.fn()
    render(<CrtTabContent {...defaultProps({ crtConfig: { ...CRT_DEFAULTS }, onSetCrtConfig })} />)
    fireEvent.click(screen.getByTestId('crt-enabled-checkbox'))
    expect(onSetCrtConfig).toHaveBeenCalledWith(null)
  })

  it('sliders are disabled when CRT is off', () => {
    render(<CrtTabContent {...defaultProps()} />)
    const slider = screen.getByTestId('crt-slider-scanlineIntensity') as HTMLInputElement
    expect(slider.disabled).toBe(true)
  })

  it('sliders are enabled when CRT is on', () => {
    render(<CrtTabContent {...defaultProps({ crtConfig: { ...CRT_DEFAULTS } })} />)
    const slider = screen.getByTestId('crt-slider-scanlineIntensity') as HTMLInputElement
    expect(slider.disabled).toBe(false)
  })

  it('changing a slider calls onSetCrtConfig with updated value', () => {
    const onSetCrtConfig = vi.fn()
    render(<CrtTabContent {...defaultProps({ crtConfig: { ...CRT_DEFAULTS }, onSetCrtConfig })} />)
    fireEvent.change(screen.getByTestId('crt-slider-scanlineIntensity'), { target: { value: '0.8' } })
    expect(onSetCrtConfig).toHaveBeenCalledWith({ ...CRT_DEFAULTS, scanlineIntensity: 0.8 })
  })

  it('displays current values for each slider', () => {
    render(<CrtTabContent {...defaultProps({ crtConfig: { ...CRT_DEFAULTS } })} />)
    expect(screen.getByTestId('crt-value-scanlineIntensity').textContent).toBe('0.50')
    expect(screen.getByTestId('crt-value-curvature').textContent).toBe('0.100')
  })

  it('reset to defaults button calls onSetCrtConfig with defaults', () => {
    const onSetCrtConfig = vi.fn()
    const custom = { ...CRT_DEFAULTS, scanlineIntensity: 0.9, bloomIntensity: 0.8 }
    render(<CrtTabContent {...defaultProps({ crtConfig: custom, onSetCrtConfig })} />)
    fireEvent.click(screen.getByTestId('crt-reset-defaults'))
    expect(onSetCrtConfig).toHaveBeenCalledWith({ ...CRT_DEFAULTS })
  })

  it('reset button is disabled when CRT is off', () => {
    render(<CrtTabContent {...defaultProps()} />)
    const btn = screen.getByTestId('crt-reset-defaults') as HTMLButtonElement
    expect(btn.disabled).toBe(true)
  })

  it('renders all effect sliders', () => {
    render(<CrtTabContent {...defaultProps({ crtConfig: { ...CRT_DEFAULTS } })} />)
    const keys = ['scanlineIntensity', 'scanlineCount', 'adaptiveIntensity', 'brightness', 'contrast', 'saturation', 'bloomIntensity', 'bloomThreshold', 'rgbShift', 'vignetteStrength', 'curvature', 'flickerStrength', 'phosphor']
    for (const key of keys) {
      expect(screen.getByTestId(`crt-slider-${key}`)).toBeTruthy()
    }
  })

  describe('localStorage persistence', () => {
    it('saves config to localStorage when slider changes', () => {
      const onSetCrtConfig = vi.fn()
      const custom = { ...CRT_DEFAULTS, scanlineIntensity: 0.8 }
      render(<CrtTabContent {...defaultProps({ crtConfig: custom, onSetCrtConfig })} />)
      fireEvent.change(screen.getByTestId('crt-slider-bloomIntensity'), { target: { value: '0.9' } })
      const stored = JSON.parse(localStorage.getItem(CRT_STORAGE_KEY)!)
      expect(stored.scanlineIntensity).toBe(0.8)
      expect(stored.bloomIntensity).toBe(0.9)
    })

    it('migrates old localStorage keys to new names when toggling on', () => {
      const oldFormat = { ...CRT_DEFAULTS, scanlines: 0.9, bloom: 0.7 }
      // Remove new keys that CRT_DEFAULTS has, simulate old format
      delete (oldFormat as Record<string, unknown>).scanlineIntensity
      delete (oldFormat as Record<string, unknown>).bloomIntensity
      localStorage.setItem(CRT_STORAGE_KEY, JSON.stringify(oldFormat))
      const onSetCrtConfig = vi.fn()
      render(<CrtTabContent {...defaultProps({ onSetCrtConfig })} />)
      fireEvent.click(screen.getByTestId('crt-enabled-checkbox'))
      const result = onSetCrtConfig.mock.calls[0][0] as Record<string, number>
      expect(result.scanlineIntensity).toBe(0.9)
      expect(result.bloomIntensity).toBe(0.7)
      expect(result).not.toHaveProperty('scanlines')
      expect(result).not.toHaveProperty('bloom')
    })

    it('restores saved config from localStorage when toggling on', () => {
      const saved = { ...CRT_DEFAULTS, scanlineIntensity: 0.9, bloomIntensity: 0.7 }
      localStorage.setItem(CRT_STORAGE_KEY, JSON.stringify(saved))
      const onSetCrtConfig = vi.fn()
      render(<CrtTabContent {...defaultProps({ onSetCrtConfig })} />)
      fireEvent.click(screen.getByTestId('crt-enabled-checkbox'))
      expect(onSetCrtConfig).toHaveBeenCalledWith(saved)
    })

    it('falls back to CRT_DEFAULTS when localStorage is empty', () => {
      const onSetCrtConfig = vi.fn()
      render(<CrtTabContent {...defaultProps({ onSetCrtConfig })} />)
      fireEvent.click(screen.getByTestId('crt-enabled-checkbox'))
      expect(onSetCrtConfig).toHaveBeenCalledWith({ ...CRT_DEFAULTS })
    })

    it('falls back to CRT_DEFAULTS when localStorage has invalid JSON', () => {
      localStorage.setItem(CRT_STORAGE_KEY, 'not-valid-json{{{')
      const onSetCrtConfig = vi.fn()
      render(<CrtTabContent {...defaultProps({ onSetCrtConfig })} />)
      fireEvent.click(screen.getByTestId('crt-enabled-checkbox'))
      expect(onSetCrtConfig).toHaveBeenCalledWith({ ...CRT_DEFAULTS })
    })

    it('saves config to localStorage when toggling off (preserves settings)', () => {
      const custom = { ...CRT_DEFAULTS, curvature: 0.4 }
      const onSetCrtConfig = vi.fn()
      render(<CrtTabContent {...defaultProps({ crtConfig: custom, onSetCrtConfig })} />)
      fireEvent.click(screen.getByTestId('crt-enabled-checkbox'))
      expect(onSetCrtConfig).toHaveBeenCalledWith(null)
      const stored = JSON.parse(localStorage.getItem(CRT_STORAGE_KEY)!)
      expect(stored.curvature).toBe(0.4)
    })

    it('saves config on reset to defaults', () => {
      const onSetCrtConfig = vi.fn()
      const custom = { ...CRT_DEFAULTS, scanlineIntensity: 0.9 }
      render(<CrtTabContent {...defaultProps({ crtConfig: custom, onSetCrtConfig })} />)
      fireEvent.click(screen.getByTestId('crt-reset-defaults'))
      const stored = JSON.parse(localStorage.getItem(CRT_STORAGE_KEY)!)
      expect(stored).toEqual({ ...CRT_DEFAULTS })
    })
  })
})
