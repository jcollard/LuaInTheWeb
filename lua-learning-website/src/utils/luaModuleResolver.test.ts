import { describe, it, expect } from 'vitest'
import { resolveModulePath } from './luaModuleResolver'

describe('luaModuleResolver', () => {
  describe('resolveModulePath', () => {
    it('should resolve simple module in same directory', () => {
      const result = resolveModulePath({
        moduleName: 'utils',
        currentFilePath: '/home/main.lua',
        fileExists: (p) => p === '/home/utils.lua',
      })

      expect(result).toEqual({
        path: '/home/utils.lua',
        moduleName: 'utils',
      })
    })

    it('should resolve module in subdirectory with slash notation', () => {
      const result = resolveModulePath({
        moduleName: 'lib/helpers',
        currentFilePath: '/home/main.lua',
        fileExists: (p) => p === '/home/lib/helpers.lua',
      })

      expect(result).toEqual({
        path: '/home/lib/helpers.lua',
        moduleName: 'lib/helpers',
      })
    })

    it('should resolve module with dot notation', () => {
      const result = resolveModulePath({
        moduleName: 'lib.helpers',
        currentFilePath: '/home/main.lua',
        fileExists: (p) => p === '/home/lib/helpers.lua',
      })

      expect(result).toEqual({
        path: '/home/lib/helpers.lua',
        moduleName: 'lib.helpers',
      })
    })

    it('should resolve init.lua for package directories', () => {
      const result = resolveModulePath({
        moduleName: 'mylib',
        currentFilePath: '/home/main.lua',
        fileExists: (p) => p === '/home/mylib/init.lua',
      })

      expect(result).toEqual({
        path: '/home/mylib/init.lua',
        moduleName: 'mylib',
      })
    })

    it('should prefer direct file over init.lua', () => {
      const result = resolveModulePath({
        moduleName: 'mylib',
        currentFilePath: '/home/main.lua',
        fileExists: (p) =>
          p === '/home/mylib.lua' || p === '/home/mylib/init.lua',
      })

      expect(result).toEqual({
        path: '/home/mylib.lua',
        moduleName: 'mylib',
      })
    })

    it('should fall back to root when not found in script directory', () => {
      const result = resolveModulePath({
        moduleName: 'shared',
        currentFilePath: '/home/project/main.lua',
        fileExists: (p) => p === '/shared.lua',
      })

      expect(result).toEqual({
        path: '/shared.lua',
        moduleName: 'shared',
      })
    })

    it('should fall back to root init.lua', () => {
      const result = resolveModulePath({
        moduleName: 'shared',
        currentFilePath: '/home/project/main.lua',
        fileExists: (p) => p === '/shared/init.lua',
      })

      expect(result).toEqual({
        path: '/shared/init.lua',
        moduleName: 'shared',
      })
    })

    it('should return null when module not found', () => {
      const result = resolveModulePath({
        moduleName: 'nonexistent',
        currentFilePath: '/home/main.lua',
        fileExists: () => false,
      })

      expect(result).toBeNull()
    })

    it('should handle root file path', () => {
      const result = resolveModulePath({
        moduleName: 'utils',
        currentFilePath: '/main.lua',
        fileExists: (p) => p === '/utils.lua',
      })

      expect(result).toEqual({
        path: '/utils.lua',
        moduleName: 'utils',
      })
    })

    it('should handle deeply nested module paths', () => {
      const result = resolveModulePath({
        moduleName: 'a.b.c.d',
        currentFilePath: '/home/main.lua',
        fileExists: (p) => p === '/home/a/b/c/d.lua',
      })

      expect(result).toEqual({
        path: '/home/a/b/c/d.lua',
        moduleName: 'a.b.c.d',
      })
    })

    it('should handle nested current file path', () => {
      const result = resolveModulePath({
        moduleName: 'utils',
        currentFilePath: '/home/project/src/main.lua',
        fileExists: (p) => p === '/home/project/src/utils.lua',
      })

      expect(result).toEqual({
        path: '/home/project/src/utils.lua',
        moduleName: 'utils',
      })
    })
  })
})
