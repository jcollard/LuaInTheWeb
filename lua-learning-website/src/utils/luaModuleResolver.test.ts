import { describe, it, expect } from 'vitest'
import { resolveModulePath } from './luaModuleResolver'

describe('luaModuleResolver', () => {
  describe('resolveModulePath', () => {
    it('should resolve simple module in CWD', () => {
      const result = resolveModulePath({
        moduleName: 'utils',
        currentFilePath: '/home/main.lua',
        cwd: '/home',
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
        cwd: '/home',
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
        cwd: '/home',
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
        cwd: '/home',
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
        cwd: '/home',
        fileExists: (p) =>
          p === '/home/mylib.lua' || p === '/home/mylib/init.lua',
      })

      expect(result).toEqual({
        path: '/home/mylib.lua',
        moduleName: 'mylib',
      })
    })

    it('should fall back to root when not found in CWD', () => {
      const result = resolveModulePath({
        moduleName: 'shared',
        currentFilePath: '/home/project/main.lua',
        cwd: '/home/project',
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
        cwd: '/home/project',
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
        cwd: '/home',
        fileExists: () => false,
      })

      expect(result).toBeNull()
    })

    it('should handle root file path', () => {
      const result = resolveModulePath({
        moduleName: 'utils',
        currentFilePath: '/main.lua',
        cwd: '/',
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
        cwd: '/home',
        fileExists: (p) => p === '/home/a/b/c/d.lua',
      })

      expect(result).toEqual({
        path: '/home/a/b/c/d.lua',
        moduleName: 'a.b.c.d',
      })
    })

    it('should NOT search relative to current file (standard Lua behavior)', () => {
      // When CWD is different from current file's directory,
      // module should NOT be found if it only exists in current file's directory
      const result = resolveModulePath({
        moduleName: 'utils',
        currentFilePath: '/home/project/src/main.lua',
        cwd: '/', // CWD is root, not the script's directory
        fileExists: (p) => p === '/home/project/src/utils.lua', // Only in script's dir
      })

      // Should NOT find it - standard Lua doesn't search relative to script
      expect(result).toBeNull()
    })

    it('should search CWD first even when module exists in both CWD and root', () => {
      const result = resolveModulePath({
        moduleName: 'utils',
        currentFilePath: '/home/main.lua',
        cwd: '/projects',
        fileExists: (p) => p === '/projects/utils.lua' || p === '/utils.lua',
      })

      // Should find in CWD first
      expect(result).toEqual({
        path: '/projects/utils.lua',
        moduleName: 'utils',
      })
    })

    describe('compound extension resolution (.ansi.lua)', () => {
      it('should resolve compound extension file when it exists', () => {
        const result = resolveModulePath({
          moduleName: 'my_image.ansi',
          currentFilePath: '/home/main.lua',
          cwd: '/home',
          fileExists: (p) => p === '/home/my_image.ansi.lua',
        })

        expect(result).toEqual({
          path: '/home/my_image.ansi.lua',
          moduleName: 'my_image.ansi',
        })
      })

      it('should fall back to dot-to-slash when compound extension file does not exist', () => {
        const result = resolveModulePath({
          moduleName: 'my_image.ansi',
          currentFilePath: '/home/main.lua',
          cwd: '/home',
          fileExists: (p) => p === '/home/my_image/ansi.lua',
        })

        expect(result).toEqual({
          path: '/home/my_image/ansi.lua',
          moduleName: 'my_image.ansi',
        })
      })

      it('should prefer compound extension file over dot-to-slash when both exist', () => {
        const result = resolveModulePath({
          moduleName: 'my_image.ansi',
          currentFilePath: '/home/main.lua',
          cwd: '/home',
          fileExists: (p) =>
            p === '/home/my_image.ansi.lua' || p === '/home/my_image/ansi.lua',
        })

        expect(result).toEqual({
          path: '/home/my_image.ansi.lua',
          moduleName: 'my_image.ansi',
        })
      })

      it('should resolve compound extension from root fallback', () => {
        const result = resolveModulePath({
          moduleName: 'title-screen.ansi',
          currentFilePath: '/home/main.lua',
          cwd: '/home',
          fileExists: (p) => p === '/title-screen.ansi.lua',
        })

        expect(result).toEqual({
          path: '/title-screen.ansi.lua',
          moduleName: 'title-screen.ansi',
        })
      })

      it('should resolve deeply dotted module as compound extension', () => {
        const result = resolveModulePath({
          moduleName: 'a.b.c',
          currentFilePath: '/home/main.lua',
          cwd: '/home',
          fileExists: (p) => p === '/home/a.b.c.lua',
        })

        expect(result).toEqual({
          path: '/home/a.b.c.lua',
          moduleName: 'a.b.c',
        })
      })

      it('should not change behavior for simple module names without dots', () => {
        const result = resolveModulePath({
          moduleName: 'utils',
          currentFilePath: '/home/main.lua',
          cwd: '/home',
          fileExists: (p) => p === '/home/utils.lua',
        })

        expect(result).toEqual({
          path: '/home/utils.lua',
          moduleName: 'utils',
        })
      })

      it('should not search root twice when cwd is root', () => {
        const checked: string[] = []
        const result = resolveModulePath({
          moduleName: 'screen.ansi',
          currentFilePath: '/main.lua',
          cwd: '/',
          fileExists: (p) => {
            checked.push(p)
            return p === '/screen.ansi.lua'
          },
        })

        expect(result).toEqual({
          path: '/screen.ansi.lua',
          moduleName: 'screen.ansi',
        })
        // Should not check the same paths twice (root searched only once)
        const uniqueChecked = [...new Set(checked)]
        expect(checked).toEqual(uniqueChecked)
      })
    })
  })
})
