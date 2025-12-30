import { describe, it, expect } from 'vitest'
import {
  folderContextMenuItems,
  workspaceContextMenuItems,
  buildConnectedWorkspaceMenuItems,
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
})
