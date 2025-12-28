/**
 * Standalone shell runtime for exported HTML.
 *
 * This module provides:
 * 1. The shell Lua library code
 * 2. Setup function to register JS bridge functions on a wasmoon engine
 * 3. xterm.js integration for terminal output
 */

import { LUA_SHELL_CODE } from '@lua-learning/lua-runtime'

import type { LuaEngine } from 'wasmoon'

// Re-export the shell Lua code for embedding
export const shellLuaCode = LUA_SHELL_CODE

/**
 * Shell runtime state for standalone execution.
 */
export interface ShellRuntimeState {
  /** Write function for terminal output */
  write: (text: string) => void
  /** Terminal width in columns */
  columns: number
  /** Terminal height in rows */
  rows: number
  /** Pending input buffer for io.read */
  inputBuffer: string
  /** Resolve function for pending input */
  inputResolve: ((value: string) => void) | null
  /** Character count for io.read(n) mode */
  inputCharCount: number | null
}

/**
 * Create a new shell runtime state.
 */
export function createShellRuntimeState(
  write: (text: string) => void,
  columns: number = 80,
  rows: number = 24
): ShellRuntimeState {
  return {
    write,
    columns,
    rows,
    inputBuffer: '',
    inputResolve: null,
    inputCharCount: null,
  }
}

/**
 * Set up all shell bridge functions on a wasmoon engine.
 */
export function setupShellBridge(
  engine: LuaEngine,
  state: ShellRuntimeState
): void {
  // __js_write - Write text to the terminal (used by shell.lua for ANSI sequences)
  engine.global.set('__js_write', (text: string) => {
    state.write(text)
  })

  // __shell_get_width - Get terminal width in columns
  engine.global.set('__shell_get_width', () => state.columns)

  // __shell_get_height - Get terminal height in rows
  engine.global.set('__shell_get_height', () => state.rows)

  // Override print to write to terminal
  engine.global.set('print', (...args: unknown[]) => {
    const output = args
      .map((arg) => {
        if (arg === null || arg === undefined) return 'nil'
        return String(arg)
      })
      .join('\t')
    state.write(output + '\n')
  })

  // Override io.write for terminal output
  const io = engine.global.get('io')
  if (io && typeof io === 'object') {
    ;(io as { write?: (text: string) => void }).write = (text: string) => {
      state.write(text)
    }

    // Override io.read for input handling
    ;(io as { read?: (count?: number | string) => Promise<string | null> })
      .read = (count?: number | string): Promise<string | null> => {
      return new Promise((resolve) => {
        if (typeof count === 'number' && count > 0) {
          // Character mode - wait for exactly N characters
          state.inputCharCount = count
          state.inputResolve = (input: string) => {
            resolve(input)
          }
        } else if (count === '*a' || count === '*all') {
          // Read all - not really applicable in interactive mode
          state.inputResolve = resolve
        } else {
          // Line mode - wait for Enter
          state.inputCharCount = null
          state.inputResolve = (input: string) => {
            resolve(input)
          }
        }
      })
    }

    engine.global.set('io', io)
  }
}

/**
 * Handle user input from the terminal.
 * Returns true if input was consumed (waiting for input), false otherwise.
 */
export function handleInput(
  state: ShellRuntimeState,
  char: string
): boolean {
  if (!state.inputResolve) {
    return false
  }

  if (state.inputCharCount !== null) {
    // Character mode
    state.inputBuffer += char
    if (state.inputBuffer.length >= state.inputCharCount) {
      const input = state.inputBuffer.slice(0, state.inputCharCount)
      state.inputBuffer = state.inputBuffer.slice(state.inputCharCount)
      state.inputCharCount = null
      const resolve = state.inputResolve
      state.inputResolve = null
      resolve(input)
    }
    return true
  } else {
    // Line mode
    if (char === '\r' || char === '\n') {
      const input = state.inputBuffer
      state.inputBuffer = ''
      const resolve = state.inputResolve
      state.inputResolve = null
      resolve(input)
      return true
    } else if (char === '\x7f' || char === '\b') {
      // Backspace
      if (state.inputBuffer.length > 0) {
        state.inputBuffer = state.inputBuffer.slice(0, -1)
        state.write('\b \b') // Erase character on screen
      }
      return true
    } else if (char.length === 1 && char.charCodeAt(0) >= 32) {
      // Printable character
      state.inputBuffer += char
      state.write(char) // Echo character
      return true
    }
    return true
  }
}
