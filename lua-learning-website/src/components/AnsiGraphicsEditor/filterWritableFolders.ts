import type { TreeNode } from '../../hooks/fileSystemTypes'

function isReadOnlyNode(node: TreeNode): boolean {
  return !!(node.isReadOnly || node.isLibraryWorkspace || node.isDocsWorkspace || node.isBookWorkspace || node.isExamplesWorkspace)
}

/** Filter tree to only writable folders (no read-only workspaces, no files). */
export function filterWritableFolders(tree: TreeNode[]): TreeNode[] {
  const result: TreeNode[] = []
  for (const node of tree) {
    if (node.type === 'file' || isReadOnlyNode(node)) continue
    const filtered: TreeNode = { ...node }
    if (node.children) {
      filtered.children = filterWritableFolders(node.children)
    }
    result.push(filtered)
  }
  return result
}
