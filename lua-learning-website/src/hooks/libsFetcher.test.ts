import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { fetchLibsContent } from './libsFetcher'
import * as workspaceFetcher from './workspaceFetcher'

describe('libsFetcher', () => {
  beforeEach(() => {
    vi.spyOn(workspaceFetcher, 'fetchWorkspaceContent')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should call fetchWorkspaceContent with /libs path', async () => {
    vi.mocked(workspaceFetcher.fetchWorkspaceContent).mockResolvedValueOnce({
      text: { 'shell.lua': '-- shell library' },
      binary: {},
    })

    await fetchLibsContent()

    expect(workspaceFetcher.fetchWorkspaceContent).toHaveBeenCalledWith('/libs')
  })

  it('should return the workspace content from fetchWorkspaceContent', async () => {
    const mockContent = {
      text: {
        'shell.lua': '-- shell library',
        'canvas.lua': '-- canvas library',
      },
      binary: {},
    }
    vi.mocked(workspaceFetcher.fetchWorkspaceContent).mockResolvedValueOnce(mockContent)

    const result = await fetchLibsContent()

    expect(result).toBe(mockContent)
  })

  it('should propagate errors from fetchWorkspaceContent', async () => {
    vi.mocked(workspaceFetcher.fetchWorkspaceContent).mockRejectedValueOnce(
      new Error('Network error')
    )

    await expect(fetchLibsContent()).rejects.toThrow('Network error')
  })
})
