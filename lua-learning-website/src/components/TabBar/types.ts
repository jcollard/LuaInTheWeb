/**
 * Type of tab - file for code editor, canvas for game canvas, markdown for markdown preview
 */
export type TabType = 'file' | 'canvas' | 'markdown'

export interface TabInfo {
  path: string
  name: string
  isDirty: boolean
  type: TabType
  isPreview: boolean
}

export interface TabBarProps {
  tabs: TabInfo[]
  activeTab: string | null
  onSelect: (path: string) => void
  onClose: (path: string) => void
  className?: string
}

export interface UseTabBarReturn {
  tabs: TabInfo[]
  activeTab: string | null
  openTab: (path: string, name: string, type?: TabType) => void
  openPreviewTab: (path: string, name: string) => void
  openCanvasTab: (id: string, name?: string) => void
  openMarkdownPreviewTab: (path: string, name: string) => void
  closeTab: (path: string) => void
  selectTab: (path: string) => void
  setDirty: (path: string, isDirty: boolean) => void
  renameTab: (oldPath: string, newPath: string, newName: string) => void
  getActiveTabType: () => TabType | null
  makeTabPermanent: (path: string) => void
  convertToFileTab: (path: string) => void
}
