import { describe, it, expect } from 'vitest'

/**
 * Example test file to verify the testing setup works.
 * Delete this file once you have real tests.
 */

describe('Testing Setup', () => {
  it('should run a basic test', () => {
    expect(1 + 1).toBe(2)
  })

  it('should have access to vitest globals', () => {
    expect(true).toBeTruthy()
    expect(false).toBeFalsy()
  })

  it('should handle async tests', async () => {
    const result = await Promise.resolve('hello')
    expect(result).toBe('hello')
  })
})
