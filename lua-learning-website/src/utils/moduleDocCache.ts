/**
 * Module Documentation Cache
 * Caches parsed documentation from module files to avoid re-parsing on every hover.
 */

import { parseLuaDocComments, type UserFunctionDoc } from './luaDocParser'

/** Maximum number of modules to cache */
const MAX_CACHE_SIZE = 50

/**
 * Simple string hash function (djb2 algorithm)
 */
function hashString(str: string): string {
  let hash = 5381
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) + hash + str.charCodeAt(i)
    hash = hash & hash // Convert to 32-bit integer
  }
  return hash.toString(36)
}

interface CacheEntry {
  /** Hash of the file content for invalidation */
  contentHash: string
  /** Parsed function documentation indexed by function name */
  docs: Map<string, UserFunctionDoc>
  /** Last access time for LRU eviction */
  lastAccess: number
}

/**
 * Cache for module documentation.
 * Uses content hashing to detect changes and LRU eviction to limit memory usage.
 */
class ModuleDocCacheImpl {
  private cache = new Map<string, CacheEntry>()

  /**
   * Get documentation for a module file.
   * Returns cached docs if content hasn't changed, otherwise parses and caches.
   *
   * @param modulePath - Absolute path to the module file
   * @param fileContent - Current content of the file
   * @returns Map of function name to documentation
   */
  get(modulePath: string, fileContent: string): Map<string, UserFunctionDoc> {
    const contentHash = hashString(fileContent)
    const existing = this.cache.get(modulePath)

    // Check if we have valid cached entry
    if (existing && existing.contentHash === contentHash) {
      existing.lastAccess = Date.now()
      return existing.docs
    }

    // Parse the file
    const parsedDocs = parseLuaDocComments(fileContent)

    // Convert array to map indexed by function name
    const docsMap = new Map<string, UserFunctionDoc>()
    for (const doc of parsedDocs) {
      docsMap.set(doc.name, doc)
    }

    // Evict oldest entries if cache is full
    if (this.cache.size >= MAX_CACHE_SIZE) {
      this.evictOldest()
    }

    // Store in cache
    this.cache.set(modulePath, {
      contentHash,
      docs: docsMap,
      lastAccess: Date.now(),
    })

    return docsMap
  }

  /**
   * Clear all cached documentation.
   */
  clear(): void {
    this.cache.clear()
  }

  /**
   * Get the current cache size (for testing).
   */
  get size(): number {
    return this.cache.size
  }

  /**
   * Evict the least recently used entry.
   */
  private evictOldest(): void {
    let oldestKey: string | null = null
    let oldestTime = Infinity

    for (const [key, entry] of this.cache) {
      if (entry.lastAccess < oldestTime) {
        oldestTime = entry.lastAccess
        oldestKey = key
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey)
    }
  }
}

/**
 * Singleton cache instance for module documentation.
 */
export const moduleDocCache = new ModuleDocCacheImpl()
