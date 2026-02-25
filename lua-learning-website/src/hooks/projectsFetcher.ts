/**
 * Projects workspace content fetcher.
 *
 * Fetches the Projects workspace content from public/projects/ using
 * the shared workspace fetcher infrastructure.
 */

import { fetchWorkspaceContent, type WorkspaceContent } from './workspaceFetcher'

/**
 * Fetch the Projects workspace content from public/projects/.
 *
 * @returns WorkspaceContent with text and binary file maps
 */
export async function fetchProjectsContent(): Promise<WorkspaceContent> {
  return fetchWorkspaceContent('/projects')
}
