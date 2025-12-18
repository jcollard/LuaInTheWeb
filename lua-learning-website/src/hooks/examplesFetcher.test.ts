import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchExamplesContent } from './examplesFetcher'
import * as workspaceFetcher from './workspaceFetcher'

describe('examplesFetcher', () => {
  beforeEach(() => {
    vi.spyOn(workspaceFetcher, 'fetchWorkspaceContent')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('fetchExamplesContent', () => {
    it('should call fetchWorkspaceContent with /examples path', async () => {
      const mockContent = {
        text: { 'hello.lua': 'print("hello")' },
        binary: {},
      }
      vi.mocked(workspaceFetcher.fetchWorkspaceContent).mockResolvedValueOnce(mockContent)

      const result = await fetchExamplesContent()

      expect(workspaceFetcher.fetchWorkspaceContent).toHaveBeenCalledWith('/examples')
      expect(result).toBe(mockContent)
    })

    it('should return the content from fetchWorkspaceContent', async () => {
      const mockContent = {
        text: {
          'hello.lua': 'print("hello")',
          'canvas/shapes.lua': '-- shapes',
        },
        binary: {
          'canvas/images/ship.png': new Uint8Array([1, 2, 3, 4]),
        },
      }
      vi.mocked(workspaceFetcher.fetchWorkspaceContent).mockResolvedValueOnce(mockContent)

      const result = await fetchExamplesContent()

      expect(result.text).toBe(mockContent.text)
      expect(result.binary).toBe(mockContent.binary)
    })

    it('should propagate errors from fetchWorkspaceContent', async () => {
      const error = new Error('Network failure')
      vi.mocked(workspaceFetcher.fetchWorkspaceContent).mockRejectedValueOnce(error)

      await expect(fetchExamplesContent()).rejects.toThrow('Network failure')
    })
  })
})
