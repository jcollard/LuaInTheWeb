import { isMacOS, hasModifierKey, getModifierKeyLabel } from './platformShortcuts'

describe('platformShortcuts', () => {
  const originalPlatform = navigator.platform

  afterEach(() => {
    Object.defineProperty(navigator, 'platform', {
      value: originalPlatform,
      configurable: true,
    })
  })

  describe('isMacOS', () => {
    it('should return true for MacIntel', () => {
      Object.defineProperty(navigator, 'platform', {
        value: 'MacIntel',
        configurable: true,
      })
      expect(isMacOS()).toBe(true)
    })

    it('should return true for MacPPC', () => {
      Object.defineProperty(navigator, 'platform', {
        value: 'MacPPC',
        configurable: true,
      })
      expect(isMacOS()).toBe(true)
    })

    it('should return true for MacARM (Apple Silicon)', () => {
      Object.defineProperty(navigator, 'platform', {
        value: 'MacARM',
        configurable: true,
      })
      expect(isMacOS()).toBe(true)
    })

    it('should return false for Win32', () => {
      Object.defineProperty(navigator, 'platform', {
        value: 'Win32',
        configurable: true,
      })
      expect(isMacOS()).toBe(false)
    })

    it('should return false for Linux x86_64', () => {
      Object.defineProperty(navigator, 'platform', {
        value: 'Linux x86_64',
        configurable: true,
      })
      expect(isMacOS()).toBe(false)
    })
  })

  describe('hasModifierKey', () => {
    describe('on macOS', () => {
      beforeEach(() => {
        Object.defineProperty(navigator, 'platform', {
          value: 'MacIntel',
          configurable: true,
        })
      })

      it('should return true when metaKey is pressed', () => {
        const event = new KeyboardEvent('keydown', { metaKey: true })
        expect(hasModifierKey(event)).toBe(true)
      })

      it('should return false when only ctrlKey is pressed', () => {
        const event = new KeyboardEvent('keydown', { ctrlKey: true })
        expect(hasModifierKey(event)).toBe(false)
      })

      it('should return false when no modifier is pressed', () => {
        const event = new KeyboardEvent('keydown', {})
        expect(hasModifierKey(event)).toBe(false)
      })
    })

    describe('on Windows/Linux', () => {
      beforeEach(() => {
        Object.defineProperty(navigator, 'platform', {
          value: 'Win32',
          configurable: true,
        })
      })

      it('should return true when ctrlKey is pressed', () => {
        const event = new KeyboardEvent('keydown', { ctrlKey: true })
        expect(hasModifierKey(event)).toBe(true)
      })

      it('should return false when only metaKey is pressed', () => {
        const event = new KeyboardEvent('keydown', { metaKey: true })
        expect(hasModifierKey(event)).toBe(false)
      })

      it('should return false when no modifier is pressed', () => {
        const event = new KeyboardEvent('keydown', {})
        expect(hasModifierKey(event)).toBe(false)
      })
    })
  })

  describe('getModifierKeyLabel', () => {
    it('should return Command symbol on macOS', () => {
      Object.defineProperty(navigator, 'platform', {
        value: 'MacIntel',
        configurable: true,
      })
      expect(getModifierKeyLabel()).toBe('⌘')
    })

    it('should return Ctrl on Windows', () => {
      Object.defineProperty(navigator, 'platform', {
        value: 'Win32',
        configurable: true,
      })
      expect(getModifierKeyLabel()).toBe('Ctrl')
    })

    it('should return Ctrl on Linux', () => {
      Object.defineProperty(navigator, 'platform', {
        value: 'Linux x86_64',
        configurable: true,
      })
      expect(getModifierKeyLabel()).toBe('Ctrl')
    })
  })
})
