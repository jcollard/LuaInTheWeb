import { test, expect } from '@playwright/test'

test.describe('Markdown Viewer', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage to start with clean state
    await page.goto('/editor')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    await expect(page.locator('[data-testid="ide-layout"]')).toBeVisible()
    // Wait for file tree to render
    await expect(page.getByRole('tree', { name: 'File Explorer' })).toBeVisible()
  })

  test.describe('markdown file preview', () => {
    test('clicking on .md file shows rendered markdown', async ({ page }) => {
      // Arrange - Expand docs workspace
      const docsWorkspace = page.getByRole('treeitem', { name: /^docs$/i })
      await docsWorkspace.getByTestId('folder-chevron').click()

      // Act - Click shell.md to open as preview
      const shellDoc = page.getByRole('treeitem', { name: 'shell.md' })
      await shellDoc.click()

      // Assert - Markdown viewer should be visible
      await expect(page.getByTestId('markdown-viewer')).toBeVisible()
    })

    test('markdown viewer renders headers as HTML', async ({ page }) => {
      // Arrange - Expand docs workspace and click shell.md
      const docsWorkspace = page.getByRole('treeitem', { name: /^docs$/i })
      await docsWorkspace.getByTestId('folder-chevron').click()
      await page.getByRole('treeitem', { name: 'shell.md' }).click()

      // Assert - Should render h1 or h2 header elements
      const markdownViewer = page.getByTestId('markdown-viewer')
      await expect(markdownViewer).toBeVisible()
      // Shell Library documentation should have rendered headers
      await expect(markdownViewer.locator('h1, h2').first()).toBeVisible()
    })

    test('markdown viewer renders code blocks', async ({ page }) => {
      // Arrange - Expand docs workspace and click shell.md
      const docsWorkspace = page.getByRole('treeitem', { name: /^docs$/i })
      await docsWorkspace.getByTestId('folder-chevron').click()
      await page.getByRole('treeitem', { name: 'shell.md' }).click()

      // Assert - Should have code blocks (pre > code elements)
      const markdownViewer = page.getByTestId('markdown-viewer')
      await expect(markdownViewer).toBeVisible()
      await expect(markdownViewer.locator('pre code').first()).toBeVisible()
    })

    test('markdown preview shows tab in tab bar', async ({ page }) => {
      // Arrange - Expand docs workspace and click shell.md
      const docsWorkspace = page.getByRole('treeitem', { name: /^docs$/i })
      await docsWorkspace.getByTestId('folder-chevron').click()
      await page.getByRole('treeitem', { name: 'shell.md' }).click()

      // Wait for markdown viewer to be visible first
      await expect(page.getByTestId('markdown-viewer')).toBeVisible()

      // Assert - Tab should show shell.md (look for tab with that name)
      const tab = page.getByRole('tab', { name: /shell\.md/i })
      await expect(tab).toBeVisible()
    })
  })

  test.describe('markdown context menu', () => {
    test('right-click on .md file shows Preview Markdown option', async ({ page }) => {
      // Arrange - Expand docs workspace
      const docsWorkspace = page.getByRole('treeitem', { name: /^docs$/i })
      await docsWorkspace.getByTestId('folder-chevron').click()

      // Act - Right-click shell.md
      const shellDoc = page.getByRole('treeitem', { name: 'shell.md' })
      await shellDoc.click({ button: 'right' })

      // Assert - Context menu should have Preview Markdown option
      await expect(page.getByRole('menuitem', { name: /preview markdown/i })).toBeVisible()
    })

    test('Preview Markdown option opens markdown viewer', async ({ page }) => {
      // Arrange - Expand docs workspace and right-click shell.md
      const docsWorkspace = page.getByRole('treeitem', { name: /^docs$/i })
      await docsWorkspace.getByTestId('folder-chevron').click()
      const shellDoc = page.getByRole('treeitem', { name: 'shell.md' })
      await shellDoc.click({ button: 'right' })

      // Act - Click Preview Markdown
      await page.getByRole('menuitem', { name: /preview markdown/i }).click()

      // Assert - Markdown viewer should be visible
      await expect(page.getByTestId('markdown-viewer')).toBeVisible()
    })
  })

  test.describe('markdown edit mode', () => {
    test('double-click on .md file in editable workspace opens editor', async ({ page }) => {
      // Expand workspace first
      const workspaceChevron = page.getByTestId('folder-chevron').first()
      await workspaceChevron.click()
      await page.waitForTimeout(100)

      // First create a markdown file in the user workspace
      const sidebar = page.getByTestId('sidebar-panel')
      await sidebar.getByRole('button', { name: /new file/i }).click()

      // Wait for inline rename input
      const input = sidebar.getByRole('textbox')
      await expect(input).toBeVisible()

      // Type the new name ending with .md
      await input.clear()
      await input.fill('test.md')
      await input.press('Enter')
      await expect(input).not.toBeVisible()

      // Now double-click on the file to open in edit mode
      const testMdFile = page.getByRole('treeitem', { name: 'test.md' })
      await expect(testMdFile).toBeVisible()
      await testMdFile.dblclick()

      // Assert - Monaco editor should be visible (not markdown viewer)
      await expect(page.locator('.monaco-editor')).toBeVisible()
    })

    test('right-click on editable .md file shows Edit Markdown option', async ({ page }) => {
      // Expand workspace first
      const workspaceChevron = page.getByTestId('folder-chevron').first()
      await workspaceChevron.click()
      await page.waitForTimeout(100)

      // First create a markdown file in the user workspace
      const sidebar = page.getByTestId('sidebar-panel')
      await sidebar.getByRole('button', { name: /new file/i }).click()
      const input = sidebar.getByRole('textbox')
      await expect(input).toBeVisible()
      await input.clear()
      await input.fill('readme.md')
      await input.press('Enter')
      await expect(input).not.toBeVisible()

      // Right-click on the file
      const readmeMdFile = page.getByRole('treeitem', { name: 'readme.md' })
      await expect(readmeMdFile).toBeVisible()
      await readmeMdFile.click({ button: 'right' })

      // Assert - Should have Edit Markdown option
      await expect(page.getByRole('menuitem', { name: /edit markdown/i })).toBeVisible()
    })

    test('Edit Markdown option opens Monaco editor', async ({ page }) => {
      // Expand workspace first
      const workspaceChevron = page.getByTestId('folder-chevron').first()
      await workspaceChevron.click()
      await page.waitForTimeout(100)

      // First create a markdown file in the user workspace
      const sidebar = page.getByTestId('sidebar-panel')
      await sidebar.getByRole('button', { name: /new file/i }).click()
      const input = sidebar.getByRole('textbox')
      await expect(input).toBeVisible()
      await input.clear()
      await input.fill('notes.md')
      await input.press('Enter')
      await expect(input).not.toBeVisible()

      // Right-click and select Edit Markdown
      const notesMdFile = page.getByRole('treeitem', { name: 'notes.md' })
      await expect(notesMdFile).toBeVisible()
      await notesMdFile.click({ button: 'right' })
      await page.getByRole('menuitem', { name: /edit markdown/i }).click()

      // Assert - Monaco editor should be visible
      await expect(page.locator('.monaco-editor')).toBeVisible()
    })
  })

  test.describe('read-only workspace markdown', () => {
    test('docs workspace .md file shows only Preview option in context menu', async ({ page }) => {
      // Arrange - Expand docs workspace
      const docsWorkspace = page.getByRole('treeitem', { name: /^docs$/i })
      await docsWorkspace.getByTestId('folder-chevron').click()

      // Act - Right-click shell.md
      const shellDoc = page.getByRole('treeitem', { name: 'shell.md' })
      await shellDoc.click({ button: 'right' })

      // Assert - Should have Preview Markdown but NOT Edit Markdown
      await expect(page.getByRole('menuitem', { name: /preview markdown/i })).toBeVisible()
      await expect(page.getByRole('menuitem', { name: /edit markdown/i })).not.toBeVisible()
    })

    test('read-only .md files do not show rename or delete options', async ({ page }) => {
      // Arrange - Expand docs workspace
      const docsWorkspace = page.getByRole('treeitem', { name: /^docs$/i })
      await docsWorkspace.getByTestId('folder-chevron').click()

      // Act - Right-click shell.md
      const shellDoc = page.getByRole('treeitem', { name: 'shell.md' })
      await shellDoc.click({ button: 'right' })

      // Assert - Should NOT have Rename or Delete options
      await expect(page.getByRole('menuitem', { name: /rename/i })).not.toBeVisible()
      await expect(page.getByRole('menuitem', { name: /delete/i })).not.toBeVisible()
    })
  })

  test.describe('markdown viewer styling', () => {
    test('markdown viewer has appropriate styling for dark theme', async ({ page }) => {
      // Arrange - Open a markdown file
      const docsWorkspace = page.getByRole('treeitem', { name: /^docs$/i })
      await docsWorkspace.getByTestId('folder-chevron').click()
      await page.getByRole('treeitem', { name: 'shell.md' }).click()

      // Assert - Markdown viewer should be visible and have styling applied
      const markdownViewer = page.getByTestId('markdown-viewer')
      await expect(markdownViewer).toBeVisible()

      // Should have proper container styling (not just raw markdown text)
      // Check that headers have different styling than body text
      const h1 = markdownViewer.locator('h1').first()
      if (await h1.isVisible()) {
        const fontSize = await h1.evaluate(el => window.getComputedStyle(el).fontSize)
        expect(parseFloat(fontSize)).toBeGreaterThan(16) // Headers should be larger
      }
    })

    test('markdown viewer renders inline code with styling', async ({ page }) => {
      // Arrange - Open shell.md which has inline code
      const docsWorkspace = page.getByRole('treeitem', { name: /^docs$/i })
      await docsWorkspace.getByTestId('folder-chevron').click()
      await page.getByRole('treeitem', { name: 'shell.md' }).click()

      // Assert - Inline code should have distinct styling
      const markdownViewer = page.getByTestId('markdown-viewer')
      await expect(markdownViewer).toBeVisible()

      const inlineCode = markdownViewer.locator('code').first()
      if (await inlineCode.isVisible()) {
        // Inline code typically has background color or different font
        const fontFamily = await inlineCode.evaluate(el => window.getComputedStyle(el).fontFamily)
        expect(fontFamily.toLowerCase()).toContain('mono')
      }
    })
  })

  test.describe('scroll position persistence', () => {
    test('editor scroll position is preserved when switching from markdown to editor tab', async ({ page }) => {
      // This test exposes a bug where switching from markdown preview back to
      // an editor tab resets the scroll position to the top

      // Step 1: Open docs folder and DOUBLE-click on shell.md (markdown preview)
      // Double-click creates a permanent tab (not replaced when opening another file)
      const docsWorkspace = page.getByRole('treeitem', { name: /^docs$/i })
      await docsWorkspace.getByTestId('folder-chevron').click()
      await page.getByRole('treeitem', { name: 'shell.md' }).dblclick()

      // Wait for markdown viewer
      await expect(page.getByTestId('markdown-viewer')).toBeVisible()

      // Scroll down in markdown viewer
      const markdownViewer = page.getByTestId('markdown-viewer')
      await markdownViewer.evaluate(el => { el.scrollTop = 200 })
      await page.waitForTimeout(100) // Let scroll settle

      // Step 2: Open libs folder and DOUBLE-click on shell.lua (editor)
      const libsWorkspace = page.getByRole('treeitem', { name: /^libs$/i })
      await libsWorkspace.getByTestId('folder-chevron').click()
      await page.getByRole('treeitem', { name: 'shell.lua' }).dblclick()

      // Wait for Monaco editor
      await expect(page.locator('.monaco-editor')).toBeVisible()
      await page.waitForTimeout(500) // Let editor fully load

      // Scroll down in Monaco editor using Monaco API
      await page.evaluate(() => {
        const monacoEditor = (window as unknown as { monaco?: { editor: { getEditors: () => Array<{ setScrollTop: (v: number) => void }> } } }).monaco?.editor.getEditors()[0]
        if (monacoEditor) {
          monacoEditor.setScrollTop(300)
        }
      })
      await page.waitForTimeout(200) // Let scroll settle and save

      // Get the scroll position before switching
      const scrollBeforeSwitch = await page.evaluate(() => {
        const monacoEditor = (window as unknown as { monaco?: { editor: { getEditors: () => Array<{ getScrollTop: () => number }> } } }).monaco?.editor.getEditors()[0]
        return monacoEditor ? monacoEditor.getScrollTop() : 0
      })

      // Verify we actually scrolled
      expect(scrollBeforeSwitch).toBeGreaterThan(100)

      // Step 3: Click back to markdown tab
      await page.getByRole('tab', { name: /shell\.md/i }).click()
      await expect(page.getByTestId('markdown-viewer')).toBeVisible()

      // Step 4: Click back to shell.lua tab - THIS IS WHERE THE BUG OCCURS
      await page.getByRole('tab', { name: /shell\.lua/i }).click()
      await expect(page.locator('.monaco-editor')).toBeVisible()
      await page.waitForTimeout(500) // Wait for scroll restoration

      // Get the scroll position after switching back
      const scrollAfterSwitch = await page.evaluate(() => {
        const monacoEditor = (window as unknown as { monaco?: { editor: { getEditors: () => Array<{ getScrollTop: () => number }> } } }).monaco?.editor.getEditors()[0]
        return monacoEditor ? monacoEditor.getScrollTop() : 0
      })

      // Assert: Scroll position should be preserved (not reset to 0)
      // Allow some tolerance for rounding
      expect(scrollAfterSwitch).toBeGreaterThan(100)
      expect(Math.abs(scrollAfterSwitch - scrollBeforeSwitch)).toBeLessThan(50)
    })

    test('editor scroll position is preserved when switching between two editor tabs', async ({ page }) => {
      // Open libs folder
      const libsWorkspace = page.getByRole('treeitem', { name: /^libs$/i })
      await libsWorkspace.getByTestId('folder-chevron').click()

      // DOUBLE-click shell.lua to create permanent tab
      await page.getByRole('treeitem', { name: 'shell.lua' }).dblclick()
      await expect(page.locator('.monaco-editor')).toBeVisible()
      await page.waitForTimeout(500) // Let editor fully load

      // Scroll down in shell.lua using Monaco API
      await page.evaluate(() => {
        const monacoEditor = (window as unknown as { monaco?: { editor: { getEditors: () => Array<{ setScrollTop: (v: number) => void }> } } }).monaco?.editor.getEditors()[0]
        if (monacoEditor) {
          monacoEditor.setScrollTop(250)
        }
      })
      await page.waitForTimeout(200) // Let scroll settle and save

      // Get shell.lua scroll position
      const shellScrollBefore = await page.evaluate(() => {
        const monacoEditor = (window as unknown as { monaco?: { editor: { getEditors: () => Array<{ getScrollTop: () => number }> } } }).monaco?.editor.getEditors()[0]
        return monacoEditor ? monacoEditor.getScrollTop() : 0
      })
      expect(shellScrollBefore).toBeGreaterThan(100)

      // DOUBLE-click canvas.lua to create permanent tab
      await page.getByRole('treeitem', { name: 'canvas.lua' }).dblclick()
      await expect(page.locator('.monaco-editor')).toBeVisible()
      await page.waitForTimeout(500) // Let editor fully load

      // Scroll down in canvas.lua using Monaco API
      await page.evaluate(() => {
        const monacoEditor = (window as unknown as { monaco?: { editor: { getEditors: () => Array<{ setScrollTop: (v: number) => void }> } } }).monaco?.editor.getEditors()[0]
        if (monacoEditor) {
          monacoEditor.setScrollTop(400)
        }
      })
      await page.waitForTimeout(200) // Let scroll settle and save

      // Switch back to shell.lua tab
      await page.getByRole('tab', { name: /shell\.lua/i }).click()
      await expect(page.locator('.monaco-editor')).toBeVisible()
      await page.waitForTimeout(500) // Wait for scroll restoration

      // Check scroll position is restored using Monaco API
      const shellScrollAfter = await page.evaluate(() => {
        const monacoEditor = (window as unknown as { monaco?: { editor: { getEditors: () => Array<{ getScrollTop: () => number }> } } }).monaco?.editor.getEditors()[0]
        return monacoEditor ? monacoEditor.getScrollTop() : 0
      })

      // Should be around 250, not 0 or 400
      expect(shellScrollAfter).toBeGreaterThan(100)
      expect(shellScrollAfter).toBeLessThan(350)
    })
  })

  test.describe('markdown tab switching', () => {
    test('can switch between markdown preview and editor tabs', async ({ page }) => {
      // Expand workspace first
      const workspaceChevron = page.getByTestId('folder-chevron').first()
      await workspaceChevron.click()
      await page.waitForTimeout(100)

      // Create a new .md file and open it
      const sidebar = page.getByTestId('sidebar-panel')
      await sidebar.getByRole('button', { name: /new file/i }).click()
      const input = sidebar.getByRole('textbox')
      await expect(input).toBeVisible()
      await input.clear()
      await input.fill('switch-test.md')
      await input.press('Enter')
      await expect(input).not.toBeVisible()

      // Double-click to open in editor
      const mdFile = page.getByRole('treeitem', { name: 'switch-test.md' })
      await expect(mdFile).toBeVisible()
      await mdFile.dblclick()

      // Verify Monaco editor is shown
      await expect(page.locator('.monaco-editor')).toBeVisible()

      // Type some markdown content
      await page.locator('.monaco-editor').click()
      await page.keyboard.type('# Test Header', { delay: 20 })

      // Now open a different file (from docs) to switch tabs
      const docsWorkspace = page.getByRole('treeitem', { name: /^docs$/i })
      await docsWorkspace.getByTestId('folder-chevron').click()
      await page.getByRole('treeitem', { name: 'shell.md' }).click()

      // Should show markdown viewer for docs file
      await expect(page.getByTestId('markdown-viewer')).toBeVisible()

      // Click back on the switch-test.md tab
      await page.getByRole('tab', { name: /switch-test\.md/i }).click()

      // Should show Monaco editor again
      await expect(page.locator('.monaco-editor')).toBeVisible()
    })
  })
})
