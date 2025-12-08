import { describe, it, expect } from 'vitest'
import { categorizeFile, aggregateResults } from './line-count.js'

describe('categorizeFile', () => {
  describe('Test Code', () => {
    it('categorizes .test.ts files as test/hook-tests', () => {
      expect(categorizeFile('src/hooks/useFileSystem.test.ts')).toEqual({
        category: 'test',
        subcategory: 'hook-tests'
      })
    })

    it('categorizes .test.tsx files as test/component-tests', () => {
      expect(categorizeFile('src/components/ActivityBar/ActivityBar.test.tsx')).toEqual({
        category: 'test',
        subcategory: 'component-tests'
      })
    })

    it('categorizes test setup files as test/setup', () => {
      expect(categorizeFile('src/test/setup.ts')).toEqual({
        category: 'test',
        subcategory: 'setup'
      })
    })
  })

  describe('UI Code', () => {
    it('categorizes component .tsx files as ui/components', () => {
      expect(categorizeFile('src/components/ActivityBar/ActivityBar.tsx')).toEqual({
        category: 'ui',
        subcategory: 'components'
      })
    })

    it('categorizes page .tsx files as ui/pages', () => {
      expect(categorizeFile('src/pages/test/PlaygroundDemo.tsx')).toEqual({
        category: 'ui',
        subcategory: 'pages'
      })
    })

    it('categorizes .module.css files as ui/styles-module', () => {
      expect(categorizeFile('src/components/ActivityBar/ActivityBar.module.css')).toEqual({
        category: 'ui',
        subcategory: 'styles-module'
      })
    })

    it('categorizes .css files as ui/styles-global', () => {
      expect(categorizeFile('src/App.css')).toEqual({
        category: 'ui',
        subcategory: 'styles-global'
      })
    })

    it('categorizes root App.tsx as ui/components', () => {
      expect(categorizeFile('src/App.tsx')).toEqual({
        category: 'ui',
        subcategory: 'components'
      })
    })

    it('categorizes main.tsx as ui/entry', () => {
      expect(categorizeFile('src/main.tsx')).toEqual({
        category: 'ui',
        subcategory: 'entry'
      })
    })
  })

  describe('Logic Code', () => {
    it('categorizes hook files as logic/hooks', () => {
      expect(categorizeFile('src/hooks/useLuaEngine.ts')).toEqual({
        category: 'logic',
        subcategory: 'hooks'
      })
    })

    it('categorizes component hook files as logic/hooks', () => {
      expect(categorizeFile('src/components/BottomPanel/useBottomPanel.ts')).toEqual({
        category: 'logic',
        subcategory: 'hooks'
      })
    })

    it('categorizes types.ts files as logic/types', () => {
      expect(categorizeFile('src/components/ActivityBar/types.ts')).toEqual({
        category: 'logic',
        subcategory: 'types'
      })
    })

    it('categorizes hooks/types.ts as logic/types', () => {
      expect(categorizeFile('src/hooks/types.ts')).toEqual({
        category: 'logic',
        subcategory: 'types'
      })
    })

    it('categorizes context.ts files as logic/context', () => {
      expect(categorizeFile('src/components/IDEContext/context.ts')).toEqual({
        category: 'logic',
        subcategory: 'context'
      })
    })

    it('categorizes useIDE.ts (context hook) as logic/context', () => {
      expect(categorizeFile('src/components/IDEContext/useIDE.ts')).toEqual({
        category: 'logic',
        subcategory: 'context'
      })
    })

    it('categorizes index.ts barrel exports as logic/exports', () => {
      expect(categorizeFile('src/components/ActivityBar/index.ts')).toEqual({
        category: 'logic',
        subcategory: 'exports'
      })
    })

    it('categorizes hooks/index.ts as logic/exports', () => {
      expect(categorizeFile('src/hooks/index.ts')).toEqual({
        category: 'logic',
        subcategory: 'exports'
      })
    })
  })

  describe('Edge cases', () => {
    it('returns null for non-source files', () => {
      expect(categorizeFile('package.json')).toBeNull()
      expect(categorizeFile('README.md')).toBeNull()
      expect(categorizeFile('vite.config.ts')).toBeNull()
    })

    it('returns null for files outside src/', () => {
      expect(categorizeFile('e2e/example.spec.ts')).toBeNull()
    })
  })
})

describe('aggregateResults', () => {
  it('aggregates file results by category and subcategory', () => {
    const files = [
      { path: 'src/hooks/useTest.ts', lines: 50, category: 'logic', subcategory: 'hooks' },
      { path: 'src/hooks/useOther.ts', lines: 30, category: 'logic', subcategory: 'hooks' },
      { path: 'src/components/Foo/Foo.tsx', lines: 100, category: 'ui', subcategory: 'components' },
      { path: 'src/hooks/useTest.test.ts', lines: 40, category: 'test', subcategory: 'hook-tests' },
    ]

    const result = aggregateResults(files)

    expect(result.totals).toEqual({
      ui: 100,
      logic: 80,
      test: 40,
      total: 220
    })

    expect(result.subcategories.logic.hooks).toBe(80)
    expect(result.subcategories.ui.components).toBe(100)
    expect(result.subcategories.test['hook-tests']).toBe(40)
  })

  it('handles empty file list', () => {
    const result = aggregateResults([])

    expect(result.totals).toEqual({
      ui: 0,
      logic: 0,
      test: 0,
      total: 0
    })
  })

  it('calculates percentages correctly', () => {
    const files = [
      { path: 'a.tsx', lines: 50, category: 'ui', subcategory: 'components' },
      { path: 'b.ts', lines: 30, category: 'logic', subcategory: 'hooks' },
      { path: 'c.test.ts', lines: 20, category: 'test', subcategory: 'hook-tests' },
    ]

    const result = aggregateResults(files)

    expect(result.percentages.ui).toBe(50)
    expect(result.percentages.logic).toBe(30)
    expect(result.percentages.test).toBe(20)
  })
})
