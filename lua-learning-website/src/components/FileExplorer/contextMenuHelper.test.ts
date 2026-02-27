import { describe, it, expect, vi } from 'vitest'
import { getContextMenuItems } from './contextMenuHelper'
import { luaFileContextMenuItems, readOnlyLuaFileContextMenuItems, fileContextMenuItems } from './contextMenuItems'

describe('getContextMenuItems', () => {
  const defaultParams = {
    contextMenu: {
      isOpen: true,
      position: { x: 0, y: 0 },
      targetPath: '/workspace/test.lua',
      targetType: 'file' as const,
    },
    isWorkspaceRoot: vi.fn().mockReturnValue(false),
    isLibraryWorkspace: vi.fn().mockReturnValue(false),
    isDocsWorkspace: vi.fn().mockReturnValue(false),
    isBookWorkspace: vi.fn().mockReturnValue(false),
    isExamplesWorkspace: vi.fn().mockReturnValue(false),
    isProjectsWorkspace: vi.fn().mockReturnValue(false),
    isProjectSubfolder: vi.fn().mockReturnValue(false),
    isInReadOnlyWorkspace: vi.fn().mockReturnValue(false),
  }

  it('returns luaFileContextMenuItems for .lua files', () => {
    const result = getContextMenuItems(defaultParams)
    expect(result).toBe(luaFileContextMenuItems)
  })

  it('returns fileContextMenuItems for non-lua, non-md, non-html files', () => {
    const params = {
      ...defaultParams,
      contextMenu: { ...defaultParams.contextMenu, targetPath: '/workspace/test.txt' },
    }
    const result = getContextMenuItems(params)
    expect(result).toBe(fileContextMenuItems)
  })

  it('does not return luaFileContextMenuItems for .lua files in read-only workspaces', () => {
    const params = {
      ...defaultParams,
      isInReadOnlyWorkspace: vi.fn().mockReturnValue(true),
    }
    const result = getContextMenuItems(params)
    expect(result).not.toBe(luaFileContextMenuItems)
  })

  it('returns readOnlyLuaFileContextMenuItems for .lua files in read-only workspaces', () => {
    const params = {
      ...defaultParams,
      isInReadOnlyWorkspace: vi.fn().mockReturnValue(true),
    }
    const result = getContextMenuItems(params)
    expect(result).toBe(readOnlyLuaFileContextMenuItems)
  })
})
