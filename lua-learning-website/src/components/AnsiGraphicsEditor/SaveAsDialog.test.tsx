import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SaveAsDialog, type SaveAsDialogProps } from './SaveAsDialog'
import type { TreeNode } from '../../hooks/fileSystemTypes'

const sampleTree: TreeNode[] = [
  { name: 'home', path: '/home', type: 'folder', children: [] },
  { name: 'workspace', path: '/workspace', type: 'folder', children: [] },
]

describe('SaveAsDialog', () => {
  let handlers: Pick<SaveAsDialogProps, 'onSave' | 'onCancel'>

  beforeEach(() => {
    handlers = { onSave: vi.fn(), onCancel: vi.fn() }
  })

  function renderOpen(overrides: Partial<SaveAsDialogProps> = {}) {
    return render(
      <SaveAsDialog isOpen={true} tree={sampleTree} defaultFolderPath="/home" {...handlers} {...overrides} />
    )
  }

  it('should not render when isOpen is false', () => {
    renderOpen({ isOpen: false })
    expect(screen.queryByTestId('save-as-overlay')).toBeNull()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('should render overlay and dialog when isOpen is true', () => {
    renderOpen()
    expect(screen.getByTestId('save-as-overlay')).toBeTruthy()
    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeTruthy()
    expect(dialog.getAttribute('aria-modal')).toBe('true')
  })

  it('should render title as Save As', () => {
    renderOpen()
    expect(screen.getByText('Save As')).toBeTruthy()
  })

  it('should render directory picker with tree', () => {
    renderOpen()
    expect(screen.getByTestId('directory-picker')).toBeTruthy()
    expect(screen.getByText('home')).toBeTruthy()
    expect(screen.getByText('workspace')).toBeTruthy()
  })

  it('should render Location and File name labels', () => {
    renderOpen()
    expect(screen.getByText('Location')).toBeTruthy()
    expect(screen.getByText('File name')).toBeTruthy()
  })

  it('should show filename input with default name-only value', () => {
    renderOpen()
    const input = screen.getByTestId('save-as-filename') as HTMLInputElement
    expect(input.value).toBe('untitled')
  })

  it('should render .ansi.lua as a non-editable suffix next to the input', () => {
    renderOpen()
    const suffix = screen.getByTestId('save-as-extension-suffix')
    expect(suffix.textContent).toBe('.ansi.lua')
    expect(suffix.tagName).toBe('SPAN')
  })

  it('should call onSave with defaultFolderPath when Save is clicked without changing location', () => {
    renderOpen({ defaultFolderPath: '/workspace' })
    fireEvent.click(screen.getByTestId('save-as-save'))
    expect(handlers.onSave).toHaveBeenCalledWith('/workspace', 'untitled.ansi.lua')
  })

  it('should call onSave with selected folder path', () => {
    renderOpen()
    fireEvent.click(screen.getByText('workspace'))
    fireEvent.click(screen.getByTestId('save-as-save'))
    expect(handlers.onSave).toHaveBeenCalledWith('/workspace', 'untitled.ansi.lua')
  })

  it('should call onSave with custom filename', () => {
    renderOpen()
    fireEvent.change(screen.getByTestId('save-as-filename'), { target: { value: 'myart.ansi.lua' } })
    fireEvent.click(screen.getByTestId('save-as-save'))
    expect(handlers.onSave).toHaveBeenCalledWith('/home', 'myart.ansi.lua')
  })

  it('should enforce .ansi.lua extension when missing', () => {
    renderOpen()
    fireEvent.change(screen.getByTestId('save-as-filename'), { target: { value: 'myart' } })
    fireEvent.click(screen.getByTestId('save-as-save'))
    expect(handlers.onSave).toHaveBeenCalledWith('/home', 'myart.ansi.lua')
  })

  it.each(['myart.ansi', 'myart.lua'])('should strip partial extension and add full extension: %s', value => {
    renderOpen()
    fireEvent.change(screen.getByTestId('save-as-filename'), { target: { value } })
    fireEvent.click(screen.getByTestId('save-as-save'))
    expect(handlers.onSave).toHaveBeenCalledWith('/home', 'myart.ansi.lua')
  })

  it('should show error when filename is empty', () => {
    renderOpen()
    fireEvent.change(screen.getByTestId('save-as-filename'), { target: { value: '' } })
    fireEvent.click(screen.getByTestId('save-as-save'))
    const errorEl = screen.getByTestId('save-as-error')
    expect(errorEl).toBeTruthy()
    expect(errorEl.textContent).toBe('Please enter a file name.')
    expect(handlers.onSave).not.toHaveBeenCalled()
  })

  it('should show error when filename is whitespace only', () => {
    renderOpen()
    fireEvent.change(screen.getByTestId('save-as-filename'), { target: { value: '   ' } })
    fireEvent.click(screen.getByTestId('save-as-save'))
    expect(screen.getByTestId('save-as-error')).toBeTruthy()
    expect(handlers.onSave).not.toHaveBeenCalled()
  })

  it.each(['.ansi.lua', '.ansi', '.lua'])('should show error when filename is only the extension: %s', value => {
    renderOpen()
    fireEvent.change(screen.getByTestId('save-as-filename'), { target: { value } })
    fireEvent.click(screen.getByTestId('save-as-save'))
    expect(screen.getByTestId('save-as-error')).toBeTruthy()
    expect(handlers.onSave).not.toHaveBeenCalled()
  })

  it('should call onCancel when Cancel button is clicked', () => {
    renderOpen()
    fireEvent.click(screen.getByTestId('save-as-cancel'))
    expect(handlers.onCancel).toHaveBeenCalledTimes(1)
  })

  it('should call onCancel on Escape key and not call onSave', () => {
    renderOpen()
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(handlers.onCancel).toHaveBeenCalledTimes(1)
    expect(handlers.onSave).not.toHaveBeenCalled()
  })

  it('should call onSave on Enter key when filename input is focused', () => {
    renderOpen()
    screen.getByTestId('save-as-filename').focus()
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Enter' })
    expect(handlers.onSave).toHaveBeenCalledTimes(1)
  })

  it('should clear error when filename changes', () => {
    renderOpen()
    const input = screen.getByTestId('save-as-filename')
    fireEvent.change(input, { target: { value: '' } })
    fireEvent.click(screen.getByTestId('save-as-save'))
    expect(screen.getByTestId('save-as-error')).toBeTruthy()
    fireEvent.change(input, { target: { value: 'a' } })
    expect(screen.queryByTestId('save-as-error')).toBeNull()
  })

  it('should reset state to defaults when reopened', () => {
    const { rerender } = renderOpen()
    fireEvent.change(screen.getByTestId('save-as-filename'), { target: { value: 'custom' } })
    rerender(<SaveAsDialog isOpen={false} tree={sampleTree} defaultFolderPath="/home" {...handlers} />)
    rerender(<SaveAsDialog isOpen={true} tree={sampleTree} defaultFolderPath="/home" {...handlers} />)
    const newInput = screen.getByTestId('save-as-filename') as HTMLInputElement
    expect(newInput.value).toBe('untitled')
  })
})
