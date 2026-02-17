import { useState, useCallback, useMemo } from 'react'
import type { TreeNode } from '../../hooks/fileSystemTypes'
import { filterWritableFolders } from './filterWritableFolders'
import styles from './SaveAsDialog.module.css'

export interface DirectoryPickerProps {
  tree: TreeNode[]
  selectedPath: string
  onSelect: (path: string) => void
}

const ChevronIcon = () => (
  <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" width="16" height="16">
    <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" fill="none" />
  </svg>
)

const FolderIcon = () => (
  <svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg" width="16" height="16">
    <path d="M14 4H8l-1-1H2a1 1 0 00-1 1v10a1 1 0 001 1h12a1 1 0 001-1V5a1 1 0 00-1-1z" fill="currentColor" opacity="0.7" />
  </svg>
)

interface DirectoryNodeProps {
  node: TreeNode
  depth: number
  selectedPath: string
  expandedPaths: Set<string>
  onSelect: (path: string) => void
  onToggle: (path: string) => void
}

function DirectoryNode({ node, depth, selectedPath, expandedPaths, onSelect, onToggle }: DirectoryNodeProps) {
  const isExpanded = expandedPaths.has(node.path)
  const isSelected = selectedPath === node.path
  const hasChildren = node.children && node.children.length > 0

  const handleClick = useCallback(() => {
    onSelect(node.path)
  }, [node.path, onSelect])

  const handleChevronClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation()
    onToggle(node.path)
  }, [node.path, onToggle])

  const className = [
    styles.directoryItem,
    isSelected && styles.directoryItemSelected,
  ].filter(Boolean).join(' ')

  return (
    <>
      <div
        className={className}
        style={{ paddingLeft: `${8 + depth * 16}px` }}
        onClick={handleClick}
        data-testid={`directory-item-${node.path}`}
      >
        <span
          className={`${styles.directoryChevron} ${isExpanded ? styles.directoryChevronExpanded : ''}`}
          onClick={hasChildren ? handleChevronClick : undefined}
          style={{ visibility: hasChildren ? 'visible' : 'hidden' }}
        >
          <ChevronIcon />
        </span>
        <span className={styles.directoryIcon}>
          <FolderIcon />
        </span>
        <span className={styles.directoryName}>{node.name}</span>
      </div>
      {isExpanded && node.children?.map(child => (
        <DirectoryNode
          key={child.path}
          node={child}
          depth={depth + 1}
          selectedPath={selectedPath}
          expandedPaths={expandedPaths}
          onSelect={onSelect}
          onToggle={onToggle}
        />
      ))}
    </>
  )
}

export function DirectoryPicker({ tree, selectedPath, onSelect }: DirectoryPickerProps) {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(() => new Set())

  const filteredTree = useMemo(() => filterWritableFolders(tree), [tree])

  const handleToggle = useCallback((path: string) => {
    setExpandedPaths(prev => {
      const next = new Set(prev)
      if (next.has(path)) {
        next.delete(path)
      } else {
        next.add(path)
      }
      return next
    })
  }, [])

  const isRootSelected = selectedPath === '/'

  return (
    <div className={styles.directoryPicker} data-testid="directory-picker" role="tree">
      <div
        className={`${styles.directoryItem} ${isRootSelected ? styles.directoryItemSelected : ''}`}
        onClick={() => onSelect('/')}
        data-testid="directory-item-/"
      >
        <span className={styles.directoryChevron} style={{ visibility: 'hidden' }}>
          <ChevronIcon />
        </span>
        <span className={styles.directoryIcon}>
          <FolderIcon />
        </span>
        <span className={styles.directoryName}>/ (root)</span>
      </div>
      {filteredTree.map(node => (
        <DirectoryNode
          key={node.path}
          node={node}
          depth={0}
          selectedPath={selectedPath}
          expandedPaths={expandedPaths}
          onSelect={onSelect}
          onToggle={handleToggle}
        />
      ))}
    </div>
  )
}
