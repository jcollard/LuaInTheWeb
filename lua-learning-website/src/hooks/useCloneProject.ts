import { useCallback } from 'react'
import type { Workspace } from './workspaceTypes'
import type { IFileSystem } from '@lua-learning/shell-core'

interface BinarySourceFileSystem extends IFileSystem {
  isBinaryFile?: (path: string) => boolean
  readBinaryFile?: (path: string) => Uint8Array
}

interface BinaryTargetFileSystem extends IFileSystem {
  writeBinaryFile?: (path: string, content: Uint8Array) => void
}

export interface UseCloneProjectParams {
  compositeFileSystem: IFileSystem
  addVirtualWorkspace: (name: string) => Promise<Workspace>
  addLocalWorkspace: (name: string, handle: FileSystemDirectoryHandle) => Promise<Workspace>
  refreshFileTree: () => void
  showError: (message: string) => void
}

function copyRecursive(
  sourceFs: IFileSystem,
  targetFs: IFileSystem,
  sourcePath: string,
  targetRelPath: string
): void {
  const sourceBinary = sourceFs as BinarySourceFileSystem
  const targetBinary = targetFs as BinaryTargetFileSystem

  const entries = sourceFs.listDirectory(sourcePath)
  for (const entry of entries) {
    const entryRelPath = `${targetRelPath}/${entry.name}`
    if (entry.type === 'directory') {
      targetFs.createDirectory(entryRelPath)
      copyRecursive(sourceFs, targetFs, entry.path, entryRelPath)
    } else if (
      typeof sourceBinary.isBinaryFile === 'function' &&
      sourceBinary.isBinaryFile(entry.path) &&
      typeof sourceBinary.readBinaryFile === 'function' &&
      typeof targetBinary.writeBinaryFile === 'function'
    ) {
      const content = sourceBinary.readBinaryFile(entry.path)
      targetBinary.writeBinaryFile(entryRelPath, content)
    } else {
      const content = sourceFs.readFile(entry.path)
      targetFs.writeFile(entryRelPath, content)
    }
  }
}

export function useCloneProject({
  compositeFileSystem,
  addVirtualWorkspace,
  addLocalWorkspace,
  refreshFileTree,
  showError,
}: UseCloneProjectParams) {
  const handleCloneProject = useCallback(
    async (
      projectPath: string,
      workspaceName: string,
      type: 'virtual' | 'local',
      handle?: FileSystemDirectoryHandle
    ) => {
      try {
        let newWorkspace: Workspace
        if (type === 'local' && handle) {
          newWorkspace = await addLocalWorkspace(workspaceName, handle)
        } else {
          newWorkspace = await addVirtualWorkspace(workspaceName)
        }

        const sourceFs = compositeFileSystem
        const targetFs = newWorkspace.filesystem

        copyRecursive(sourceFs, targetFs, projectPath, '')
        refreshFileTree()
      } catch (err) {
        console.error('Failed to clone project:', err)
        showError('Failed to clone project')
      }
    },
    [compositeFileSystem, addVirtualWorkspace, addLocalWorkspace, refreshFileTree, showError]
  )

  return { handleCloneProject }
}
