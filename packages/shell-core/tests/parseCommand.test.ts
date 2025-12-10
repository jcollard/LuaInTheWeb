import { describe, it, expect } from 'vitest'
import { parseCommand } from '../src/parseCommand'

describe('parseCommand', () => {
  describe('basic parsing', () => {
    it('should parse a simple command with no arguments', () => {
      const result = parseCommand('ls')
      expect(result.command).toBe('ls')
      expect(result.args).toEqual([])
      expect(result.raw).toBe('ls')
    })

    it('should parse a command with one argument', () => {
      const result = parseCommand('cd /home')
      expect(result.command).toBe('cd')
      expect(result.args).toEqual(['/home'])
    })

    it('should parse a command with multiple arguments', () => {
      const result = parseCommand('cp file1.txt file2.txt /backup')
      expect(result.command).toBe('cp')
      expect(result.args).toEqual(['file1.txt', 'file2.txt', '/backup'])
    })

    it('should handle extra whitespace between arguments', () => {
      const result = parseCommand('ls   -la    /home')
      expect(result.command).toBe('ls')
      expect(result.args).toEqual(['-la', '/home'])
    })

    it('should trim leading and trailing whitespace', () => {
      const result = parseCommand('  ls -la  ')
      expect(result.command).toBe('ls')
      expect(result.args).toEqual(['-la'])
    })
  })

  describe('empty and whitespace input', () => {
    it('should return empty command for empty string', () => {
      const result = parseCommand('')
      expect(result.command).toBe('')
      expect(result.args).toEqual([])
    })

    it('should return empty command for whitespace only', () => {
      const result = parseCommand('   ')
      expect(result.command).toBe('')
      expect(result.args).toEqual([])
    })
  })

  describe('quoted arguments', () => {
    it('should handle double-quoted argument with spaces', () => {
      const result = parseCommand('echo "hello world"')
      expect(result.command).toBe('echo')
      expect(result.args).toEqual(['hello world'])
    })

    it('should handle single-quoted argument with spaces', () => {
      const result = parseCommand("echo 'hello world'")
      expect(result.command).toBe('echo')
      expect(result.args).toEqual(['hello world'])
    })

    it('should handle multiple quoted arguments', () => {
      const result = parseCommand('echo "hello" "world"')
      expect(result.command).toBe('echo')
      expect(result.args).toEqual(['hello', 'world'])
    })

    it('should handle mixed quoted and unquoted arguments', () => {
      const result = parseCommand('cp "my file.txt" /backup')
      expect(result.command).toBe('cp')
      expect(result.args).toEqual(['my file.txt', '/backup'])
    })

    it('should handle empty quoted strings', () => {
      const result = parseCommand('echo "" ""')
      expect(result.command).toBe('echo')
      expect(result.args).toEqual(['', ''])
    })

    it('should preserve quotes inside other quotes', () => {
      const result = parseCommand('echo "he said \'hello\'"')
      expect(result.command).toBe('echo')
      expect(result.args).toEqual(["he said 'hello'"])
    })

    it('should preserve double quotes inside single quotes', () => {
      const result = parseCommand("echo 'he said \"hello\"'")
      expect(result.command).toBe('echo')
      expect(result.args).toEqual(['he said "hello"'])
    })
  })

  describe('escape sequences', () => {
    it('should handle escaped spaces', () => {
      const result = parseCommand('cd my\\ folder')
      expect(result.command).toBe('cd')
      expect(result.args).toEqual(['my folder'])
    })

    it('should handle escaped quotes', () => {
      const result = parseCommand('echo \\"hello\\"')
      expect(result.command).toBe('echo')
      expect(result.args).toEqual(['"hello"'])
    })

    it('should handle escaped backslash', () => {
      const result = parseCommand('echo \\\\path')
      expect(result.command).toBe('echo')
      expect(result.args).toEqual(['\\path'])
    })
  })

  describe('special characters', () => {
    it('should handle arguments with dashes', () => {
      const result = parseCommand('ls -la --all')
      expect(result.command).toBe('ls')
      expect(result.args).toEqual(['-la', '--all'])
    })

    it('should handle arguments with equals signs', () => {
      const result = parseCommand('export VAR=value')
      expect(result.command).toBe('export')
      expect(result.args).toEqual(['VAR=value'])
    })

    it('should handle paths with dots', () => {
      const result = parseCommand('cd ../folder')
      expect(result.command).toBe('cd')
      expect(result.args).toEqual(['../folder'])
    })
  })

  describe('raw preservation', () => {
    it('should preserve the original raw command', () => {
      const input = '  echo   "hello world"  '
      const result = parseCommand(input)
      expect(result.raw).toBe(input)
    })
  })
})
