/**
 * Docs workspace content fetcher.
 *
 * Fetches the Docs workspace content from public/docs/ using
 * the shared workspace fetcher infrastructure.
 */

import { fetchWorkspaceContent, type WorkspaceContent } from './workspaceFetcher'

/**
 * Fetch the Docs workspace content from public/docs/.
 *
 * @returns WorkspaceContent with text and binary file maps
 */
export async function fetchDocsContent(): Promise<WorkspaceContent> {
  return fetchWorkspaceContent('/docs')
}
