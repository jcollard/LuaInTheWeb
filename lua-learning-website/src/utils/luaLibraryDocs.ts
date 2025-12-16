/**
 * Documentation for Lua library modules (like shell).
 *
 * This module provides documentation lookup for functions and fields
 * in library modules that can be required via `require('modulename')`.
 */

/**
 * Documentation entry for a library member (function or field).
 */
export interface LibraryDocEntry {
  /** The member name (e.g., 'clear', 'foreground') */
  name: string
  /** The function/field signature */
  signature: string
  /** Description of what the member does */
  description: string
  /** The library this belongs to (e.g., 'shell') */
  library: string
  /** Parameter documentation if this is a function */
  params?: Array<{ name: string; description: string }>
  /** Return value documentation */
  returns?: string
}

/**
 * Shell library documentation.
 * Based on LuaDoc annotations in @lua-learning/lua-runtime shell.ts
 */
const shellLibraryDocs: Record<string, LibraryDocEntry> = {
  // Color constants
  BLACK: {
    name: 'BLACK',
    signature: 'shell.BLACK',
    description: "Black color constant ('#000000')",
    library: 'shell',
  },
  RED: {
    name: 'RED',
    signature: 'shell.RED',
    description: "Red color constant ('#FF0000')",
    library: 'shell',
  },
  GREEN: {
    name: 'GREEN',
    signature: 'shell.GREEN',
    description: "Green color constant ('#00FF00')",
    library: 'shell',
  },
  YELLOW: {
    name: 'YELLOW',
    signature: 'shell.YELLOW',
    description: "Yellow color constant ('#FFFF00')",
    library: 'shell',
  },
  BLUE: {
    name: 'BLUE',
    signature: 'shell.BLUE',
    description: "Blue color constant ('#0000FF')",
    library: 'shell',
  },
  MAGENTA: {
    name: 'MAGENTA',
    signature: 'shell.MAGENTA',
    description: "Magenta color constant ('#FF00FF')",
    library: 'shell',
  },
  CYAN: {
    name: 'CYAN',
    signature: 'shell.CYAN',
    description: "Cyan color constant ('#00FFFF')",
    library: 'shell',
  },
  WHITE: {
    name: 'WHITE',
    signature: 'shell.WHITE',
    description: "White color constant ('#FFFFFF')",
    library: 'shell',
  },
  ORANGE: {
    name: 'ORANGE',
    signature: 'shell.ORANGE',
    description: "Orange color constant ('#FF6400')",
    library: 'shell',
  },
  PINK: {
    name: 'PINK',
    signature: 'shell.PINK',
    description: "Pink color constant ('#FFC0CB')",
    library: 'shell',
  },
  GRAY: {
    name: 'GRAY',
    signature: 'shell.GRAY',
    description: "Gray color constant ('#808080')",
    library: 'shell',
  },

  // Screen control
  clear: {
    name: 'clear',
    signature: 'shell.clear()',
    description: 'Clear the terminal screen and move cursor to home position.',
    library: 'shell',
    returns: 'nil',
  },

  // Color control
  foreground: {
    name: 'foreground',
    signature: 'shell.foreground(arg1, [arg2], [arg3])',
    description:
      'Set the text foreground (text) color. Can be called with a hex string, a color constant, or RGB values.',
    library: 'shell',
    params: [
      {
        name: 'arg1',
        description:
          "Hex color string (e.g., '#FF0000'), color constant (e.g., shell.RED), or red component (0-255)",
      },
      { name: 'arg2', description: 'Green component (0-255) when using RGB (optional)' },
      { name: 'arg3', description: 'Blue component (0-255) when using RGB (optional)' },
    ],
    returns: 'nil',
  },
  background: {
    name: 'background',
    signature: 'shell.background(arg1, [arg2], [arg3])',
    description:
      'Set the text background color. Can be called with a hex string, a color constant, or RGB values.',
    library: 'shell',
    params: [
      {
        name: 'arg1',
        description:
          "Hex color string (e.g., '#0000FF'), color constant (e.g., shell.BLUE), or red component (0-255)",
      },
      { name: 'arg2', description: 'Green component (0-255) when using RGB (optional)' },
      { name: 'arg3', description: 'Blue component (0-255) when using RGB (optional)' },
    ],
    returns: 'nil',
  },
  reset: {
    name: 'reset',
    signature: 'shell.reset()',
    description: 'Reset all text attributes (colors, styles) to defaults.',
    library: 'shell',
    returns: 'nil',
  },

  // Cursor control
  set_cursor: {
    name: 'set_cursor',
    signature: 'shell.set_cursor(x, y)',
    description: 'Move the cursor to the specified position.',
    library: 'shell',
    params: [
      { name: 'x', description: 'Column number (1-based, left to right)' },
      { name: 'y', description: 'Row number (1-based, top to bottom)' },
    ],
    returns: 'nil',
  },
  cursor_up: {
    name: 'cursor_up',
    signature: 'shell.cursor_up([n])',
    description: 'Move the cursor up by n lines.',
    library: 'shell',
    params: [{ name: 'n', description: 'Number of lines to move (default: 1)' }],
    returns: 'nil',
  },
  cursor_down: {
    name: 'cursor_down',
    signature: 'shell.cursor_down([n])',
    description: 'Move the cursor down by n lines.',
    library: 'shell',
    params: [{ name: 'n', description: 'Number of lines to move (default: 1)' }],
    returns: 'nil',
  },
  cursor_right: {
    name: 'cursor_right',
    signature: 'shell.cursor_right([n])',
    description: 'Move the cursor right by n columns.',
    library: 'shell',
    params: [{ name: 'n', description: 'Number of columns to move (default: 1)' }],
    returns: 'nil',
  },
  cursor_left: {
    name: 'cursor_left',
    signature: 'shell.cursor_left([n])',
    description: 'Move the cursor left by n columns.',
    library: 'shell',
    params: [{ name: 'n', description: 'Number of columns to move (default: 1)' }],
    returns: 'nil',
  },
  save_cursor: {
    name: 'save_cursor',
    signature: 'shell.save_cursor()',
    description: 'Save the current cursor position. Use restore_cursor() to return to this position later.',
    library: 'shell',
    returns: 'nil',
  },
  restore_cursor: {
    name: 'restore_cursor',
    signature: 'shell.restore_cursor()',
    description: 'Restore the cursor to the previously saved position.',
    library: 'shell',
    returns: 'nil',
  },
  hide_cursor: {
    name: 'hide_cursor',
    signature: 'shell.hide_cursor()',
    description: 'Hide the cursor.',
    library: 'shell',
    returns: 'nil',
  },
  show_cursor: {
    name: 'show_cursor',
    signature: 'shell.show_cursor()',
    description: 'Show the cursor (if previously hidden).',
    library: 'shell',
    returns: 'nil',
  },

  // Terminal dimensions
  width: {
    name: 'width',
    signature: 'shell.width()',
    description: 'Get the terminal width in columns.',
    library: 'shell',
    returns: 'integer - The terminal width in columns',
  },
  height: {
    name: 'height',
    signature: 'shell.height()',
    description: 'Get the terminal height in rows.',
    library: 'shell',
    returns: 'integer - The terminal height in rows',
  },
}

/**
 * All available library documentation indexed by library name.
 */
const libraryDocs: Record<string, Record<string, LibraryDocEntry>> = {
  shell: shellLibraryDocs,
}

/**
 * Get the list of available libraries with documentation.
 *
 * @returns Array of library names
 */
export function getAvailableLibraries(): string[] {
  return Object.keys(libraryDocs)
}

/**
 * Get documentation for a library member.
 *
 * @param libraryName - The library name (e.g., 'shell')
 * @param memberName - The member name (e.g., 'foreground', 'RED')
 * @returns The documentation entry or null if not found
 */
export function getLibraryDocumentation(
  libraryName: string,
  memberName: string
): LibraryDocEntry | null {
  const library = libraryDocs[libraryName]
  if (!library) {
    return null
  }

  return library[memberName] ?? null
}
