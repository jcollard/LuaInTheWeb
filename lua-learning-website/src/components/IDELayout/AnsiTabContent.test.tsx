import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { AnsiTabContent } from './AnsiTabContent'

// Spy that captures the props handed to AnsiTerminalPanel so we can assert
// useFontBlocks flows through. The real panel construction needs xterm /
// PixelAnsiRenderer plumbing we don't care about here.
const panelSpy = vi.fn()
vi.mock('../AnsiTerminalPanel/AnsiTerminalPanel', () => ({
  AnsiTerminalPanel: (props: Record<string, unknown>) => {
    panelSpy(props)
    return <div data-testid="ansi-terminal-panel-mock" />
  },
}))

describe('AnsiTabContent', () => {
  it('forwards useFontBlocks=true to AnsiTerminalPanel', () => {
    panelSpy.mockClear()
    render(
      <AnsiTabContent
        tabs={[{ path: 'ansi://main', name: 'ANSI', type: 'ansi', isDirty: false, isPreview: false, isPinned: false }]}
        activeTab="ansi://main"
        onSelectTab={vi.fn()}
        onCloseTab={vi.fn()}
        useFontBlocks={true}
      />,
    )
    const last = panelSpy.mock.calls[panelSpy.mock.calls.length - 1][0]
    expect(last.useFontBlocks).toBe(true)
  })

  it('forwards useFontBlocks=false to AnsiTerminalPanel', () => {
    panelSpy.mockClear()
    render(
      <AnsiTabContent
        tabs={[{ path: 'ansi://main', name: 'ANSI', type: 'ansi', isDirty: false, isPreview: false, isPinned: false }]}
        activeTab="ansi://main"
        onSelectTab={vi.fn()}
        onCloseTab={vi.fn()}
        useFontBlocks={false}
      />,
    )
    const last = panelSpy.mock.calls[panelSpy.mock.calls.length - 1][0]
    expect(last.useFontBlocks).toBe(false)
  })

  it('forwards undefined useFontBlocks (panel uses default)', () => {
    panelSpy.mockClear()
    render(
      <AnsiTabContent
        tabs={[{ path: 'ansi://main', name: 'ANSI', type: 'ansi', isDirty: false, isPreview: false, isPinned: false }]}
        activeTab="ansi://main"
        onSelectTab={vi.fn()}
        onCloseTab={vi.fn()}
      />,
    )
    const last = panelSpy.mock.calls[panelSpy.mock.calls.length - 1][0]
    expect(last.useFontBlocks).toBeUndefined()
  })
})
