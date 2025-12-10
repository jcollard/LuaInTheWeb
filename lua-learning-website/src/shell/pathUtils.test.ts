import { describe, it, expect } from 'vitest';
import {
  resolvePath,
  normalizePath,
  getParentPath,
  joinPath,
} from './pathUtils';

describe('pathUtils', () => {
  describe('resolvePath', () => {
    it('resolves ~ to root', () => {
      expect(resolvePath('/home/user', '~')).toBe('/');
    });

    it('resolves empty string to root', () => {
      expect(resolvePath('/home/user', '')).toBe('/');
    });

    it('resolves absolute path directly', () => {
      expect(resolvePath('/home/user', '/other/path')).toBe('/other/path');
    });

    it('resolves relative path from base', () => {
      expect(resolvePath('/home', 'user')).toBe('/home/user');
    });

    it('resolves relative path with .. from base', () => {
      expect(resolvePath('/home/user', '../other')).toBe('/home/other');
    });

    it('resolves from root correctly', () => {
      expect(resolvePath('/', 'home')).toBe('/home');
    });

    it('handles nested relative paths', () => {
      expect(resolvePath('/home', 'user/documents')).toBe(
        '/home/user/documents'
      );
    });
  });

  describe('normalizePath', () => {
    it('normalizes path with double slashes', () => {
      expect(normalizePath('/home//user')).toBe('/home/user');
    });

    it('normalizes path with . components', () => {
      expect(normalizePath('/home/./user')).toBe('/home/user');
    });

    it('normalizes path with .. components', () => {
      expect(normalizePath('/home/user/../other')).toBe('/home/other');
    });

    it('handles multiple .. at start without going above root', () => {
      expect(normalizePath('/../..')).toBe('/');
    });

    it('returns root for root path', () => {
      expect(normalizePath('/')).toBe('/');
    });

    it('handles complex path', () => {
      expect(normalizePath('/a/b/../c/./d/../e')).toBe('/a/c/e');
    });
  });

  describe('getParentPath', () => {
    it('returns root for root', () => {
      expect(getParentPath('/')).toBe('/');
    });

    it('returns root for top-level directory', () => {
      expect(getParentPath('/home')).toBe('/');
    });

    it('returns parent for nested path', () => {
      expect(getParentPath('/home/user')).toBe('/home');
    });

    it('returns grandparent for deeply nested path', () => {
      expect(getParentPath('/home/user/documents')).toBe('/home/user');
    });
  });

  describe('joinPath', () => {
    it('joins two segments', () => {
      expect(joinPath('/home', 'user')).toBe('/home/user');
    });

    it('joins multiple segments', () => {
      expect(joinPath('/home', 'user', 'documents')).toBe(
        '/home/user/documents'
      );
    });

    it('normalizes the result', () => {
      expect(joinPath('/home', '../other')).toBe('/other');
    });

    it('handles segments starting with slash', () => {
      expect(joinPath('/home', '/user')).toBe('/home/user');
    });
  });
});
