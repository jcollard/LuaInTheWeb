import { describe, it, expect } from 'vitest'
import { encodeBase64, toDataUrl } from '../src/base64'

describe('base64', () => {
  describe('encodeBase64', () => {
    it('should encode Uint8Array to base64 string', () => {
      // "Hello" in ASCII
      const data = new Uint8Array([72, 101, 108, 108, 111])
      expect(encodeBase64(data)).toBe('SGVsbG8=')
    })

    it('should handle empty data', () => {
      const data = new Uint8Array([])
      expect(encodeBase64(data)).toBe('')
    })

    it('should handle binary data with high bytes (PNG header)', () => {
      // PNG magic bytes: 0x89 0x50 0x4E 0x47
      const data = new Uint8Array([0x89, 0x50, 0x4e, 0x47])
      expect(encodeBase64(data)).toBe('iVBORw==')
    })

    it('should handle single byte', () => {
      const data = new Uint8Array([65]) // 'A'
      expect(encodeBase64(data)).toBe('QQ==')
    })

    it('should handle two bytes', () => {
      const data = new Uint8Array([65, 66]) // 'AB'
      expect(encodeBase64(data)).toBe('QUI=')
    })
  })

  describe('toDataUrl', () => {
    it('should create data URL with correct MIME type for image', () => {
      const data = new Uint8Array([0x89, 0x50, 0x4e, 0x47])
      const result = toDataUrl(data, 'image/png')
      expect(result).toBe('data:image/png;base64,iVBORw==')
    })

    it('should create data URL for audio', () => {
      const data = new Uint8Array([0xff, 0xfb])
      const result = toDataUrl(data, 'audio/mpeg')
      expect(result).toBe('data:audio/mpeg;base64,//s=')
    })

    it('should create data URL for font', () => {
      const data = new Uint8Array([0, 1, 0, 0])
      const result = toDataUrl(data, 'font/ttf')
      expect(result).toBe('data:font/ttf;base64,AAEAAA==')
    })

    it('should handle empty data', () => {
      const data = new Uint8Array([])
      const result = toDataUrl(data, 'text/plain')
      expect(result).toBe('data:text/plain;base64,')
    })
  })
})
