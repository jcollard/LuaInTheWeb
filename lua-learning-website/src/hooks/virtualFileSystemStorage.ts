/**
 * IndexedDB storage for virtual filesystem data.
 *
 * Stores files (text and binary) and folder structures for virtual workspaces.
 * Each workspace is isolated by its ID, enabling multiple workspaces to coexist.
 */

const DB_NAME = 'lua-workspace-files'
const DB_VERSION = 1
const FILES_STORE = 'files'
const FOLDERS_STORE = 'folders'

/**
 * A file entry stored in IndexedDB.
 */
export interface StoredFile {
  /** Composite key: workspaceId:path */
  key: string
  /** The workspace this file belongs to */
  workspaceId: string
  /** The absolute path of the file */
  path: string
  /** File content - string for text, Uint8Array for binary */
  content: string | Uint8Array
  /** Whether this is a binary file */
  isBinary: boolean
  /** Timestamp when the file was created */
  createdAt: number
  /** Timestamp when the file was last updated */
  updatedAt: number
}

/**
 * A folder entry stored in IndexedDB.
 */
export interface StoredFolder {
  /** Composite key: workspaceId:path */
  key: string
  /** The workspace this folder belongs to */
  workspaceId: string
  /** The absolute path of the folder */
  path: string
}

/**
 * Create a composite key for a file or folder.
 */
function makeKey(workspaceId: string, path: string): string {
  return `${workspaceId}:${path}`
}

/**
 * Open the IndexedDB database, creating object stores if needed.
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => {
      reject(new Error('Failed to open IndexedDB for virtual filesystem'))
    }

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result

      // Create files store with index on workspaceId
      if (!db.objectStoreNames.contains(FILES_STORE)) {
        const filesStore = db.createObjectStore(FILES_STORE, { keyPath: 'key' })
        filesStore.createIndex('workspaceId', 'workspaceId', { unique: false })
      }

      // Create folders store with index on workspaceId
      if (!db.objectStoreNames.contains(FOLDERS_STORE)) {
        const foldersStore = db.createObjectStore(FOLDERS_STORE, { keyPath: 'key' })
        foldersStore.createIndex('workspaceId', 'workspaceId', { unique: false })
      }
    }
  })
}

/**
 * Store a file in IndexedDB.
 */
export async function storeFile(
  workspaceId: string,
  path: string,
  content: string | Uint8Array,
  isBinary: boolean
): Promise<void> {
  const db = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(FILES_STORE, 'readwrite')
    const store = transaction.objectStore(FILES_STORE)

    const key = makeKey(workspaceId, path)
    const now = Date.now()

    // Check if file exists to preserve createdAt
    const getRequest = store.get(key)

    getRequest.onsuccess = () => {
      const existing = getRequest.result as StoredFile | undefined
      const file: StoredFile = {
        key,
        workspaceId,
        path,
        content,
        isBinary,
        createdAt: existing?.createdAt ?? now,
        updatedAt: now,
      }

      const putRequest = store.put(file)

      putRequest.onerror = () => {
        reject(new Error(`Failed to store file: ${path}`))
      }

      putRequest.onsuccess = () => {
        resolve()
      }
    }

    getRequest.onerror = () => {
      reject(new Error(`Failed to check existing file: ${path}`))
    }

    transaction.oncomplete = () => {
      db.close()
    }
  })
}

/**
 * Retrieve a file from IndexedDB.
 * Returns null if the file doesn't exist.
 */
export async function getFile(
  workspaceId: string,
  path: string
): Promise<StoredFile | null> {
  const db = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(FILES_STORE, 'readonly')
    const store = transaction.objectStore(FILES_STORE)

    const key = makeKey(workspaceId, path)
    const request = store.get(key)

    request.onerror = () => {
      reject(new Error(`Failed to retrieve file: ${path}`))
    }

    request.onsuccess = () => {
      resolve(request.result ?? null)
    }

    transaction.oncomplete = () => {
      db.close()
    }
  })
}

/**
 * Delete a file from IndexedDB.
 */
export async function deleteFile(
  workspaceId: string,
  path: string
): Promise<void> {
  const db = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(FILES_STORE, 'readwrite')
    const store = transaction.objectStore(FILES_STORE)

    const key = makeKey(workspaceId, path)
    const request = store.delete(key)

    request.onerror = () => {
      reject(new Error(`Failed to delete file: ${path}`))
    }

    request.onsuccess = () => {
      resolve()
    }

    transaction.oncomplete = () => {
      db.close()
    }
  })
}

/**
 * Get all files for a workspace.
 * Returns a map of path -> StoredFile.
 */
export async function getAllFilesForWorkspace(
  workspaceId: string
): Promise<Map<string, StoredFile>> {
  const db = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(FILES_STORE, 'readonly')
    const store = transaction.objectStore(FILES_STORE)
    const index = store.index('workspaceId')

    const request = index.getAll(workspaceId)

    request.onerror = () => {
      reject(new Error('Failed to retrieve files for workspace'))
    }

    request.onsuccess = () => {
      const results = request.result as StoredFile[]
      const fileMap = new Map<string, StoredFile>()
      for (const file of results) {
        fileMap.set(file.path, file)
      }
      resolve(fileMap)
    }

    transaction.oncomplete = () => {
      db.close()
    }
  })
}

/**
 * Store a folder in IndexedDB.
 */
export async function storeFolder(
  workspaceId: string,
  path: string
): Promise<void> {
  const db = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(FOLDERS_STORE, 'readwrite')
    const store = transaction.objectStore(FOLDERS_STORE)

    const folder: StoredFolder = {
      key: makeKey(workspaceId, path),
      workspaceId,
      path,
    }

    const request = store.put(folder)

    request.onerror = () => {
      reject(new Error(`Failed to store folder: ${path}`))
    }

    request.onsuccess = () => {
      resolve()
    }

    transaction.oncomplete = () => {
      db.close()
    }
  })
}

/**
 * Delete a folder from IndexedDB.
 */
export async function deleteFolder(
  workspaceId: string,
  path: string
): Promise<void> {
  const db = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(FOLDERS_STORE, 'readwrite')
    const store = transaction.objectStore(FOLDERS_STORE)

    const key = makeKey(workspaceId, path)
    const request = store.delete(key)

    request.onerror = () => {
      reject(new Error(`Failed to delete folder: ${path}`))
    }

    request.onsuccess = () => {
      resolve()
    }

    transaction.oncomplete = () => {
      db.close()
    }
  })
}

/**
 * Get all folders for a workspace.
 * Returns a set of folder paths.
 */
export async function getAllFoldersForWorkspace(
  workspaceId: string
): Promise<Set<string>> {
  const db = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(FOLDERS_STORE, 'readonly')
    const store = transaction.objectStore(FOLDERS_STORE)
    const index = store.index('workspaceId')

    const request = index.getAll(workspaceId)

    request.onerror = () => {
      reject(new Error('Failed to retrieve folders for workspace'))
    }

    request.onsuccess = () => {
      const results = request.result as StoredFolder[]
      const folderSet = new Set<string>()
      for (const folder of results) {
        folderSet.add(folder.path)
      }
      resolve(folderSet)
    }

    transaction.oncomplete = () => {
      db.close()
    }
  })
}

/**
 * Delete all data for a workspace (files and folders).
 */
export async function deleteWorkspaceData(workspaceId: string): Promise<void> {
  const db = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([FILES_STORE, FOLDERS_STORE], 'readwrite')

    // Delete all files for this workspace
    const filesStore = transaction.objectStore(FILES_STORE)
    const filesIndex = filesStore.index('workspaceId')
    const filesRequest = filesIndex.getAllKeys(workspaceId)

    filesRequest.onsuccess = () => {
      for (const key of filesRequest.result) {
        filesStore.delete(key)
      }
    }

    // Delete all folders for this workspace
    const foldersStore = transaction.objectStore(FOLDERS_STORE)
    const foldersIndex = foldersStore.index('workspaceId')
    const foldersRequest = foldersIndex.getAllKeys(workspaceId)

    foldersRequest.onsuccess = () => {
      for (const key of foldersRequest.result) {
        foldersStore.delete(key)
      }
    }

    transaction.onerror = () => {
      reject(new Error('Failed to delete workspace data'))
    }

    transaction.oncomplete = () => {
      db.close()
      resolve()
    }
  })
}
