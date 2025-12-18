import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchDocsContent } from './docsFetcher'
import * as workspaceFetcher from './workspaceFetcher'

describe('docsFetcher', () => {
  beforeEach(() => {
    vi.spyOn(workspaceFetcher, 'fetchWorkspaceContent')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('fetchDocsContent', () => {
    it('should call fetchWorkspaceContent with /docs path', async () => {
      const mockContent = {
        text: { 'shell.md': '# Shell Library' },
        binary: {},
      }
      vi.mocked(workspaceFetcher.fetchWorkspaceContent).mockResolvedValueOnce(mockContent)

      const result = await fetchDocsContent()

      expect(workspaceFetcher.fetchWorkspaceContent).toHaveBeenCalledWith('/docs')
      expect(result).toBe(mockContent)
    })

    it('should return the content from fetchWorkspaceContent', async () => {
      const mockContent = {
        text: {
          'shell.md': '# Shell Library',
          'canvas.md': '# Canvas Library',
          'lua/basics.md': '# Lua Basics',
        },
        binary: {},
      }
      vi.mocked(workspaceFetcher.fetchWorkspaceContent).mockResolvedValueOnce(mockContent)

      const result = await fetchDocsContent()

      expect(result.text).toBe(mockContent.text)
      expect(result.binary).toBe(mockContent.binary)
    })

    it('should propagate errors from fetchWorkspaceContent', async () => {
      const error = new Error('Network failure')
      vi.mocked(workspaceFetcher.fetchWorkspaceContent).mockRejectedValueOnce(error)

      await expect(fetchDocsContent()).rejects.toThrow('Network failure')
    })
  })
})
