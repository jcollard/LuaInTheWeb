/**
 * Type augmentations for the File System Access API.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Window/showDirectoryPicker
 */

interface DirectoryPickerOptions {
  /** The ID of the picker instance. Used to persist the last-used directory. */
  id?: string
  /** The initial directory mode. Defaults to 'read'. */
  mode?: 'read' | 'readwrite'
  /** A suggested initial directory. */
  startIn?: FileSystemHandle | 'desktop' | 'documents' | 'downloads' | 'music' | 'pictures' | 'videos'
}

interface Window {
  /**
   * Shows a directory picker that allows the user to select a directory.
   * @returns A promise that resolves to a FileSystemDirectoryHandle for the selected directory.
   */
  showDirectoryPicker(options?: DirectoryPickerOptions): Promise<FileSystemDirectoryHandle>
}
