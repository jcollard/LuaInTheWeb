import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FileOptionsModal, type FileOptionsModalProps } from './FileOptionsModal'

function defaultProps(overrides?: Partial<FileOptionsModalProps>): FileOptionsModalProps {
  return {
    isOpen: true,
    onClose: vi.fn(),
    onClear: vi.fn(),
    onSave: vi.fn(),
    onSaveAs: vi.fn(),
    onImportPng: vi.fn(),
    onExportAns: vi.fn(),
    onExportSh: vi.fn(),
    cgaPreview: false,
    onToggleCgaPreview: vi.fn(),
    ...overrides,
  }
}

describe('FileOptionsModal', () => {
  it('returns null when isOpen is false', () => {
    const { container } = render(<FileOptionsModal {...defaultProps({ isOpen: false })} />)
    expect(container.innerHTML).toBe('')
  })

  it('renders dialog with correct role and aria-modal when open', () => {
    render(<FileOptionsModal {...defaultProps()} />)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeTruthy()
    expect(dialog.getAttribute('aria-modal')).toBe('true')
  })

  it('fires onSave and onClose when Save is clicked', () => {
    const onSave = vi.fn()
    const onClose = vi.fn()
    render(<FileOptionsModal {...defaultProps({ onSave, onClose })} />)
    fireEvent.click(screen.getByTestId('file-save'))
    expect(onSave).toHaveBeenCalledOnce()
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('fires onSaveAs and onClose when Save As is clicked', () => {
    const onSaveAs = vi.fn()
    const onClose = vi.fn()
    render(<FileOptionsModal {...defaultProps({ onSaveAs, onClose })} />)
    fireEvent.click(screen.getByTestId('file-save-as'))
    expect(onSaveAs).toHaveBeenCalledOnce()
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('fires onClear and onClose when Clear is clicked', () => {
    const onClear = vi.fn()
    const onClose = vi.fn()
    render(<FileOptionsModal {...defaultProps({ onClear, onClose })} />)
    fireEvent.click(screen.getByTestId('file-clear'))
    expect(onClear).toHaveBeenCalledOnce()
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('fires onImportPng and onClose when Load PNG is clicked', () => {
    const onImportPng = vi.fn()
    const onClose = vi.fn()
    render(<FileOptionsModal {...defaultProps({ onImportPng, onClose })} />)
    fireEvent.click(screen.getByTestId('file-import-png'))
    expect(onImportPng).toHaveBeenCalledOnce()
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('fires onExportAns and onClose when Export ANS is clicked', () => {
    const onExportAns = vi.fn()
    const onClose = vi.fn()
    render(<FileOptionsModal {...defaultProps({ onExportAns, onClose })} />)
    fireEvent.click(screen.getByTestId('file-export-ans'))
    expect(onExportAns).toHaveBeenCalledOnce()
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('fires onExportSh and onClose when Export .sh is clicked', () => {
    const onExportSh = vi.fn()
    const onClose = vi.fn()
    render(<FileOptionsModal {...defaultProps({ onExportSh, onClose })} />)
    fireEvent.click(screen.getByTestId('file-export-sh'))
    expect(onExportSh).toHaveBeenCalledOnce()
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('reflects cgaPreview state on the checkbox', () => {
    const { rerender } = render(<FileOptionsModal {...defaultProps({ cgaPreview: false })} />)
    const checkbox = screen.getByTestId('file-cga-preview') as HTMLInputElement
    expect(checkbox.checked).toBe(false)

    rerender(<FileOptionsModal {...defaultProps({ cgaPreview: true })} />)
    expect(checkbox.checked).toBe(true)
  })

  it('calls onToggleCgaPreview on checkbox change but does NOT close modal', () => {
    const onToggleCgaPreview = vi.fn()
    const onClose = vi.fn()
    render(<FileOptionsModal {...defaultProps({ onToggleCgaPreview, onClose })} />)
    fireEvent.click(screen.getByTestId('file-cga-preview'))
    expect(onToggleCgaPreview).toHaveBeenCalledOnce()
    expect(onClose).not.toHaveBeenCalled()
  })

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
