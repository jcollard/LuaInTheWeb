export interface ContextMenuItem {
  id: string
  label?: string
  type?: 'divider'
  disabled?: boolean
}

export interface ContextMenuProps {
  isOpen: boolean
  position: { x: number; y: number }
  items: ContextMenuItem[]
  onSelect: (id: string) => void
  onClose: () => void
}

export interface UseContextMenuReturn {
  isOpen: boolean
  position: { x: number; y: number }
  show: (x: number, y: number) => void
  hide: () => void
}
