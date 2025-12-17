import type { TreeNode } from '../../hooks/useFileSystem'

/**
 * Find the type of a node at a given path in the tree.
 */
export function findNodeType(
  tree: TreeNode[],
  path: string
): 'file' | 'folder' | null {
  const search = (nodes: TreeNode[]): 'file' | 'folder' | null => {
    for (const node of nodes) {
      if (node.path === path) return node.type
      if (node.children) {
        const found = search(node.children)
        if (found) return found
      }
    }
    return null
  }
  return search(tree)
}

/**
 * Check if a path is a workspace root (top-level folder with isWorkspace flag).
 */
export function isWorkspaceRoot(tree: TreeNode[], path: string): boolean {
  for (const node of tree) {
    if (node.path === path && node.isWorkspace) {
      return true
    }
  }
  return false
}

/**
 * Check if a path is a library workspace root (read-only, built-in libraries).
 */
export function isLibraryWorkspace(tree: TreeNode[], path: string): boolean {
  for (const node of tree) {
    if (node.path === path && node.isLibraryWorkspace) {
      return true
    }
  }
  return false
}

/**
 * Check if a path is a docs workspace root (read-only, API documentation).
 */
export function isDocsWorkspace(tree: TreeNode[], path: string): boolean {
  for (const node of tree) {
    if (node.path === path && node.isDocsWorkspace) {
      return true
    }
  }
  return false
}

/**
 * Check if a path is a book workspace root (read-only, learning content).
 */
export function isBookWorkspace(tree: TreeNode[], path: string): boolean {
  for (const node of tree) {
    if (node.path === path && node.isBookWorkspace) {
      return true
    }
  }
  return false
}

/**
 * Check if a path is an examples workspace root (read-only, example Lua programs).
 */
export function isExamplesWorkspace(tree: TreeNode[], path: string): boolean {
  for (const node of tree) {
    if (node.path === path && node.isExamplesWorkspace) {
      return true
    }
  }
  return false
}

/**
 * Find the name of a node at a given path in the tree.
 */
export function findNodeName(tree: TreeNode[], path: string): string {
  const search = (nodes: TreeNode[]): string | null => {
    for (const node of nodes) {
      if (node.path === path) return node.name
      if (node.children) {
        const found = search(node.children)
        if (found) return found
      }
    }
    return null
  }
  return search(tree) || path.split('/').pop() || path
}

/**
 * Check if a path exists in the tree.
 */
export function pathExists(tree: TreeNode[], path: string): boolean {
  const search = (nodes: TreeNode[]): boolean => {
    for (const node of nodes) {
      if (node.path === path) return true
      if (node.children && search(node.children)) return true
    }
    return false
  }
  return search(tree)
}

/**
 * Get the workspace (root folder) for a given path.
 * Returns null if the path is not within a workspace.
 */
export function getWorkspaceForPath(
  tree: TreeNode[],
  path: string
): string | null {
  // Extract the first path segment (workspace mount point)
  const parts = path.split('/').filter(Boolean)
  if (parts.length === 0) return null
  const workspacePath = `/${parts[0]}`
  // Verify it's actually a workspace in the tree
  for (const node of tree) {
    if (node.path === workspacePath && node.isWorkspace) {
      return workspacePath
    }
  }
  return null
}
