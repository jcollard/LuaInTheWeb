import { useMemo } from 'react'
import type { TreeNode } from '../../hooks/useFileSystem'
import {
  findNodeType as findNodeTypeUtil,
  findNodeName as findNodeNameUtil,
  pathExists as pathExistsUtil,
  isWorkspaceRoot as isWorkspaceRootUtil,
  isLibraryWorkspace as isLibraryWorkspaceUtil,
  isDocsWorkspace as isDocsWorkspaceUtil,
  isBookWorkspace as isBookWorkspaceUtil,
  isExamplesWorkspace as isExamplesWorkspaceUtil,
  isProjectsWorkspace as isProjectsWorkspaceUtil,
  isProjectSubfolder as isProjectSubfolderUtil,
  getWorkspaceForPath as getWorkspaceForPathUtil,
  isInReadOnlyWorkspace as isInReadOnlyWorkspaceUtil,
} from './treeUtils'

export interface UseTreeUtilitiesReturn {
  findNodeType: (path: string) => 'file' | 'folder' | null
  findNodeName: (path: string) => string
  pathExists: (path: string) => boolean
  isWorkspaceRoot: (path: string) => boolean
  isLibraryWorkspace: (path: string) => boolean
  isDocsWorkspace: (path: string) => boolean
  isBookWorkspace: (path: string) => boolean
  isExamplesWorkspace: (path: string) => boolean
  isProjectsWorkspace: (path: string) => boolean
  isProjectSubfolder: (path: string) => boolean
  getWorkspaceForPath: (path: string) => string | null
  isInReadOnlyWorkspace: (path: string) => boolean
}

/**
 * Hook providing memoized tree utility functions.
 * These wrap pure utility functions to create stable function references.
 */
export function useTreeUtilities(tree: TreeNode[]): UseTreeUtilitiesReturn {
  const findNodeType = useMemo(
    () => (path: string) => findNodeTypeUtil(tree, path),
    [tree]
  )
  const isWorkspaceRoot = useMemo(
    () => (path: string) => isWorkspaceRootUtil(tree, path),
    [tree]
  )
  const isLibraryWorkspace = useMemo(
    () => (path: string) => isLibraryWorkspaceUtil(tree, path),
    [tree]
  )
  const isDocsWorkspace = useMemo(
    () => (path: string) => isDocsWorkspaceUtil(tree, path),
    [tree]
  )
  const isBookWorkspace = useMemo(
    () => (path: string) => isBookWorkspaceUtil(tree, path),
    [tree]
  )
  const isExamplesWorkspace = useMemo(
    () => (path: string) => isExamplesWorkspaceUtil(tree, path),
    [tree]
  )
  const isProjectsWorkspace = useMemo(
    () => (path: string) => isProjectsWorkspaceUtil(tree, path),
    [tree]
  )
  const isProjectSubfolder = useMemo(
    () => (path: string) => isProjectSubfolderUtil(tree, path),
    [tree]
  )
  const findNodeName = useMemo(
    () => (path: string) => findNodeNameUtil(tree, path),
    [tree]
  )
  const pathExists = useMemo(
    () => (path: string) => pathExistsUtil(tree, path),
    [tree]
  )
  const getWorkspaceForPath = useMemo(
    () => (path: string) => getWorkspaceForPathUtil(tree, path),
    [tree]
  )
  const isInReadOnlyWorkspace = useMemo(
    () => (path: string) => isInReadOnlyWorkspaceUtil(tree, path),
    [tree]
  )

  return {
    findNodeType,
    findNodeName,
    pathExists,
    isWorkspaceRoot,
    isLibraryWorkspace,
    isDocsWorkspace,
    isBookWorkspace,
    isExamplesWorkspace,
    isProjectsWorkspace,
    isProjectSubfolder,
    getWorkspaceForPath,
    isInReadOnlyWorkspace,
  }
}
