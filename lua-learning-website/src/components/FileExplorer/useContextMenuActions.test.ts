import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useContextMenuActions } from './useContextMenuActions'
import type { ContextMenuState } from './types'

describe('useContextMenuActions', () => {
  const defaultContextMenu: ContextMenuState = {
    isOpen: true,
    position: { x: 100, y: 100 },
    targetPath: '/workspace/file.lua',
    targetType: 'file',
  }

  const defaultParams = {
    contextMenu: defaultContextMenu,
    findNodeType: vi.fn().mockReturnValue('file'),
    findNodeName: vi.fn((path: string) => path.split('/').pop() || path),
    startRename: vi.fn(),
    openConfirmDialog: vi.fn(),
    closeConfirmDialog: vi.fn(),
    closeContextMenu: vi.fn(),
    onCreateFile: vi.fn(),
    onCreateFolder: vi.fn(),
    onDeleteFile: vi.fn(),
    onDeleteFolder: vi.fn(),
    onPreviewMarkdown: vi.fn(),
    onEditMarkdown: vi.fn(),
    onPreviewHtml: vi.fn(),
    onEditHtml: vi.fn(),
    onOpenHtmlInBrowser: vi.fn(),
    onCdToLocation: vi.fn(),
    triggerUpload: vi.fn(),
    triggerFolderUpload: vi.fn(),
    openCloneDialog: vi.fn(),
    workspaceProps: {
      workspaces: [],
      pendingWorkspaces: new Set<string>(),
      isFileSystemAccessSupported: true,
      onAddVirtualWorkspace: vi.fn(),
      onAddLocalWorkspace: vi.fn().mockResolvedValue(undefined),
      onRemoveWorkspace: vi.fn(),
      onRefreshWorkspace: vi.fn().mockResolvedValue(undefined),
      supportsRefresh: vi.fn().mockReturnValue(false),
      onReconnectWorkspace: vi.fn().mockResolvedValue(undefined),
      onDisconnectWorkspace: vi.fn(),
      onRenameWorkspace: vi.fn(),
      isFolderAlreadyMounted: vi.fn().mockResolvedValue(false),
      getUniqueWorkspaceName: vi.fn((name: string) => name),
    },
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('handleContextMenuSelect', () => {
    it('calls closeContextMenu after any action', () => {
      const { result } = renderHook(() => useContextMenuActions(defaultParams))

      act(() => { result.current.handleContextMenuSelect('new-file') })

      expect(defaultParams.closeContextMenu).toHaveBeenCalled()
    })

    it('does nothing when targetPath is empty', () => {
      const params = {
        ...defaultParams,
        contextMenu: { ...defaultContextMenu, targetPath: '' },
      }
      const { result } = renderHook(() => useContextMenuActions(params))

      act(() => { result.current.handleContextMenuSelect('new-file') })

      expect(defaultParams.onCreateFile).not.toHaveBeenCalled()
    })

    describe('file actions', () => {
      it('dispatches preview-markdown action', () => {
        const { result } = renderHook(() => useContextMenuActions(defaultParams))

        act(() => { result.current.handleContextMenuSelect('preview-markdown') })

        expect(defaultParams.onPreviewMarkdown).toHaveBeenCalledWith('/workspace/file.lua')
      })

      it('dispatches edit-markdown action', () => {
        const { result } = renderHook(() => useContextMenuActions(defaultParams))

        act(() => { result.current.handleContextMenuSelect('edit-markdown') })

        expect(defaultParams.onEditMarkdown).toHaveBeenCalledWith('/workspace/file.lua')
      })

      it('dispatches preview-html action', () => {
        const { result } = renderHook(() => useContextMenuActions(defaultParams))

        act(() => { result.current.handleContextMenuSelect('preview-html') })

        expect(defaultParams.onPreviewHtml).toHaveBeenCalledWith('/workspace/file.lua')
      })

      it('dispatches edit-html action', () => {
        const { result } = renderHook(() => useContextMenuActions(defaultParams))

        act(() => { result.current.handleContextMenuSelect('edit-html') })

        expect(defaultParams.onEditHtml).toHaveBeenCalledWith('/workspace/file.lua')
      })

      it('dispatches open-in-browser action', () => {
        const { result } = renderHook(() => useContextMenuActions(defaultParams))

        act(() => { result.current.handleContextMenuSelect('open-in-browser') })

        expect(defaultParams.onOpenHtmlInBrowser).toHaveBeenCalledWith('/workspace/file.lua')
      })

      it('dispatches open-in-terminal action', () => {
        const { result } = renderHook(() => useContextMenuActions(defaultParams))

        act(() => { result.current.handleContextMenuSelect('open-in-terminal') })

        expect(defaultParams.onCdToLocation).toHaveBeenCalledWith('/workspace/file.lua')
      })
    })

    describe('creation actions', () => {
      it('dispatches new-file action', () => {
        const { result } = renderHook(() => useContextMenuActions(defaultParams))

        act(() => { result.current.handleContextMenuSelect('new-file') })

        expect(defaultParams.onCreateFile).toHaveBeenCalledWith('/workspace/file.lua')
      })

      it('dispatches new-folder action', () => {
        const { result } = renderHook(() => useContextMenuActions(defaultParams))

        act(() => { result.current.handleContextMenuSelect('new-folder') })

        expect(defaultParams.onCreateFolder).toHaveBeenCalledWith('/workspace/file.lua')
      })
    })

    describe('upload actions', () => {
      it('dispatches upload-files action', () => {
        const { result } = renderHook(() => useContextMenuActions(defaultParams))

        act(() => { result.current.handleContextMenuSelect('upload-files') })

        expect(defaultParams.triggerUpload).toHaveBeenCalledWith('/workspace/file.lua')
      })

      it('dispatches upload-folder action', () => {
        const { result } = renderHook(() => useContextMenuActions(defaultParams))

        act(() => { result.current.handleContextMenuSelect('upload-folder') })

        expect(defaultParams.triggerFolderUpload).toHaveBeenCalledWith('/workspace/file.lua')
      })
    })

    describe('rename actions', () => {
      it('dispatches rename action', () => {
        const { result } = renderHook(() => useContextMenuActions(defaultParams))

        act(() => { result.current.handleContextMenuSelect('rename') })

        expect(defaultParams.startRename).toHaveBeenCalledWith('/workspace/file.lua')
      })

      it('dispatches rename-workspace action', () => {
        const { result } = renderHook(() => useContextMenuActions(defaultParams))

        act(() => { result.current.handleContextMenuSelect('rename-workspace') })

        expect(defaultParams.startRename).toHaveBeenCalledWith('/workspace/file.lua')
      })
    })

    describe('workspace actions', () => {
      it('dispatches refresh action', () => {
        const { result } = renderHook(() => useContextMenuActions(defaultParams))

        act(() => { result.current.handleContextMenuSelect('refresh') })

        expect(defaultParams.workspaceProps!.onRefreshWorkspace).toHaveBeenCalledWith('/workspace/file.lua')
      })

      it('dispatches disconnect-workspace action', () => {
        const { result } = renderHook(() => useContextMenuActions(defaultParams))

        act(() => { result.current.handleContextMenuSelect('disconnect-workspace') })

        expect(defaultParams.workspaceProps!.onDisconnectWorkspace).toHaveBeenCalledWith('/workspace/file.lua')
      })

      it('opens confirm dialog for remove-workspace', () => {
        const { result } = renderHook(() => useContextMenuActions(defaultParams))

        act(() => { result.current.handleContextMenuSelect('remove-workspace') })

        expect(defaultParams.openConfirmDialog).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Remove Workspace',
            variant: 'danger',
          })
        )
      })

      it('calls onRemoveWorkspace when confirm callback is invoked', () => {
        const { result } = renderHook(() => useContextMenuActions(defaultParams))

        act(() => { result.current.handleContextMenuSelect('remove-workspace') })

        // Get the onConfirm callback
        const confirmCall = defaultParams.openConfirmDialog.mock.calls[0][0]
        act(() => { confirmCall.onConfirm() })

        expect(defaultParams.workspaceProps!.onRemoveWorkspace).toHaveBeenCalledWith('/workspace/file.lua')
        expect(defaultParams.closeConfirmDialog).toHaveBeenCalled()
      })
    })

    describe('clone action', () => {
      it('dispatches clone-project action', () => {
        const { result } = renderHook(() => useContextMenuActions(defaultParams))

        act(() => { result.current.handleContextMenuSelect('clone-project') })

        expect(defaultParams.openCloneDialog).toHaveBeenCalledWith('/workspace/file.lua')
      })
    })

    describe('delete action', () => {
      it('opens confirm dialog for file delete', () => {
        const params = {
          ...defaultParams,
          contextMenu: { ...defaultContextMenu, targetType: 'file' as const },
        }
        const { result } = renderHook(() => useContextMenuActions(params))

        act(() => { result.current.handleContextMenuSelect('delete') })

        expect(defaultParams.openConfirmDialog).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Delete File',
            variant: 'danger',
          })
        )
      })

      it('opens confirm dialog for folder delete', () => {
        const params = {
          ...defaultParams,
          contextMenu: { ...defaultContextMenu, targetType: 'folder' as const },
        }
        const { result } = renderHook(() => useContextMenuActions(params))

        act(() => { result.current.handleContextMenuSelect('delete') })

        expect(defaultParams.openConfirmDialog).toHaveBeenCalledWith(
          expect.objectContaining({
            title: 'Delete Folder',
            variant: 'danger',
          })
        )
      })

      it('calls onDeleteFile for file when confirmed', () => {
        const params = {
          ...defaultParams,
          contextMenu: { ...defaultContextMenu, targetType: 'file' as const },
        }
        const { result } = renderHook(() => useContextMenuActions(params))

        act(() => { result.current.handleContextMenuSelect('delete') })

        const confirmCall = defaultParams.openConfirmDialog.mock.calls[0][0]
        act(() => { confirmCall.onConfirm() })

        expect(defaultParams.onDeleteFile).toHaveBeenCalledWith('/workspace/file.lua')
        expect(defaultParams.closeConfirmDialog).toHaveBeenCalled()
      })

      it('calls onDeleteFolder for folder when confirmed', () => {
        const params = {
          ...defaultParams,
          contextMenu: { ...defaultContextMenu, targetType: 'folder' as const },
        }
        const { result } = renderHook(() => useContextMenuActions(params))

        act(() => { result.current.handleContextMenuSelect('delete') })

        const confirmCall = defaultParams.openConfirmDialog.mock.calls[0][0]
        act(() => { confirmCall.onConfirm() })

        expect(defaultParams.onDeleteFolder).toHaveBeenCalledWith('/workspace/file.lua')
        expect(defaultParams.closeConfirmDialog).toHaveBeenCalled()
      })
    })
  })

  describe('handleDeleteKey', () => {
    it('opens confirm dialog for file deletion', () => {
      defaultParams.findNodeType.mockReturnValue('file')
      const { result } = renderHook(() => useContextMenuActions(defaultParams))

      act(() => { result.current.handleDeleteKey('/workspace/file.lua') })

      expect(defaultParams.openConfirmDialog).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Delete File',
          variant: 'danger',
        })
      )
    })

    it('opens confirm dialog for folder deletion', () => {
      defaultParams.findNodeType.mockReturnValue('folder')
      const { result } = renderHook(() => useContextMenuActions(defaultParams))

      act(() => { result.current.handleDeleteKey('/workspace/src') })

      expect(defaultParams.openConfirmDialog).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Delete Folder',
          variant: 'danger',
        })
      )
    })

    it('does nothing when node type is null', () => {
      defaultParams.findNodeType.mockReturnValue(null)
      const { result } = renderHook(() => useContextMenuActions(defaultParams))

      act(() => { result.current.handleDeleteKey('/nonexistent') })

      expect(defaultParams.openConfirmDialog).not.toHaveBeenCalled()
    })

    it('calls onDeleteFile when file deletion is confirmed', () => {
      defaultParams.findNodeType.mockReturnValue('file')
      const { result } = renderHook(() => useContextMenuActions(defaultParams))

      act(() => { result.current.handleDeleteKey('/workspace/file.lua') })

      const confirmCall = defaultParams.openConfirmDialog.mock.calls[0][0]
      act(() => { confirmCall.onConfirm() })

      expect(defaultParams.onDeleteFile).toHaveBeenCalledWith('/workspace/file.lua')
      expect(defaultParams.closeConfirmDialog).toHaveBeenCalled()
    })

    it('calls onDeleteFolder when folder deletion is confirmed', () => {
      defaultParams.findNodeType.mockReturnValue('folder')
      const { result } = renderHook(() => useContextMenuActions(defaultParams))

      act(() => { result.current.handleDeleteKey('/workspace/src') })

      const confirmCall = defaultParams.openConfirmDialog.mock.calls[0][0]
      act(() => { confirmCall.onConfirm() })

      expect(defaultParams.onDeleteFolder).toHaveBeenCalledWith('/workspace/src')
      expect(defaultParams.closeConfirmDialog).toHaveBeenCalled()
    })
  })
})
