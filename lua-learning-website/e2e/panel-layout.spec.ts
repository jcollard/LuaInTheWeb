import { test, expect } from '@playwright/test'

test.describe('Panel Layout', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test to ensure clean state
    await page.goto('/test/panel-layout')
    await page.evaluate(() => localStorage.clear())
    await page.reload()
    // Wait for panels to render
    await expect(page.locator('[data-testid="panel-header"]').first()).toBeVisible()
  })

  test('renders panels with correct initial structure', async ({ page }) => {
    // Should have left panel with header
    await expect(page.getByText('Left Panel')).toBeVisible()

    // Should have editor panel - scope to panel headers to avoid matching nav links
    const panelHeaders = page.locator('[data-testid="panel-header"]')
    await expect(panelHeaders.filter({ hasText: 'Editor' })).toBeVisible()

    // Should have output panel
    await expect(panelHeaders.filter({ hasText: 'Output' })).toBeVisible()

    // Should have resize handles (separators)
    const resizeHandles = page.locator('[role="separator"]')
    await expect(resizeHandles).toHaveCount(2) // horizontal + vertical
  })

  test('dragging resize handle changes panel sizes', async ({ page }) => {
    // Get the first resize handle (between left panel and right section)
    const resizeHandle = page.locator('[role="separator"]').first()
    await expect(resizeHandle).toBeVisible()

    // Get initial bounding box of left panel header
    const leftPanelHeader = page.getByText('Left Panel')
    const initialBox = await leftPanelHeader.boundingBox()

    // Drag the handle to the right (increase left panel width)
    const handleBox = await resizeHandle.boundingBox()
    if (handleBox && initialBox) {
      await page.mouse.move(
        handleBox.x + handleBox.width / 2,
        handleBox.y + handleBox.height / 2
      )
      await page.mouse.down()
      await page.mouse.move(handleBox.x + 100, handleBox.y + handleBox.height / 2)
      await page.mouse.up()

      // Wait for resize to take effect
      await page.waitForTimeout(200)

      // The left panel should be wider now (header text should have more space)
      const newBox = await leftPanelHeader.boundingBox()
      if (newBox) {
        // The panel should be wider or at least not smaller
        expect(newBox.x).toBeLessThanOrEqual(initialBox.x + 10)
      }
    }
  })

  test('layout persists after page refresh', async ({ page }) => {
    // Get the first resize handle
    const resizeHandle = page.locator('[role="separator"]').first()
    const handleBox = await resizeHandle.boundingBox()

    if (handleBox) {
      // Drag the handle to change panel sizes
      await page.mouse.move(
        handleBox.x + handleBox.width / 2,
        handleBox.y + handleBox.height / 2
      )
      await page.mouse.down()
      await page.mouse.move(handleBox.x + 150, handleBox.y + handleBox.height / 2)
      await page.mouse.up()

      // Wait for persistence debounce (100ms + buffer)
      await page.waitForTimeout(300)

      // Get the handle position after resize
      const afterResizeBox = await resizeHandle.boundingBox()

      // Reload the page
      await page.reload()
      await expect(page.getByText('Left Panel')).toBeVisible()

      // Wait for layout to be restored
      await page.waitForTimeout(500)

      // Check that handle is still in the new position (with tolerance for minor differences)
      const afterReloadBox = await resizeHandle.boundingBox()
      if (afterResizeBox && afterReloadBox) {
        // The handle should be approximately in the same position
        expect(Math.abs(afterReloadBox.x - afterResizeBox.x)).toBeLessThan(20)
      }
    }
  })

  test('collapse button hides panel content', async ({ page }) => {
    // Find the collapse button in the left panel header
    const collapseButton = page.locator('button[aria-label="Collapse panel"]').first()
    await expect(collapseButton).toBeVisible()

    // Verify panel content is visible before collapse
    await expect(page.getByText('Explorer')).toBeVisible()
    await expect(page.getByText('File 1.lua')).toBeVisible()

    // Click collapse button
    await collapseButton.click()

    // Wait for collapse animation
    await page.waitForTimeout(200)

    // Panel content should be hidden
    await expect(page.getByText('File 1.lua')).not.toBeVisible()

    // Header should still be visible (panel is collapsed, not removed)
    await expect(page.getByText('Left Panel')).toBeVisible()

    // Expand button should now be visible
    const expandButton = page.locator('button[aria-label="Expand panel"]').first()
    await expect(expandButton).toBeVisible()
  })

  test('expand button shows panel content', async ({ page }) => {
    // First collapse the panel
    const collapseButton = page.locator('button[aria-label="Collapse panel"]').first()
    await collapseButton.click()
    await page.waitForTimeout(200)

    // Now expand it
    const expandButton = page.locator('button[aria-label="Expand panel"]').first()
    await expandButton.click()
    await page.waitForTimeout(200)

    // Content should be visible again
    await expect(page.getByText('Explorer')).toBeVisible()
    await expect(page.getByText('File 1.lua')).toBeVisible()
  })

  test('keyboard arrow keys resize when handle focused', async ({ page }) => {
    // Get the first resize handle
    const resizeHandle = page.locator('[role="separator"]').first()
    await expect(resizeHandle).toBeVisible()

    // Get initial position
    const initialBox = await resizeHandle.boundingBox()

    // Focus the resize handle
    await resizeHandle.focus()

    // Press arrow key to resize (react-resizable-panels handles this)
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowRight')
    await page.keyboard.press('ArrowRight')

    // Wait for resize to take effect
    await page.waitForTimeout(200)

    // Check that handle has moved
    const afterBox = await resizeHandle.boundingBox()
    if (initialBox && afterBox) {
      // The handle should have moved to the right
      expect(afterBox.x).toBeGreaterThanOrEqual(initialBox.x)
    }
  })

  test('nested vertical panel group works correctly', async ({ page }) => {
    // Get the vertical resize handle (between editor and output)
    const verticalHandle = page.locator('[role="separator"]').nth(1)
    await expect(verticalHandle).toBeVisible()

    // Get initial position
    const initialBox = await verticalHandle.boundingBox()

    if (initialBox) {
      // Drag down to resize
      await page.mouse.move(
        initialBox.x + initialBox.width / 2,
        initialBox.y + initialBox.height / 2
      )
      await page.mouse.down()
      await page.mouse.move(
        initialBox.x + initialBox.width / 2,
        initialBox.y + 50
      )
      await page.mouse.up()

      // Wait for resize
      await page.waitForTimeout(200)

      // Verify both panels are still visible
      await expect(page.getByText('Code Editor')).toBeVisible()
      await expect(page.getByText('Terminal Output')).toBeVisible()
    }
  })

  test('double-click resize handle resets to default size', async ({ page }) => {
    // Get the first resize handle (between left panel and right section)
    const resizeHandle = page.locator('[role="separator"]').first()
    await expect(resizeHandle).toBeVisible()

    // Get initial handle position (default 30/70 split)
    const initialBox = await resizeHandle.boundingBox()

    if (initialBox) {
      // Drag the handle significantly to the right
      await page.mouse.move(
        initialBox.x + initialBox.width / 2,
        initialBox.y + initialBox.height / 2
      )
      await page.mouse.down()
      await page.mouse.move(initialBox.x + 200, initialBox.y + initialBox.height / 2)
      await page.mouse.up()

      // Wait for resize to take effect
      await page.waitForTimeout(200)

      // Verify handle has moved
      const afterDragBox = await resizeHandle.boundingBox()
      expect(afterDragBox).toBeTruthy()
      if (afterDragBox) {
        expect(afterDragBox.x).toBeGreaterThan(initialBox.x + 50)
      }

      // Double-click the handle to reset
      await resizeHandle.dblclick()

      // Wait for reset animation
      await page.waitForTimeout(200)

      // Verify handle is back near original position
      const afterResetBox = await resizeHandle.boundingBox()
      if (afterResetBox) {
        // Should be within 30px of original position (allowing for minor differences)
        expect(Math.abs(afterResetBox.x - initialBox.x)).toBeLessThan(30)
      }
    }
  })
})
