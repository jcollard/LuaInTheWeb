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
    onExportAns: vi.fn(),
    onExportSh: vi.fn(),
    cgaPreview: false,
    onToggleCgaPreview: vi.fn(),
    ...overrides,
  }
}

describe('FileOptionsModal', () => {
  it('renders dialog with correct role and aria-modal', () => {
    render(<FileOptionsModal {...defaultProps()} />)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeTruthy()
    expect(dialog.getAttribute('aria-modal')).toBe('true')
  })

  it.each([
    ['onSave', 'file-save'],
    ['onSaveAs', 'file-save-as'],
    ['onClear', 'file-clear'],
    ['onImportPng', 'file-import-png'],
    ['onExportAns', 'file-export-ans'],
    ['onExportSh', 'file-export-sh'],
  ] as const)('fires %s and onClose when %s is clicked', (handlerName, testId) => {
    const handler = vi.fn()
    const onClose = vi.fn()
    render(<FileOptionsModal {...defaultProps({ [handlerName]: handler, onClose })} />)
    fireEvent.click(screen.getByTestId(testId))
    expect(handler).toHaveBeenCalledOnce()
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
