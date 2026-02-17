import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SaveAsDialog, type SaveAsDialogProps } from './SaveAsDialog'
import type { TreeNode } from '../../hooks/fileSystemTypes'

const sampleTree: TreeNode[] = [
  { name: 'workspace', path: '/workspace', type: 'folder', children: [] },
]

describe('SaveAsDialog', () => {
  let handlers: Pick<SaveAsDialogProps, 'onSave' | 'onCancel'>

  beforeEach(() => {
    handlers = {
      onSave: vi.fn(),
      onCancel: vi.fn(),
    }
  })

  it('should not render when isOpen is false', () => {
    render(<SaveAsDialog isOpen={false} tree={sampleTree} {...handlers} />)
    expect(screen.queryByTestId('save-as-overlay')).toBeNull()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('should render overlay and dialog when isOpen is true', () => {
    render(<SaveAsDialog isOpen={true} tree={sampleTree} {...handlers} />)
    expect(screen.getByTestId('save-as-overlay')).toBeTruthy()
    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeTruthy()
    expect(dialog.getAttribute('aria-modal')).toBe('true')
  })

  it('should render title as Save As', () => {
    render(<SaveAsDialog isOpen={true} tree={sampleTree} {...handlers} />)
    expect(screen.getByText('Save As')).toBeTruthy()
  })

  it('should render directory picker with tree', () => {
    render(<SaveAsDialog isOpen={true} tree={sampleTree} {...handlers} />)
    expect(screen.getByTestId('directory-picker')).toBeTruthy()
    expect(screen.getByText('/ (root)')).toBeTruthy()
    expect(screen.getByText('workspace')).toBeTruthy()
  })

  it('should render Location and File name labels', () => {
    render(<SaveAsDialog isOpen={true} tree={sampleTree} {...handlers} />)
    expect(screen.getByText('Location')).toBeTruthy()
    expect(screen.getByText('File name')).toBeTruthy()
  })

  it('should show filename input with default value', () => {
    render(<SaveAsDialog isOpen={true} tree={sampleTree} {...handlers} />)
    const input = screen.getByTestId('save-as-filename') as HTMLInputElement
    expect(input.value).toBe('untitled.ansi.lua')
  })

  it('should call onSave with root path and default filename when Save is clicked', () => {
    render(<SaveAsDialog isOpen={true} tree={sampleTree} {...handlers} />)
    fireEvent.click(screen.getByTestId('save-as-save'))
    expect(handlers.onSave).toHaveBeenCalledTimes(1)
    expect(handlers.onSave).toHaveBeenCalledWith('/', 'untitled.ansi.lua')
  })

  it('should call onSave with selected folder path', () => {
    render(<SaveAsDialog isOpen={true} tree={sampleTree} {...handlers} />)
    fireEvent.click(screen.getByText('workspace'))
    fireEvent.click(screen.getByTestId('save-as-save'))
    expect(handlers.onSave).toHaveBeenCalledTimes(1)
    expect(handlers.onSave).toHaveBeenCalledWith('/workspace', 'untitled.ansi.lua')
  })

  it('should call onSave with custom filename', () => {
    render(<SaveAsDialog isOpen={true} tree={sampleTree} {...handlers} />)
    const input = screen.getByTestId('save-as-filename')
    fireEvent.change(input, { target: { value: 'myart.ansi.lua' } })
    fireEvent.click(screen.getByTestId('save-as-save'))
    expect(handlers.onSave).toHaveBeenCalledWith('/', 'myart.ansi.lua')
  })

  it('should enforce .ansi.lua extension when missing', () => {
    render(<SaveAsDialog isOpen={true} tree={sampleTree} {...handlers} />)
    const input = screen.getByTestId('save-as-filename')
    fireEvent.change(input, { target: { value: 'myart' } })
    fireEvent.click(screen.getByTestId('save-as-save'))
    expect(handlers.onSave).toHaveBeenCalledWith('/', 'myart.ansi.lua')
  })

  it('should strip partial .ansi extension and add full extension', () => {
    render(<SaveAsDialog isOpen={true} tree={sampleTree} {...handlers} />)
    const input = screen.getByTestId('save-as-filename')
    fireEvent.change(input, { target: { value: 'myart.ansi' } })
    fireEvent.click(screen.getByTestId('save-as-save'))
    expect(handlers.onSave).toHaveBeenCalledWith('/', 'myart.ansi.lua')
  })

  it('should strip partial .lua extension and add full extension', () => {
    render(<SaveAsDialog isOpen={true} tree={sampleTree} {...handlers} />)
    const input = screen.getByTestId('save-as-filename')
    fireEvent.change(input, { target: { value: 'myart.lua' } })
    fireEvent.click(screen.getByTestId('save-as-save'))
    expect(handlers.onSave).toHaveBeenCalledWith('/', 'myart.ansi.lua')
  })

  it('should show error when filename is empty', () => {
    render(<SaveAsDialog isOpen={true} tree={sampleTree} {...handlers} />)
    const input = screen.getByTestId('save-as-filename')
    fireEvent.change(input, { target: { value: '' } })
    fireEvent.click(screen.getByTestId('save-as-save'))
    const errorEl = screen.getByTestId('save-as-error')
    expect(errorEl).toBeTruthy()
    expect(errorEl.textContent).toBe('Please enter a file name.')
    expect(handlers.onSave).not.toHaveBeenCalled()
  })

  it('should show error when filename is whitespace only', () => {
    render(<SaveAsDialog isOpen={true} tree={sampleTree} {...handlers} />)
    const input = screen.getByTestId('save-as-filename')
    fireEvent.change(input, { target: { value: '   ' } })
    fireEvent.click(screen.getByTestId('save-as-save'))
    expect(screen.getByTestId('save-as-error')).toBeTruthy()
    expect(handlers.onSave).not.toHaveBeenCalled()
  })

  it('should show error when filename is only the extension', () => {
    render(<SaveAsDialog isOpen={true} tree={sampleTree} {...handlers} />)
    const input = screen.getByTestId('save-as-filename')
    fireEvent.change(input, { target: { value: '.ansi.lua' } })
    fireEvent.click(screen.getByTestId('save-as-save'))
    expect(screen.getByTestId('save-as-error')).toBeTruthy()
    expect(handlers.onSave).not.toHaveBeenCalled()
  })

  it('should call onCancel when Cancel button is clicked', () => {
    render(<SaveAsDialog isOpen={true} tree={sampleTree} {...handlers} />)
    fireEvent.click(screen.getByTestId('save-as-cancel'))
    expect(handlers.onCancel).toHaveBeenCalledTimes(1)
  })

  it('should call onCancel on Escape key', () => {
    render(<SaveAsDialog isOpen={true} tree={sampleTree} {...handlers} />)
    const dialog = screen.getByRole('dialog')
    fireEvent.keyDown(dialog, { key: 'Escape' })
    expect(handlers.onCancel).toHaveBeenCalledTimes(1)
    expect(handlers.onSave).not.toHaveBeenCalled()
  })

  it('should not call onSave on Escape key', () => {
    render(<SaveAsDialog isOpen={true} tree={sampleTree} {...handlers} />)
    const dialog = screen.getByRole('dialog')
    fireEvent.keyDown(dialog, { key: 'Escape' })
    expect(handlers.onSave).not.toHaveBeenCalled()
  })

  it('should call onSave on Enter key when filename input is focused', () => {
    render(<SaveAsDialog isOpen={true} tree={sampleTree} {...handlers} />)
    const input = screen.getByTestId('save-as-filename')
    input.focus()
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Enter' })
    expect(handlers.onSave).toHaveBeenCalledTimes(1)
  })

  it('should clear error when filename changes', () => {
    render(<SaveAsDialog isOpen={true} tree={sampleTree} {...handlers} />)
    const input = screen.getByTestId('save-as-filename')
    fireEvent.change(input, { target: { value: '' } })
    fireEvent.click(screen.getByTestId('save-as-save'))
    expect(screen.getByTestId('save-as-error')).toBeTruthy()
    fireEvent.change(input, { target: { value: 'a' } })
    expect(screen.queryByTestId('save-as-error')).toBeNull()
  })

  it('should render Save and Cancel buttons with correct text', () => {
    render(<SaveAsDialog isOpen={true} tree={sampleTree} {...handlers} />)
    const saveBtn = screen.getByTestId('save-as-save')
    const cancelBtn = screen.getByTestId('save-as-cancel')
    expect(saveBtn.textContent).toBe('Save')
    expect(cancelBtn.textContent).toBe('Cancel')
    expect(saveBtn.getAttribute('type')).toBe('button')
    expect(cancelBtn.getAttribute('type')).toBe('button')
  })

  it('should reset state when reopened', () => {
    const { rerender } = render(<SaveAsDialog isOpen={true} tree={sampleTree} {...handlers} />)
    // Change filename
    const input = screen.getByTestId('save-as-filename') as HTMLInputElement
    fireEvent.change(input, { target: { value: 'custom.ansi.lua' } })
    expect(input.value).toBe('custom.ansi.lua')
    // Close and reopen
    rerender(<SaveAsDialog isOpen={false} tree={sampleTree} {...handlers} />)
    rerender(<SaveAsDialog isOpen={true} tree={sampleTree} {...handlers} />)
    const newInput = screen.getByTestId('save-as-filename') as HTMLInputElement
    expect(newInput.value).toBe('untitled.ansi.lua')
  })
})
