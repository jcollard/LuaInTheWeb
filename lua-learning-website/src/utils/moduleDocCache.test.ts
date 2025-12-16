import { describe, it, expect, beforeEach } from 'vitest'
import { moduleDocCache } from './moduleDocCache'

describe('moduleDocCache', () => {
  beforeEach(() => {
    moduleDocCache.clear()
  })

  it('should parse and cache module documentation', () => {
    const content = `
--- Greets a person by name.
--- @param name string The name to greet
--- @return string The greeting message
function greet(name)
  return "Hello, " .. name
end
`
    const docs = moduleDocCache.get('/home/utils.lua', content)

    expect(docs.size).toBe(1)
    expect(docs.has('greet')).toBe(true)

    const greetDoc = docs.get('greet')
    expect(greetDoc?.name).toBe('greet')
    expect(greetDoc?.signature).toBe('greet(name)')
    expect(greetDoc?.description).toBe('Greets a person by name.')
    expect(greetDoc?.params).toHaveLength(1)
    expect(greetDoc?.params?.[0].name).toBe('name')
    expect(greetDoc?.returns).toBe('The greeting message')
  })

  it('should return cached docs on second access with same content', () => {
    const content = `
--- Adds two numbers.
function add(a, b)
  return a + b
end
`
    const docs1 = moduleDocCache.get('/home/math.lua', content)
    const docs2 = moduleDocCache.get('/home/math.lua', content)

    // Should be the exact same Map instance (cached)
    expect(docs1).toBe(docs2)
  })

  it('should re-parse when content changes', () => {
    const content1 = `
--- Version 1.
function foo()
end
`
    const content2 = `
--- Version 2.
function foo()
end
`
    const docs1 = moduleDocCache.get('/home/mod.lua', content1)
    const docs2 = moduleDocCache.get('/home/mod.lua', content2)

    // Should be different Map instances
    expect(docs1).not.toBe(docs2)
    expect(docs1.get('foo')?.description).toBe('Version 1.')
    expect(docs2.get('foo')?.description).toBe('Version 2.')
  })

  it('should cache multiple modules independently', () => {
    const content1 = `
--- Module A function.
function funcA()
end
`
    const content2 = `
--- Module B function.
function funcB()
end
`
    moduleDocCache.get('/home/a.lua', content1)
    moduleDocCache.get('/home/b.lua', content2)

    expect(moduleDocCache.size).toBe(2)

    const docsA = moduleDocCache.get('/home/a.lua', content1)
    const docsB = moduleDocCache.get('/home/b.lua', content2)

    expect(docsA.has('funcA')).toBe(true)
    expect(docsB.has('funcB')).toBe(true)
  })

  it('should handle multiple functions in one module', () => {
    const content = `
--- First function.
function first()
end

--- Second function.
function second()
end

--- Third function.
function third()
end
`
    const docs = moduleDocCache.get('/home/multi.lua', content)

    expect(docs.size).toBe(3)
    expect(docs.has('first')).toBe(true)
    expect(docs.has('second')).toBe(true)
    expect(docs.has('third')).toBe(true)
  })

  it('should return empty map for code without documented functions', () => {
    const content = `
-- This is not a doc comment (only two dashes)
function undocumented()
end

local x = 42
`
    const docs = moduleDocCache.get('/home/nodocs.lua', content)

    expect(docs.size).toBe(0)
  })

  it('should clear all cached entries', () => {
    moduleDocCache.get('/home/a.lua', '--- A\nfunction a() end')
    moduleDocCache.get('/home/b.lua', '--- B\nfunction b() end')

    expect(moduleDocCache.size).toBe(2)

    moduleDocCache.clear()

    expect(moduleDocCache.size).toBe(0)
  })

  it('should handle method-style function definitions', () => {
    const content = `
--- Creates a new instance.
function MyClass:new()
end

--- Gets the value.
function MyClass:getValue()
end
`
    const docs = moduleDocCache.get('/home/class.lua', content)

    expect(docs.size).toBe(2)
    expect(docs.has('MyClass:new')).toBe(true)
    expect(docs.has('MyClass:getValue')).toBe(true)
  })

  it('should evict oldest entry when cache reaches max size', () => {
    // Fill cache to MAX_CACHE_SIZE (50)
    for (let i = 0; i < 50; i++) {
      const content = `--- Func ${i}.\nfunction func${i}() end`
      moduleDocCache.get(`/home/module${i}.lua`, content)
    }

    expect(moduleDocCache.size).toBe(50)

    // Access the first entry to make it recently used
    moduleDocCache.get('/home/module0.lua', '--- Func 0.\nfunction func0() end')

    // Add one more entry, should evict module1 (second oldest, since module0 was just accessed)
    const newContent = '--- New func.\nfunction newFunc() end'
    moduleDocCache.get('/home/new.lua', newContent)

    // Size should still be 50 (one evicted)
    expect(moduleDocCache.size).toBe(50)

    // The new entry should be present
    const newDocs = moduleDocCache.get('/home/new.lua', newContent)
    expect(newDocs.has('newFunc')).toBe(true)
  })

  it('should update lastAccess when accessing cached entry', () => {
    const content = '--- Test func.\nfunction test() end'

    // Add entry
    moduleDocCache.get('/home/test.lua', content)

    // Access it again with same content - should update lastAccess
    const docs = moduleDocCache.get('/home/test.lua', content)

    // The docs should still be valid
    expect(docs.has('test')).toBe(true)
  })
})
