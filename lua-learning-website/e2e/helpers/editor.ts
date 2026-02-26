import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'
import { TIMEOUTS } from '../constants'

/**
 * Create a new file with the default name and open it in Monaco.
 *
 * Steps: expand workspace → click New File → accept default name → click file → wait for Monaco.
 * Returns the `.monaco-editor` locator.
 */
export async function createAndOpenFile(page: Page) {
  const sidebar = page.getByTestId('sidebar-panel')

  // Expand the workspace folder by clicking its chevron
  const workspaceChevron = page.getByTestId('folder-chevron').first()
  await workspaceChevron.click()
  await expect(page.getByRole('treeitem').nth(1)).toBeVisible({
    timeout: TIMEOUTS.ELEMENT_VISIBLE,
  })

  // Click New File button
  await sidebar.getByRole('button', { name: /new file/i }).click()

  const input = sidebar.getByRole('textbox')
  await expect(input).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })
  await input.press('Enter') // Accept default name
  await expect(input).not.toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

  // Click the newly created file to open it
  const fileItems = page.getByRole('treeitem')
  const count = await fileItems.count()
  if (count > 1) {
    await fileItems.nth(1).click()
  } else {
    await fileItems.first().click()
  }

  // Wait for Monaco editor to load
  const monacoEditor = page.locator('.monaco-editor')
  await expect(monacoEditor).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })
  await page.waitForTimeout(TIMEOUTS.UI_STABLE)
  return monacoEditor
}

/**
 * Create a new file with a specific name and open it as a permanent tab.
 *
 * Steps: click New File → fill name → press Enter → double-click to open → wait for tab.
 * Assumes the workspace is already expanded.
 */
export async function createAndOpenFileWithName(page: Page, filename: string) {
  const sidebar = page.getByTestId('sidebar-panel')
  await sidebar.getByRole('button', { name: /new file/i }).click()

  const input = sidebar.getByRole('textbox')
  await expect(input).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })
  await input.fill(filename)
  await input.press('Enter')
  await expect(input).not.toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

  // Double-click to open as permanent tab (not preview)
  const treeItem = page.getByRole('treeitem', { name: new RegExp(filename) })
  await treeItem.dblclick()
  const editorPanel = page.getByTestId('editor-panel')
  await expect(
    editorPanel.getByRole('tab', { name: new RegExp(filename) })
  ).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })
}
