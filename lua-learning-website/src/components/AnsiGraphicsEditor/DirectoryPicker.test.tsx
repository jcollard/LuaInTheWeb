import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { DirectoryPicker } from './DirectoryPicker'
import { filterWritableFolders } from './filterWritableFolders'
import type { TreeNode } from '../../hooks/fileSystemTypes'

function makeFolder(name: string, path: string, overrides?: Partial<TreeNode>): TreeNode {
  return { name, path, type: 'folder', ...overrides }
}

function makeFile(name: string, path: string): TreeNode {
  return { name, path, type: 'file' }
}

describe('filterWritableFolders', () => {
  it('should exclude read-only nodes', () => {
    const tree: TreeNode[] = [
      makeFolder('workspace', '/workspace'),
      makeFolder('lib', '/lib', { isLibraryWorkspace: true }),
      makeFolder('docs', '/docs', { isDocsWorkspace: true }),
      makeFolder('book', '/book', { isBookWorkspace: true }),
      makeFolder('examples', '/examples', { isExamplesWorkspace: true }),
      makeFolder('readonly', '/readonly', { isReadOnly: true }),
    ]
    const result = filterWritableFolders(tree)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('workspace')
  })

  it('should exclude files', () => {
    const tree: TreeNode[] = [
      makeFolder('folder', '/folder'),
      makeFile('file.lua', '/file.lua'),
    ]
    const result = filterWritableFolders(tree)
    expect(result).toHaveLength(1)
    expect(result[0].name).toBe('folder')
  })

  it('should recursively filter children', () => {
    const tree: TreeNode[] = [
      makeFolder('parent', '/parent', {
        children: [
          makeFolder('child', '/parent/child'),
          makeFile('file.lua', '/parent/file.lua'),
          makeFolder('readonly', '/parent/readonly', { isReadOnly: true }),
        ],
      }),
    ]
    const result = filterWritableFolders(tree)
    expect(result[0].children).toHaveLength(1)
    expect(result[0].children![0].name).toBe('child')
  })

  it('should return empty array for all read-only tree', () => {
    const tree: TreeNode[] = [
      makeFolder('lib', '/lib', { isLibraryWorkspace: true }),
    ]
    const result = filterWritableFolders(tree)
    expect(result).toHaveLength(0)
    expect(result).toEqual([])
  })
})

describe('DirectoryPicker', () => {
  const sampleTree: TreeNode[] = [
    makeFolder('workspace', '/workspace', {
      children: [
        makeFolder('src', '/workspace/src'),
        makeFile('main.lua', '/workspace/main.lua'),
      ],
    }),
    makeFolder('lib', '/lib', { isLibraryWorkspace: true }),
  ]

  it('should render root option with correct text', () => {
    render(<DirectoryPicker tree={sampleTree} selectedPath="/" onSelect={vi.fn()} />)
    const rootItem = screen.getByTestId('directory-item-/')
    expect(rootItem).toBeTruthy()
    expect(rootItem.textContent).toContain('/ (root)')
  })

  it('should render tree role attribute', () => {
    render(<DirectoryPicker tree={sampleTree} selectedPath="/" onSelect={vi.fn()} />)
    const picker = screen.getByTestId('directory-picker')
    expect(picker.getAttribute('role')).toBe('tree')
  })

  it('should show writable folders and hide read-only ones', () => {
    render(<DirectoryPicker tree={sampleTree} selectedPath="/" onSelect={vi.fn()} />)
    expect(screen.getByText('workspace')).toBeTruthy()
    expect(screen.queryByText('lib')).toBeNull()
  })

  it('should call onSelect when a folder is clicked', () => {
    const onSelect = vi.fn()
    render(<DirectoryPicker tree={sampleTree} selectedPath="/" onSelect={onSelect} />)
    fireEvent.click(screen.getByText('workspace'))
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledWith('/workspace')
  })

  it('should highlight the selected path and not highlight others', () => {
    render(<DirectoryPicker tree={sampleTree} selectedPath="/workspace" onSelect={vi.fn()} />)
    const workspaceItem = screen.getByTestId('directory-item-/workspace')
    const rootItem = screen.getByTestId('directory-item-/')
    expect(workspaceItem.className).toContain('Selected')
    expect(rootItem.className).not.toContain('Selected')
  })

  it('should highlight root when root is selected', () => {
    render(<DirectoryPicker tree={sampleTree} selectedPath="/" onSelect={vi.fn()} />)
    const rootItem = screen.getByTestId('directory-item-/')
    expect(rootItem.className).toContain('Selected')
  })

  it('should expand folder on chevron click to show children', () => {
    render(<DirectoryPicker tree={sampleTree} selectedPath="/" onSelect={vi.fn()} />)
    expect(screen.queryByText('src')).toBeNull()
    const chevron = screen.getByTestId('directory-item-/workspace').querySelector('[class*="directoryChevron"]')!
    fireEvent.click(chevron)
    expect(screen.getByText('src')).toBeTruthy()
    expect(screen.queryByText('main.lua')).toBeNull()
  })

  it('should collapse folder on second chevron click', () => {
    render(<DirectoryPicker tree={sampleTree} selectedPath="/" onSelect={vi.fn()} />)
    const chevron = screen.getByTestId('directory-item-/workspace').querySelector('[class*="directoryChevron"]')!
    fireEvent.click(chevron)
    expect(screen.getByText('src')).toBeTruthy()
    fireEvent.click(chevron)
    expect(screen.queryByText('src')).toBeNull()
  })

  it('should select root by clicking root item', () => {
    const onSelect = vi.fn()
    render(<DirectoryPicker tree={sampleTree} selectedPath="/workspace" onSelect={onSelect} />)
    fireEvent.click(screen.getByText('/ (root)'))
    expect(onSelect).toHaveBeenCalledTimes(1)
    expect(onSelect).toHaveBeenCalledWith('/')
  })

  it('should select child folder after expanding', () => {
    const onSelect = vi.fn()
    render(<DirectoryPicker tree={sampleTree} selectedPath="/" onSelect={onSelect} />)
    const chevron = screen.getByTestId('directory-item-/workspace').querySelector('[class*="directoryChevron"]')!
    fireEvent.click(chevron)
    fireEvent.click(screen.getByText('src'))
    expect(onSelect).toHaveBeenCalledWith('/workspace/src')
  })

  it('should indent child folders deeper than root items', () => {
    render(<DirectoryPicker tree={sampleTree} selectedPath="/" onSelect={vi.fn()} />)
    const chevron = screen.getByTestId('directory-item-/workspace').querySelector('[class*="directoryChevron"]')!
    fireEvent.click(chevron)
    const childItem = screen.getByTestId('directory-item-/workspace/src')
    const parentItem = screen.getByTestId('directory-item-/workspace')
    // Child should have greater paddingLeft than parent
    const childPadding = parseInt(childItem.style.paddingLeft)
    const parentPadding = parseInt(parentItem.style.paddingLeft)
    expect(childPadding).toBeGreaterThan(parentPadding)
  })

  it('should render with empty tree', () => {
    render(<DirectoryPicker tree={[]} selectedPath="/" onSelect={vi.fn()} />)
    expect(screen.getByText('/ (root)')).toBeTruthy()
    // Only root should be present
    const items = screen.getAllByTestId(/^directory-item-/)
    expect(items).toHaveLength(1)
  })

  it('should hide chevron for leaf folders', () => {
    const tree: TreeNode[] = [makeFolder('leaf', '/leaf')]
    render(<DirectoryPicker tree={tree} selectedPath="/" onSelect={vi.fn()} />)
    const item = screen.getByTestId('directory-item-/leaf')
    const chevron = item.querySelector('[class*="directoryChevron"]') as HTMLElement
    expect(chevron.style.visibility).toBe('hidden')
  })
})
