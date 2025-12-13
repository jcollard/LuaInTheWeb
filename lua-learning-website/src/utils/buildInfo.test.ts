import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// Type for global build constants
interface BuildGlobals {
  __BUILD_COMMIT__?: string
  __BUILD_BRANCH__?: string
  __BUILD_TIMESTAMP__?: string
  __BUILD_ENV__?: string
  __BUILD_VERSION__?: string
}

const globals = globalThis as unknown as BuildGlobals

describe('buildInfo', () => {
  const originalGlobals = {
    __BUILD_COMMIT__: globals.__BUILD_COMMIT__,
    __BUILD_BRANCH__: globals.__BUILD_BRANCH__,
    __BUILD_TIMESTAMP__: globals.__BUILD_TIMESTAMP__,
    __BUILD_ENV__: globals.__BUILD_ENV__,
    __BUILD_VERSION__: globals.__BUILD_VERSION__,
  }

  beforeEach(() => {
    // Set mock values for build constants
    ;(globalThis as Record<string, unknown>).__BUILD_COMMIT__ = 'abc1234'
    ;(globalThis as Record<string, unknown>).__BUILD_BRANCH__ = 'main'
    ;(globalThis as Record<string, unknown>).__BUILD_TIMESTAMP__ =
      '2025-01-15T10:30:00.000Z'
    ;(globalThis as Record<string, unknown>).__BUILD_ENV__ = 'production'
    ;(globalThis as Record<string, unknown>).__BUILD_VERSION__ = '1.2.3'
    vi.spyOn(console, 'info').mockImplementation(() => {})
  })

  afterEach(() => {
    // Restore original globals
    Object.assign(globalThis, originalGlobals)
    vi.restoreAllMocks()
    // Reset module cache to allow re-import
    vi.resetModules()
  })

  describe('logBuildInfo', () => {
    it('should log build info to console', async () => {
      const { logBuildInfo } = await import('./buildInfo')
      logBuildInfo()
      expect(console.info).toHaveBeenCalled()
    })

    it('should include commit hash in output', async () => {
      const { logBuildInfo } = await import('./buildInfo')
      logBuildInfo()
      const call = vi.mocked(console.info).mock.calls[0][0] as string
      expect(call).toContain('abc1234')
    })

    it('should include branch name in output', async () => {
      const { logBuildInfo } = await import('./buildInfo')
      logBuildInfo()
      const call = vi.mocked(console.info).mock.calls[0][0] as string
      expect(call).toContain('main')
    })

    it('should include environment in output', async () => {
      const { logBuildInfo } = await import('./buildInfo')
      logBuildInfo()
      const call = vi.mocked(console.info).mock.calls[0][0] as string
      expect(call).toContain('production')
    })

    it('should include version in output', async () => {
      const { logBuildInfo } = await import('./buildInfo')
      logBuildInfo()
      const call = vi.mocked(console.info).mock.calls[0][0] as string
      expect(call).toContain('1.2.3')
    })

    it('should include build timestamp in output', async () => {
      const { logBuildInfo } = await import('./buildInfo')
      logBuildInfo()
      const call = vi.mocked(console.info).mock.calls[0][0] as string
      expect(call).toContain('2025-01-15')
    })

    it('should truncate timestamp to remove milliseconds', async () => {
      const { logBuildInfo } = await import('./buildInfo')
      logBuildInfo()
      const call = vi.mocked(console.info).mock.calls[0][0] as string
      // Verify milliseconds are NOT in output
      expect(call).not.toContain('.000Z')
      // Verify truncated timestamp IS in output
      expect(call).toContain('2025-01-15T10:30:00')
    })
  })

  describe('getBuildInfo', () => {
    it('should return build info object', async () => {
      const { getBuildInfo } = await import('./buildInfo')
      const info = getBuildInfo()
      expect(info).toEqual({
        commit: 'abc1234',
        branch: 'main',
        timestamp: '2025-01-15T10:30:00.000Z',
        env: 'production',
        version: '1.2.3',
      })
    })
  })
})
