import type { ITheme } from '@xterm/xterm'
import type { Theme } from '../../contexts/types'

/**
 * Dark terminal theme - matches VS Code dark theme
 * Colors are aligned with themes.css CSS variables
 */
export const darkTerminalTheme: ITheme = {
  background: '#1e1e1e',
  foreground: '#cccccc',
  cursor: '#ffffff',
  cursorAccent: '#1e1e1e',
  selectionBackground: '#264f78',
  selectionForeground: '#ffffff',
  selectionInactiveBackground: '#3a3d41',

  // Standard ANSI colors
  black: '#000000',
  red: '#cd3131',
  green: '#0dbc79',
  yellow: '#e5e510',
  blue: '#2472c8',
  magenta: '#bc3fbc',
  cyan: '#11a8cd',
  white: '#e5e5e5',

  // Bright ANSI colors
  brightBlack: '#666666',
  brightRed: '#f14c4c',
  brightGreen: '#23d18b',
  brightYellow: '#f5f543',
  brightBlue: '#3b8eea',
  brightMagenta: '#d670d6',
  brightCyan: '#29b8db',
  brightWhite: '#ffffff',
}

/**
 * Light terminal theme - matches VS Code light theme
 * Colors are aligned with themes.css CSS variables
 */
export const lightTerminalTheme: ITheme = {
  background: '#ffffff',
  foreground: '#1e1e1e',
  cursor: '#1e1e1e',
  cursorAccent: '#ffffff',
  selectionBackground: '#add6ff',
  selectionForeground: '#1e1e1e',
  selectionInactiveBackground: '#e5ebf1',

  // Standard ANSI colors (adjusted for light background)
  black: '#000000',
  red: '#cd3131',
  green: '#107c10',
  yellow: '#795e00',
  blue: '#0066b8',
  magenta: '#bc05bc',
  cyan: '#0598bc',
  white: '#1e1e1e',

  // Bright ANSI colors (adjusted for light background)
  brightBlack: '#666666',
  brightRed: '#d02020',
  brightGreen: '#14a514',
  brightYellow: '#b89500',
  brightBlue: '#0078d4',
  brightMagenta: '#d670d6',
  brightCyan: '#0598bc',
  brightWhite: '#3b3b3b',
}

/**
 * Get the terminal theme based on the current app theme
 */
export function getTerminalTheme(theme: Theme): ITheme {
  return theme === 'dark' ? darkTerminalTheme : lightTerminalTheme
}
