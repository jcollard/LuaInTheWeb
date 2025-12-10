import { useState, useCallback, useMemo } from 'react';
import {
  CommandRegistry,
  parseCommand,
  pwdCommand,
  cdCommand,
  lsCommand,
  createHelpCommand,
} from '../shell';
import type { IFileSystem, ShellContext } from '../shell/types';

export interface UseShellOptions {
  fs: IFileSystem;
  onOutput: (text: string) => void;
  initialCwd?: string;
}

export interface UseShellResult {
  cwd: string;
  previousCwd: string;
  prompt: string;
  registry: CommandRegistry;
  executeCommand: (input: string) => Promise<number>;
}

/**
 * Hook for managing shell state and command execution
 */
export function useShell({
  fs,
  onOutput,
  initialCwd = '/',
}: UseShellOptions): UseShellResult {
  const [cwd, setCwd] = useState(initialCwd);
  const [previousCwd, setPreviousCwd] = useState(initialCwd);

  // Create registry and register commands
  const registry = useMemo(() => {
    const reg = new CommandRegistry();
    reg.register(pwdCommand);
    reg.register(cdCommand);
    reg.register(lsCommand);
    reg.register(createHelpCommand(reg));
    return reg;
  }, []);

  // Generate prompt showing current directory
  const prompt = useMemo(() => {
    return `${cwd}$ `;
  }, [cwd]);

  // Create shell context for command execution
  const createContext = useCallback((): ShellContext => {
    return {
      cwd,
      fs,
      write: onOutput,
      writeln: onOutput,
      setCwd,
      previousCwd,
      setPreviousCwd,
    };
  }, [cwd, fs, onOutput, previousCwd]);

  // Execute a command string
  const executeCommand = useCallback(
    async (input: string): Promise<number> => {
      const { command, args } = parseCommand(input);

      // Empty command - do nothing
      if (!command) {
        return 0;
      }

      // Look up command in registry
      const cmd = registry.get(command);

      if (!cmd) {
        onOutput(`${command}: command not found`);
        onOutput("Type 'help' for available commands.");
        return 1;
      }

      // Execute command
      const context = createContext();
      const result = await cmd.execute(args, context);

      return result.exitCode;
    },
    [registry, createContext, onOutput]
  );

  return {
    cwd,
    previousCwd,
    prompt,
    registry,
    executeCommand,
  };
}
