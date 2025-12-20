/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { FontCache } from '../../src/renderer/FontCache.js';

// Mock FontFace for jsdom environment
class MockFontFace {
  family: string;
  source: string;

  constructor(family: string, source: string) {
    this.family = family;
    this.source = source;
  }
}

describe('FontCache', () => {
  let cache: FontCache;

  beforeEach(() => {
    cache = new FontCache();
  });

  describe('constructor', () => {
    it('should create an empty cache', () => {
      expect(cache).toBeDefined();
      expect(cache.has('nonexistent')).toBe(false);
    });
  });

  describe('set', () => {
    it('should store a font by name', () => {
      const font = new MockFontFace('TestFont', 'local(Arial)') as unknown as FontFace;
      cache.set('GameFont', font);
      expect(cache.has('GameFont')).toBe(true);
    });

    it('should overwrite existing font with same name', () => {
      const font1 = new MockFontFace('Font1', 'local(Arial)') as unknown as FontFace;
      const font2 = new MockFontFace('Font2', 'local(Times)') as unknown as FontFace;

      cache.set('custom', font1);
      cache.set('custom', font2);

      expect(cache.get('custom')).toBe(font2);
    });
  });

  describe('get', () => {
    it('should return stored font by name', () => {
      const font = new MockFontFace('MyFont', 'local(Arial)') as unknown as FontFace;
      cache.set('title', font);
      expect(cache.get('title')).toBe(font);
    });

    it('should return undefined for non-existent name', () => {
      expect(cache.get('missing')).toBeUndefined();
    });
  });

  describe('has', () => {
    it('should return true for existing font', () => {
      const font = new MockFontFace('HeaderFont', 'local(Arial)') as unknown as FontFace;
      cache.set('header', font);
      expect(cache.has('header')).toBe(true);
    });

    it('should return false for non-existent font', () => {
      expect(cache.has('nothing')).toBe(false);
    });
  });

  describe('getLoadedFonts', () => {
    it('should return empty array for empty cache', () => {
      expect(cache.getLoadedFonts()).toEqual([]);
    });

    it('should return all font names', () => {
      const font1 = new MockFontFace('Font1', 'local(Arial)') as unknown as FontFace;
      const font2 = new MockFontFace('Font2', 'local(Times)') as unknown as FontFace;
      cache.set('alpha', font1);
      cache.set('beta', font2);

      const names = cache.getLoadedFonts();
      expect(names).toContain('alpha');
      expect(names).toContain('beta');
      expect(names).toHaveLength(2);
    });
  });

  describe('clear', () => {
    it('should remove all stored fonts', () => {
      const font1 = new MockFontFace('Font1', 'local(Arial)') as unknown as FontFace;
      const font2 = new MockFontFace('Font2', 'local(Times)') as unknown as FontFace;
      cache.set('a', font1);
      cache.set('b', font2);

      cache.clear();

      expect(cache.has('a')).toBe(false);
      expect(cache.has('b')).toBe(false);
      expect(cache.getLoadedFonts()).toEqual([]);
    });

    it('should work on empty cache', () => {
      expect(() => cache.clear()).not.toThrow();
    });
  });
});
