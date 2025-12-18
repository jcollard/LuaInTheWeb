/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { ImageCache } from '../../src/renderer/ImageCache.js';

describe('ImageCache', () => {
  let cache: ImageCache;

  beforeEach(() => {
    cache = new ImageCache();
  });

  describe('constructor', () => {
    it('should create an empty cache', () => {
      expect(cache).toBeDefined();
      expect(cache.has('nonexistent')).toBe(false);
    });
  });

  describe('set', () => {
    it('should store an image by name', () => {
      const img = new Image();
      cache.set('player', img);
      expect(cache.has('player')).toBe(true);
    });

    it('should overwrite existing image with same name', () => {
      const img1 = new Image();
      img1.src = 'first.png';
      const img2 = new Image();
      img2.src = 'second.png';

      cache.set('sprite', img1);
      cache.set('sprite', img2);

      expect(cache.get('sprite')).toBe(img2);
    });
  });

  describe('get', () => {
    it('should return stored image by name', () => {
      const img = new Image();
      cache.set('enemy', img);
      expect(cache.get('enemy')).toBe(img);
    });

    it('should return undefined for non-existent name', () => {
      expect(cache.get('missing')).toBeUndefined();
    });
  });

  describe('has', () => {
    it('should return true for existing asset', () => {
      const img = new Image();
      cache.set('background', img);
      expect(cache.has('background')).toBe(true);
    });

    it('should return false for non-existent asset', () => {
      expect(cache.has('nothing')).toBe(false);
    });
  });

  describe('clear', () => {
    it('should remove all stored images', () => {
      const img1 = new Image();
      const img2 = new Image();
      cache.set('a', img1);
      cache.set('b', img2);

      cache.clear();

      expect(cache.has('a')).toBe(false);
      expect(cache.has('b')).toBe(false);
    });

    it('should work on empty cache', () => {
      expect(() => cache.clear()).not.toThrow();
    });
  });
});
