/* eslint-disable @typescript-eslint/no-explicit-any */
import { test, expect } from './fixtures'
import type { Page } from '@playwright/test'
import { TIMEOUTS } from './constants'
import { createAndOpenFileWithName } from './helpers/editor'

/**
 * Cursor-jump-to-end reproduction.
 *
 * Reported symptom: typing in the editor jumps the cursor to the end of the
 * file. Users noticed it more in larger projects (larger files / many tabs),
 * but the underlying bug fires even in a minimal scenario.
 *
 * Observed test results (chromium):
 *   - 1 keystroke         → cursor stays put (line 50 → col 11) ✓
 *   - typing with 200 ms delay between keys → cursor stays put ✓
 *   - typing with 4 ms delay between keys (rapid) → cursor JUMPS to last line ✗
 *
 * Mechanism: `@monaco-editor/react@4.7.0`'s value-sync effect runs when
 * `value !== editor.getValue()` and calls
 * `editor.executeEdits('', [{ range, text: value, forceMoveMarkers: true }])`,
 * which lands the cursor at the END of the inserted text — i.e. end of file.
 * Rapid typing produces a render where the React `value` prop is briefly
 * out of sync with Monaco's local model, triggering the full-range replace.
 *
 * Why "larger projects" makes it more noticeable: longer files = farther
 * (more visible) jump; more state updates per keystroke (setTabContents +
 * setDirty + context memo invalidation + syntax checker debounce + autosave
 * timer) widen the React render-scheduling window where the drift can occur.
 *
 * These tests intentionally FAIL today — they are a regression repro for the
 * bug. When the underlying fix lands, they should pass.
 */

const NUM_TABS = 8 // VirtualizedEditorPanel mounts up to 10
const LINES_IN_ACTIVE_FILE = 120
const CURSOR_START_LINE = 50
const CURSOR_START_COL = 10
const TYPE_BATCH_CHARS = 'qwertyuiopasdfghjklzxcvbnm'
const TYPE_DELAY_MS = 4
const RUNS = 5 // bug is intermittent — run multiple times

interface MonacoLikePosition { lineNumber: number; column: number }

async function getActiveEditorPosition(page: Page): Promise<MonacoLikePosition | null> {
  return page.evaluate(() => {
    const w = window as unknown as {
      monaco?: { editor?: { getEditors?: () => Array<{
        hasTextFocus: () => boolean
        getPosition: () => MonacoLikePosition | null
      }> } }
    }
    const editors = w.monaco?.editor?.getEditors?.() ?? []
    const focused = editors.find((e) => e.hasTextFocus()) ?? editors[0]
    return focused?.getPosition?.() ?? null
  })
}

async function seedActiveEditor(
  page: Page,
  content: string,
  line: number,
  col: number
): Promise<void> {
  await page.evaluate(({ content, line, col }) => {
    const w = window as unknown as {
      monaco?: { editor?: { getEditors?: () => Array<{
        hasTextFocus: () => boolean
        getModel: () => { setValue: (v: string) => void } | null
        setPosition: (p: { lineNumber: number; column: number }) => void
        focus: () => void
      }> } }
    }
    const editors = w.monaco?.editor?.getEditors?.() ?? []
    const focused = editors.find((e) => e.hasTextFocus()) ?? editors[0]
    if (!focused) return
    focused.getModel()?.setValue(content)
    focused.setPosition({ lineNumber: line, column: col })
    focused.focus()
  }, { content, line, col })
}

async function enableAutoSave(page: Page): Promise<void> {
  await page.locator('[data-testid^="editor-container-"]:visible .monaco-editor').first().click()
  await page.keyboard.press('F1')
  await expect(page.locator('.quick-input-widget')).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })
  await page.keyboard.type('auto-save')
  await page.locator('.quick-input-widget').getByText(/turn on auto-save/i).click()
  await expect(page.locator('.quick-input-widget')).not.toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })
}

test.describe('Minimal repro: cursor stays in place with a single substantial file', () => {
  test.beforeEach(async ({ explorerPage: page }) => {
    const workspaceChevron = page.getByTestId('folder-chevron').first()
    await workspaceChevron.click()
    await expect(page.getByRole('treeitem').nth(1)).toBeVisible({
      timeout: TIMEOUTS.ELEMENT_VISIBLE,
    })
  })

  test('single file, no autosave, no extra tabs: cursor stays at line 50', async ({ explorerPage: page }) => {
    await createAndOpenFileWithName(page, 'only.lua')

    const monacoEditor = page.locator('[data-testid^="editor-container-"]:visible .monaco-editor').first()
    await expect(monacoEditor).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })
    await page.waitForTimeout(TIMEOUTS.UI_STABLE)
    await monacoEditor.click()

    const longContent = Array.from(
      { length: LINES_IN_ACTIVE_FILE },
      (_, i) => `print("line ${i + 1}")`
    ).join('\n')
    await seedActiveEditor(page, longContent, CURSOR_START_LINE, CURSOR_START_COL)
    await page.waitForTimeout(TIMEOUTS.UI_STABLE)

    const startPos = await getActiveEditorPosition(page)
    expect(startPos!.lineNumber).toBe(CURSOR_START_LINE)
    expect(startPos!.column).toBe(CURSOR_START_COL)

    // Type just ONE character and check immediately
    await page.keyboard.type('q')
    await page.waitForTimeout(TIMEOUTS.UI_STABLE)

    const afterOneChar = await getActiveEditorPosition(page)
    console.log(`[trace] after one char: ${JSON.stringify(afterOneChar)}`)
    expect(
      afterOneChar!.lineNumber,
      `cursor jumped after ONE keystroke: from ${CURSOR_START_LINE} to ${afterOneChar!.lineNumber}`
    ).toBe(CURSOR_START_LINE)

    await page.keyboard.type(TYPE_BATCH_CHARS, { delay: TYPE_DELAY_MS })
    await page.waitForTimeout(TIMEOUTS.UI_STABLE)

    const finalPos = await getActiveEditorPosition(page)
    expect(
      finalPos!.lineNumber,
      `cursor jumped from ${CURSOR_START_LINE} to ${finalPos!.lineNumber}`
    ).toBe(CURSOR_START_LINE)
    expect(finalPos!.column).toBe(CURSOR_START_COL + 1 + TYPE_BATCH_CHARS.length)
  })

  test('SLOW typing (200ms between keys) does NOT cause the jump', async ({ explorerPage: page }) => {
    await createAndOpenFileWithName(page, 'only-slow.lua')

    const monacoEditor = page.locator('[data-testid^="editor-container-"]:visible .monaco-editor').first()
    await expect(monacoEditor).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })
    await page.waitForTimeout(TIMEOUTS.UI_STABLE)
    await monacoEditor.click()

    const longContent = Array.from(
      { length: LINES_IN_ACTIVE_FILE },
      (_, i) => `print("line ${i + 1}")`
    ).join('\n')
    await seedActiveEditor(page, longContent, CURSOR_START_LINE, CURSOR_START_COL)
    await page.waitForTimeout(TIMEOUTS.UI_STABLE)

    await page.keyboard.type('hello', { delay: 200 })
    await page.waitForTimeout(TIMEOUTS.UI_STABLE)

    const pos = await getActiveEditorPosition(page)
    expect(pos!.lineNumber, `slow typing should not jump: got line ${pos!.lineNumber}`).toBe(CURSOR_START_LINE)
    expect(pos!.column).toBe(CURSOR_START_COL + 'hello'.length)
  })
})

test.describe('Cursor stays in place when typing in a larger project', () => {
  test.beforeEach(async ({ explorerPage: page }) => {
    const workspaceChevron = page.getByTestId('folder-chevron').first()
    await workspaceChevron.click()
    await expect(page.getByRole('treeitem').nth(1)).toBeVisible({
      timeout: TIMEOUTS.ELEMENT_VISIBLE,
    })
  })

  for (let run = 1; run <= RUNS; run++) {
    test(`run ${run}: cursor stays at line ~${CURSOR_START_LINE} after rapid typing`, async ({ explorerPage: page }) => {
      // 1) Open many file tabs so tabContents / tabs / fileTree grow.
      const filenames = Array.from({ length: NUM_TABS }, (_, i) => `file-${run}-${i + 1}.lua`)
      for (const name of filenames) {
        await createAndOpenFileWithName(page, name)
      }
      // The last opened file is now the active tab.

      // 2) Wait for the visible Monaco editor (VirtualizedEditorPanel mounts
      //    multiple editors with display:none — we need the active one).
      const monacoEditor = page.locator('[data-testid^="editor-container-"]:visible .monaco-editor').first()
      await expect(monacoEditor).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })
      await page.waitForTimeout(TIMEOUTS.UI_STABLE)

      // 3) Click into the editor to focus
      await monacoEditor.click()

      // 4) Seed substantial content + place cursor mid-file
      const longContent = Array.from(
        { length: LINES_IN_ACTIVE_FILE },
        (_, i) => `print("line ${i + 1} of file-${run}-${NUM_TABS}.lua")`
      ).join('\n')
      await seedActiveEditor(page, longContent, CURSOR_START_LINE, CURSOR_START_COL)
      await page.waitForTimeout(TIMEOUTS.UI_STABLE)

      // 5) Verify starting position took
      const startPos = await getActiveEditorPosition(page)
      expect(startPos, 'editor should be focused with a position').not.toBeNull()
      expect(startPos!.lineNumber).toBe(CURSOR_START_LINE)
      expect(startPos!.column).toBe(CURSOR_START_COL)

      // 6) Enable auto-save — its 1500 ms timer racing with typing is a prime
      //    suspect for the value/editor drift.
      await enableAutoSave(page)

      // Re-focus and reset position after the command palette interaction.
      await monacoEditor.click()
      await seedActiveEditor(page, longContent, CURSOR_START_LINE, CURSOR_START_COL)
      await page.waitForTimeout(TIMEOUTS.UI_STABLE)

      // 7) Type a burst, pause past the autosave debounce, type another burst.
      //    This is the scenario most likely to produce a stale-render race:
      //    autosave fires its setTabContents while the user is mid-keystroke.
      await page.keyboard.type(TYPE_BATCH_CHARS, { delay: TYPE_DELAY_MS })
      // Wait long enough that the 1500ms autosave debounce fires.
      await page.waitForTimeout(1700)
      // Type again while autosave is still settling.
      await page.keyboard.type(TYPE_BATCH_CHARS, { delay: TYPE_DELAY_MS })
      // Brief settle.
      await page.waitForTimeout(TIMEOUTS.UI_STABLE)

      // 8) Read final cursor.
      const finalPos = await getActiveEditorPosition(page)
      expect(finalPos, 'editor should still report a position').not.toBeNull()

      // 9) Assertions: cursor must NOT have jumped to end of file.
      //    Expected: still on line 50, column = 10 + 2 * batch length.
      //    If the bug fires: cursor is on or near the last line (~120).
      const expectedColumn = CURSOR_START_COL + 2 * TYPE_BATCH_CHARS.length
      expect(
        finalPos!.lineNumber,
        `cursor jumped from line ${CURSOR_START_LINE} to line ${finalPos!.lineNumber} — likely Monaco value-sync executeEdits with forceMoveMarkers:true`
      ).toBe(CURSOR_START_LINE)
      expect(finalPos!.column).toBe(expectedColumn)
    })
  }
})
