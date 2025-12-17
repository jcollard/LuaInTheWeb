/* eslint-disable max-lines */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  storeFile,
  getFile,
  deleteFile,
  getAllFilesForWorkspace,
  storeFolder,
  deleteFolder,
  getAllFoldersForWorkspace,
  deleteWorkspaceData,
} from './virtualFileSystemStorage'

// Mock IndexedDB
class MockIDBRequest<T> {
  result: T | undefined
  error: DOMException | null = null
  onsuccess: ((event: Event) => void) | null = null
  onerror: ((event: Event) => void) | null = null

  _succeed(result: T): void {
    this.result = result
    if (this.onsuccess) {
      this.onsuccess({ target: this } as unknown as Event)
    }
  }

  _fail(error: DOMException): void {
    this.error = error
    if (this.onerror) {
      this.onerror({ target: this } as unknown as Event)
    }
  }
}

class MockIDBIndex {
  private store: MockIDBObjectStore
  private keyPath: string

  constructor(store: MockIDBObjectStore, keyPath: string) {
    this.store = store
    this.keyPath = keyPath
  }

  getAll(query: string): MockIDBRequest<object[]> {
    const request = new MockIDBRequest<object[]>()
    setTimeout(() => {
      const results = Array.from(this.store._data.values()).filter(
        (item) => (item as Record<string, unknown>)[this.keyPath] === query
      )
      request._succeed(results)
    }, 0)
    return request
  }

  getAllKeys(query: string): MockIDBRequest<IDBValidKey[]> {
    const request = new MockIDBRequest<IDBValidKey[]>()
    setTimeout(() => {
      const keys: IDBValidKey[] = []
      for (const [key, item] of this.store._data.entries()) {
        if ((item as Record<string, unknown>)[this.keyPath] === query) {
          keys.push(key)
        }
      }
      request._succeed(keys)
    }, 0)
    return request
  }
}

class MockIDBObjectStore {
  _data: Map<string, object> = new Map()
  private indexes: Map<string, MockIDBIndex> = new Map()
  private keyPath: string

  constructor(keyPath: string) {
    this.keyPath = keyPath
  }

  createIndex(name: string, keyPath: string): MockIDBIndex {
    const index = new MockIDBIndex(this, keyPath)
    this.indexes.set(name, index)
    return index
  }

  index(name: string): MockIDBIndex {
    return this.indexes.get(name) || new MockIDBIndex(this, name)
  }

  put(value: object): MockIDBRequest<IDBValidKey> {
    const request = new MockIDBRequest<IDBValidKey>()
    setTimeout(() => {
      const key = (value as Record<string, unknown>)[this.keyPath] as string
      this._data.set(key, value)
      request._succeed(key)
    }, 0)
    return request
  }

  get(key: string): MockIDBRequest<object | undefined> {
    const request = new MockIDBRequest<object | undefined>()
    setTimeout(() => {
      request._succeed(this._data.get(key))
    }, 0)
    return request
  }

  delete(key: IDBValidKey): MockIDBRequest<undefined> {
    const request = new MockIDBRequest<undefined>()
    setTimeout(() => {
      this._data.delete(key as string)
      request._succeed(undefined)
    }, 0)
    return request
  }

  getAll(): MockIDBRequest<object[]> {
    const request = new MockIDBRequest<object[]>()
    setTimeout(() => {
      request._succeed(Array.from(this._data.values()))
    }, 0)
    return request
  }
}

class MockIDBTransaction {
  private stores: Map<string, MockIDBObjectStore>
  oncomplete: ((event: Event) => void) | null = null
  onerror: ((event: Event) => void) | null = null

  constructor(stores: Map<string, MockIDBObjectStore>) {
    this.stores = stores
  }

  objectStore(name: string): MockIDBObjectStore {
    return this.stores.get(name)!
  }

  _complete(): void {
    if (this.oncomplete) {
      this.oncomplete({} as Event)
    }
  }
}

class MockIDBDatabase {
  objectStoreNames: DOMStringList = {
    length: 0,
    contains: () => false,
    item: () => null,
    [Symbol.iterator]: function* () {},
  } as DOMStringList
  private stores: Map<string, MockIDBObjectStore> = new Map()
  closed = false

  createObjectStore(name: string, options: { keyPath: string }): MockIDBObjectStore {
    const store = new MockIDBObjectStore(options.keyPath)
    this.stores.set(name, store)
    // Update objectStoreNames
    const names = Array.from(this.stores.keys())
    this.objectStoreNames = {
      length: names.length,
      contains: (n: string) => names.includes(n),
      item: (i: number) => names[i] || null,
      [Symbol.iterator]: function* () {
        yield* names
      },
    } as DOMStringList
    return store
  }

  transaction(
    storeNames: string | string[],
    _mode?: IDBTransactionMode
  ): MockIDBTransaction {
    const storeNamesArray = Array.isArray(storeNames) ? storeNames : [storeNames]
    const txStores = new Map<string, MockIDBObjectStore>()
    for (const name of storeNamesArray) {
      txStores.set(name, this.stores.get(name)!)
    }
    const tx = new MockIDBTransaction(txStores)
    // Auto-complete transaction after microtask
    setTimeout(() => tx._complete(), 10)
    return tx
  }

  close(): void {
    this.closed = true
  }
}

class MockIDBOpenDBRequest extends MockIDBRequest<IDBDatabase> {
  onupgradeneeded: ((event: IDBVersionChangeEvent) => void) | null = null
}

// Global mock stores for persistence between operations
const globalStores = new Map<string, MockIDBObjectStore>()

// Error injection flags
let shouldFailOpen = false
let shouldTriggerUpgradeNeeded = false

const mockIndexedDB = {
  open: vi.fn((_name: string, _version?: number): MockIDBOpenDBRequest => {
    const request = new MockIDBOpenDBRequest()

    setTimeout(() => {
      if (shouldFailOpen) {
        request._fail(new DOMException('Mock open error', 'OpenError'))
        return
      }

      const db = new MockIDBDatabase()

      // Restore global stores or create new ones
      if (!globalStores.has('files')) {
        globalStores.set('files', new MockIDBObjectStore('key'))
        globalStores.get('files')!.createIndex('workspaceId', 'workspaceId')
      }
      if (!globalStores.has('folders')) {
        globalStores.set('folders', new MockIDBObjectStore('key'))
        globalStores.get('folders')!.createIndex('workspaceId', 'workspaceId')
      }

      // Link global stores to the db
      ;(db as unknown as { stores: Map<string, MockIDBObjectStore> }).stores = globalStores
      db.objectStoreNames = {
        length: 2,
        contains: (n: string) => globalStores.has(n),
        item: (i: number) => ['files', 'folders'][i] || null,
        [Symbol.iterator]: function* () {
          yield* ['files', 'folders']
        },
      } as DOMStringList

      // Trigger upgradeneeded if needed (or when flag is set)
      if (request.onupgradeneeded && shouldTriggerUpgradeNeeded) {
        // Create a fresh db with no stores to trigger store creation
        const freshDb = new MockIDBDatabase()
        request.onupgradeneeded({
          target: { result: freshDb },
        } as unknown as IDBVersionChangeEvent)
      } else if (request.onupgradeneeded) {
        request.onupgradeneeded({
          target: { result: db },
        } as unknown as IDBVersionChangeEvent)
      }

      request._succeed(db as unknown as IDBDatabase)
    }, 0)

    return request
  }),
}

// Install mock
Object.defineProperty(window, 'indexedDB', { value: mockIndexedDB, writable: true })

describe('virtualFileSystemStorage', () => {
  beforeEach(() => {
    // Clear global stores between tests
    globalStores.clear()
    vi.clearAllMocks()
    // Reset error injection flags
    shouldFailOpen = false
    shouldTriggerUpgradeNeeded = false
  })

  describe('storeFile and getFile', () => {
    it('stores and retrieves a text file', async () => {
      await storeFile('workspace1', '/test.txt', 'Hello World', false)

      const file = await getFile('workspace1', '/test.txt')

      expect(file).not.toBeNull()
      expect(file!.content).toBe('Hello World')
      expect(file!.isBinary).toBe(false)
      expect(file!.workspaceId).toBe('workspace1')
      expect(file!.path).toBe('/test.txt')
    })

    it('stores and retrieves a binary file', async () => {
      const binaryContent = new Uint8Array([0x89, 0x50, 0x4e, 0x47]) // PNG header

      await storeFile('workspace1', '/image.png', binaryContent, true)

      const file = await getFile('workspace1', '/image.png')

      expect(file).not.toBeNull()
      expect(file!.content).toEqual(binaryContent)
      expect(file!.isBinary).toBe(true)
    })

    it('returns null for non-existent file', async () => {
      const file = await getFile('workspace1', '/nonexistent.txt')

      expect(file).toBeNull()
    })

    it('preserves createdAt when updating a file', async () => {
      await storeFile('workspace1', '/test.txt', 'Original', false)
      const original = await getFile('workspace1', '/test.txt')
      const originalCreatedAt = original!.createdAt

      // Wait a bit to ensure timestamp would be different
      await new Promise((resolve) => setTimeout(resolve, 10))

      await storeFile('workspace1', '/test.txt', 'Updated', false)
      const updated = await getFile('workspace1', '/test.txt')

      expect(updated!.content).toBe('Updated')
      expect(updated!.createdAt).toBe(originalCreatedAt)
      expect(updated!.updatedAt).toBeGreaterThanOrEqual(originalCreatedAt)
    })

    it('isolates files between workspaces', async () => {
      await storeFile('workspace1', '/test.txt', 'Workspace 1', false)
      await storeFile('workspace2', '/test.txt', 'Workspace 2', false)

      const file1 = await getFile('workspace1', '/test.txt')
      const file2 = await getFile('workspace2', '/test.txt')

      expect(file1!.content).toBe('Workspace 1')
      expect(file2!.content).toBe('Workspace 2')
    })
  })

  describe('deleteFile', () => {
    it('deletes an existing file', async () => {
      await storeFile('workspace1', '/test.txt', 'content', false)
      await deleteFile('workspace1', '/test.txt')

      const file = await getFile('workspace1', '/test.txt')
      expect(file).toBeNull()
    })

    it('does not error when deleting non-existent file', async () => {
      // Should not throw
      await deleteFile('workspace1', '/nonexistent.txt')
    })
  })

  describe('getAllFilesForWorkspace', () => {
    it('returns all files for a workspace', async () => {
      await storeFile('workspace1', '/file1.txt', 'content1', false)
      await storeFile('workspace1', '/file2.txt', 'content2', false)
      await storeFile('workspace2', '/other.txt', 'other', false)

      const files = await getAllFilesForWorkspace('workspace1')

      expect(files.size).toBe(2)
      expect(files.get('/file1.txt')!.content).toBe('content1')
      expect(files.get('/file2.txt')!.content).toBe('content2')
    })

    it('returns empty map for workspace with no files', async () => {
      const files = await getAllFilesForWorkspace('empty-workspace')

      expect(files.size).toBe(0)
    })
  })

  describe('storeFolder and getAllFoldersForWorkspace', () => {
    it('stores and retrieves folders', async () => {
      await storeFolder('workspace1', '/')
      await storeFolder('workspace1', '/src')
      await storeFolder('workspace1', '/src/components')

      const folders = await getAllFoldersForWorkspace('workspace1')

      expect(folders.size).toBe(3)
      expect(folders.has('/')).toBe(true)
      expect(folders.has('/src')).toBe(true)
      expect(folders.has('/src/components')).toBe(true)
    })

    it('isolates folders between workspaces', async () => {
      await storeFolder('workspace1', '/src')
      await storeFolder('workspace2', '/lib')

      const folders1 = await getAllFoldersForWorkspace('workspace1')
      const folders2 = await getAllFoldersForWorkspace('workspace2')

      expect(folders1.has('/src')).toBe(true)
      expect(folders1.has('/lib')).toBe(false)
      expect(folders2.has('/lib')).toBe(true)
      expect(folders2.has('/src')).toBe(false)
    })
  })

  describe('deleteFolder', () => {
    it('deletes a folder', async () => {
      await storeFolder('workspace1', '/test')
      await deleteFolder('workspace1', '/test')

      const folders = await getAllFoldersForWorkspace('workspace1')
      expect(folders.has('/test')).toBe(false)
    })
  })

  describe('deleteWorkspaceData', () => {
    it('deletes all files and folders for a workspace', async () => {
      await storeFile('workspace1', '/file.txt', 'content', false)
      await storeFolder('workspace1', '/folder')
      await storeFile('workspace2', '/other.txt', 'other', false)

      await deleteWorkspaceData('workspace1')

      const files1 = await getAllFilesForWorkspace('workspace1')
      const folders1 = await getAllFoldersForWorkspace('workspace1')
      const files2 = await getAllFilesForWorkspace('workspace2')

      expect(files1.size).toBe(0)
      expect(folders1.size).toBe(0)
      // workspace2 should be unaffected
      expect(files2.size).toBe(1)
    })
  })

  describe('binary content handling', () => {
    it('handles empty binary files', async () => {
      const emptyBinary = new Uint8Array(0)
      await storeFile('workspace1', '/empty.bin', emptyBinary, true)

      const file = await getFile('workspace1', '/empty.bin')

      expect(file!.content).toEqual(emptyBinary)
      expect((file!.content as Uint8Array).length).toBe(0)
    })

    it('handles large binary files', async () => {
      const largeBinary = new Uint8Array(1024 * 100) // 100KB
      for (let i = 0; i < largeBinary.length; i++) {
        largeBinary[i] = i % 256
      }

      await storeFile('workspace1', '/large.bin', largeBinary, true)

      const file = await getFile('workspace1', '/large.bin')

      expect(file!.content).toEqual(largeBinary)
    })
  })

  describe('error handling', () => {
    describe('openDatabase errors', () => {
      it('rejects when IndexedDB fails to open', async () => {
        shouldFailOpen = true

        await expect(storeFile('ws1', '/test.txt', 'content', false)).rejects.toThrow(
          'Failed to open IndexedDB for virtual filesystem'
        )
      })

      it('rejects getFile when IndexedDB fails to open', async () => {
        shouldFailOpen = true

        await expect(getFile('ws1', '/test.txt')).rejects.toThrow(
          'Failed to open IndexedDB for virtual filesystem'
        )
      })

      it('rejects deleteFile when IndexedDB fails to open', async () => {
        shouldFailOpen = true

        await expect(deleteFile('ws1', '/test.txt')).rejects.toThrow(
          'Failed to open IndexedDB for virtual filesystem'
        )
      })

      it('rejects getAllFilesForWorkspace when IndexedDB fails to open', async () => {
        shouldFailOpen = true

        await expect(getAllFilesForWorkspace('ws1')).rejects.toThrow(
          'Failed to open IndexedDB for virtual filesystem'
        )
      })

      it('rejects storeFolder when IndexedDB fails to open', async () => {
        shouldFailOpen = true

        await expect(storeFolder('ws1', '/folder')).rejects.toThrow(
          'Failed to open IndexedDB for virtual filesystem'
        )
      })

      it('rejects deleteFolder when IndexedDB fails to open', async () => {
        shouldFailOpen = true

        await expect(deleteFolder('ws1', '/folder')).rejects.toThrow(
          'Failed to open IndexedDB for virtual filesystem'
        )
      })

      it('rejects getAllFoldersForWorkspace when IndexedDB fails to open', async () => {
        shouldFailOpen = true

        await expect(getAllFoldersForWorkspace('ws1')).rejects.toThrow(
          'Failed to open IndexedDB for virtual filesystem'
        )
      })

      it('rejects deleteWorkspaceData when IndexedDB fails to open', async () => {
        shouldFailOpen = true

        await expect(deleteWorkspaceData('ws1')).rejects.toThrow(
          'Failed to open IndexedDB for virtual filesystem'
        )
      })
    })

    describe('upgrade needed creates stores', () => {
      it('creates object stores on first open', async () => {
        shouldTriggerUpgradeNeeded = true

        // This should not throw - it should create the stores
        await storeFile('ws1', '/test.txt', 'content', false)

        const file = await getFile('ws1', '/test.txt')
        expect(file).not.toBeNull()
      })
    })

    describe('key generation', () => {
      it('generates composite keys correctly', async () => {
        await storeFile('workspace-id', '/path/to/file.txt', 'content', false)

        // The key should be workspaceId:path
        const file = await getFile('workspace-id', '/path/to/file.txt')
        expect(file).not.toBeNull()
        expect(file!.key).toBe('workspace-id:/path/to/file.txt')
      })

      it('handles special characters in workspace ids and paths', async () => {
        await storeFile('my-workspace', '/special:path/file.txt', 'content', false)

        const file = await getFile('my-workspace', '/special:path/file.txt')
        expect(file).not.toBeNull()
        expect(file!.key).toBe('my-workspace:/special:path/file.txt')
      })
    })

    describe('file timestamps', () => {
      it('sets createdAt and updatedAt on new file', async () => {
        const beforeStore = Date.now()
        await storeFile('ws1', '/test.txt', 'content', false)
        const afterStore = Date.now()

        const file = await getFile('ws1', '/test.txt')

        expect(file!.createdAt).toBeGreaterThanOrEqual(beforeStore)
        expect(file!.createdAt).toBeLessThanOrEqual(afterStore)
        expect(file!.updatedAt).toBeGreaterThanOrEqual(beforeStore)
        expect(file!.updatedAt).toBeLessThanOrEqual(afterStore)
      })

      it('updates updatedAt but preserves createdAt on update', async () => {
        await storeFile('ws1', '/test.txt', 'original', false)
        const original = await getFile('ws1', '/test.txt')
        const originalCreatedAt = original!.createdAt

        // Small delay to ensure timestamp differs
        await new Promise((r) => setTimeout(r, 5))

        await storeFile('ws1', '/test.txt', 'updated', false)
        const updated = await getFile('ws1', '/test.txt')

        expect(updated!.createdAt).toBe(originalCreatedAt)
        expect(updated!.updatedAt).toBeGreaterThanOrEqual(originalCreatedAt)
      })
    })

    describe('multiple workspaces isolation', () => {
      it('does not delete files from other workspaces', async () => {
        await storeFile('ws1', '/shared.txt', 'ws1 content', false)
        await storeFile('ws2', '/shared.txt', 'ws2 content', false)

        await deleteWorkspaceData('ws1')

        const ws1File = await getFile('ws1', '/shared.txt')
        const ws2File = await getFile('ws2', '/shared.txt')

        expect(ws1File).toBeNull()
        expect(ws2File).not.toBeNull()
        expect(ws2File!.content).toBe('ws2 content')
      })

      it('does not delete folders from other workspaces', async () => {
        await storeFolder('ws1', '/shared')
        await storeFolder('ws2', '/shared')

        await deleteWorkspaceData('ws1')

        const ws1Folders = await getAllFoldersForWorkspace('ws1')
        const ws2Folders = await getAllFoldersForWorkspace('ws2')

        expect(ws1Folders.size).toBe(0)
        expect(ws2Folders.has('/shared')).toBe(true)
      })
    })

    describe('empty and edge cases', () => {
      it('handles empty workspace id', async () => {
        await storeFile('', '/test.txt', 'content', false)
        const file = await getFile('', '/test.txt')

        expect(file).not.toBeNull()
        expect(file!.workspaceId).toBe('')
      })

      it('handles empty path', async () => {
        await storeFile('ws1', '', 'content', false)
        const file = await getFile('ws1', '')

        expect(file).not.toBeNull()
        expect(file!.path).toBe('')
      })

      it('handles empty content', async () => {
        await storeFile('ws1', '/empty.txt', '', false)
        const file = await getFile('ws1', '/empty.txt')

        expect(file!.content).toBe('')
        expect(file!.isBinary).toBe(false)
      })

      it('deletes multiple files and folders for workspace', async () => {
        await storeFile('ws1', '/file1.txt', 'content1', false)
        await storeFile('ws1', '/file2.txt', 'content2', false)
        await storeFile('ws1', '/file3.txt', 'content3', false)
        await storeFolder('ws1', '/dir1')
        await storeFolder('ws1', '/dir2')

        await deleteWorkspaceData('ws1')

        const files = await getAllFilesForWorkspace('ws1')
        const folders = await getAllFoldersForWorkspace('ws1')

        expect(files.size).toBe(0)
        expect(folders.size).toBe(0)
      })

      it('handles deleting from empty workspace', async () => {
        // Should not throw
        await deleteWorkspaceData('nonexistent-workspace')

        const files = await getAllFilesForWorkspace('nonexistent-workspace')
        expect(files.size).toBe(0)
      })
    })
  })
})
