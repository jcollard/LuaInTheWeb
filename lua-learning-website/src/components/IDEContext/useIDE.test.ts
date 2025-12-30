import { renderHook } from '@testing-library/react'
import React from 'react'
import { vi } from 'vitest'
import { useIDE } from './useIDE'
import { IDEContext } from './context'
import type { IDEContextValue } from './types'

describe('useIDE', () => {
  describe('error handling', () => {
    it('should throw error when used outside of IDEContextProvider', () => {
      // Arrange
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      // Act & Assert
      expect(() => {
        renderHook(() => useIDE())
      }).toThrow('useIDE must be used within an IDEContextProvider')

      consoleSpy.mockRestore()
    })

    it('should throw error with descriptive message', () => {
      // Arrange
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

      // Act & Assert
      try {
        renderHook(() => useIDE())
      } catch (error) {
        expect(error).toBeInstanceOf(Error)
        expect((error as Error).message).toContain('IDEContextProvider')
      }

      consoleSpy.mockRestore()
    })
  })

  describe('context access', () => {
    it('should return context value when used within provider', () => {
      // Arrange
      const mockContextValue: IDEContextValue = {
        engine: { isReady: true, execute: vi.fn(), reset: vi.fn() },
        code: 'test code',
        setCode: vi.fn(),
        fileName: 'test.lua',
        isDirty: false,
        activePanel: 'explorer',
        setActivePanel: vi.fn(),
        terminalVisible: true,
        toggleTerminal: vi.fn(),
        sidebarVisible: true,
        toggleSidebar: vi.fn(),
        fileTree: [],
        refreshFileTree: vi.fn(),
        handleShellFileMove: vi.fn(),
        createFile: vi.fn(),
        createFolder: vi.fn(),
        deleteFile: vi.fn(),
        deleteFolder: vi.fn(),
        renameFile: vi.fn(),
        renameFolder: vi.fn(),
        moveFile: vi.fn(),
        copyFile: vi.fn(),
        openFile: vi.fn(),
        openPreviewFile: vi.fn(),
        openMarkdownPreview: vi.fn(),
        openBinaryViewer: vi.fn(),
        saveFile: vi.fn(),
        tabs: [],
        activeTab: null,
        activeTabType: null,
        selectTab: vi.fn(),
        closeTab: vi.fn(),
        openCanvasTab: vi.fn(),
        makeTabPermanent: vi.fn(),
        pinTab: vi.fn(),
        unpinTab: vi.fn(),
        reorderTab: vi.fn(),
        closeToRight: vi.fn(),
        closeOthers: vi.fn(),
        toasts: [],
        showError: vi.fn(),
        dismissToast: vi.fn(),
        pendingNewFilePath: null,
        generateUniqueFileName: vi.fn(),
        createFileWithRename: vi.fn(),
        clearPendingNewFile: vi.fn(),
        pendingNewFolderPath: null,
        generateUniqueFolderName: vi.fn(),
        createFolderWithRename: vi.fn(),
        clearPendingNewFolder: vi.fn(),
        recentFiles: [],
        clearRecentFiles: vi.fn(),
        fileSystem: {
          createFile: vi.fn(),
          readFile: vi.fn(),
          writeFile: vi.fn(),
          deleteFile: vi.fn(),
          renameFile: vi.fn(),
          moveFile: vi.fn(),
          copyFile: vi.fn(),
          writeBinaryFile: vi.fn(),
          createFolder: vi.fn(),
          deleteFolder: vi.fn(),
          renameFolder: vi.fn(),
          exists: vi.fn(),
          isDirectory: vi.fn(),
          listDirectory: vi.fn(),
          getTree: vi.fn(),
          flush: vi.fn(),
          version: 0,
        },
        autoSaveEnabled: false,
        toggleAutoSave: vi.fn(),
        saveAllFiles: vi.fn(),
        uploadFiles: vi.fn(),
        uploadFolder: vi.fn(),
      }

      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(IDEContext.Provider, { value: mockContextValue }, children)

      // Act
      const { result } = renderHook(() => useIDE(), { wrapper })

      // Assert
      expect(result.current).toBe(mockContextValue)
    })

    it('should return all expected properties from context', () => {
      // Arrange
      const mockContextValue: IDEContextValue = {
        engine: { isReady: false, execute: vi.fn(), reset: vi.fn() },
        code: '',
        setCode: vi.fn(),
        fileName: null,
        isDirty: false,
        activePanel: 'explorer',
        setActivePanel: vi.fn(),
        terminalVisible: true,
        toggleTerminal: vi.fn(),
        sidebarVisible: true,
        toggleSidebar: vi.fn(),
        fileTree: [],
        refreshFileTree: vi.fn(),
        handleShellFileMove: vi.fn(),
        createFile: vi.fn(),
        createFolder: vi.fn(),
        deleteFile: vi.fn(),
        deleteFolder: vi.fn(),
        renameFile: vi.fn(),
        renameFolder: vi.fn(),
        moveFile: vi.fn(),
        copyFile: vi.fn(),
        openFile: vi.fn(),
        openPreviewFile: vi.fn(),
        openMarkdownPreview: vi.fn(),
        openBinaryViewer: vi.fn(),
        saveFile: vi.fn(),
        tabs: [],
        activeTab: null,
        activeTabType: null,
        selectTab: vi.fn(),
        closeTab: vi.fn(),
        openCanvasTab: vi.fn(),
        makeTabPermanent: vi.fn(),
        pinTab: vi.fn(),
        unpinTab: vi.fn(),
        reorderTab: vi.fn(),
        closeToRight: vi.fn(),
        closeOthers: vi.fn(),
        toasts: [],
        showError: vi.fn(),
        dismissToast: vi.fn(),
        pendingNewFilePath: null,
        generateUniqueFileName: vi.fn(),
        createFileWithRename: vi.fn(),
        clearPendingNewFile: vi.fn(),
        pendingNewFolderPath: null,
        generateUniqueFolderName: vi.fn(),
        createFolderWithRename: vi.fn(),
        clearPendingNewFolder: vi.fn(),
        recentFiles: [],
        clearRecentFiles: vi.fn(),
        fileSystem: {
          createFile: vi.fn(),
          readFile: vi.fn(),
          writeFile: vi.fn(),
          deleteFile: vi.fn(),
          renameFile: vi.fn(),
          moveFile: vi.fn(),
          copyFile: vi.fn(),
          writeBinaryFile: vi.fn(),
          createFolder: vi.fn(),
          deleteFolder: vi.fn(),
          renameFolder: vi.fn(),
          exists: vi.fn(),
          isDirectory: vi.fn(),
          listDirectory: vi.fn(),
          getTree: vi.fn(),
          flush: vi.fn(),
          version: 0,
        },
        autoSaveEnabled: false,
        toggleAutoSave: vi.fn(),
        saveAllFiles: vi.fn(),
        uploadFiles: vi.fn(),
        uploadFolder: vi.fn(),
      }

      const wrapper = ({ children }: { children: React.ReactNode }) =>
        React.createElement(IDEContext.Provider, { value: mockContextValue }, children)

      // Act
      const { result } = renderHook(() => useIDE(), { wrapper })

      // Assert - verify all key properties are accessible
      expect(result.current.engine).toBeDefined()
      expect(result.current.code).toBeDefined()
      expect(result.current.setCode).toBeInstanceOf(Function)
      expect(result.current.fileTree).toBeInstanceOf(Array)
      expect(result.current.tabs).toBeInstanceOf(Array)
    })
  })
})
