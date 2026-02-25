import { describe, it, expect } from 'vitest'
import {
  folderContextMenuItems,
  workspaceContextMenuItems,
  buildConnectedWorkspaceMenuItems,
  luaFileContextMenuItems,
} from './contextMenuItems'

describe('contextMenuItems', () => {
  describe('upload-files menu item', () => {
    it('folderContextMenuItems should include upload-files option', () => {
      const uploadItem = folderContextMenuItems.find((item) => item.id === 'upload-files')
      expect(uploadItem).toBeDefined()
      expect(uploadItem?.label).toBe('Upload Files...')
    })

    it('workspaceContextMenuItems should include upload-files option', () => {
      const uploadItem = workspaceContextMenuItems.find((item) => item.id === 'upload-files')
      expect(uploadItem).toBeDefined()
      expect(uploadItem?.label).toBe('Upload Files...')
    })

    it('buildConnectedWorkspaceMenuItems should include upload-files option', () => {
      const items = buildConnectedWorkspaceMenuItems()
      const uploadItem = items.find((item) => item.id === 'upload-files')
      expect(uploadItem).toBeDefined()
      expect(uploadItem?.label).toBe('Upload Files...')
    })
  })

  describe('luaFileContextMenuItems', () => {
    it('should include run-lua option as the first item', () => {
      const runItem = luaFileContextMenuItems[0]
      expect(runItem.id).toBe('run-lua')
      expect(runItem.label).toBe('Run')
    })

    it('should include rename and delete after a divider', () => {
      const ids = luaFileContextMenuItems.map((item) => item.id)
      expect(ids).toContain('divider-lua')
      expect(ids).toContain('rename')
      expect(ids).toContain('delete')
    })
  })
})
