/**
 * IndexedDB storage for FileSystemDirectoryHandle objects.
 *
 * The File System Access API allows storing directory handles in IndexedDB,
 * which can then be used to request permission again without showing the
 * full directory picker. This enables a smoother reconnection experience
 * for local workspaces after page refresh.
 */

const DB_NAME = 'lua-workspace-handles'
const DB_VERSION = 1
const STORE_NAME = 'directory-handles'

/**
 * Open the IndexedDB database.
 */
function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)

    request.onerror = () => {
      reject(new Error('Failed to open IndexedDB'))
    }

    request.onsuccess = () => {
      resolve(request.result)
    }

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'workspaceId' })
      }
    }
  })
}

/**
 * Store a directory handle for a workspace.
 */
export async function storeDirectoryHandle(
  workspaceId: string,
  handle: FileSystemDirectoryHandle
): Promise<void> {
  const db = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)

    const request = store.put({ workspaceId, handle })

    request.onerror = () => {
      reject(new Error('Failed to store directory handle'))
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
 * Retrieve a directory handle for a workspace.
 * Returns null if no handle is stored.
 */
export async function getDirectoryHandle(
  workspaceId: string
): Promise<FileSystemDirectoryHandle | null> {
  const db = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly')
    const store = transaction.objectStore(STORE_NAME)

    const request = store.get(workspaceId)

    request.onerror = () => {
      reject(new Error('Failed to retrieve directory handle'))
    }

    request.onsuccess = () => {
      const result = request.result
      resolve(result?.handle ?? null)
    }

    transaction.oncomplete = () => {
      db.close()
    }
  })
}

/**
 * Remove a directory handle for a workspace.
 */
export async function removeDirectoryHandle(workspaceId: string): Promise<void> {
  const db = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite')
    const store = transaction.objectStore(STORE_NAME)

    const request = store.delete(workspaceId)

    request.onerror = () => {
      reject(new Error('Failed to remove directory handle'))
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
 * Get all stored directory handles.
 * Returns a map of workspaceId -> handle.
 */
export async function getAllDirectoryHandles(): Promise<Map<string, FileSystemDirectoryHandle>> {
  const db = await openDatabase()

  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly')
    const store = transaction.objectStore(STORE_NAME)

    const request = store.getAll()

    request.onerror = () => {
      reject(new Error('Failed to retrieve directory handles'))
    }

    request.onsuccess = () => {
      const results = request.result as Array<{ workspaceId: string; handle: FileSystemDirectoryHandle }>
      const handleMap = new Map<string, FileSystemDirectoryHandle>()
      for (const { workspaceId, handle } of results) {
        handleMap.set(workspaceId, handle)
      }
      resolve(handleMap)
    }

    transaction.oncomplete = () => {
      db.close()
    }
  })
}

/**
 * Request permission on a stored handle.
 * Returns true if permission was granted, false otherwise.
 */
export async function requestHandlePermission(
  handle: FileSystemDirectoryHandle
): Promise<boolean> {
  try {
    // Check current permission state
    const currentPermission = await handle.queryPermission({ mode: 'readwrite' })
    if (currentPermission === 'granted') {
      return true
    }

    // Request permission
    const newPermission = await handle.requestPermission({ mode: 'readwrite' })
    return newPermission === 'granted'
  } catch {
    // Handle might be invalid (e.g., folder was deleted)
    return false
  }
}
