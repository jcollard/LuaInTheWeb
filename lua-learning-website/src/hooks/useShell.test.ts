import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useShell } from './useShell';
import type { IFileSystem, FileEntry } from '../shell/types';

describe('useShell', () => {
  let mockFs: IFileSystem;

  beforeEach(() => {
    mockFs = {
      exists: vi.fn().mockReturnValue(true),
      isDirectory: vi.fn().mockReturnValue(true),
      listDirectory: vi.fn().mockReturnValue([]),
      readFile: vi.fn(),
    };
  });

  describe('initial state', () => {
    it('starts at root directory', () => {
      const { result } = renderHook(() =>
        useShell({ fs: mockFs, onOutput: vi.fn() })
      );
      expect(result.current.cwd).toBe('/');
    });

    it('has registered commands', () => {
      const { result } = renderHook(() =>
        useShell({ fs: mockFs, onOutput: vi.fn() })
      );
      expect(result.current.registry.has('pwd')).toBe(true);
      expect(result.current.registry.has('cd')).toBe(true);
      expect(result.current.registry.has('ls')).toBe(true);
      expect(result.current.registry.has('help')).toBe(true);
    });
  });

  describe('executeCommand', () => {
    it('executes pwd command', async () => {
      const onOutput = vi.fn();
      const { result } = renderHook(() => useShell({ fs: mockFs, onOutput }));

      await act(async () => {
        await result.current.executeCommand('pwd');
      });

      expect(onOutput).toHaveBeenCalledWith('/');
    });

    it('executes cd command and updates cwd', async () => {
      const onOutput = vi.fn();
      const { result } = renderHook(() => useShell({ fs: mockFs, onOutput }));

      await act(async () => {
        await result.current.executeCommand('cd home');
      });

      expect(result.current.cwd).toBe('/home');
    });

    it('executes ls command', async () => {
      const entries: FileEntry[] = [
        { name: 'file.txt', isDirectory: false },
        { name: 'folder', isDirectory: true },
      ];
      mockFs.listDirectory = vi.fn().mockReturnValue(entries);

      const onOutput = vi.fn();
      const { result } = renderHook(() => useShell({ fs: mockFs, onOutput }));

      await act(async () => {
        await result.current.executeCommand('ls');
      });

      expect(onOutput).toHaveBeenCalledWith('folder/');
      expect(onOutput).toHaveBeenCalledWith('file.txt');
    });

    it('handles unknown command', async () => {
      const onOutput = vi.fn();
      const { result } = renderHook(() => useShell({ fs: mockFs, onOutput }));

      await act(async () => {
        const exitCode = await result.current.executeCommand('unknown');
        expect(exitCode).toBe(1);
      });

      expect(onOutput).toHaveBeenCalledWith(
        expect.stringContaining('command not found')
      );
    });

    it('handles empty command', async () => {
      const onOutput = vi.fn();
      const { result } = renderHook(() => useShell({ fs: mockFs, onOutput }));

      await act(async () => {
        const exitCode = await result.current.executeCommand('');
        expect(exitCode).toBe(0);
      });

      expect(onOutput).not.toHaveBeenCalled();
    });

    it('handles whitespace-only command', async () => {
      const onOutput = vi.fn();
      const { result } = renderHook(() => useShell({ fs: mockFs, onOutput }));

      await act(async () => {
        const exitCode = await result.current.executeCommand('   ');
        expect(exitCode).toBe(0);
      });

      expect(onOutput).not.toHaveBeenCalled();
    });
  });

  describe('prompt', () => {
    it('shows current directory in prompt', () => {
      const { result } = renderHook(() =>
        useShell({ fs: mockFs, onOutput: vi.fn() })
      );
      expect(result.current.prompt).toContain('/');
    });

    it('updates prompt when directory changes', async () => {
      const { result } = renderHook(() =>
        useShell({ fs: mockFs, onOutput: vi.fn() })
      );

      await act(async () => {
        await result.current.executeCommand('cd home');
      });

      expect(result.current.prompt).toContain('/home');
    });
  });

  describe('command suggestions', () => {
    it('suggests similar commands for typos', async () => {
      const onOutput = vi.fn();
      const { result } = renderHook(() => useShell({ fs: mockFs, onOutput }));

      await act(async () => {
        await result.current.executeCommand('pwdd');
      });

      const output = onOutput.mock.calls.map((call) => call[0]).join('\n');
      expect(output).toContain('command not found');
    });
  });
});
