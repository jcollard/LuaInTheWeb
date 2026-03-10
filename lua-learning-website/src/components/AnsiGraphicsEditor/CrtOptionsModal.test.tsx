import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CrtOptionsModal, type CrtOptionsModalProps, CRT_STORAGE_KEY } from './CrtOptionsModal'
import { CRT_DEFAULTS } from '@lua-learning/lua-runtime'

function defaultProps(overrides?: Partial<CrtOptionsModalProps>): CrtOptionsModalProps {
  return {
    onClose: vi.fn(),
    crtConfig: null,
    onSetCrtConfig: vi.fn(),
    ...overrides,
  }
}

describe('CrtOptionsModal', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('renders dialog with correct role and aria-modal', () => {
    render(<CrtOptionsModal {...defaultProps()} />)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeTruthy()
    expect(dialog.getAttribute('aria-modal')).toBe('true')
  })

  it('checkbox is unchecked when crtConfig is null', () => {
    render(<CrtOptionsModal {...defaultProps()} />)
    const checkbox = screen.getByTestId('crt-enabled-checkbox') as HTMLInputElement
    expect(checkbox.checked).toBe(false)
  })

  it('checkbox is checked when crtConfig is provided', () => {
    render(<CrtOptionsModal {...defaultProps({ crtConfig: { ...CRT_DEFAULTS } })} />)
    const checkbox = screen.getByTestId('crt-enabled-checkbox') as HTMLInputElement
    expect(checkbox.checked).toBe(true)
  })

  it('toggling checkbox on calls onSetCrtConfig with defaults', () => {
    const onSetCrtConfig = vi.fn()
    render(<CrtOptionsModal {...defaultProps({ onSetCrtConfig })} />)
    fireEvent.click(screen.getByTestId('crt-enabled-checkbox'))
    expect(onSetCrtConfig).toHaveBeenCalledWith({ ...CRT_DEFAULTS })
  })

  it('toggling checkbox off calls onSetCrtConfig with null', () => {
    const onSetCrtConfig = vi.fn()
    render(<CrtOptionsModal {...defaultProps({ crtConfig: { ...CRT_DEFAULTS }, onSetCrtConfig })} />)
    fireEvent.click(screen.getByTestId('crt-enabled-checkbox'))
    expect(onSetCrtConfig).toHaveBeenCalledWith(null)
  })

  it('sliders are disabled when CRT is off', () => {
    render(<CrtOptionsModal {...defaultProps()} />)
    const slider = screen.getByTestId('crt-slider-scanlineIntensity') as HTMLInputElement
    expect(slider.disabled).toBe(true)
  })

  it('sliders are enabled when CRT is on', () => {
    render(<CrtOptionsModal {...defaultProps({ crtConfig: { ...CRT_DEFAULTS } })} />)
    const slider = screen.getByTestId('crt-slider-scanlineIntensity') as HTMLInputElement
    expect(slider.disabled).toBe(false)
  })

  it('changing a slider calls onSetCrtConfig with updated value', () => {
    const onSetCrtConfig = vi.fn()
    render(<CrtOptionsModal {...defaultProps({ crtConfig: { ...CRT_DEFAULTS }, onSetCrtConfig })} />)
    fireEvent.change(screen.getByTestId('crt-slider-scanlineIntensity'), { target: { value: '0.8' } })
    expect(onSetCrtConfig).toHaveBeenCalledWith({ ...CRT_DEFAULTS, scanlineIntensity: 0.8 })
  })

  it('displays current values for each slider', () => {
    render(<CrtOptionsModal {...defaultProps({ crtConfig: { ...CRT_DEFAULTS } })} />)
    expect(screen.getByTestId('crt-value-scanlineIntensity').textContent).toBe('0.15')
    expect(screen.getByTestId('crt-value-curvature').textContent).toBe('0.150')
  })

  it('reset to defaults button calls onSetCrtConfig with defaults', () => {
    const onSetCrtConfig = vi.fn()
    const custom = { ...CRT_DEFAULTS, scanlineIntensity: 0.9, bloomIntensity: 0.8 }
    render(<CrtOptionsModal {...defaultProps({ crtConfig: custom, onSetCrtConfig })} />)
    fireEvent.click(screen.getByTestId('crt-reset-defaults'))
    expect(onSetCrtConfig).toHaveBeenCalledWith({ ...CRT_DEFAULTS })
  })

  it('reset button is disabled when CRT is off', () => {
    render(<CrtOptionsModal {...defaultProps()} />)
    const btn = screen.getByTestId('crt-reset-defaults') as HTMLButtonElement
    expect(btn.disabled).toBe(true)
  })

  it('calls onClose when backdrop is clicked', () => {
    const onClose = vi.fn()
    render(<CrtOptionsModal {...defaultProps({ onClose })} />)
    fireEvent.click(screen.getByTestId('crt-options-overlay'))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('does not close when dialog body is clicked', () => {
    const onClose = vi.fn()
    render(<CrtOptionsModal {...defaultProps({ onClose })} />)
    fireEvent.click(screen.getByRole('dialog'))
    expect(onClose).not.toHaveBeenCalled()
  })

  it('calls onClose when Escape key is pressed', () => {
    const onClose = vi.fn()
    render(<CrtOptionsModal {...defaultProps({ onClose })} />)
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('renders all 10 effect sliders', () => {
    render(<CrtOptionsModal {...defaultProps({ crtConfig: { ...CRT_DEFAULTS } })} />)
    const keys = ['curvature', 'scanlineIntensity', 'bloomIntensity', 'vignetteStrength', 'rgbShift', 'flickerStrength', 'brightness', 'contrast', 'saturation', 'phosphor']
    for (const key of keys) {
      expect(screen.getByTestId(`crt-slider-${key}`)).toBeTruthy()
    }
  })

  describe('localStorage persistence', () => {
    it('saves config to localStorage when slider changes', () => {
      const onSetCrtConfig = vi.fn()
      const custom = { ...CRT_DEFAULTS, scanlineIntensity: 0.8 }
      render(<CrtOptionsModal {...defaultProps({ crtConfig: custom, onSetCrtConfig })} />)
      fireEvent.change(screen.getByTestId('crt-slider-bloomIntensity'), { target: { value: '0.5' } })
      const stored = JSON.parse(localStorage.getItem(CRT_STORAGE_KEY)!)
      expect(stored.scanlineIntensity).toBe(0.8)
      expect(stored.bloomIntensity).toBe(0.5)
    })

    it('restores saved config from localStorage when toggling on', () => {
      const saved = { ...CRT_DEFAULTS, scanlineIntensity: 0.9, bloomIntensity: 0.7 }
      localStorage.setItem(CRT_STORAGE_KEY, JSON.stringify(saved))
      const onSetCrtConfig = vi.fn()
      render(<CrtOptionsModal {...defaultProps({ onSetCrtConfig })} />)
      fireEvent.click(screen.getByTestId('crt-enabled-checkbox'))
      expect(onSetCrtConfig).toHaveBeenCalledWith(saved)
    })

    it('falls back to CRT_DEFAULTS when localStorage is empty', () => {
      const onSetCrtConfig = vi.fn()
      render(<CrtOptionsModal {...defaultProps({ onSetCrtConfig })} />)
      fireEvent.click(screen.getByTestId('crt-enabled-checkbox'))
      expect(onSetCrtConfig).toHaveBeenCalledWith({ ...CRT_DEFAULTS })
    })

    it('falls back to CRT_DEFAULTS when localStorage has invalid JSON', () => {
      localStorage.setItem(CRT_STORAGE_KEY, 'not-valid-json{{{')
      const onSetCrtConfig = vi.fn()
      render(<CrtOptionsModal {...defaultProps({ onSetCrtConfig })} />)
      fireEvent.click(screen.getByTestId('crt-enabled-checkbox'))
      expect(onSetCrtConfig).toHaveBeenCalledWith({ ...CRT_DEFAULTS })
    })

    it('saves config to localStorage when toggling off (preserves settings)', () => {
      const custom = { ...CRT_DEFAULTS, curvature: 0.4 }
      const onSetCrtConfig = vi.fn()
      render(<CrtOptionsModal {...defaultProps({ crtConfig: custom, onSetCrtConfig })} />)
      fireEvent.click(screen.getByTestId('crt-enabled-checkbox'))
      expect(onSetCrtConfig).toHaveBeenCalledWith(null)
      const stored = JSON.parse(localStorage.getItem(CRT_STORAGE_KEY)!)
      expect(stored.curvature).toBe(0.4)
    })

    it('saves config on reset to defaults', () => {
      const onSetCrtConfig = vi.fn()
      const custom = { ...CRT_DEFAULTS, scanlineIntensity: 0.9 }
      render(<CrtOptionsModal {...defaultProps({ crtConfig: custom, onSetCrtConfig })} />)
      fireEvent.click(screen.getByTestId('crt-reset-defaults'))
      const stored = JSON.parse(localStorage.getItem(CRT_STORAGE_KEY)!)
      expect(stored).toEqual({ ...CRT_DEFAULTS })
    })
  })
})
