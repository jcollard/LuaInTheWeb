import React, { useCallback, useMemo, type KeyboardEvent, type MouseEvent } from 'react'
import { FileTreeItem } from '../FileTreeItem'
import type { TreeNode } from '../../hooks/useFileSystem'
import type { FileTreeProps } from './types'
import styles from './FileTree.module.css'

export function FileTree({
  tree,
  selectedPath,
  expandedPaths,
  onSelect,
  onDoubleClick,
  onToggle,
  onContextMenu,
  onRename,
  onDelete,
  renamingPath,
  onRenameSubmit,
  onRenameCancel,
  onDrop,
  onReconnect,
}: FileTreeProps) {
  // Separate regular workspaces from read-only workspaces (libs, docs)
  const { regularNodes, readOnlyNodes } = useMemo(() => {
    const regular: TreeNode[] = []
    const readOnly: TreeNode[] = []

    for (const node of tree) {
      if (node.isLibraryWorkspace || node.isDocsWorkspace) {
        readOnly.push(node)
      } else {
        regular.push(node)
      }
    }

    return { regularNodes: regular, readOnlyNodes: readOnly }
  }, [tree])

  // Flatten tree to get ordered list of visible paths for keyboard navigation
  // Uses regularNodes then readOnlyNodes to match render order
  const visiblePaths = useMemo(() => {
    const paths: string[] = []

    const collectPaths = (nodes: TreeNode[]) => {
      for (const node of nodes) {
        paths.push(node.path)
        if (node.type === 'folder' && node.children && expandedPaths.has(node.path)) {
          collectPaths(node.children)
        }
      }
    }

    collectPaths(regularNodes)
    collectPaths(readOnlyNodes)
    return paths
  }, [regularNodes, readOnlyNodes, expandedPaths])

  // Find selected node type for keyboard handling
  const selectedNode = useMemo(() => {
    const findNode = (nodes: TreeNode[]): TreeNode | null => {
      for (const node of nodes) {
        if (node.path === selectedPath) return node
        if (node.children) {
          const found = findNode(node.children)
          if (found) return found
        }
      }
      return null
    }
    return selectedPath ? findNode(tree) : null
  }, [tree, selectedPath])

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!selectedPath) {
        // If nothing selected, select first item on any nav key
        if (visiblePaths.length > 0 && ['ArrowDown', 'ArrowUp', 'Enter'].includes(event.key)) {
          onSelect(visiblePaths[0])
          event.preventDefault()
        }
        return
      }

      const currentIndex = visiblePaths.indexOf(selectedPath)
      if (currentIndex === -1) return

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault()
          if (currentIndex < visiblePaths.length - 1) {
            onSelect(visiblePaths[currentIndex + 1])
          }
          break
        case 'ArrowUp':
          event.preventDefault()
          if (currentIndex > 0) {
            onSelect(visiblePaths[currentIndex - 1])
          }
          break
        case 'Enter':
          event.preventDefault()
          if (selectedNode?.type === 'folder') {
            onToggle(selectedPath)
          } else {
            onSelect(selectedPath)
          }
          break
        case 'ArrowRight':
          event.preventDefault()
          if (selectedNode?.type === 'folder' && !expandedPaths.has(selectedPath)) {
            onToggle(selectedPath)
          }
          break
        case 'ArrowLeft':
          event.preventDefault()
          if (selectedNode?.type === 'folder' && expandedPaths.has(selectedPath)) {
            onToggle(selectedPath)
          }
          break
        case 'F2':
          event.preventDefault()
          onRename?.(selectedPath)
          break
        case 'Delete':
          event.preventDefault()
          onDelete?.(selectedPath)
          break
      }
    },
    [selectedPath, selectedNode, visiblePaths, expandedPaths, onSelect, onToggle, onRename, onDelete]
  )

  // Stryker disable all: Simple callback wrappers with deps optimization
  const handleItemClick = useCallback(
    (path: string) => {
      onSelect(path)
    },
    [onSelect]
  )

  const handleItemDoubleClick = useCallback(
    (path: string) => {
      onDoubleClick?.(path)
    },
    [onDoubleClick]
  )

  const handleItemToggle = useCallback(
    (path: string) => {
      onToggle(path)
    },
    [onToggle]
  )

  const handleItemContextMenu = useCallback(
    (path: string, event: MouseEvent) => {
      onContextMenu?.(path, event)
    },
    [onContextMenu]
  )
  // Stryker restore all

  const renderNode = (node: TreeNode, depth: number): React.ReactNode => {
    const isFolder = node.type === 'folder'
    const isExpanded = expandedPaths.has(node.path)
    const isSelected = selectedPath === node.path
    const isRenaming = renamingPath === node.path

    return (
      <div key={node.path}>
        <FileTreeItem
          name={node.name}
          path={node.path}
          type={node.type}
          isWorkspace={node.isWorkspace}
          isLocalWorkspace={node.isLocalWorkspace}
          isDisconnected={node.isDisconnected}
          isLibraryWorkspace={node.isLibraryWorkspace}
          isDocsWorkspace={node.isDocsWorkspace}
          isReadOnly={node.isReadOnly}
          isSelected={isSelected}
          isExpanded={isExpanded}
          isRenaming={isRenaming}
          depth={depth}
          onClick={handleItemClick}
          onDoubleClick={handleItemDoubleClick}
          onToggle={handleItemToggle}
          onContextMenu={handleItemContextMenu}
          onRenameSubmit={onRenameSubmit}
          onRenameCancel={onRenameCancel}
          onDrop={onDrop}
          onReconnect={onReconnect}
        />
        {isFolder && isExpanded && node.children && (
          <div role="group">
            {/* Stryker disable next-line ArithmeticOperator: depth only affects visual indentation */}
            {node.children.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  if (tree.length === 0) {
    return (
      <div
        role="tree"
        aria-label="File Explorer"
        className={styles.tree}
      >
        <div className={styles.emptyState}>
          <span className={styles.emptyText}>No files</span>
        </div>
      </div>
    )
  }

  return (
    <div
      role="tree"
      aria-label="File Explorer"
      className={styles.tree}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {regularNodes.map((node) => renderNode(node, 0))}
      {readOnlyNodes.length > 0 && regularNodes.length > 0 && (
        <div className={styles.divider} data-testid="read-only-divider" role="separator" aria-hidden="true" />
      )}
      {readOnlyNodes.map((node) => renderNode(node, 0))}
    </div>
  )
}
