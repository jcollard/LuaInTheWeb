import { describe, it, expect } from 'vitest'
import { getTerminalTheme, darkTerminalTheme, lightTerminalTheme } from './terminalTheme'
import type { Theme } from '../../contexts/types'

describe('terminalTheme', () => {
  describe('darkTerminalTheme', () => {
    it('should have dark background color', () => {
      expect(darkTerminalTheme.background).toBe('#1e1e1e')
    })

    it('should have light foreground color', () => {
      expect(darkTerminalTheme.foreground).toBe('#cccccc')
    })

    it('should have cursor color', () => {
      expect(darkTerminalTheme.cursor).toBe('#ffffff')
    })

    it('should have cursorAccent color', () => {
      expect(darkTerminalTheme.cursorAccent).toBe('#1e1e1e')
    })

    it('should have selection colors', () => {
      expect(darkTerminalTheme.selectionBackground).toBe('#264f78')
      expect(darkTerminalTheme.selectionForeground).toBe('#ffffff')
      expect(darkTerminalTheme.selectionInactiveBackground).toBe('#3a3d41')
    })

    it('should have standard ANSI colors', () => {
      expect(darkTerminalTheme.black).toBe('#000000')
      expect(darkTerminalTheme.red).toBe('#cd3131')
      expect(darkTerminalTheme.green).toBe('#0dbc79')
      expect(darkTerminalTheme.yellow).toBe('#e5e510')
      expect(darkTerminalTheme.blue).toBe('#2472c8')
      expect(darkTerminalTheme.magenta).toBe('#bc3fbc')
      expect(darkTerminalTheme.cyan).toBe('#11a8cd')
      expect(darkTerminalTheme.white).toBe('#e5e5e5')
    })

    it('should have bright ANSI colors', () => {
      expect(darkTerminalTheme.brightBlack).toBe('#666666')
      expect(darkTerminalTheme.brightRed).toBe('#f14c4c')
      expect(darkTerminalTheme.brightGreen).toBe('#23d18b')
      expect(darkTerminalTheme.brightYellow).toBe('#f5f543')
      expect(darkTerminalTheme.brightBlue).toBe('#3b8eea')
      expect(darkTerminalTheme.brightMagenta).toBe('#d670d6')
      expect(darkTerminalTheme.brightCyan).toBe('#29b8db')
      expect(darkTerminalTheme.brightWhite).toBe('#ffffff')
    })
  })

  describe('lightTerminalTheme', () => {
    it('should have light background color', () => {
      expect(lightTerminalTheme.background).toBe('#ffffff')
    })

    it('should have dark foreground color', () => {
      expect(lightTerminalTheme.foreground).toBe('#1e1e1e')
    })

    it('should have cursor color', () => {
      expect(lightTerminalTheme.cursor).toBe('#1e1e1e')
    })

    it('should have cursorAccent color', () => {
      expect(lightTerminalTheme.cursorAccent).toBe('#ffffff')
    })

    it('should have selection colors', () => {
      expect(lightTerminalTheme.selectionBackground).toBe('#add6ff')
      expect(lightTerminalTheme.selectionForeground).toBe('#1e1e1e')
      expect(lightTerminalTheme.selectionInactiveBackground).toBe('#e5ebf1')
    })

    it('should have standard ANSI colors', () => {
      expect(lightTerminalTheme.black).toBe('#000000')
      expect(lightTerminalTheme.red).toBe('#cd3131')
      expect(lightTerminalTheme.green).toBe('#107c10')
      expect(lightTerminalTheme.yellow).toBe('#795e00')
      expect(lightTerminalTheme.blue).toBe('#0066b8')
      expect(lightTerminalTheme.magenta).toBe('#bc05bc')
      expect(lightTerminalTheme.cyan).toBe('#0598bc')
      expect(lightTerminalTheme.white).toBe('#1e1e1e')
    })

    it('should have bright ANSI colors', () => {
      expect(lightTerminalTheme.brightBlack).toBe('#666666')
      expect(lightTerminalTheme.brightRed).toBe('#d02020')
      expect(lightTerminalTheme.brightGreen).toBe('#14a514')
      expect(lightTerminalTheme.brightYellow).toBe('#b89500')
      expect(lightTerminalTheme.brightBlue).toBe('#0078d4')
      expect(lightTerminalTheme.brightMagenta).toBe('#d670d6')
      expect(lightTerminalTheme.brightCyan).toBe('#0598bc')
      expect(lightTerminalTheme.brightWhite).toBe('#3b3b3b')
    })
  })

  describe('getTerminalTheme', () => {
    it('should return dark theme when theme is dark', () => {
      const theme: Theme = 'dark'
      expect(getTerminalTheme(theme)).toBe(darkTerminalTheme)
    })

    it('should return light theme when theme is light', () => {
      const theme: Theme = 'light'
      expect(getTerminalTheme(theme)).toBe(lightTerminalTheme)
    })
  })
})
