/**
 * Type augmentations for the File System Access API.
 *
 * The standard DOM types don't include the async iterator methods for
 * FileSystemDirectoryHandle. This file adds the missing type definitions.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemDirectoryHandle
 */

interface FileSystemDirectoryHandle {
  /**
   * Returns an async iterator of [name, handle] pairs for each entry in the directory.
   */
  entries(): AsyncIterableIterator<[string, FileSystemHandle]>

  /**
   * Returns an async iterator of the names of entries in the directory.
   */
  keys(): AsyncIterableIterator<string>

  /**
   * Returns an async iterator of the handles of entries in the directory.
   */
  values(): AsyncIterableIterator<FileSystemHandle>
}
