/**
 * Shared test setup for CanvasController tests.
 * Provides mock instances and factory functions for creating test fixtures.
 */

import { vi } from 'vitest'
import type { IFileSystem } from '@lua-learning/shell-core'

// Store mock instances for testing - these are set by the mock classes
export let mockImageCacheInstance: {
  set: ReturnType<typeof vi.fn>
  get: ReturnType<typeof vi.fn>
  has: ReturnType<typeof vi.fn>
  clear: ReturnType<typeof vi.fn>
} | null = null

export let mockAssetLoaderInstance: {
  loadAsset: ReturnType<typeof vi.fn>
  resolvePath: ReturnType<typeof vi.fn>
} | null = null

// Functions to reset mock instances
export function resetMockInstances(): void {
  mockImageCacheInstance = null
  mockAssetLoaderInstance = null
}

// Function to set mock instances (called by mock classes)
export function setMockImageCacheInstance(instance: typeof mockImageCacheInstance): void {
  mockImageCacheInstance = instance
}

export function setMockAssetLoaderInstance(instance: typeof mockAssetLoaderInstance): void {
  mockAssetLoaderInstance = instance
}

// Create mock filesystem for asset tests
export function createMockFileSystem(): IFileSystem {
  return {
    exists: vi.fn().mockReturnValue(true),
    isFile: vi.fn().mockReturnValue(true),
    isDirectory: vi.fn().mockReturnValue(false),
    readFile: vi.fn().mockReturnValue(''),
    writeFile: vi.fn(),
    deleteFile: vi.fn(),
    createDirectory: vi.fn(),
    deleteDirectory: vi.fn(),
    listDirectory: vi.fn().mockReturnValue([]),
    readBinaryFile: vi.fn().mockReturnValue(new Uint8Array([1, 2, 3])),
    writeBinaryFile: vi.fn(),
    copyFile: vi.fn(),
    moveFile: vi.fn(),
    rename: vi.fn(),
  }
}
