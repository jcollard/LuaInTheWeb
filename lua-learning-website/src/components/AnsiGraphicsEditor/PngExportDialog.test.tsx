import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { PngExportDialog, type PngExportDialogProps } from './PngExportDialog'

function defaultProps(overrides?: Partial<PngExportDialogProps>): PngExportDialogProps {
  return {
    isOpen: true,
    defaultFileName: 'untitled.png',
    dimensionsForScale: scale => ({ width: 640 * scale, height: 400 * scale }),
    onExport: vi.fn(),
    onCancel: vi.fn(),
    ...overrides,
  }
}

describe('PngExportDialog', () => {
  it('renders nothing when isOpen=false', () => {
    render(<PngExportDialog {...defaultProps({ isOpen: false })} />)
    expect(screen.queryByTestId('png-export-overlay')).toBeNull()
  })

  it('renders dialog with role, aria-modal, and tabIndex=-1', () => {
    render(<PngExportDialog {...defaultProps()} />)
    const dialog = screen.getByRole('dialog')
    expect(dialog).toBeTruthy()
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    expect(dialog.getAttribute('tabindex')).toBe('-1')
  })

  it('shows no error initially', () => {
    render(<PngExportDialog {...defaultProps()} />)
    expect(screen.queryByTestId('png-export-error')).toBeNull()
  })

  it('renders Cancel and Export buttons with their labels', () => {
    render(<PngExportDialog {...defaultProps()} />)
    expect(screen.getByTestId('png-export-cancel').textContent).toBe('Cancel')
    expect(screen.getByTestId('png-export-confirm').textContent).toBe('Export')
  })

  it('focuses the filename input on open', () => {
    render(<PngExportDialog {...defaultProps({ defaultFileName: 'foo' })} />)
    expect(document.activeElement).toBe(screen.getByTestId('png-export-filename'))
  })

  it('clears the error and re-focuses input when reopened from closed state', () => {
    const { rerender } = render(<PngExportDialog {...defaultProps({ isOpen: false })} />)
    rerender(<PngExportDialog {...defaultProps({ isOpen: true, defaultFileName: 'bar' })} />)
    fireEvent.change(screen.getByTestId('png-export-filename'), { target: { value: '' } })
    fireEvent.click(screen.getByTestId('png-export-confirm'))
    expect(screen.getByTestId('png-export-error')).toBeTruthy()
    rerender(<PngExportDialog {...defaultProps({ isOpen: false })} />)
    rerender(<PngExportDialog {...defaultProps({ isOpen: true, defaultFileName: 'baz' })} />)
    expect(screen.queryByTestId('png-export-error')).toBeNull()
    expect((screen.getByTestId('png-export-filename') as HTMLInputElement).value).toBe('baz')
  })

  it('shows the default filename without the .png extension', () => {
    render(<PngExportDialog {...defaultProps({ defaultFileName: 'my-art.png' })} />)
    const input = screen.getByTestId('png-export-filename') as HTMLInputElement
    expect(input.value).toBe('my-art')
  })

  it('preserves filename when default already lacks .png', () => {
    render(<PngExportDialog {...defaultProps({ defaultFileName: 'noext' })} />)
    const input = screen.getByTestId('png-export-filename') as HTMLInputElement
    expect(input.value).toBe('noext')
  })

  it('only strips a trailing .png, not a .png in the middle of the name', () => {
    render(<PngExportDialog {...defaultProps({ defaultFileName: 'my.png.backup' })} />)
    expect((screen.getByTestId('png-export-filename') as HTMLInputElement).value).toBe('my.png.backup')
  })

  it('strips .png case-insensitively', () => {
    render(<PngExportDialog {...defaultProps({ defaultFileName: 'shot.PNG' })} />)
    expect((screen.getByTestId('png-export-filename') as HTMLInputElement).value).toBe('shot')
  })

  it('shows the .png suffix indicator', () => {
    render(<PngExportDialog {...defaultProps()} />)
    expect(screen.getByTestId('png-export-extension-suffix').textContent).toBe('.png')
  })

  it('renders 1×, 2×, 3× scale buttons with 1× selected by default', () => {
    render(<PngExportDialog {...defaultProps()} />)
    const one = screen.getByTestId('png-export-scale-1x')
    const two = screen.getByTestId('png-export-scale-2x')
    const three = screen.getByTestId('png-export-scale-3x')
    expect(one.getAttribute('aria-checked')).toBe('true')
    expect(two.getAttribute('aria-checked')).toBe('false')
    expect(three.getAttribute('aria-checked')).toBe('false')
  })

  it('switches active scale button on click', () => {
    render(<PngExportDialog {...defaultProps()} />)
    fireEvent.click(screen.getByTestId('png-export-scale-2x'))
    expect(screen.getByTestId('png-export-scale-1x').getAttribute('aria-checked')).toBe('false')
    expect(screen.getByTestId('png-export-scale-2x').getAttribute('aria-checked')).toBe('true')
  })

  it('shows output dimensions for the selected scale', () => {
    render(<PngExportDialog {...defaultProps()} />)
    expect(screen.getByTestId('png-export-dimensions').textContent).toBe('640 × 400 px')
    fireEvent.click(screen.getByTestId('png-export-scale-3x'))
    expect(screen.getByTestId('png-export-dimensions').textContent).toBe('1920 × 1200 px')
  })

  it('calls onExport with appended .png extension and selected scale', () => {
    const onExport = vi.fn()
    render(<PngExportDialog {...defaultProps({ onExport, defaultFileName: 'foo' })} />)
    fireEvent.click(screen.getByTestId('png-export-scale-2x'))
    fireEvent.click(screen.getByTestId('png-export-confirm'))
    expect(onExport).toHaveBeenCalledWith('foo.png', 2)
  })

  it('does not double-add .png when user types it explicitly', () => {
    const onExport = vi.fn()
    render(<PngExportDialog {...defaultProps({ onExport, defaultFileName: 'foo' })} />)
    const input = screen.getByTestId('png-export-filename')
    fireEvent.change(input, { target: { value: 'screenshot.png' } })
    fireEvent.click(screen.getByTestId('png-export-confirm'))
    expect(onExport).toHaveBeenCalledWith('screenshot.png', 1)
  })

  it('shows error and does not call onExport when filename is empty', () => {
    const onExport = vi.fn()
    render(<PngExportDialog {...defaultProps({ onExport })} />)
    fireEvent.change(screen.getByTestId('png-export-filename'), { target: { value: '   ' } })
    fireEvent.click(screen.getByTestId('png-export-confirm'))
    expect(onExport).not.toHaveBeenCalled()
    expect(screen.getByTestId('png-export-error').textContent).toMatch(/file name/i)
  })

  it('clears error once the user types a valid name', () => {
    render(<PngExportDialog {...defaultProps()} />)
    fireEvent.change(screen.getByTestId('png-export-filename'), { target: { value: '' } })
    fireEvent.click(screen.getByTestId('png-export-confirm'))
    expect(screen.queryByTestId('png-export-error')).toBeTruthy()
    fireEvent.change(screen.getByTestId('png-export-filename'), { target: { value: 'x' } })
    expect(screen.queryByTestId('png-export-error')).toBeNull()
  })

  it('clears error after a successful export click', () => {
    render(<PngExportDialog {...defaultProps()} />)
    fireEvent.change(screen.getByTestId('png-export-filename'), { target: { value: '' } })
    fireEvent.click(screen.getByTestId('png-export-confirm'))
    expect(screen.queryByTestId('png-export-error')).toBeTruthy()
    fireEvent.change(screen.getByTestId('png-export-filename'), { target: { value: 'good' } })
    fireEvent.click(screen.getByTestId('png-export-confirm'))
    expect(screen.queryByTestId('png-export-error')).toBeNull()
  })

  it('does not trigger export when Enter is pressed on the dialog backdrop (not input/button)', () => {
    const onExport = vi.fn()
    render(<PngExportDialog {...defaultProps({ onExport })} />)
    // Move focus to the dialog itself (not the filename input or export button).
    const dialog = screen.getByRole('dialog') as HTMLElement
    dialog.focus()
    fireEvent.keyDown(dialog, { key: 'Enter' })
    expect(onExport).not.toHaveBeenCalled()
  })

  it('calls onCancel when Cancel is clicked', () => {
    const onCancel = vi.fn()
    render(<PngExportDialog {...defaultProps({ onCancel })} />)
    fireEvent.click(screen.getByTestId('png-export-cancel'))
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('calls onCancel when Escape is pressed in the dialog', () => {
    const onCancel = vi.fn()
    render(<PngExportDialog {...defaultProps({ onCancel })} />)
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(onCancel).toHaveBeenCalledOnce()
  })

  it('triggers Export when Enter is pressed in the filename input', () => {
    const onExport = vi.fn()
    render(<PngExportDialog {...defaultProps({ onExport, defaultFileName: 'foo' })} />)
    const input = screen.getByTestId('png-export-filename')
    input.focus()
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onExport).toHaveBeenCalledWith('foo.png', 1)
  })

  it('resets state when reopened with a new default name', () => {
    const { rerender } = render(<PngExportDialog {...defaultProps({ isOpen: false })} />)
    rerender(<PngExportDialog {...defaultProps({ isOpen: true, defaultFileName: 'first.png' })} />)
    expect((screen.getByTestId('png-export-filename') as HTMLInputElement).value).toBe('first')
    fireEvent.click(screen.getByTestId('png-export-scale-3x'))
    rerender(<PngExportDialog {...defaultProps({ isOpen: false })} />)
    rerender(<PngExportDialog {...defaultProps({ isOpen: true, defaultFileName: 'second.png' })} />)
    expect((screen.getByTestId('png-export-filename') as HTMLInputElement).value).toBe('second')
    expect(screen.getByTestId('png-export-scale-1x').getAttribute('aria-checked')).toBe('true')
  })
})
