import type { UseFileSystemReturn } from '../hooks/useFileSystem';
import type { IFileSystem, FileEntry } from './types';

/**
 * Creates an IFileSystem adapter from the IDE's useFileSystem hook
 * This allows shell commands to work with the IDE's virtual filesystem
 */
export function createFileSystemAdapter(
  fs: UseFileSystemReturn
): IFileSystem {
  return {
    exists(path: string): boolean {
      return fs.exists(path);
    },

    isDirectory(path: string): boolean {
      // A path is a directory if:
      // 1. It's root (/)
      // 2. It exists and is NOT a file (can't read its content)
      if (path === '/') return true;
      if (!fs.exists(path)) return false;

      // If readFile returns null and path exists, it's a folder
      // If readFile returns content (even empty string), it's a file
      const content = fs.readFile(path);
      return content === null;
    },

    listDirectory(path: string): FileEntry[] {
      const children = fs.listDirectory(path);
      const normalizedPath = path === '/' ? '' : path;

      return children.map((name) => {
        const childPath = `${normalizedPath}/${name}`;
        return {
          name,
          isDirectory: this.isDirectory(childPath),
        };
      });
    },

    readFile(path: string): string {
      const content = fs.readFile(path);
      if (content === null) {
        throw new Error(`Cannot read file: ${path}`);
      }
      return content;
    },
  };
}
