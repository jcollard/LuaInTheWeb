/**
 * Type augmentations for the File System Access API.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Window/showDirectoryPicker
 * @see https://developer.mozilla.org/en-US/docs/Web/API/FileSystemHandle/queryPermission
 */

interface DirectoryPickerOptions {
  /** The ID of the picker instance. Used to persist the last-used directory. */
  id?: string
  /** The initial directory mode. Defaults to 'read'. */
  mode?: 'read' | 'readwrite'
  /** A suggested initial directory. */
  startIn?: FileSystemHandle | 'desktop' | 'documents' | 'downloads' | 'music' | 'pictures' | 'videos'
}

interface FileSystemPermissionDescriptor {
  /** The permission mode to request. */
  mode?: 'read' | 'readwrite'
}

type PermissionState = 'granted' | 'denied' | 'prompt'

interface FileSystemDirectoryHandle {
  /**
   * Queries the current permission state for the handle.
   * @returns A promise that resolves to the permission state.
   */
  queryPermission(descriptor?: FileSystemPermissionDescriptor): Promise<PermissionState>
  /**
   * Requests permission for the handle.
   * @returns A promise that resolves to the permission state after the request.
   */
  requestPermission(descriptor?: FileSystemPermissionDescriptor): Promise<PermissionState>
  /**
   * Compares two handles to see if they represent the same entry.
   * @returns A promise that resolves to true if the handles are the same entry.
   */
  isSameEntry(other: FileSystemHandle): Promise<boolean>
}

interface Window {
  /**
   * Shows a directory picker that allows the user to select a directory.
   * @returns A promise that resolves to a FileSystemDirectoryHandle for the selected directory.
   */
  showDirectoryPicker(options?: DirectoryPickerOptions): Promise<FileSystemDirectoryHandle>
}
