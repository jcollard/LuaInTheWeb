import type { TerminalCommand } from './useBashTerminal'

/**
 * Interface for terminal-like objects that can execute commands.
 * This allows us to work with xterm.js Terminal or mock implementations.
 */
export interface TerminalLike {
  write: (data: string) => void
  writeln: (data: string) => void
}

/**
 * ANSI escape code direction mappings for cursor movement
 */
const cursorDirectionCodes: Record<string, string> = {
  up: 'A',
  down: 'B',
  right: 'C',
  left: 'D',
}

/**
 * Executes an array of terminal commands on the given terminal.
 * This bridges the hook's TerminalCommand[] output to actual xterm operations.
 */
export function executeTerminalCommands(
  terminal: TerminalLike,
  commands: TerminalCommand[]
): void {
  for (const command of commands) {
    switch (command.type) {
      case 'write':
        terminal.write(command.data ?? '')
        break

      case 'writeln':
        terminal.writeln(command.data ?? '')
        break

      case 'moveCursor': {
        const direction = command.direction
        if (direction) {
          const code = cursorDirectionCodes[direction]
          const count = command.count ?? 1
          terminal.write(`\x1b[${count}${code}`)
        }
        break
      }

      case 'clearLine':
        // Move to start of line (\r) and clear from cursor to end (\x1b[K)
        terminal.write('\r\x1b[K')
        break

      case 'clearToEnd':
        // Clear from cursor to end of line
        terminal.write('\x1b[K')
        break
    }
  }
}
