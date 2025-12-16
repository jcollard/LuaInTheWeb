/**
 * Tests for canvas pop-out utility.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { openCanvasPopout } from './canvasPopout'

describe('canvasPopout', () => {
  let mockPopup: {
    document: {
      write: ReturnType<typeof vi.fn>
      close: ReturnType<typeof vi.fn>
    }
  }

  beforeEach(() => {
    mockPopup = {
      document: {
        write: vi.fn(),
        close: vi.fn(),
      },
    }
    vi.spyOn(window, 'open').mockReturnValue(mockPopup as unknown as Window)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('openCanvasPopout', () => {
    it('opens a new window', () => {
      openCanvasPopout('print("hello")')
      expect(window.open).toHaveBeenCalled()
    })

    it('opens window with correct dimensions', () => {
      openCanvasPopout('print("hello")', { width: 640, height: 480 })
      expect(window.open).toHaveBeenCalledWith(
        '',
        '_blank',
        expect.stringContaining('width=672') // 640 + 32 padding
      )
      expect(window.open).toHaveBeenCalledWith(
        '',
        '_blank',
        expect.stringContaining('height=580') // 480 + 100 toolbar
      )
    })

    it('uses default dimensions when not specified', () => {
      openCanvasPopout('print("hello")')
      expect(window.open).toHaveBeenCalledWith(
        '',
        '_blank',
        expect.stringContaining('width=832') // 800 + 32
      )
      expect(window.open).toHaveBeenCalledWith(
        '',
        '_blank',
        expect.stringContaining('height=700') // 600 + 100
      )
    })

    it('returns the popup window', () => {
      const result = openCanvasPopout('print("hello")')
      expect(result).toBe(mockPopup)
    })

    it('returns null if popup was blocked', () => {
      vi.spyOn(window, 'open').mockReturnValue(null)
      const result = openCanvasPopout('print("hello")')
      expect(result).toBeNull()
    })

    it('writes HTML content to popup', () => {
      openCanvasPopout('print("hello")')
      expect(mockPopup.document.write).toHaveBeenCalled()
    })

    it('closes document after writing', () => {
      openCanvasPopout('print("hello")')
      expect(mockPopup.document.close).toHaveBeenCalled()
    })

    it('includes code in the HTML', () => {
      openCanvasPopout('local x = 42')
      const writtenContent = mockPopup.document.write.mock.calls[0][0]
      expect(writtenContent).toContain('local x = 42')
    })

    it('includes custom title in the HTML', () => {
      openCanvasPopout('print("hello")', { title: 'My Game' })
      const writtenContent = mockPopup.document.write.mock.calls[0][0]
      expect(writtenContent).toContain('<title>My Game</title>')
    })

    it('escapes HTML in title', () => {
      openCanvasPopout('print("hello")', { title: '<script>alert("xss")</script>' })
      const writtenContent = mockPopup.document.write.mock.calls[0][0]
      expect(writtenContent).not.toContain('<script>alert("xss")</script></title>')
      expect(writtenContent).toContain('&lt;script&gt;')
    })

    it('includes canvas with correct dimensions', () => {
      openCanvasPopout('print("hello")', { width: 400, height: 300 })
      const writtenContent = mockPopup.document.write.mock.calls[0][0]
      expect(writtenContent).toContain('width="400"')
      expect(writtenContent).toContain('height="300"')
    })

    it('opens window without menu/toolbar/location bars', () => {
      openCanvasPopout('print("hello")')
      expect(window.open).toHaveBeenCalledWith(
        '',
        '_blank',
        expect.stringContaining('menubar=no')
      )
      expect(window.open).toHaveBeenCalledWith(
        '',
        '_blank',
        expect.stringContaining('toolbar=no')
      )
      expect(window.open).toHaveBeenCalledWith(
        '',
        '_blank',
        expect.stringContaining('location=no')
      )
    })
  })
})
