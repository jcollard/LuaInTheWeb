import { test, expect } from './fixtures'
import { TIMEOUTS } from './constants'

const DEFAULT_RUNTIME_SURROUND = 'rgb(0, 13, 17)'

test.describe('ANSI editor — canvas surround', () => {
  test('drawable canvas has a visible border and the surround is not the default runtime black', async ({ cleanEditorPage }) => {
    const page = cleanEditorPage

    await page.getByRole('button', { name: /extensions/i }).click()
    await page.getByTestId('open-ansi-editor').click()

    const editor = page.getByTestId('ansi-graphics-editor')
    await expect(editor).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

    const surround = editor.locator('div[class*="container"]').first()
    await expect(surround).toBeVisible({ timeout: TIMEOUTS.ELEMENT_VISIBLE })

    await expect(async () => {
      const bg = await surround.evaluate((el) => getComputedStyle(el).backgroundColor)
      expect(bg).not.toBe(DEFAULT_RUNTIME_SURROUND)
      expect(bg).not.toBe('rgba(0, 0, 0, 0)')
    }).toPass({ timeout: TIMEOUTS.INIT })

    const wrapper = surround.locator('div[class*="terminalWrapper"]').first()
    await expect(wrapper).toBeVisible()

    await expect(async () => {
      const borderTop = await wrapper.evaluate((el) => getComputedStyle(el).borderTopWidth)
      expect(borderTop).not.toBe('')
      expect(borderTop).not.toBe('0px')
    }).toPass({ timeout: TIMEOUTS.INIT })
  })
})
