import { describe, it, expect } from 'vitest';
import { formatCanvasTickError, extractLineNumber } from '../../src/worker/luaErrorUtils';

describe('luaErrorUtils', () => {
  describe('extractLineNumber', () => {
    it('should extract line number from [string "..."] format', () => {
      const result = extractLineNumber('[string "test.lua"]:3: some error');
      expect(result).toEqual({ line: 3, message: 'some error' });
    });

    it('should extract line number from filename.lua format', () => {
      const result = extractLineNumber('test.lua:5: another error');
      expect(result).toEqual({ line: 5, message: 'another error' });
    });

    it('should extract line number from @filename format', () => {
      const result = extractLineNumber('@test.lua:7: yet another error');
      expect(result).toEqual({ line: 7, message: 'yet another error' });
    });

    it('should return null line when no line number present', () => {
      const result = extractLineNumber('some error without line number');
      expect(result).toEqual({ line: null, message: 'some error without line number' });
    });

    it('should handle empty string', () => {
      const result = extractLineNumber('');
      expect(result.line).toBeNull();
      expect(result.message).toBe('');
      // Verify the exact shape of the result
      expect(Object.keys(result)).toHaveLength(2);
      expect(result).toStrictEqual({ line: null, message: '' });
    });

    it('should handle whitespace-only string', () => {
      const result = extractLineNumber('   ');
      expect(result.line).toBeNull();
      expect(result.message).toBe('   ');
    });

    it('should handle multi-digit line numbers', () => {
      const result = extractLineNumber('[string "main.lua"]:123: error message');
      expect(result).toEqual({ line: 123, message: 'error message' });
    });

    it('should preserve message content exactly', () => {
      const result = extractLineNumber('[string "x"]:1: attempt to call nil value');
      expect(result).toEqual({ line: 1, message: 'attempt to call nil value' });
    });
  });

  describe('formatCanvasTickError', () => {
    it('should format error with line number when present', () => {
      const result = formatCanvasTickError('[string "test.lua"]:3: some error');
      expect(result).toBe('canvas.tick (line 3): some error');
    });

    it('should format error without line number when not present', () => {
      const result = formatCanvasTickError('some error without line');
      expect(result).toBe('canvas.tick: some error without line');
    });

    it('should handle already transformed error messages', () => {
      // Error that was already transformed by luaErrorTransformer
      const result = formatCanvasTickError(
        '[string "test.lua"]:5: attempt to iterate over a non-iterator value. Hint: use pairs() or ipairs() for tables'
      );
      expect(result).toBe(
        'canvas.tick (line 5): attempt to iterate over a non-iterator value. Hint: use pairs() or ipairs() for tables'
      );
    });

    it('should handle TypeError wrapper from wasmoon', () => {
      const result = formatCanvasTickError('[string "test.lua"]:10: TypeError: o is not a function');
      expect(result).toBe('canvas.tick (line 10): TypeError: o is not a function');
    });

    it('should handle empty error message', () => {
      const result = formatCanvasTickError('');
      expect(result).toBe('canvas.tick: ');
      expect(result.startsWith('canvas.tick')).toBe(true);
      expect(result.length).toBe('canvas.tick: '.length);
    });

    it('should handle whitespace-only error message', () => {
      const result = formatCanvasTickError('   ');
      expect(result).toBe('canvas.tick:    ');
    });

    it('should handle filename.lua format', () => {
      const result = formatCanvasTickError('main.lua:42: undefined variable');
      expect(result).toBe('canvas.tick (line 42): undefined variable');
    });

    it('should handle @filename format', () => {
      const result = formatCanvasTickError('@script.lua:15: stack overflow');
      expect(result).toBe('canvas.tick (line 15): stack overflow');
    });
  });
});
