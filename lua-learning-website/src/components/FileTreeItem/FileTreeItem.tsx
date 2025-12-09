import { useState, useEffect, useRef, type MouseEvent, type KeyboardEvent, type DragEvent } from 'react'
import styles from './FileTreeItem.module.css'
import type { FileTreeItemProps } from './types'

const INDENT_SIZE = 16

// SVG icons
const ChevronIcon = () => (
  <svg className={styles.chevronIcon} viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" fill="none" />
  </svg>
)

const FileIcon = () => (
  <svg className={`${styles.iconSvg} ${styles.fileIcon}`} viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    <path d="M13.71 4.29l-3-3A1 1 0 0010 1H4a1 1 0 00-1 1v12a1 1 0 001 1h8a1 1 0 001-1V5a1 1 0 00-.29-.71zM12 14H4V2h5v3a1 1 0 001 1h2v8z" />
  </svg>
)

const FolderIcon = () => (
  <svg className={`${styles.iconSvg} ${styles.folderIcon}`} viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 4H8l-1-1H2a1 1 0 00-1 1v10a1 1 0 001 1h12a1 1 0 001-1V5a1 1 0 00-1-1z" />
  </svg>
)

export function FileTreeItem({
  name,
  path,
  type,
  isSelected,
  isExpanded,
  isRenaming,
  depth = 0,
  onClick,
  onToggle,
  onContextMenu,
  onRenameSubmit,
  onRenameCancel,
  onDragStart,
  onDrop,
}: FileTreeItemProps) {
  const [renameValue, setRenameValue] = useState(name)
  const [isDragOver, setIsDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  // Focus input when entering rename mode
  useEffect(() => {
    if (isRenaming && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isRenaming])

  // Reset rename value when name changes or exiting rename mode
  useEffect(() => {
    setRenameValue(name)
  }, [name, isRenaming])

  const handleClick = (event: MouseEvent) => {
    event.stopPropagation()
    onClick(path)
  }

  const handleChevronClick = (event: MouseEvent) => {
    event.stopPropagation()
    onToggle?.(path)
  }

  const handleContextMenu = (event: MouseEvent) => {
    event.preventDefault()
    event.stopPropagation()
    onContextMenu?.(path, event)
  }

  const handleRenameKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    // Stop all keyboard events from propagating to parent components
    // This ensures arrow keys, Home, End, etc. work in the input field
    // instead of triggering file tree navigation
    event.stopPropagation()

    if (event.key === 'Enter') {
      event.preventDefault()
      onRenameSubmit?.(path, renameValue)
    } else if (event.key === 'Escape') {
      event.preventDefault()
      onRenameCancel?.()
    }
  }

  const handleRenameBlur = () => {
    onRenameSubmit?.(path, renameValue)
  }

  // Drag and drop handlers
  const handleDragStart = (event: DragEvent) => {
    event.dataTransfer.setData('text/plain', path)
    event.dataTransfer.effectAllowed = 'move'
    onDragStart?.(path)
  }

  const handleDragOver = (event: DragEvent) => {
    if (!isFolder) return
    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setIsDragOver(true)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const handleDrop = (event: DragEvent) => {
    event.preventDefault()
    setIsDragOver(false)

    if (!isFolder) return

    const sourcePath = event.dataTransfer.getData('text/plain')

    // Don't drop on itself
    if (sourcePath === path) return

    onDrop?.(sourcePath, path)
  }

  const isFolder = type === 'folder'
  const indentStyle = { paddingLeft: `${depth * INDENT_SIZE}px` }

  const classNames = [
    styles.treeItem,
    isSelected && styles.selected,
    isDragOver && styles.dragOver,
  ].filter(Boolean).join(' ')

  return (
    <div
      role="treeitem"
      aria-label={name}
      aria-selected={isSelected}
      aria-expanded={isFolder ? isExpanded : undefined}
      className={classNames}
      style={indentStyle}
      onClick={handleClick}
      onContextMenu={handleContextMenu}
      draggable
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Chevron for folders */}
      {isFolder ? (
        <span
          data-testid="folder-chevron"
          className={`${styles.chevron} ${isExpanded ? styles.expanded : ''}`}
          onClick={handleChevronClick}
        >
          <ChevronIcon />
        </span>
      ) : (
        <span className={styles.chevron} /> // Spacer for alignment
      )}

      {/* Icon */}
      <span className={styles.icon} data-testid={isFolder ? 'folder-icon' : 'file-icon'}>
        {isFolder ? <FolderIcon /> : <FileIcon />}
      </span>

      {/* Name or rename input */}
      {isRenaming ? (
        <input
          ref={inputRef}
          type="text"
          className={styles.renameInput}
          value={renameValue}
          onChange={(e) => setRenameValue(e.target.value)}
          onKeyDown={handleRenameKeyDown}
          onBlur={handleRenameBlur}
          onClick={(e) => e.stopPropagation()}
        />
      ) : (
        <span className={styles.name}>{name}</span>
      )}
    </div>
  )
}
