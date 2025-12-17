/**
 * Helper functions for workspace management.
 *
 * Extracted from useWorkspaceManager to keep file size manageable.
 */

import type { IFileSystem } from '@lua-learning/shell-core'
import {
  generateShellLibrarySource,
  generateCanvasLibrarySource,
} from './libraryDocumentation'
import { getExamplesContent } from './examplesContent'
import type {
  Workspace,
  PersistedWorkspace,
  WorkspaceManagerState,
} from './workspaceTypes'
import { createVirtualFileSystem } from './virtualFileSystemFactory'
import { getAllDocs } from './luaStdlibMarkdown/index'
import { createReadOnlyFileSystem } from './readOnlyFileSystem'
import { fetchBookContent } from './bookFetcher'

export const WORKSPACE_STORAGE_KEY = 'lua-workspaces'
export const DEFAULT_WORKSPACE_ID = 'default'
export const DEFAULT_WORKSPACE_NAME = 'home'
export const DEFAULT_MOUNT_PATH = '/home'
export const LIBRARY_WORKSPACE_ID = 'libs'
export const LIBRARY_WORKSPACE_NAME = 'libs'
export const LIBRARY_MOUNT_PATH = '/libs'
export const DOCS_WORKSPACE_ID = 'docs'
export const DOCS_WORKSPACE_NAME = 'docs'
export const DOCS_MOUNT_PATH = '/docs'
export const BOOK_WORKSPACE_ID = 'adventures'
export const BOOK_WORKSPACE_NAME = 'Adventures'
export const BOOK_MOUNT_PATH = '/adventures'
export const BOOK_PUBLIC_PATH = '/adventures-in-lua-book'
export const EXAMPLES_WORKSPACE_ID = 'examples'
export const EXAMPLES_WORKSPACE_NAME = 'examples'
export const EXAMPLES_MOUNT_PATH = '/examples'

/**
 * Generate a unique workspace ID.
 */
export function generateWorkspaceId(): string {
  return `ws-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

/**
 * Convert a workspace name to a mount path.
 * e.g., "My Files" -> "/my-files", "Project 1" -> "/project-1"
 */
export function nameToMountPath(name: string): string {
  const slug = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
  return `/${slug || 'workspace'}`
}

/**
 * Generate a unique mount path for a workspace.
 * Handles collisions by appending numbers: /project, /project-2, /project-3
 */
export function generateMountPath(name: string, existingPaths: Set<string>): string {
  const basePath = nameToMountPath(name)

  if (!existingPaths.has(basePath)) {
    return basePath
  }

  let counter = 2
  while (existingPaths.has(`${basePath}-${counter}`)) {
    counter++
  }

  return `${basePath}-${counter}`
}

/**
 * Load persisted workspace metadata from localStorage.
 */
export function loadPersistedWorkspaces(): PersistedWorkspace[] | null {
  try {
    const data = localStorage.getItem(WORKSPACE_STORAGE_KEY)
    if (!data) return null

    const parsed = JSON.parse(data)
    return parsed.workspaces as PersistedWorkspace[]
  } catch {
    return null
  }
}

/**
 * IDs of workspaces that should not be persisted (they are recreated fresh on load).
 */
const NON_PERSISTED_WORKSPACE_IDS = new Set([
  LIBRARY_WORKSPACE_ID,
  DOCS_WORKSPACE_ID,
  EXAMPLES_WORKSPACE_ID,
  BOOK_WORKSPACE_ID,
])

/**
 * Save workspace metadata to localStorage.
 * Filters out special workspaces (libs, docs, examples, adventures) that are recreated on load.
 */
export function saveWorkspaces(workspaces: Workspace[]): void {
  const persistedWorkspaces: PersistedWorkspace[] = workspaces
    .filter((w) => !NON_PERSISTED_WORKSPACE_IDS.has(w.id))
    .map((w) => ({
      id: w.id,
      name: w.name,
      type: w.type,
      mountPath: w.mountPath,
    }))

  localStorage.setItem(
    WORKSPACE_STORAGE_KEY,
    JSON.stringify({
      workspaces: persistedWorkspaces,
    })
  )
}

/**
 * Create the default workspace.
 */
export function createDefaultWorkspace(): Workspace {
  return {
    id: DEFAULT_WORKSPACE_ID,
    name: DEFAULT_WORKSPACE_NAME,
    type: 'virtual',
    mountPath: DEFAULT_MOUNT_PATH,
    filesystem: createVirtualFileSystem(DEFAULT_WORKSPACE_ID),
    status: 'connected',
  }
}

/**
 * Create the library workspace containing built-in libraries.
 * This workspace is read-only and contains files like shell.lua.
 */
export function createLibraryWorkspace(): Workspace {
  const libraryFiles: Record<string, string> = {
    'shell.lua': generateShellLibrarySource(),
    'canvas.lua': generateCanvasLibrarySource(),
  }

  return {
    id: LIBRARY_WORKSPACE_ID,
    name: LIBRARY_WORKSPACE_NAME,
    type: 'library',
    mountPath: LIBRARY_MOUNT_PATH,
    filesystem: createReadOnlyFileSystem(libraryFiles),
    status: 'connected',
    isReadOnly: true,
  }
}

/**
 * Create the docs workspace containing API documentation.
 * This workspace is read-only and contains markdown documentation files.
 */
export function createDocsWorkspace(): Workspace {
  return {
    id: DOCS_WORKSPACE_ID,
    name: DOCS_WORKSPACE_NAME,
    type: 'docs',
    mountPath: DOCS_MOUNT_PATH,
    filesystem: createReadOnlyFileSystem(getAllDocs()),
    status: 'connected',
    isReadOnly: true,
  }
}

/**
 * Create the book workspace from pre-fetched content.
 * This workspace is read-only and contains book chapters.
 */
export function createBookWorkspace(files: Record<string, string>): Workspace {
  return {
    id: BOOK_WORKSPACE_ID,
    name: BOOK_WORKSPACE_NAME,
    type: 'book',
    mountPath: BOOK_MOUNT_PATH,
    filesystem: createReadOnlyFileSystem(files),
    status: 'connected',
    isReadOnly: true,
  }
}

/**
 * Create the examples workspace containing example Lua programs.
 * This workspace is read-only and contains sample code for users to browse and run.
 */
export function createExamplesWorkspace(): Workspace {
  return {
    id: EXAMPLES_WORKSPACE_ID,
    name: EXAMPLES_WORKSPACE_NAME,
    type: 'examples',
    mountPath: EXAMPLES_MOUNT_PATH,
    filesystem: createReadOnlyFileSystem(getExamplesContent()),
    status: 'connected',
    isReadOnly: true,
  }
}

/**
 * Fetch book content and create the book workspace.
 * Returns null if the fetch fails.
 */
export async function fetchAndCreateBookWorkspace(): Promise<Workspace | null> {
  const files = await fetchBookContent(BOOK_PUBLIC_PATH)
  if (Object.keys(files).length === 0) {
    return null
  }
  return createBookWorkspace(files)
}

/**
 * Migrate legacy workspace data that may have rootPath instead of mountPath.
 */
export function migratePersistedWorkspace(
  pw: PersistedWorkspace & { rootPath?: string },
  existingPaths: Set<string>
): PersistedWorkspace {
  // If already has mountPath, use it
  if (pw.mountPath) {
    return pw
  }

  // Generate mount path from name for legacy data
  const mountPath =
    pw.id === DEFAULT_WORKSPACE_ID
      ? DEFAULT_MOUNT_PATH
      : generateMountPath(pw.name, existingPaths)

  return {
    id: pw.id,
    name: pw.name,
    type: pw.type,
    mountPath,
  }
}

/**
 * Create a placeholder filesystem for disconnected local workspaces.
 */
export function createDisconnectedFileSystem(): IFileSystem {
  const throwDisconnected = (): never => {
    throw new Error('Workspace is disconnected. Please reconnect to access files.')
  }

  return {
    getCurrentDirectory: () => '/',
    setCurrentDirectory: throwDisconnected,
    exists: () => false,
    isDirectory: () => false,
    isFile: () => false,
    listDirectory: throwDisconnected,
    readFile: throwDisconnected,
    writeFile: throwDisconnected,
    createDirectory: throwDisconnected,
    delete: throwDisconnected,
  }
}

/**
 * Initialize workspaces from localStorage or create default.
 * Always includes the library workspace for built-in libraries,
 * the docs workspace for API documentation, and the examples workspace
 * for sample Lua programs.
 */
export function initializeWorkspaces(): WorkspaceManagerState {
  const persistedWorkspaces = loadPersistedWorkspaces()

  // Library workspace is always present (not persisted, always created fresh)
  const libraryWorkspace = createLibraryWorkspace()
  // Docs workspace is always present (not persisted, always created fresh)
  const docsWorkspace = createDocsWorkspace()
  // Examples workspace is always present (not persisted, always created fresh)
  const examplesWorkspace = createExamplesWorkspace()

  if (!persistedWorkspaces || persistedWorkspaces.length === 0) {
    const defaultWorkspace = createDefaultWorkspace()
    return {
      workspaces: [defaultWorkspace, libraryWorkspace, docsWorkspace, examplesWorkspace],
    }
  }

  // Migrate and restore workspaces
  const existingPaths = new Set<string>()
  const migratedWorkspaces = persistedWorkspaces.map((pw) => {
    const migrated = migratePersistedWorkspace(
      pw as PersistedWorkspace & { rootPath?: string },
      existingPaths
    )
    existingPaths.add(migrated.mountPath)
    return migrated
  })

  const workspaces: Workspace[] = migratedWorkspaces.map((pw) => {
    if (pw.type === 'virtual') {
      return {
        id: pw.id,
        name: pw.name,
        type: pw.type,
        mountPath: pw.mountPath,
        filesystem: createVirtualFileSystem(pw.id),
        status: 'connected' as const,
      }
    } else {
      // Local workspaces are disconnected until handle is re-provided
      return {
        id: pw.id,
        name: pw.name,
        type: pw.type,
        mountPath: pw.mountPath,
        filesystem: createDisconnectedFileSystem(),
        status: 'disconnected' as const,
      }
    }
  })

  // Ensure default workspace exists
  const hasDefault = workspaces.some((w) => w.id === DEFAULT_WORKSPACE_ID)
  if (!hasDefault) {
    workspaces.unshift(createDefaultWorkspace())
  }

  // Add library workspace (always present, not persisted)
  workspaces.push(libraryWorkspace)

  // Add docs workspace (always present, not persisted)
  workspaces.push(docsWorkspace)

  // Add examples workspace (always present, not persisted)
  workspaces.push(examplesWorkspace)

  return {
    workspaces,
  }
}
