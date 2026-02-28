import { test, expect } from './fixtures'
import { TIMEOUTS } from './constants'

test.describe('File Download', () => {
  test.describe('single file download', () => {
    test('right-click file shows Download option in context menu', async ({
      explorerPage: page,
    }) => {
      // Arrange - Wait for workspace and expand it, then create a file
      await expect(page.getByRole('treeitem', { name: 'libs' })).toBeVisible()
      const workspaceChevron = page.getByTestId('folder-chevron').first()
      await workspaceChevron.click()
      await page.waitForTimeout(TIMEOUTS.BRIEF)

      const sidebar = page.getByTestId('sidebar-panel')
      await sidebar.getByRole('button', { name: /new file/i }).click()
      const input = sidebar.getByRole('textbox')
      await input.clear()
      await input.fill('download-test.lua')
      await input.press('Enter')
      await expect(input).not.toBeVisible()

      // Act - Right-click the file
      const fileItem = page.getByRole('treeitem', { name: 'download-test.lua' })
      await fileItem.click({ button: 'right' })

      // Assert - Context menu should include "Download"
      await expect(page.getByRole('menu')).toBeVisible()
      await expect(
        page.getByRole('menuitem', { name: 'Download' })
      ).toBeVisible()
    })

    test('clicking Download triggers file download', async ({
      explorerPage: page,
    }) => {
      // Arrange - Wait for workspace and expand it, then create a file
      await expect(page.getByRole('treeitem', { name: 'libs' })).toBeVisible()
      const workspaceChevron = page.getByTestId('folder-chevron').first()
      await workspaceChevron.click()
      await page.waitForTimeout(TIMEOUTS.BRIEF)

      const sidebar = page.getByTestId('sidebar-panel')
      await sidebar.getByRole('button', { name: /new file/i }).click()
      const input = sidebar.getByRole('textbox')
      await input.clear()
      await input.fill('hello.lua')
      await input.press('Enter')
      await expect(input).not.toBeVisible()

      // Act - Right-click file and click Download
      const fileItem = page.getByRole('treeitem', { name: 'hello.lua' })
      const downloadPromise = page.waitForEvent('download')
      await fileItem.click({ button: 'right' })
      await expect(page.getByRole('menu')).toBeVisible()
      await page.getByRole('menuitem', { name: 'Download' }).click()

      // Assert - Download should trigger with expected filename
      const download = await downloadPromise
      expect(download.suggestedFilename()).toBe('hello.lua')
    })

    test('downloading read-only library file triggers download', async ({
      explorerPage: page,
    }) => {
      // Arrange - Wait for libs workspace to load and expand it
      const libsWorkspace = page.getByRole('treeitem', { name: /^libs$/i })
      await expect(libsWorkspace).toBeVisible({
        timeout: TIMEOUTS.ELEMENT_VISIBLE,
      })
      await expect(
        page.getByTestId('library-workspace-icon')
      ).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

      const chevron = libsWorkspace.getByTestId('folder-chevron')
      await chevron.click()

      // Wait for shell.lua to be visible
      const shellFile = page.getByRole('treeitem', { name: 'shell.lua' })
      await expect(shellFile).toBeVisible()

      // Act - Right-click shell.lua and click Download
      const downloadPromise = page.waitForEvent('download')
      await shellFile.click({ button: 'right' })
      await expect(page.getByRole('menu')).toBeVisible()
      await page.getByRole('menuitem', { name: 'Download' }).click()

      // Assert - Download should trigger with expected filename
      const download = await downloadPromise
      expect(download.suggestedFilename()).toBe('shell.lua')
    })
  })

  test.describe('folder download as ZIP', () => {
    test('right-click folder shows "Download as ZIP" option', async ({
      explorerPage: page,
    }) => {
      // Arrange - Wait for workspace and expand it, then create a folder
      await expect(page.getByRole('treeitem', { name: 'libs' })).toBeVisible()
      const workspaceChevron = page.getByTestId('folder-chevron').first()
      await workspaceChevron.click()
      await page.waitForTimeout(TIMEOUTS.BRIEF)

      const sidebar = page.getByTestId('sidebar-panel')
      await sidebar.getByRole('button', { name: /new folder/i }).click()
      const input = sidebar.getByRole('textbox')
      await input.clear()
      await input.fill('zip-test')
      await input.press('Enter')
      await expect(input).not.toBeVisible()

      // Act - Right-click the folder
      const folderItem = page.getByRole('treeitem', { name: 'zip-test' })
      await folderItem.click({ button: 'right' })

      // Assert - Context menu should include "Download as ZIP"
      await expect(page.getByRole('menu')).toBeVisible()
      await expect(
        page.getByRole('menuitem', { name: 'Download as ZIP' })
      ).toBeVisible()
    })

    test('clicking "Download as ZIP" on folder triggers ZIP download', async ({
      explorerPage: page,
    }) => {
      // Arrange - Wait for workspace and expand it, then create a folder
      await expect(page.getByRole('treeitem', { name: 'libs' })).toBeVisible()
      const workspaceChevron = page.getByTestId('folder-chevron').first()
      await workspaceChevron.click()
      await page.waitForTimeout(TIMEOUTS.BRIEF)

      const sidebar = page.getByTestId('sidebar-panel')
      await sidebar.getByRole('button', { name: /new folder/i }).click()
      const input = sidebar.getByRole('textbox')
      await input.clear()
      await input.fill('my-project')
      await input.press('Enter')
      await expect(input).not.toBeVisible()

      // Act - Right-click folder and click Download as ZIP
      const folderItem = page.getByRole('treeitem', { name: 'my-project' })
      const downloadPromise = page.waitForEvent('download')
      await folderItem.click({ button: 'right' })
      await expect(page.getByRole('menu')).toBeVisible()
      await page.getByRole('menuitem', { name: 'Download as ZIP' }).click()

      // Assert - ZIP download should trigger with folder name
      const download = await downloadPromise
      expect(download.suggestedFilename()).toBe('my-project.zip')
    })
  })

  test.describe('workspace download as ZIP', () => {
    test('right-click read-only workspace shows "Download as ZIP" option', async ({
      explorerPage: page,
    }) => {
      // Arrange - Wait for libs workspace to load
      const libsWorkspace = page.getByRole('treeitem', { name: /^libs$/i })
      await expect(libsWorkspace).toBeVisible({
        timeout: TIMEOUTS.ELEMENT_VISIBLE,
      })
      await expect(
        page.getByTestId('library-workspace-icon')
      ).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

      // Act - Right-click the libs workspace
      await libsWorkspace.click({ button: 'right' })

      // Assert - Context menu should include "Download as ZIP"
      await expect(page.getByRole('menu')).toBeVisible()
      await expect(
        page.getByRole('menuitem', { name: 'Download as ZIP' })
      ).toBeVisible()
    })

    test('clicking "Download as ZIP" on read-only workspace triggers ZIP download', async ({
      explorerPage: page,
    }) => {
      // Arrange - Wait for libs workspace to load
      const libsWorkspace = page.getByRole('treeitem', { name: /^libs$/i })
      await expect(libsWorkspace).toBeVisible({
        timeout: TIMEOUTS.ELEMENT_VISIBLE,
      })
      await expect(
        page.getByTestId('library-workspace-icon')
      ).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

      // Act - Right-click libs workspace and click Download as ZIP
      const downloadPromise = page.waitForEvent('download')
      await libsWorkspace.click({ button: 'right' })
      await expect(page.getByRole('menu')).toBeVisible()
      await page.getByRole('menuitem', { name: 'Download as ZIP' }).click()

      // Assert - ZIP download should trigger with workspace name
      const download = await downloadPromise
      expect(download.suggestedFilename()).toBe('libs.zip')
    })

    test('right-click docs workspace shows "Download as ZIP" option', async ({
      explorerPage: page,
    }) => {
      // Arrange - Wait for docs workspace to load
      const docsWorkspace = page.getByRole('treeitem', { name: /^docs$/i })
      await expect(docsWorkspace).toBeVisible({
        timeout: TIMEOUTS.ELEMENT_VISIBLE,
      })
      await expect(
        page.getByTestId('docs-workspace-icon')
      ).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

      // Act - Right-click the docs workspace
      await docsWorkspace.click({ button: 'right' })

      // Assert - Context menu should include "Download as ZIP"
      await expect(page.getByRole('menu')).toBeVisible()
      await expect(
        page.getByRole('menuitem', { name: 'Download as ZIP' })
      ).toBeVisible()
    })

    test('right-click writable workspace shows "Download as ZIP" option', async ({
      explorerPage: page,
    }) => {
      // Arrange - Wait for workspace to load
      await expect(page.getByRole('treeitem', { name: 'libs' })).toBeVisible()

      // Act - Right-click the home workspace
      const homeWorkspace = page.getByRole('treeitem', { name: /home/i })
      await homeWorkspace.click({ button: 'right' })

      // Assert - Context menu should include "Download as ZIP"
      await expect(page.getByRole('menu')).toBeVisible()
      await expect(
        page.getByRole('menuitem', { name: 'Download as ZIP' })
      ).toBeVisible()
    })
  })
})
