import { describe, it, expect, vi } from 'vitest'
import { createExplorerProps, type ExplorerPropsParams } from './explorerPropsHelper'

function createMockParams(overrides?: Partial<ExplorerPropsParams>): ExplorerPropsParams {
  return {
    fileTree: [],
    activeTab: null,
    pendingNewFilePath: null,
    pendingNewFolderPath: null,
    handleCreateFile: vi.fn(),
    handleCreateFolder: vi.fn(),
    renameFile: vi.fn(),
    renameFolder: vi.fn(),
    deleteFile: vi.fn(),
    deleteFolder: vi.fn(),
    openFile: vi.fn(),
    openPreviewFile: vi.fn(),
    moveFile: vi.fn(),
    copyFile: vi.fn(),
    clearPendingNewFile: vi.fn(),
    clearPendingNewFolder: vi.fn(),
    openMarkdownPreview: vi.fn(),
    openMarkdownEdit: vi.fn(),
    makeTabPermanent: vi.fn(),
    openBinaryViewer: vi.fn(),
    openAnsiEditorFile: vi.fn(),
    openHtmlPreview: vi.fn(),
    openHtmlInBrowser: vi.fn(),
    refreshFileTree: vi.fn(),
    workspaces: [],
    pendingWorkspaces: new Set<string>(),
    isFileSystemAccessSupported: false,
    addVirtualWorkspace: vi.fn(),
    handleAddLocalWorkspace: vi.fn(),
    handleRemoveWorkspace: vi.fn(),
    refreshWorkspace: vi.fn(),
    supportsRefresh: vi.fn(),
    handleReconnectWorkspace: vi.fn(),
    handleDisconnectWorkspace: vi.fn(),
    handleRenameWorkspace: vi.fn(),
    isFolderAlreadyMounted: vi.fn(),
    getUniqueWorkspaceName: vi.fn(),
    ...overrides,
  }
}

describe('explorerPropsHelper', () => {
  describe('.ansi.lua routing', () => {
    it('should route .ansi.lua files to openAnsiEditorFile on single click', () => {
      const openAnsiEditorFile = vi.fn()
      const params = createMockParams({ openAnsiEditorFile })
      const props = createExplorerProps(params)

      props.onSelectFile('/art/my-drawing.ansi.lua')

      expect(openAnsiEditorFile).toHaveBeenCalledWith('/art/my-drawing.ansi.lua')
      expect(params.openPreviewFile).not.toHaveBeenCalled()
    })

    it('should route .ansi.lua files to openAnsiEditorFile on double click', () => {
      const openAnsiEditorFile = vi.fn()
      const params = createMockParams({ openAnsiEditorFile })
      const props = createExplorerProps(params)

      props.onDoubleClickFile('/art/my-drawing.ansi.lua')

      expect(openAnsiEditorFile).toHaveBeenCalledWith('/art/my-drawing.ansi.lua')
      expect(params.openFile).not.toHaveBeenCalled()
    })

    it('should route .ANSI.LUA files case-insensitively', () => {
      const openAnsiEditorFile = vi.fn()
      const params = createMockParams({ openAnsiEditorFile })
      const props = createExplorerProps(params)

      props.onSelectFile('/Art/Drawing.ANSI.LUA')

      expect(openAnsiEditorFile).toHaveBeenCalledWith('/Art/Drawing.ANSI.LUA')
    })

    it('should not route regular .lua files to ansi editor', () => {
      const openAnsiEditorFile = vi.fn()
      const params = createMockParams({ openAnsiEditorFile })
      const props = createExplorerProps(params)

      props.onSelectFile('/scripts/main.lua')

      expect(openAnsiEditorFile).not.toHaveBeenCalled()
      expect(params.openPreviewFile).toHaveBeenCalledWith('/scripts/main.lua')
    })
  })

  describe('.html routing', () => {
    it('should route .html files to openHtmlPreview on single click', () => {
      const openHtmlPreview = vi.fn()
      const params = createMockParams({ openHtmlPreview })
      const props = createExplorerProps(params)

      props.onSelectFile('/docs/guide.html')

      expect(openHtmlPreview).toHaveBeenCalledWith('/docs/guide.html')
      expect(params.openPreviewFile).not.toHaveBeenCalled()
    })

    it('should route .htm files to openHtmlPreview on single click', () => {
      const openHtmlPreview = vi.fn()
      const params = createMockParams({ openHtmlPreview })
      const props = createExplorerProps(params)

      props.onSelectFile('/docs/page.htm')

      expect(openHtmlPreview).toHaveBeenCalledWith('/docs/page.htm')
    })

    it('should route .HTML files case-insensitively', () => {
      const openHtmlPreview = vi.fn()
      const params = createMockParams({ openHtmlPreview })
      const props = createExplorerProps(params)

      props.onSelectFile('/docs/Guide.HTML')

      expect(openHtmlPreview).toHaveBeenCalledWith('/docs/Guide.HTML')
    })

    it('should make html tab permanent on double click', () => {
      const makeTabPermanent = vi.fn()
      const params = createMockParams({ makeTabPermanent })
      const props = createExplorerProps(params)

      props.onDoubleClickFile('/docs/guide.html')

      expect(makeTabPermanent).toHaveBeenCalledWith('/docs/guide.html')
      expect(params.openFile).not.toHaveBeenCalled()
    })

    it('should return onPreviewHtml mapped to openHtmlPreview', () => {
      const openHtmlPreview = vi.fn()
      const params = createMockParams({ openHtmlPreview })
      const props = createExplorerProps(params)

      props.onPreviewHtml?.('/docs/guide.html')

      expect(openHtmlPreview).toHaveBeenCalledWith('/docs/guide.html')
    })

    it('should return onEditHtml mapped to openFile', () => {
      const openFile = vi.fn()
      const params = createMockParams({ openFile })
      const props = createExplorerProps(params)

      props.onEditHtml?.('/docs/guide.html')

      expect(openFile).toHaveBeenCalledWith('/docs/guide.html')
    })

    it('should return onOpenHtmlInBrowser mapped to openHtmlInBrowser', () => {
      const openHtmlInBrowser = vi.fn()
      const params = createMockParams({ openHtmlInBrowser })
      const props = createExplorerProps(params)

      props.onOpenHtmlInBrowser?.('/docs/guide.html')

      expect(openHtmlInBrowser).toHaveBeenCalledWith('/docs/guide.html')
    })
  })
})
