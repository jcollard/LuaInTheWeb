import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FileOptionsModal, type FileOptionsModalProps } from './FileOptionsModal'

function defaultProps(overrides?: Partial<FileOptionsModalProps>): FileOptionsModalProps {
  return {
    onClose: vi.fn(),
    onClear: vi.fn(),
    onSave: vi.fn(),
    onSaveAs: vi.fn(),
    onImportPng: vi.fn(),
    onImportLayers: vi.fn(),
    onExportAns: vi.fn(),
    onExportDosAns: vi.fn(),
    onExportSh: vi.fn(),
    onExportBat: vi.fn(),
    onExportPng: vi.fn(),
    onExportLayers: vi.fn(),
    cgaPreview: false,
    onToggleCgaPreview: vi.fn(),
    cols: 80,
    rows: 25,
    onResizeCanvas: vi.fn(),
    font: 'IBM_VGA_8x16',
    onSetFont: vi.fn(),
    useFontBlocks: true,
    onSetUseFontBlocks: vi.fn(),
    eyedropperModifier: 'ctrl',
    onSetEyedropperModifier: vi.fn(),
    ...overrides,
  }
}

function selectTab(id: 'file' | 'canvas' | 'input'): void {
  fireEvent.click(screen.getByTestId(`file-options-tab-${id}`))
}

describe('FileOptionsModal', () => {
  it('renders dialog with correct role and aria-modal', () => {
    render(<FileOptionsModal {...defaultProps()} />)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeTruthy()
    expect(dialog.getAttribute('aria-modal')).toBe('true')
  })

  describe('tabs', () => {
    it('renders File / Canvas / Input tabs', () => {
      render(<FileOptionsModal {...defaultProps()} />)
      expect(screen.getByTestId('file-options-tab-file')).toBeTruthy()
      expect(screen.getByTestId('file-options-tab-canvas')).toBeTruthy()
      expect(screen.getByTestId('file-options-tab-input')).toBeTruthy()
    })

    it('defaults to the File tab and shows File-tab content', () => {
      render(<FileOptionsModal {...defaultProps()} />)
      expect(screen.getByTestId('file-options-tab-file').getAttribute('aria-selected')).toBe('true')
      expect(screen.getByTestId('file-save')).toBeTruthy()
      expect(screen.queryByTestId('file-cga-preview')).toBeNull()
      expect(screen.queryByTestId('file-eyedropper-modifier')).toBeNull()
    })

    it('switches to Canvas tab content on click', () => {
      render(<FileOptionsModal {...defaultProps()} />)
      selectTab('canvas')
      expect(screen.getByTestId('file-options-tab-canvas').getAttribute('aria-selected')).toBe('true')
      expect(screen.getByTestId('file-cga-preview')).toBeTruthy()
      expect(screen.getByTestId('file-resize-apply')).toBeTruthy()
      expect(screen.queryByTestId('file-save')).toBeNull()
      expect(screen.queryByTestId('file-eyedropper-modifier')).toBeNull()
    })

    it('switches to Input tab content on click', () => {
      render(<FileOptionsModal {...defaultProps()} />)
      selectTab('input')
      expect(screen.getByTestId('file-options-tab-input').getAttribute('aria-selected')).toBe('true')
      expect(screen.getByTestId('file-eyedropper-modifier')).toBeTruthy()
      expect(screen.queryByTestId('file-save')).toBeNull()
      expect(screen.queryByTestId('file-cga-preview')).toBeNull()
    })
  })

  describe('File tab actions', () => {
    it.each([
      ['onSave', 'file-save'],
      ['onSaveAs', 'file-save-as'],
      ['onImportPng', 'file-import-png'],
      ['onImportLayers', 'file-import-layers'],
      ['onExportAns', 'file-export-ans'],
      ['onExportDosAns', 'file-export-dos-ans'],
      ['onExportSh', 'file-export-sh'],
      ['onExportBat', 'file-export-bat'],
      ['onExportPng', 'file-export-png'],
      ['onExportLayers', 'file-export-layers'],
    ] as const)('fires %s and onClose when %s is clicked', (handlerName, testId) => {
      const handler = vi.fn()
      const onClose = vi.fn()
      render(<FileOptionsModal {...defaultProps({ [handlerName]: handler, onClose })} />)
      fireEvent.click(screen.getByTestId(testId))
      expect(handler).toHaveBeenCalledOnce()
      expect(onClose).toHaveBeenCalledOnce()
    })
  })

  describe('Canvas tab', () => {
    it('fires onClear and onClose when Clear is clicked', () => {
      const onClear = vi.fn()
      const onClose = vi.fn()
      render(<FileOptionsModal {...defaultProps({ onClear, onClose })} />)
      selectTab('canvas')
      fireEvent.click(screen.getByTestId('file-clear'))
      expect(onClear).toHaveBeenCalledOnce()
      expect(onClose).toHaveBeenCalledOnce()
    })

    it('reflects cgaPreview state on the checkbox', () => {
      const { rerender } = render(<FileOptionsModal {...defaultProps({ cgaPreview: false })} />)
      selectTab('canvas')
      const checkbox = screen.getByTestId('file-cga-preview') as HTMLInputElement
      expect(checkbox.checked).toBe(false)

      rerender(<FileOptionsModal {...defaultProps({ cgaPreview: true })} />)
      selectTab('canvas')
      const checkbox2 = screen.getByTestId('file-cga-preview') as HTMLInputElement
      expect(checkbox2.checked).toBe(true)
    })

    it('calls onToggleCgaPreview on checkbox change but does NOT close modal', () => {
      const onToggleCgaPreview = vi.fn()
      const onClose = vi.fn()
      render(<FileOptionsModal {...defaultProps({ onToggleCgaPreview, onClose })} />)
      selectTab('canvas')
      fireEvent.click(screen.getByTestId('file-cga-preview'))
      expect(onToggleCgaPreview).toHaveBeenCalledOnce()
      expect(onClose).not.toHaveBeenCalled()
    })

  })

  describe('Input tab', () => {
    it('renders the eyedropper modifier select with the current value', () => {
      render(<FileOptionsModal {...defaultProps({ eyedropperModifier: 'shift' })} />)
      selectTab('input')
      const select = screen.getByTestId('file-eyedropper-modifier') as HTMLSelectElement
      expect(select.value).toBe('shift')
    })

    it('offers ctrl/shift/alt/meta options', () => {
      render(<FileOptionsModal {...defaultProps()} />)
      selectTab('input')
      const select = screen.getByTestId('file-eyedropper-modifier') as HTMLSelectElement
      const values = Array.from(select.options).map(o => o.value)
      expect(values).toEqual(['ctrl', 'shift', 'alt', 'meta'])
    })

    it('calls onSetEyedropperModifier on change and does NOT close the modal', () => {
      const onSetEyedropperModifier = vi.fn()
      const onClose = vi.fn()
      render(<FileOptionsModal {...defaultProps({ onSetEyedropperModifier, onClose })} />)
      selectTab('input')
      fireEvent.change(screen.getByTestId('file-eyedropper-modifier'), { target: { value: 'alt' } })
      expect(onSetEyedropperModifier).toHaveBeenCalledWith('alt')
      expect(onClose).not.toHaveBeenCalled()
    })

    it('shows helper text explaining the behavior', () => {
      render(<FileOptionsModal {...defaultProps()} />)
      selectTab('input')
      expect(screen.getByTestId('file-eyedropper-modifier-help')).toBeTruthy()
    })
  })

  describe('overlay and keyboard', () => {
    it('calls onClose when backdrop is clicked', () => {
      const onClose = vi.fn()
      render(<FileOptionsModal {...defaultProps({ onClose })} />)
      fireEvent.click(screen.getByTestId('file-options-overlay'))
      expect(onClose).toHaveBeenCalledOnce()
    })

    it('does not close when dialog body is clicked', () => {
      const onClose = vi.fn()
      render(<FileOptionsModal {...defaultProps({ onClose })} />)
      fireEvent.click(screen.getByRole('dialog'))
      expect(onClose).not.toHaveBeenCalled()
    })

    it('calls onClose when Escape key is pressed', () => {
      const onClose = vi.fn()
      render(<FileOptionsModal {...defaultProps({ onClose })} />)
      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
      expect(onClose).toHaveBeenCalledOnce()
    })
  })
})
