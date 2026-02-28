import { render, screen } from '@testing-library/react'
import { describe, it, expect, vi } from 'vitest'
import { HtmlTabContent } from './HtmlTabContent'
import type { IFileSystem } from '@lua-learning/shell-core'

function createMockFileSystem(files: Record<string, string>): IFileSystem {
  return {
    exists: vi.fn((path: string) => path in files),
    readFile: vi.fn((path: string) => files[path] ?? ''),
    writeFile: vi.fn(),
    deleteFile: vi.fn(),
    deleteDirectory: vi.fn(),
    createDirectory: vi.fn(),
    listFiles: vi.fn(() => []),
    getTree: vi.fn(() => []),
    moveFile: vi.fn(),
    copyFile: vi.fn(),
    readBinaryFile: vi.fn(() => new Uint8Array()),
    writeBinaryFile: vi.fn(),
  } as unknown as IFileSystem
}

describe('HtmlTabContent', () => {
  it('should render the HtmlViewer with provided content', () => {
    const fileSystem = createMockFileSystem({ '/test.html': '<h1>Hello</h1>' })
    const tabBarProps = {
      tabs: [{ path: '/test.html', name: 'test.html', isDirty: false, type: 'html' as const, isPreview: false, isPinned: false }],
      activeTab: '/test.html',
      onSelect: () => {},
      onClose: () => {},
    }
    render(<HtmlTabContent tabBarProps={tabBarProps} fileSystem={fileSystem} activeTab="/test.html" />)
    const iframe = screen.getByTestId('html-viewer')
    expect(iframe).toHaveAttribute('srcdoc', '<h1>Hello</h1>')
  })

  it('should render TabBar when tabBarProps are provided', () => {
    const fileSystem = createMockFileSystem({ '/test.html': '<p>test</p>' })
    const tabBarProps = {
      tabs: [{ path: '/test.html', name: 'test.html', isDirty: false, type: 'html' as const, isPreview: false, isPinned: false }],
      activeTab: '/test.html',
      onSelect: () => {},
      onClose: () => {},
    }
    render(<HtmlTabContent tabBarProps={tabBarProps} fileSystem={fileSystem} activeTab="/test.html" />)
    expect(screen.getByText('test.html')).toBeInTheDocument()
  })

  it('should render no viewers when tabBarProps is undefined (no tabs)', () => {
    const fileSystem = createMockFileSystem({ '/test.html': '<p>test</p>' })
    render(<HtmlTabContent fileSystem={fileSystem} activeTab="/test.html" />)
    // No HTML tabs means no viewers rendered
    expect(screen.queryByTestId('html-viewer')).not.toBeInTheDocument()
  })

  describe('multi-tab rendering', () => {
    it('should render one HtmlViewer per HTML tab', () => {
      const fileSystem = createMockFileSystem({
        '/page1.html': '<h1>Page 1</h1>',
        '/page2.html': '<h2>Page 2</h2>',
      })
      const tabBarProps = {
        tabs: [
          { path: '/page1.html', name: 'page1.html', isDirty: false, type: 'html' as const, isPreview: false, isPinned: false },
          { path: '/page2.html', name: 'page2.html', isDirty: false, type: 'html' as const, isPreview: false, isPinned: false },
        ],
        activeTab: '/page1.html',
        onSelect: () => {},
        onClose: () => {},
      }
      render(<HtmlTabContent tabBarProps={tabBarProps} fileSystem={fileSystem} activeTab="/page1.html" />)

      const viewers = screen.getAllByTestId('html-viewer')
      expect(viewers).toHaveLength(2)
    })

    it('should render correct content for each HTML tab', () => {
      const fileSystem = createMockFileSystem({
        '/page1.html': '<h1>Page 1</h1>',
        '/page2.html': '<h2>Page 2</h2>',
      })
      const tabBarProps = {
        tabs: [
          { path: '/page1.html', name: 'page1.html', isDirty: false, type: 'html' as const, isPreview: false, isPinned: false },
          { path: '/page2.html', name: 'page2.html', isDirty: false, type: 'html' as const, isPreview: false, isPinned: false },
        ],
        activeTab: '/page1.html',
        onSelect: () => {},
        onClose: () => {},
      }
      render(<HtmlTabContent tabBarProps={tabBarProps} fileSystem={fileSystem} activeTab="/page1.html" />)

      const viewers = screen.getAllByTestId('html-viewer')
      const srcdocs = viewers.map(v => v.getAttribute('srcdoc'))
      expect(srcdocs).toContain('<h1>Page 1</h1>')
      expect(srcdocs).toContain('<h2>Page 2</h2>')
    })

    it('should only render HTML tabs, not other tab types', () => {
      const fileSystem = createMockFileSystem({
        '/page.html': '<p>HTML content</p>',
      })
      const tabBarProps = {
        tabs: [
          { path: '/page.html', name: 'page.html', isDirty: false, type: 'html' as const, isPreview: false, isPinned: false },
          { path: '/code.lua', name: 'code.lua', isDirty: false, type: 'file' as const, isPreview: false, isPinned: false },
        ],
        activeTab: '/page.html',
        onSelect: () => {},
        onClose: () => {},
      }
      render(<HtmlTabContent tabBarProps={tabBarProps} fileSystem={fileSystem} activeTab="/page.html" />)

      const viewers = screen.getAllByTestId('html-viewer')
      expect(viewers).toHaveLength(1)
    })

    it('should show active HTML tab with display contents and hide others off-screen', () => {
      const fileSystem = createMockFileSystem({
        '/page1.html': '<h1>Page 1</h1>',
        '/page2.html': '<h2>Page 2</h2>',
      })
      const tabBarProps = {
        tabs: [
          { path: '/page1.html', name: 'page1.html', isDirty: false, type: 'html' as const, isPreview: false, isPinned: false },
          { path: '/page2.html', name: 'page2.html', isDirty: false, type: 'html' as const, isPreview: false, isPinned: false },
        ],
        activeTab: '/page1.html',
        onSelect: () => {},
        onClose: () => {},
      }
      const { container } = render(<HtmlTabContent tabBarProps={tabBarProps} fileSystem={fileSystem} activeTab="/page1.html" />)

      // The active tab wrapper should use display: contents
      const wrappers = container.querySelectorAll('[data-html-tab-path]')
      expect(wrappers).toHaveLength(2)

      const activeWrapper = container.querySelector('[data-html-tab-path="/page1.html"]') as HTMLElement
      const inactiveWrapper = container.querySelector('[data-html-tab-path="/page2.html"]') as HTMLElement

      expect(activeWrapper.style.display).toBe('contents')
      // Inactive wrapper should be positioned off-screen for iframe preservation
      expect(inactiveWrapper.style.position).toBe('absolute')
      expect(inactiveWrapper.style.width).toBe('0px')
      expect(inactiveWrapper.style.height).toBe('0px')
    })

    it('should render empty content when file does not exist', () => {
      const fileSystem = createMockFileSystem({})
      const tabBarProps = {
        tabs: [
          { path: '/missing.html', name: 'missing.html', isDirty: false, type: 'html' as const, isPreview: false, isPinned: false },
        ],
        activeTab: '/missing.html',
        onSelect: () => {},
        onClose: () => {},
      }
      render(<HtmlTabContent tabBarProps={tabBarProps} fileSystem={fileSystem} activeTab="/missing.html" />)

      const viewer = screen.getByTestId('html-viewer')
      expect(viewer).toHaveAttribute('srcdoc', '')
    })
  })
})
