import { describe, it, expect } from 'vitest'
import { VERSION } from '../src/index'

describe('shell-core package', () => {
  it('exports VERSION constant', () => {
    expect(VERSION).toBe('0.0.1')
  })
})
