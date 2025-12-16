import { describe, it, expect, vi, beforeEach } from 'vitest'
import { LuaEngineFactory, type LuaEngineCallbacks } from '../src/LuaEngineFactory'

/**
 * Tests for the __format_results Lua function.
 * This function formats multiple return values for display in the REPL.
 */
describe('LuaEngineFactory - __format_results', () => {
  let callbacks: LuaEngineCallbacks

  beforeEach(() => {
    callbacks = {
      onOutput: vi.fn(),
      onError: vi.fn(),
      onReadInput: vi.fn(),
    }
  })

  it('should handle multiple values with nil in middle', async () => {
    const engine = await LuaEngineFactory.create(callbacks)

    const result = await engine.doString('return __format_results(1, nil, 3)')

    expect(result).toBe('1\tnil\t3')

    engine.global.close()
  })

  it('should handle nil at start', async () => {
    const engine = await LuaEngineFactory.create(callbacks)

    const result = await engine.doString('return __format_results(nil, 2, 3)')

    expect(result).toBe('nil\t2\t3')

    engine.global.close()
  })

  it('should handle trailing nils', async () => {
    const engine = await LuaEngineFactory.create(callbacks)

    const result = await engine.doString('return __format_results(1, 2, nil)')

    expect(result).toBe('1\t2\tnil')

    engine.global.close()
  })

  it('should handle all nils', async () => {
    const engine = await LuaEngineFactory.create(callbacks)

    const result = await engine.doString('return __format_results(nil, nil, nil)')

    expect(result).toBe('nil\tnil\tnil')

    engine.global.close()
  })

  it('should handle no nils (regression test)', async () => {
    const engine = await LuaEngineFactory.create(callbacks)

    const result = await engine.doString('return __format_results(1, 2, 3)')

    expect(result).toBe('1\t2\t3')

    engine.global.close()
  })
})
