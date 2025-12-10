import { describe, it, expect, vi } from 'vitest'
import { executeTerminalCommands } from './executeTerminalCommands'
import type { TerminalCommand } from './useBashTerminal'

describe('executeTerminalCommands', () => {
  const createMockTerminal = () => ({
    write: vi.fn(),
    writeln: vi.fn(),
  })

  describe('write command', () => {
    it('should call terminal.write with data', () => {
      // Arrange
      const terminal = createMockTerminal()
      const commands: TerminalCommand[] = [{ type: 'write', data: 'hello' }]

      // Act
      executeTerminalCommands(terminal, commands)

      // Assert
      expect(terminal.write).toHaveBeenCalledWith('hello')
    })

    it('should handle empty data', () => {
      // Arrange
      const terminal = createMockTerminal()
      const commands: TerminalCommand[] = [{ type: 'write', data: '' }]

      // Act
      executeTerminalCommands(terminal, commands)

      // Assert
      expect(terminal.write).toHaveBeenCalledWith('')
    })

    it('should handle undefined data as empty string', () => {
      // Arrange
      const terminal = createMockTerminal()
      const commands: TerminalCommand[] = [{ type: 'write' }]

      // Act
      executeTerminalCommands(terminal, commands)

      // Assert
      expect(terminal.write).toHaveBeenCalledWith('')
    })
  })

  describe('writeln command', () => {
    it('should call terminal.writeln with data', () => {
      // Arrange
      const terminal = createMockTerminal()
      const commands: TerminalCommand[] = [{ type: 'writeln', data: 'hello' }]

      // Act
      executeTerminalCommands(terminal, commands)

      // Assert
      expect(terminal.writeln).toHaveBeenCalledWith('hello')
    })

    it('should handle empty data', () => {
      // Arrange
      const terminal = createMockTerminal()
      const commands: TerminalCommand[] = [{ type: 'writeln', data: '' }]

      // Act
      executeTerminalCommands(terminal, commands)

      // Assert
      expect(terminal.writeln).toHaveBeenCalledWith('')
    })
  })

  describe('moveCursor command', () => {
    it('should move cursor left', () => {
      // Arrange
      const terminal = createMockTerminal()
      const commands: TerminalCommand[] = [
        { type: 'moveCursor', direction: 'left', count: 3 },
      ]

      // Act
      executeTerminalCommands(terminal, commands)

      // Assert
      expect(terminal.write).toHaveBeenCalledWith('\x1b[3D')
    })

    it('should move cursor right', () => {
      // Arrange
      const terminal = createMockTerminal()
      const commands: TerminalCommand[] = [
        { type: 'moveCursor', direction: 'right', count: 5 },
      ]

      // Act
      executeTerminalCommands(terminal, commands)

      // Assert
      expect(terminal.write).toHaveBeenCalledWith('\x1b[5C')
    })

    it('should move cursor up', () => {
      // Arrange
      const terminal = createMockTerminal()
      const commands: TerminalCommand[] = [
        { type: 'moveCursor', direction: 'up', count: 2 },
      ]

      // Act
      executeTerminalCommands(terminal, commands)

      // Assert
      expect(terminal.write).toHaveBeenCalledWith('\x1b[2A')
    })

    it('should move cursor down', () => {
      // Arrange
      const terminal = createMockTerminal()
      const commands: TerminalCommand[] = [
        { type: 'moveCursor', direction: 'down', count: 1 },
      ]

      // Act
      executeTerminalCommands(terminal, commands)

      // Assert
      expect(terminal.write).toHaveBeenCalledWith('\x1b[1B')
    })

    it('should default count to 1 if not specified', () => {
      // Arrange
      const terminal = createMockTerminal()
      const commands: TerminalCommand[] = [
        { type: 'moveCursor', direction: 'left' },
      ]

      // Act
      executeTerminalCommands(terminal, commands)

      // Assert
      expect(terminal.write).toHaveBeenCalledWith('\x1b[1D')
    })
  })

  describe('clearLine command', () => {
    it('should clear entire line', () => {
      // Arrange
      const terminal = createMockTerminal()
      const commands: TerminalCommand[] = [{ type: 'clearLine' }]

      // Act
      executeTerminalCommands(terminal, commands)

      // Assert
      // Move to start of line, then clear from cursor to end
      expect(terminal.write).toHaveBeenCalledWith('\r\x1b[K')
    })
  })

  describe('clearToEnd command', () => {
    it('should clear from cursor to end of line', () => {
      // Arrange
      const terminal = createMockTerminal()
      const commands: TerminalCommand[] = [{ type: 'clearToEnd' }]

      // Act
      executeTerminalCommands(terminal, commands)

      // Assert
      expect(terminal.write).toHaveBeenCalledWith('\x1b[K')
    })
  })

  describe('multiple commands', () => {
    it('should execute commands in order', () => {
      // Arrange
      const terminal = createMockTerminal()
      const commands: TerminalCommand[] = [
        { type: 'clearLine' },
        { type: 'write', data: 'hello' },
        { type: 'moveCursor', direction: 'left', count: 2 },
      ]

      // Act
      executeTerminalCommands(terminal, commands)

      // Assert
      expect(terminal.write).toHaveBeenNthCalledWith(1, '\r\x1b[K')
      expect(terminal.write).toHaveBeenNthCalledWith(2, 'hello')
      expect(terminal.write).toHaveBeenNthCalledWith(3, '\x1b[2D')
    })
  })

  describe('empty commands array', () => {
    it('should do nothing for empty array', () => {
      // Arrange
      const terminal = createMockTerminal()
      const commands: TerminalCommand[] = []

      // Act
      executeTerminalCommands(terminal, commands)

      // Assert
      expect(terminal.write).not.toHaveBeenCalled()
      expect(terminal.writeln).not.toHaveBeenCalled()
    })
  })
})
