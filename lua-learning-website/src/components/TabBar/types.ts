/**
 * Type of tab - file for code editor, canvas for game canvas, markdown for markdown preview, binary for binary file viewer
 */
export type TabType = 'file' | 'canvas' | 'markdown' | 'binary' | 'ansi' | 'ansi-editor'

export interface TabInfo {
  path: string
  name: string
  isDirty: boolean
  type: TabType
  isPreview: boolean
  isPinned: boolean
}

export interface TabBarProps {
  tabs: TabInfo[]
  activeTab: string | null
  onSelect: (path: string) => void
  onClose: (path: string) => void
  onReorder?: (path: string, newIndex: number) => void
  onPinTab?: (path: string) => void
  onUnpinTab?: (path: string) => void
  onCloseToRight?: (path: string) => void
  onCloseOthers?: (path: string) => void
  className?: string
}

export interface UseTabBarReturn {
  tabs: TabInfo[]
  activeTab: string | null
  openTab: (path: string, name: string, type?: TabType) => void
  openPreviewTab: (path: string, name: string) => void
  openCanvasTab: (id: string, name?: string) => void
  openAnsiTab: (id: string, name?: string) => void
  openAnsiEditorTab: () => void
  openMarkdownPreviewTab: (path: string, name: string) => void
  openBinaryPreviewTab: (path: string, name: string) => void
  closeTab: (path: string) => void
  selectTab: (path: string) => void
  setDirty: (path: string, isDirty: boolean) => void
  renameTab: (oldPath: string, newPath: string, newName: string) => void
  getActiveTabType: () => TabType | null
  makeTabPermanent: (path: string) => void
  convertToFileTab: (path: string) => void
  convertToMarkdownTab: (path: string) => void
  pinTab: (path: string) => void
  unpinTab: (path: string) => void
  reorderTab: (path: string, newIndex: number) => void
  closeToRight: (path: string) => void
  closeOthers: (path: string) => void
}
