/* eslint-disable react-hooks/rules-of-hooks -- Playwright's `use` is not a React hook */
import { test as base, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { TIMEOUTS } from './constants'

export { expect }

/**
 * Shared Playwright fixtures for LuaInTheWeb E2E tests.
 *
 * Each fixture navigates to /editor and waits for progressively more UI to load:
 *   editorPage       → ide-layout visible
 *   cleanEditorPage  → clear localStorage + reload + ide-layout visible
 *   explorerPage     → cleanEditorPage + File Explorer tree visible
 *   shellPage        → editorPage + shell terminal visible
 */

async function waitForIdeLayout(page: Page): Promise<void> {
  await page.goto('/editor')
  await expect(page.locator('[data-testid="ide-layout"]')).toBeVisible()
}

async function waitForCleanIdeLayout(page: Page): Promise<void> {
  await page.goto('/editor')
  await page.evaluate(() => localStorage.clear())
  await page.reload()
  await expect(page.locator('[data-testid="ide-layout"]')).toBeVisible()
}

async function waitForFileExplorer(page: Page): Promise<void> {
  await waitForCleanIdeLayout(page)
  await expect(page.getByRole('tree', { name: 'File Explorer' })).toBeVisible()
}

async function waitForShellTerminal(page: Page): Promise<void> {
  await waitForIdeLayout(page)
  await expect(
    page.locator('[data-testid="shell-terminal-container"]')
  ).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })
}

export const test = base.extend<{
  editorPage: Page
  cleanEditorPage: Page
  explorerPage: Page
  shellPage: Page
}>({
  editorPage: async ({ page }, use) => {
    await waitForIdeLayout(page)
    await use(page)
  },

  cleanEditorPage: async ({ page }, use) => {
    await waitForCleanIdeLayout(page)
    await use(page)
  },

  explorerPage: async ({ page }, use) => {
    await waitForFileExplorer(page)
    await use(page)
  },

  shellPage: async ({ page }, use) => {
    await waitForShellTerminal(page)
    await use(page)
  },
})
