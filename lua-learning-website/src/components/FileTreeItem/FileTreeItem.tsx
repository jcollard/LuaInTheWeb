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
  <svg className={`${styles.iconSvg} ${styles.fileIcon}`} viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" data-testid="file-icon">
    <path d="M13.71 4.29l-3-3A1 1 0 0010 1H4a1 1 0 00-1 1v12a1 1 0 001 1h8a1 1 0 001-1V5a1 1 0 00-.29-.71zM12 14H4V2h5v3a1 1 0 001 1h2v8z" />
  </svg>
)

const FolderIcon = () => (
  <svg className={`${styles.iconSvg} ${styles.folderIcon}`} viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" data-testid="folder-icon">
    <path d="M14 4H8l-1-1H2a1 1 0 00-1 1v10a1 1 0 001 1h12a1 1 0 001-1V5a1 1 0 00-1-1z" />
  </svg>
)

// Virtual workspace icon - cloud (browser storage)
const VirtualWorkspaceIcon = () => (
  <svg className={styles.iconSvg} viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" data-testid="virtual-workspace-icon">
    {/* Cloud shape - white/light gray */}
    <path d="M13.5 9.5c1.38 0 2.5 1.12 2.5 2.5s-1.12 2.5-2.5 2.5H4c-1.66 0-3-1.34-3-3 0-1.54 1.16-2.8 2.65-2.97A4.5 4.5 0 018 4c2.05 0 3.78 1.38 4.32 3.26.38-.17.79-.26 1.18-.26z" fill="#b0b0b0" />
  </svg>
)

// Local workspace icon - hard drive/computer (local filesystem)
const LocalWorkspaceIcon = () => (
  <svg className={styles.iconSvg} viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" data-testid="local-workspace-icon">
    {/* Hard drive shape - silver/gray */}
    <rect x="1" y="3" width="14" height="10" rx="1.5" fill="#8a8a8a" />
    <line x1="1" y1="10" x2="15" y2="10" stroke="#5a5a5a" strokeWidth="1" />
    <circle cx="12.5" cy="12" r="1" fill="#4a4a4a" />
    <rect x="3" y="11" width="5" height="1" rx="0.5" fill="#5a5a5a" />
  </svg>
)

// Disconnected workspace icon - hard drive with warning
const DisconnectedWorkspaceIcon = () => (
  <svg className={styles.iconSvg} viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" data-testid="disconnected-workspace-icon">
    {/* Hard drive shape (dimmed) */}
    <rect x="1" y="3" width="14" height="10" rx="1.5" fill="#8a8a8a" opacity="0.5" />
    <line x1="1" y1="10" x2="15" y2="10" stroke="#5a5a5a" strokeWidth="1" opacity="0.5" />
    {/* Warning/disconnect indicator */}
    <circle cx="12" cy="8" r="3.5" fill="#f14c4c" />
    <path d="M10.5 6.5l3 3M13.5 6.5l-3 3" stroke="#1e1e1e" strokeWidth="1.2" strokeLinecap="round" />
  </svg>
)

// Library workspace icon - open book (read-only libraries)
const LibraryWorkspaceIcon = () => (
  <svg className={styles.iconSvg} viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" data-testid="library-workspace-icon">
    {/* Open book shape */}
    <path d="M8 3c-1.5-1-3.5-1.5-5.5-1.5-.5 0-1 0-1.5.1v10.8c.5-.1 1-.1 1.5-.1 2 0 4 .5 5.5 1.5 1.5-1 3.5-1.5 5.5-1.5.5 0 1 0 1.5.1V1.6c-.5-.1-1-.1-1.5-.1-2 0-4 .5-5.5 1.5z" fill="#6b9bd1" stroke="#4a7ab0" strokeWidth="0.5" />
    {/* Center binding */}
    <path d="M8 3v10.8" stroke="#4a7ab0" strokeWidth="0.8" />
    {/* Page lines on left */}
    <path d="M3 5h3M3 7h3M3 9h3" stroke="#4a7ab0" strokeWidth="0.5" opacity="0.6" />
    {/* Page lines on right */}
    <path d="M10 5h3M10 7h3M10 9h3" stroke="#4a7ab0" strokeWidth="0.5" opacity="0.6" />
  </svg>
)

// Docs workspace icon - document with question mark (API documentation)
const DocsWorkspaceIcon = () => (
  <svg className={styles.iconSvg} viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" data-testid="docs-workspace-icon">
    {/* Document shape */}
    <path d="M3 1.5A1.5 1.5 0 014.5 0h5.793a1 1 0 01.707.293l2.707 2.707a1 1 0 01.293.707V14.5a1.5 1.5 0 01-1.5 1.5h-8A1.5 1.5 0 013 14.5v-13z" fill="#7cc47c" stroke="#5a9c5a" strokeWidth="0.5" />
    {/* Question mark for docs/help */}
    <text x="8" y="11" fontSize="8" fill="#3a6c3a" textAnchor="middle" fontWeight="bold">?</text>
  </svg>
)

export function FileTreeItem({
  name,
  path,
  type,
  isWorkspace,
  isLocalWorkspace,
  isDisconnected,
  isLibraryWorkspace,
  isDocsWorkspace,
  isReadOnly,
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
  onReconnect,
}: FileTreeItemProps) {
  // Mark isReadOnly as used (will be used for save blocking in IDEContext)
  void isReadOnly
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
    // If this is a disconnected workspace, trigger reconnection instead of normal click
    if (isWorkspace && isDisconnected && onReconnect) {
      onReconnect(path)
      return
    }
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
      <span className={styles.icon}>
        {isFolder ? (
          isWorkspace ? (
            isDisconnected ? (
              <DisconnectedWorkspaceIcon />
            ) : isLibraryWorkspace ? (
              <LibraryWorkspaceIcon />
            ) : isDocsWorkspace ? (
              <DocsWorkspaceIcon />
            ) : isLocalWorkspace ? (
              <LocalWorkspaceIcon />
            ) : (
              <VirtualWorkspaceIcon />
            )
          ) : (
            <FolderIcon />
          )
        ) : (
          <FileIcon />
        )}
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
