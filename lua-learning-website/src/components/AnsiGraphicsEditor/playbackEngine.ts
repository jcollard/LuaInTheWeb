import type { Layer, DrawnLayer } from './types'
import { DEFAULT_FRAME_DURATION_MS } from './types'

/** Maps layerId to the absolute time (ms) at which it should next advance. */
export type LayerSchedule = Map<string, number>

export interface PlaybackTickResult {
  changed: boolean
  nextDelayMs: number
}

function isAnimatedDrawn(layer: Layer): layer is DrawnLayer {
  return layer.type === 'drawn' && layer.frames.length > 1
}

/**
 * Create an initial schedule for all animated layers.
 * Each layer's first advance is at `now + frameDurationMs`.
 */
export function initSchedule(layers: readonly Layer[], now: number): LayerSchedule {
  const schedule: LayerSchedule = new Map()
  for (const layer of layers) {
    if (isAnimatedDrawn(layer)) {
      schedule.set(layer.id, now + layer.frameDurationMs)
    }
  }
  return schedule
}

/**
 * Advance layers whose scheduled time has arrived.
 * Mutates layer frame state and the schedule map in place.
 */
export function computePlaybackTick(
  layers: Layer[],
  schedule: LayerSchedule,
  now: number,
): PlaybackTickResult {
  let changed = false
  let soonest = Infinity
  const animatedIds = new Set<string>()

  for (const layer of layers) {
    if (!isAnimatedDrawn(layer)) continue
    animatedIds.add(layer.id)

    let advanceAt = schedule.get(layer.id)

    // Auto-initialize layers added mid-playback
    if (advanceAt === undefined) {
      advanceAt = now + layer.frameDurationMs
      schedule.set(layer.id, advanceAt)
      soonest = Math.min(soonest, advanceAt)
      continue
    }

    if (now >= advanceAt) {
      const nextIndex = (layer.currentFrameIndex + 1) % layer.frames.length
      layer.currentFrameIndex = nextIndex
      layer.grid = layer.frames[nextIndex]
      changed = true

      // Drift correction: if we're more than one full period late, snap forward
      const nextAdvance = now - advanceAt >= layer.frameDurationMs
        ? now + layer.frameDurationMs
        : advanceAt + layer.frameDurationMs
      schedule.set(layer.id, nextAdvance)
      soonest = Math.min(soonest, nextAdvance)
    } else {
      soonest = Math.min(soonest, advanceAt)
    }
  }

  for (const id of schedule.keys()) {
    if (!animatedIds.has(id)) {
      schedule.delete(id)
    }
  }

  const nextDelayMs = soonest === Infinity
    ? DEFAULT_FRAME_DURATION_MS
    : Math.max(1, soonest - now)

  return { changed, nextDelayMs }
}
