import { describe, it, expect } from 'vitest'
import {
  fileContextMenuItems,
  markdownFileContextMenuItems,
  readOnlyMarkdownFileContextMenuItems,
  htmlFileContextMenuItems,
  readOnlyHtmlFileContextMenuItems,
  readOnlyFileContextMenuItems,
  folderContextMenuItems,
  workspaceContextMenuItems,
  libraryWorkspaceContextMenuItems,
  docsWorkspaceContextMenuItems,
  bookWorkspaceContextMenuItems,
  examplesWorkspaceContextMenuItems,
  projectsWorkspaceContextMenuItems,
  projectSubfolderContextMenuItems,
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

  describe('download menu items', () => {
    it('fileContextMenuItems includes download', () => {
      const item = fileContextMenuItems.find((i) => i.id === 'download')
      expect(item).toBeDefined()
      expect(item?.label).toBe('Download')
    })

    it('markdownFileContextMenuItems includes download', () => {
      const item = markdownFileContextMenuItems.find((i) => i.id === 'download')
      expect(item).toBeDefined()
      expect(item?.label).toBe('Download')
    })

    it('readOnlyMarkdownFileContextMenuItems includes download', () => {
      const item = readOnlyMarkdownFileContextMenuItems.find((i) => i.id === 'download')
      expect(item).toBeDefined()
      expect(item?.label).toBe('Download')
    })

    it('htmlFileContextMenuItems includes download', () => {
      const item = htmlFileContextMenuItems.find((i) => i.id === 'download')
      expect(item).toBeDefined()
      expect(item?.label).toBe('Download')
    })

    it('readOnlyHtmlFileContextMenuItems includes download', () => {
      const item = readOnlyHtmlFileContextMenuItems.find((i) => i.id === 'download')
      expect(item).toBeDefined()
      expect(item?.label).toBe('Download')
    })

    it('readOnlyFileContextMenuItems includes download', () => {
      const item = readOnlyFileContextMenuItems.find((i) => i.id === 'download')
      expect(item).toBeDefined()
      expect(item?.label).toBe('Download')
    })
  })

  describe('download-zip menu items', () => {
    it('folderContextMenuItems includes download-zip', () => {
      const item = folderContextMenuItems.find((i) => i.id === 'download-zip')
      expect(item).toBeDefined()
      expect(item?.label).toBe('Download as ZIP')
    })

    it('workspaceContextMenuItems includes download-zip', () => {
      const item = workspaceContextMenuItems.find((i) => i.id === 'download-zip')
      expect(item).toBeDefined()
      expect(item?.label).toBe('Download as ZIP')
    })

    it('buildConnectedWorkspaceMenuItems includes download-zip', () => {
      const items = buildConnectedWorkspaceMenuItems()
      const item = items.find((i) => i.id === 'download-zip')
      expect(item).toBeDefined()
      expect(item?.label).toBe('Download as ZIP')
    })

    it('libraryWorkspaceContextMenuItems includes download-zip', () => {
      const item = libraryWorkspaceContextMenuItems.find((i) => i.id === 'download-zip')
      expect(item).toBeDefined()
      expect(item?.label).toBe('Download as ZIP')
    })

    it('docsWorkspaceContextMenuItems includes download-zip', () => {
      const item = docsWorkspaceContextMenuItems.find((i) => i.id === 'download-zip')
      expect(item).toBeDefined()
      expect(item?.label).toBe('Download as ZIP')
    })

    it('bookWorkspaceContextMenuItems includes download-zip', () => {
      const item = bookWorkspaceContextMenuItems.find((i) => i.id === 'download-zip')
      expect(item).toBeDefined()
      expect(item?.label).toBe('Download as ZIP')
    })

    it('examplesWorkspaceContextMenuItems includes download-zip', () => {
      const item = examplesWorkspaceContextMenuItems.find((i) => i.id === 'download-zip')
      expect(item).toBeDefined()
      expect(item?.label).toBe('Download as ZIP')
    })

    it('projectsWorkspaceContextMenuItems includes download-zip', () => {
      const item = projectsWorkspaceContextMenuItems.find((i) => i.id === 'download-zip')
      expect(item).toBeDefined()
      expect(item?.label).toBe('Download as ZIP')
    })

    it('projectSubfolderContextMenuItems includes download-zip', () => {
      const item = projectSubfolderContextMenuItems.find((i) => i.id === 'download-zip')
      expect(item).toBeDefined()
      expect(item?.label).toBe('Download as ZIP')
    })
  })
})
