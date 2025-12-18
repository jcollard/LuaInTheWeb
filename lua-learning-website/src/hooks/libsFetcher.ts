/**
 * Libs workspace content fetcher.
 *
 * Fetches the Libs workspace content from public/libs/ using
 * the shared workspace fetcher infrastructure.
 */

import { fetchWorkspaceContent, type WorkspaceContent } from './workspaceFetcher'

/**
 * Fetch the Libs workspace content from public/libs/.
 *
 * @returns WorkspaceContent with text and binary file maps
 */
export async function fetchLibsContent(): Promise<WorkspaceContent> {
  return fetchWorkspaceContent('/libs')
}
