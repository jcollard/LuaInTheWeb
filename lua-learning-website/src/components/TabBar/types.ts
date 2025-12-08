export interface TabInfo {
  path: string
  name: string
  isDirty: boolean
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
  openTab: (path: string, name: string) => void
  closeTab: (path: string) => void
  selectTab: (path: string) => void
  setDirty: (path: string, isDirty: boolean) => void
  renameTab: (oldPath: string, newPath: string, newName: string) => void
}
