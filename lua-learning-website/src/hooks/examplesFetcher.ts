/**
 * Examples workspace content fetcher.
 *
 * Fetches the Examples workspace content from public/examples/ using
 * the shared workspace fetcher infrastructure.
 */

import { fetchWorkspaceContent, type WorkspaceContent } from './workspaceFetcher'

/**
 * Fetch the Examples workspace content from public/examples/.
 *
 * @returns WorkspaceContent with text and binary file maps
 */
export async function fetchExamplesContent(): Promise<WorkspaceContent> {
  return fetchWorkspaceContent('/examples')
}
