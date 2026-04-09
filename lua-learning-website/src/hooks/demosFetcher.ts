/**
 * Demos workspace content fetcher.
 *
 * Fetches the Demos workspace content from public/demos/ using
 * the shared workspace fetcher infrastructure.
 */

import { fetchWorkspaceContent, type WorkspaceContent } from './workspaceFetcher'

/**
 * Fetch the Demos workspace content from public/demos/.
 *
 * @returns WorkspaceContent with text and binary file maps
 */
export async function fetchDemosContent(): Promise<WorkspaceContent> {
  return fetchWorkspaceContent('/demos')
}
