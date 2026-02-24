import { describe, it, expect } from 'vitest'
import {
  initSchedule,
  computePlaybackTick,
  DEFAULT_FRAME_DURATION_MS,
  type LayerSchedule,
  type PlayableLayer,
  type AnimatedDrawnLayer,
} from '../src/playbackEngine'

function makeDrawnLayer(
  id: string,
  frameCount: number,
  frameDurationMs = DEFAULT_FRAME_DURATION_MS,
  currentFrameIndex = 0,
): AnimatedDrawnLayer {
  const frames = Array.from({ length: frameCount }, (_, i) => ({ frameIndex: i }))
  return {
    type: 'drawn',
    id,
    frames,
    currentFrameIndex,
    frameDurationMs,
    grid: frames[currentFrameIndex],
  }
}

describe('initSchedule', () => {
  it('creates correct initial schedule for animated layers', () => {
    const layers: PlayableLayer[] = [
      makeDrawnLayer('a', 3, 100),
      makeDrawnLayer('b', 2, 200),
    ]
    const schedule = initSchedule(layers, 1000)
    expect(schedule.get('a')).toBe(1100)
    expect(schedule.get('b')).toBe(1200)
  })

  it('ignores single-frame layers', () => {
    const layers: PlayableLayer[] = [
      makeDrawnLayer('static', 1, 100),
      makeDrawnLayer('anim', 2, 100),
    ]
    const schedule = initSchedule(layers, 500)
    expect(schedule.has('static')).toBe(false)
    expect(schedule.has('anim')).toBe(true)
  })

  it('ignores non-drawn layers', () => {
    const layers: PlayableLayer[] = [
      { type: 'group', id: 'g1' },
    ]
    const schedule = initSchedule(layers, 500)
    expect(schedule.size).toBe(0)
  })
})

describe('computePlaybackTick', () => {
  it('advances a single layer when now >= advanceAt', () => {
    const layer = makeDrawnLayer('a', 3, 100, 0)
    const layers: PlayableLayer[] = [layer]
    const schedule: LayerSchedule = new Map([['a', 1100]])

    const result = computePlaybackTick(layers, schedule, 1100)
    expect(result.changed).toBe(true)
    expect(layer.currentFrameIndex).toBe(1)
    expect(layer.grid).toBe(layer.frames[1])
  })

  it('does NOT advance a layer before its time', () => {
    const layer = makeDrawnLayer('a', 3, 100, 0)
    const layers: PlayableLayer[] = [layer]
    const schedule: LayerSchedule = new Map([['a', 1100]])

    const result = computePlaybackTick(layers, schedule, 1050)
    expect(result.changed).toBe(false)
    expect(layer.currentFrameIndex).toBe(0)
  })

  it('advances only the fast layer at its interval when two layers have different rates', () => {
    const fast = makeDrawnLayer('fast', 3, 100, 0)
    const slow = makeDrawnLayer('slow', 3, 200, 0)
    const layers: PlayableLayer[] = [fast, slow]
    const schedule: LayerSchedule = new Map([['fast', 1100], ['slow', 1200]])

    const result = computePlaybackTick(layers, schedule, 1100)
    expect(result.changed).toBe(true)
    expect(fast.currentFrameIndex).toBe(1)
    expect(slow.currentFrameIndex).toBe(0)
  })

  it('advances both layers when both are due', () => {
    const a = makeDrawnLayer('a', 3, 100, 0)
    const b = makeDrawnLayer('b', 3, 200, 0)
    const layers: PlayableLayer[] = [a, b]
    const schedule: LayerSchedule = new Map([['a', 1100], ['b', 1100]])

    const result = computePlaybackTick(layers, schedule, 1100)
    expect(result.changed).toBe(true)
    expect(a.currentFrameIndex).toBe(1)
    expect(b.currentFrameIndex).toBe(1)
  })

  it('200ms layer plays at half the rate of 100ms layer over multiple ticks', () => {
    const fast = makeDrawnLayer('fast', 4, 100, 0)
    const slow = makeDrawnLayer('slow', 4, 200, 0)
    const layers: PlayableLayer[] = [fast, slow]
    const schedule: LayerSchedule = new Map([['fast', 1100], ['slow', 1200]])

    // Tick at 1100: fast advances, slow does not
    computePlaybackTick(layers, schedule, 1100)
    expect(fast.currentFrameIndex).toBe(1)
    expect(slow.currentFrameIndex).toBe(0)

    // Tick at 1200: both advance
    computePlaybackTick(layers, schedule, 1200)
    expect(fast.currentFrameIndex).toBe(2)
    expect(slow.currentFrameIndex).toBe(1)

    // Tick at 1300: fast advances, slow does not
    computePlaybackTick(layers, schedule, 1300)
    expect(fast.currentFrameIndex).toBe(3)
    expect(slow.currentFrameIndex).toBe(1)

    // Tick at 1400: both advance
    computePlaybackTick(layers, schedule, 1400)
    expect(fast.currentFrameIndex).toBe(0) // wraps
    expect(slow.currentFrameIndex).toBe(2)
  })

  it('ignores single-frame layers', () => {
    const single = makeDrawnLayer('single', 1, 100)
    const anim = makeDrawnLayer('anim', 3, 100, 0)
    const layers: PlayableLayer[] = [single, anim]
    const schedule: LayerSchedule = new Map([['anim', 1100]])

    const result = computePlaybackTick(layers, schedule, 1100)
    expect(result.changed).toBe(true)
    expect(anim.currentFrameIndex).toBe(1)
  })

  it('returns changed=false when no layer is due', () => {
    const layer = makeDrawnLayer('a', 3, 100, 0)
    const layers: PlayableLayer[] = [layer]
    const schedule: LayerSchedule = new Map([['a', 1200]])

    const result = computePlaybackTick(layers, schedule, 1100)
    expect(result.changed).toBe(false)
  })

  it('returns changed=true when at least one layer advances', () => {
    const layer = makeDrawnLayer('a', 3, 100, 0)
    const layers: PlayableLayer[] = [layer]
    const schedule: LayerSchedule = new Map([['a', 1100]])

    const result = computePlaybackTick(layers, schedule, 1100)
    expect(result.changed).toBe(true)
  })

  it('defaults nextDelayMs to DEFAULT_FRAME_DURATION_MS when no animated layers', () => {
    const layers: PlayableLayer[] = [makeDrawnLayer('static', 1, 100)]
    const schedule: LayerSchedule = new Map()

    const result = computePlaybackTick(layers, schedule, 1000)
    expect(result.nextDelayMs).toBe(DEFAULT_FRAME_DURATION_MS)
  })

  it('applies drift correction when very late tick snaps schedule forward', () => {
    const layer = makeDrawnLayer('a', 3, 100, 0)
    const layers: PlayableLayer[] = [layer]
    // Layer was scheduled at 1100 but we tick at 1500 (400ms late — more than one full period)
    const schedule: LayerSchedule = new Map([['a', 1100]])

    computePlaybackTick(layers, schedule, 1500)
    expect(layer.currentFrameIndex).toBe(1)
    // Schedule should snap forward to now + duration instead of old advanceAt + duration
    expect(schedule.get('a')).toBe(1600)
  })

  it('removes schedule entries for deleted layers', () => {
    const layers: PlayableLayer[] = [makeDrawnLayer('a', 3, 100, 0)]
    const schedule: LayerSchedule = new Map([['a', 1100], ['deleted', 1200]])

    computePlaybackTick(layers, schedule, 1050)
    expect(schedule.has('deleted')).toBe(false)
  })

  it('removes schedule entries for layers reduced to 1 frame', () => {
    const single = makeDrawnLayer('single', 1, 100)
    const layers: PlayableLayer[] = [single]
    const schedule: LayerSchedule = new Map([['single', 1100]])

    computePlaybackTick(layers, schedule, 1050)
    expect(schedule.has('single')).toBe(false)
  })

  it('auto-initializes new layers appearing mid-playback', () => {
    const existing = makeDrawnLayer('existing', 3, 100, 0)
    const newLayer = makeDrawnLayer('new', 3, 200, 0)
    const layers: PlayableLayer[] = [existing, newLayer]
    // Only 'existing' is in the schedule; 'new' was added mid-playback
    const schedule: LayerSchedule = new Map([['existing', 1100]])

    const result = computePlaybackTick(layers, schedule, 1100)
    expect(result.changed).toBe(true)
    expect(existing.currentFrameIndex).toBe(1)
    // New layer should be initialized (not advanced yet since it wasn't scheduled)
    expect(schedule.has('new')).toBe(true)
    expect(schedule.get('new')).toBe(1300) // now + frameDurationMs
  })

  it('wraps from last frame back to frame 0', () => {
    const layer = makeDrawnLayer('a', 3, 100, 2) // on last frame
    const layers: PlayableLayer[] = [layer]
    const schedule: LayerSchedule = new Map([['a', 1100]])

    computePlaybackTick(layers, schedule, 1100)
    expect(layer.currentFrameIndex).toBe(0)
    expect(layer.grid).toBe(layer.frames[0])
  })

  it('ensures nextDelayMs is at least 1ms', () => {
    const layer = makeDrawnLayer('a', 3, 100, 0)
    const layers: PlayableLayer[] = [layer]
    const schedule: LayerSchedule = new Map([['a', 1100]])

    const result = computePlaybackTick(layers, schedule, 1200)
    expect(result.nextDelayMs).toBeGreaterThanOrEqual(1)
  })

  it('returns nextDelayMs based on soonest scheduled advance', () => {
    const fast = makeDrawnLayer('fast', 3, 100, 0)
    const slow = makeDrawnLayer('slow', 3, 300, 0)
    const layers: PlayableLayer[] = [fast, slow]
    const schedule: LayerSchedule = new Map([['fast', 1100], ['slow', 1300]])

    // Neither due yet at 1050
    const result = computePlaybackTick(layers, schedule, 1050)
    expect(result.nextDelayMs).toBe(50) // 1100 - 1050
  })

  it('nextDelayMs reflects auto-initialized layer schedule', () => {
    // New layer added mid-playback with 150ms duration, no other layers
    const newLayer = makeDrawnLayer('new', 3, 150, 0)
    const layers: PlayableLayer[] = [newLayer]
    const schedule: LayerSchedule = new Map() // empty — layer not yet scheduled

    const result = computePlaybackTick(layers, schedule, 2000)
    // Auto-initialized to 2000 + 150 = 2150; delay = 2150 - 2000 = 150
    expect(result.nextDelayMs).toBe(150)
  })

  it('nextDelayMs after advancing reflects new schedule (not-late case)', () => {
    const layer = makeDrawnLayer('a', 3, 200, 0)
    const layers: PlayableLayer[] = [layer]
    // Scheduled at 1200, tick exactly on time
    const schedule: LayerSchedule = new Map([['a', 1200]])

    const result = computePlaybackTick(layers, schedule, 1200)
    expect(result.changed).toBe(true)
    // Not-late: next = 1200 + 200 = 1400; delay = 1400 - 1200 = 200
    expect(schedule.get('a')).toBe(1400)
    expect(result.nextDelayMs).toBe(200)
  })

  it('drift correction uses now + duration (not advanceAt + duration) when very late', () => {
    const layer = makeDrawnLayer('a', 3, 100, 0)
    const layers: PlayableLayer[] = [layer]
    // Scheduled at 1100 but tick at 1250 (150ms late, > 1 full period of 100ms)
    const schedule: LayerSchedule = new Map([['a', 1100]])

    const result = computePlaybackTick(layers, schedule, 1250)
    expect(result.changed).toBe(true)
    // Drift correction: 1250 + 100 = 1350 (not 1100 + 100 = 1200)
    expect(schedule.get('a')).toBe(1350)
    expect(result.nextDelayMs).toBe(100) // 1350 - 1250
  })

  it('no drift correction when slightly late (less than one period)', () => {
    const layer = makeDrawnLayer('a', 3, 100, 0)
    const layers: PlayableLayer[] = [layer]
    // Scheduled at 1100, tick at 1150 (50ms late, < 100ms period)
    const schedule: LayerSchedule = new Map([['a', 1100]])

    const result = computePlaybackTick(layers, schedule, 1150)
    expect(result.changed).toBe(true)
    // No drift: next = 1100 + 100 = 1200 (catch-up behavior)
    expect(schedule.get('a')).toBe(1200)
    expect(result.nextDelayMs).toBe(50) // 1200 - 1150
  })

  it('nextDelayMs from not-yet-due layer when it is the only animated layer', () => {
    const layer = makeDrawnLayer('a', 3, 300, 0)
    const layers: PlayableLayer[] = [layer]
    const schedule: LayerSchedule = new Map([['a', 2000]])

    const result = computePlaybackTick(layers, schedule, 1800)
    expect(result.changed).toBe(false)
    expect(result.nextDelayMs).toBe(200) // 2000 - 1800
  })

  it('nextDelayMs picks soonest among auto-initialized and existing layers', () => {
    const existing = makeDrawnLayer('existing', 3, 500, 0)
    const newLayer = makeDrawnLayer('new', 3, 50, 0)
    const layers: PlayableLayer[] = [existing, newLayer]
    // existing is scheduled far in the future; new is auto-initialized
    const schedule: LayerSchedule = new Map([['existing', 3000]])

    const result = computePlaybackTick(layers, schedule, 1000)
    // new auto-initialized at 1000 + 50 = 1050
    // existing at 3000
    // soonest = 1050, delay = 50
    expect(result.nextDelayMs).toBe(50)
  })
})
