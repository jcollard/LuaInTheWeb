/**
 * Pixel manipulation API bindings for canvas.
 * Extracted from setupCanvasAPI.ts to manage file size.
 */

import type { LuaEngine } from 'wasmoon'
import type { CanvasController } from './CanvasController'

// ============================================================================
// ImageData Store - Keeps pixel data on JS side for O(1) put_image_data
// ============================================================================

interface StoredImageData {
  data: Uint8ClampedArray
  width: number
  height: number
}

/** Storage for ImageData arrays, keyed by numeric ID */
const imageDataStore = new Map<number, StoredImageData>()

/** Next available ID for ImageData storage */
let nextImageDataId = 1

/**
 * Store an ImageData array and return its ID.
 * The data is stored on the JS side to avoid copying on every put_image_data call.
 */
function storeImageData(data: Uint8ClampedArray, width: number, height: number): number {
  const id = nextImageDataId++
  imageDataStore.set(id, { data, width, height })
  return id
}

/**
 * Clear all stored ImageData. Called when canvas is stopped.
 */
export function clearImageDataStore(): void {
  imageDataStore.clear()
}

/**
 * Set up pixel manipulation API bindings in the Lua engine.
 */
export function setupPixelBindings(
  engine: LuaEngine,
  getController: () => CanvasController | null
): void {
  // create_image_data: Creates empty pixel buffer, returns {id, width, height}
  engine.global.set('__canvas_createImageData', (width: number, height: number) => {
    const data = new Uint8ClampedArray(width * height * 4)
    const id = storeImageData(data, width, height)
    return { id, width, height }
  })

  // get_image_data: Reads pixels from canvas, stores in JS, returns {id, width, height}
  engine.global.set(
    '__canvas_getImageData',
    (x: number, y: number, width: number, height: number) => {
      const arr = getController()?.getImageData(x, y, width, height)
      if (!arr) return null
      const data = new Uint8ClampedArray(arr)
      const id = storeImageData(data, width, height)
      return { id, width, height }
    }
  )

  // put_image_data: Uses stored array by ID - O(1) no copy needed!
  engine.global.set('__canvas_putImageData', (id: number, dx: number, dy: number) => {
    const stored = imageDataStore.get(id)
    if (!stored) return
    getController()?.putImageData(Array.from(stored.data), stored.width, stored.height, dx, dy)
  })

  // set_pixel: Modifies stored array directly by ID
  engine.global.set(
    '__canvas_imageDataSetPixel',
    (id: number, x: number, y: number, r: number, g: number, b: number, a: number) => {
      const stored = imageDataStore.get(id)
      if (!stored || x < 0 || x >= stored.width || y < 0 || y >= stored.height) return
      const idx = (y * stored.width + x) * 4
      stored.data[idx] = r
      stored.data[idx + 1] = g
      stored.data[idx + 2] = b
      stored.data[idx + 3] = a
    }
  )

  // get_pixel: Reads from stored array by ID
  engine.global.set('__canvas_imageDataGetPixel', (id: number, x: number, y: number) => {
    const stored = imageDataStore.get(id)
    if (!stored || x < 0 || x >= stored.width || y < 0 || y >= stored.height) {
      return [0, 0, 0, 0]
    }
    const idx = (y * stored.width + x) * 4
    return [stored.data[idx], stored.data[idx + 1], stored.data[idx + 2], stored.data[idx + 3]]
  })

  // dispose: Removes ImageData from store to free memory
  engine.global.set('__canvas_imageDataDispose', (id: number) => {
    imageDataStore.delete(id)
  })

  // clone: Creates a deep copy of an existing ImageData
  engine.global.set('__canvas_cloneImageData', (id: number) => {
    const stored = imageDataStore.get(id)
    if (!stored) return null
    // Create a new Uint8ClampedArray with a copy of the data
    const clonedData = new Uint8ClampedArray(stored.data)
    const newId = storeImageData(clonedData, stored.width, stored.height)
    return { id: newId, width: stored.width, height: stored.height }
  })
}
