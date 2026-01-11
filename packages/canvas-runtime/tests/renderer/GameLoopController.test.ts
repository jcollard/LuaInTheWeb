/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GameLoopController } from '../../src/renderer/GameLoopController.js';
import type { TimingInfo } from '../../src/shared/types.js';

describe('GameLoopController', () => {
  let controller: GameLoopController;
  let frameCallback: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    frameCallback = vi.fn();
    controller = new GameLoopController(frameCallback);
  });

  afterEach(() => {
    controller.dispose();
    vi.useRealTimers();
  });

  describe('constructor', () => {
    it('should create controller with frame callback', () => {
      expect(controller).toBeDefined();
    });

    it('should not be running initially', () => {
      expect(controller.isRunning()).toBe(false);
    });
  });

  describe('start/stop', () => {
    it('should start the game loop', () => {
      controller.start();
      expect(controller.isRunning()).toBe(true);
    });

    it('should stop the game loop', () => {
      controller.start();
      controller.stop();
      expect(controller.isRunning()).toBe(false);
    });

    it('should call frame callback when running', () => {
      controller.start();

      // Advance time and trigger animation frame
      vi.advanceTimersToNextTimer();

      expect(frameCallback).toHaveBeenCalled();
    });

    it('should not call frame callback after stopping', () => {
      controller.start();
      controller.stop();

      frameCallback.mockClear();
      vi.advanceTimersByTime(100);

      expect(frameCallback).not.toHaveBeenCalled();
    });

    it('should be safe to call start multiple times', () => {
      controller.start();
      controller.start();
      controller.start();

      expect(controller.isRunning()).toBe(true);
    });

    it('should be safe to call stop when not running', () => {
      expect(() => controller.stop()).not.toThrow();
    });
  });

  describe('pause/resume', () => {
    it('should pause the game loop', () => {
      controller.start();
      controller.pause();

      expect(controller.isRunning()).toBe(true);
      expect(controller.isPaused()).toBe(true);
    });

    it('should not call frame callback when paused', () => {
      controller.start();

      // Let one frame happen
      vi.advanceTimersToNextTimer();
      const callCount = frameCallback.mock.calls.length;

      controller.pause();
      vi.advanceTimersByTime(100);

      // No additional frames while paused
      expect(frameCallback.mock.calls.length).toBe(callCount);
    });

    it('should resume after pause', () => {
      controller.start();
      controller.pause();

      frameCallback.mockClear();
      controller.resume();

      vi.advanceTimersToNextTimer();

      expect(frameCallback).toHaveBeenCalled();
    });

    it('should not be paused initially', () => {
      expect(controller.isPaused()).toBe(false);
    });

    it('should be safe to resume when not paused', () => {
      controller.start();
      expect(() => controller.resume()).not.toThrow();
    });
  });

  describe('timing info', () => {
    it('should pass timing info to frame callback', () => {
      controller.start();
      vi.advanceTimersToNextTimer();

      expect(frameCallback).toHaveBeenCalledWith(
        expect.objectContaining({
          deltaTime: expect.any(Number),
          totalTime: expect.any(Number),
          frameNumber: expect.any(Number),
        })
      );
    });

    it('should increment frame number each frame', () => {
      controller.start();

      // First frame
      vi.advanceTimersToNextTimer();
      const firstCall = frameCallback.mock.calls[0][0] as TimingInfo;
      expect(firstCall.frameNumber).toBe(1);

      // Second frame
      vi.advanceTimersToNextTimer();
      const secondCall = frameCallback.mock.calls[1][0] as TimingInfo;
      expect(secondCall.frameNumber).toBe(2);
    });

    it('should track total time elapsed', () => {
      controller.start();

      // First frame
      vi.advanceTimersByTime(16);
      vi.advanceTimersToNextTimer();
      const firstCall = frameCallback.mock.calls[0][0] as TimingInfo;

      // Second frame - advance time first
      vi.advanceTimersByTime(16);
      vi.advanceTimersToNextTimer();
      const secondCall = frameCallback.mock.calls[1][0] as TimingInfo;

      expect(secondCall.totalTime).toBeGreaterThan(firstCall.totalTime);
    });

    it('should provide delta time since last frame', () => {
      controller.start();

      vi.advanceTimersByTime(16);
      vi.advanceTimersToNextTimer();

      const timing = frameCallback.mock.calls[0][0] as TimingInfo;
      // Delta time should be positive
      expect(timing.deltaTime).toBeGreaterThan(0);
    });

    it('should cap delta time to prevent spiral of death', () => {
      controller.start();

      // Simulate a very long frame (1 second)
      vi.advanceTimersByTime(1000);
      vi.advanceTimersToNextTimer();

      const timing = frameCallback.mock.calls[0][0] as TimingInfo;
      // Delta should be capped (typically to ~100ms)
      expect(timing.deltaTime).toBeLessThanOrEqual(0.1);
    });
  });

  describe('reset', () => {
    it('should reset frame counter', () => {
      controller.start();
      vi.advanceTimersToNextTimer();
      vi.advanceTimersToNextTimer();

      controller.reset();
      frameCallback.mockClear();

      vi.advanceTimersToNextTimer();

      const timing = frameCallback.mock.calls[0][0] as TimingInfo;
      expect(timing.frameNumber).toBe(1);
    });

    it('should reset total time', () => {
      controller.start();
      vi.advanceTimersByTime(100);
      vi.advanceTimersToNextTimer();

      controller.reset();
      frameCallback.mockClear();

      vi.advanceTimersToNextTimer();

      const timing = frameCallback.mock.calls[0][0] as TimingInfo;
      // Total time should be small after reset
      expect(timing.totalTime).toBeLessThan(0.1);
    });
  });

  describe('target FPS', () => {
    it('should default to 60 FPS', () => {
      expect(controller.getTargetFPS()).toBe(60);
    });

    it('should allow setting target FPS', () => {
      controller.setTargetFPS(30);
      expect(controller.getTargetFPS()).toBe(30);
    });
  });

  describe('dispose', () => {
    it('should stop the loop and clean up', () => {
      controller.start();
      controller.dispose();

      expect(controller.isRunning()).toBe(false);
    });

    it('should be safe to call multiple times', () => {
      expect(() => {
        controller.dispose();
        controller.dispose();
      }).not.toThrow();
    });

    it('should not call callback after dispose', () => {
      controller.start();
      controller.dispose();

      frameCallback.mockClear();
      vi.advanceTimersByTime(100);

      expect(frameCallback).not.toHaveBeenCalled();
    });
  });

  describe('getCurrentTiming', () => {
    it('should return current timing state', () => {
      controller.start();
      vi.advanceTimersToNextTimer();
      vi.advanceTimersToNextTimer();

      const timing = controller.getCurrentTiming();
      expect(timing.frameNumber).toBe(2);
      expect(timing.totalTime).toBeGreaterThan(0);
    });

    it('should return zeros before first frame', () => {
      const timing = controller.getCurrentTiming();
      expect(timing.frameNumber).toBe(0);
      expect(timing.totalTime).toBe(0);
      expect(timing.deltaTime).toBe(0);
    });
  });

  describe('step', () => {
    it('should execute one frame callback when paused', () => {
      controller.start();
      vi.advanceTimersToNextTimer(); // Initial frame
      controller.pause();
      frameCallback.mockClear();

      controller.step();
      vi.advanceTimersToNextTimer();

      expect(frameCallback).toHaveBeenCalledTimes(1);
    });

    it('should return to paused state after stepping', () => {
      controller.start();
      controller.pause();

      controller.step();
      vi.advanceTimersToNextTimer();

      expect(controller.isPaused()).toBe(true);
    });

    it('should do nothing if not running', () => {
      frameCallback.mockClear();

      controller.step();
      vi.advanceTimersToNextTimer();

      expect(frameCallback).not.toHaveBeenCalled();
    });

    it('should do nothing if not paused', () => {
      controller.start();
      vi.advanceTimersToNextTimer(); // Initial frame
      frameCallback.mockClear();

      // Not paused - step should have no effect
      controller.step();
      vi.advanceTimersToNextTimer();

      // Only normal frame should occur (step doesn't cause extra)
      expect(frameCallback.mock.calls.length).toBeLessThanOrEqual(1);
    });

    it('should allow multiple steps', () => {
      controller.start();
      controller.pause();
      frameCallback.mockClear();

      controller.step();
      vi.advanceTimersToNextTimer();

      controller.step();
      vi.advanceTimersToNextTimer();

      controller.step();
      vi.advanceTimersToNextTimer();

      expect(frameCallback).toHaveBeenCalledTimes(3);
    });

    it('should increment frame number on each step', () => {
      controller.start();
      vi.advanceTimersToNextTimer(); // Frame 1
      controller.pause();
      frameCallback.mockClear();

      controller.step();
      vi.advanceTimersToNextTimer(); // Frame 2

      const timing = frameCallback.mock.calls[0][0] as TimingInfo;
      expect(timing.frameNumber).toBe(2);
    });

    it('should still be running after step', () => {
      controller.start();
      controller.pause();

      controller.step();
      vi.advanceTimersToNextTimer();

      expect(controller.isRunning()).toBe(true);
    });

    it('should not schedule additional frames after step', () => {
      controller.start();
      controller.pause();
      frameCallback.mockClear();

      controller.step();
      vi.advanceTimersToNextTimer();

      // Wait more time - no additional frames should occur
      vi.advanceTimersByTime(100);

      expect(frameCallback).toHaveBeenCalledTimes(1);
    });
  });
});
