/**
 * Tests for binary extensions utility.
 */
import { describe, it, expect } from 'vitest'
import { BINARY_EXTENSIONS, isBinaryExtension } from './binaryExtensions'

describe('binaryExtensions', () => {
  describe('BINARY_EXTENSIONS', () => {
    it('should contain common image extensions', () => {
      expect(BINARY_EXTENSIONS.has('.png')).toBe(true)
      expect(BINARY_EXTENSIONS.has('.jpg')).toBe(true)
      expect(BINARY_EXTENSIONS.has('.gif')).toBe(true)
    })

    it('should contain common audio extensions', () => {
      expect(BINARY_EXTENSIONS.has('.mp3')).toBe(true)
      expect(BINARY_EXTENSIONS.has('.wav')).toBe(true)
    })

    it('should contain common video extensions', () => {
      expect(BINARY_EXTENSIONS.has('.mp4')).toBe(true)
      expect(BINARY_EXTENSIONS.has('.webm')).toBe(true)
    })

    it('should not contain text extensions', () => {
      expect(BINARY_EXTENSIONS.has('.lua')).toBe(false)
      expect(BINARY_EXTENSIONS.has('.md')).toBe(false)
      expect(BINARY_EXTENSIONS.has('.json')).toBe(false)
    })
  })

  describe('isBinaryExtension', () => {
    it('should return true for image extensions', () => {
      expect(isBinaryExtension('photo.png')).toBe(true)
      expect(isBinaryExtension('image.jpg')).toBe(true)
      expect(isBinaryExtension('icon.svg')).toBe(true)
    })

    it('should return true for audio extensions', () => {
      expect(isBinaryExtension('song.mp3')).toBe(true)
      expect(isBinaryExtension('sound.wav')).toBe(true)
    })

    it('should return true for video extensions', () => {
      expect(isBinaryExtension('video.mp4')).toBe(true)
      expect(isBinaryExtension('clip.webm')).toBe(true)
    })

    it('should return true for document extensions', () => {
      expect(isBinaryExtension('doc.pdf')).toBe(true)
      expect(isBinaryExtension('spreadsheet.xlsx')).toBe(true)
    })

    it('should return false for text extensions', () => {
      expect(isBinaryExtension('script.lua')).toBe(false)
      expect(isBinaryExtension('readme.md')).toBe(false)
      expect(isBinaryExtension('config.json')).toBe(false)
      expect(isBinaryExtension('style.css')).toBe(false)
    })

    it('should handle uppercase extensions', () => {
      expect(isBinaryExtension('PHOTO.PNG')).toBe(true)
      expect(isBinaryExtension('IMAGE.JPG')).toBe(true)
    })

    it('should handle paths with directories', () => {
      expect(isBinaryExtension('/path/to/image.png')).toBe(true)
      expect(isBinaryExtension('folder/script.lua')).toBe(false)
    })

    it('should return false for files without extensions', () => {
      expect(isBinaryExtension('Makefile')).toBe(false)
      expect(isBinaryExtension('README')).toBe(false)
    })
  })
})
