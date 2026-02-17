import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ExtensionsPanel } from './ExtensionsPanel'

describe('ExtensionsPanel', () => {
  it('should render the extensions panel', () => {
    render(<ExtensionsPanel onOpenAnsiEditor={vi.fn()} />)
    expect(screen.getByTestId('extensions-panel')).toBeTruthy()
  })

  it('should display ANSI Graphics Editor entry', () => {
    render(<ExtensionsPanel onOpenAnsiEditor={vi.fn()} />)
    expect(screen.getByText('ANSI Graphics Editor')).toBeTruthy()
  })

  it('should call onOpenAnsiEditor when entry is clicked', () => {
    const onOpen = vi.fn()
    render(<ExtensionsPanel onOpenAnsiEditor={onOpen} />)
    fireEvent.click(screen.getByTestId('open-ansi-editor'))
    expect(onOpen).toHaveBeenCalledOnce()
  })
})
