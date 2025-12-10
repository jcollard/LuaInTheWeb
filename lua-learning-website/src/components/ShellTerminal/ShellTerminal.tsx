import { useRef, useCallback, useEffect } from 'react';
import BashTerminal from '../BashTerminal';
import type { BashTerminalHandle } from '../BashTerminal';
import { useShell } from '../../hooks/useShell';
import { createFileSystemAdapter } from '../../shell';
import type { UseFileSystemReturn } from '../../hooks/useFileSystem';
import styles from './ShellTerminal.module.css';

export interface ShellTerminalProps {
  /** Filesystem from IDE context */
  filesystem: UseFileSystemReturn;
  /** When true, hides header for embedded context */
  embedded?: boolean;
}

/**
 * Interactive shell terminal with Unix-like commands
 */
export function ShellTerminal({ filesystem, embedded = false }: ShellTerminalProps) {
  const terminalRef = useRef<BashTerminalHandle>(null);

  // Create filesystem adapter
  const fs = createFileSystemAdapter(filesystem);

  // Shell state and commands
  const { cwd, executeCommand } = useShell({
    fs,
    onOutput: (text) => {
      terminalRef.current?.writeln(text);
    },
  });

  // Show welcome message
  const showWelcome = useCallback(() => {
    terminalRef.current?.writeln('Lua Shell - Ready');
    terminalRef.current?.writeln("Type 'help' for available commands");
    terminalRef.current?.writeln('');
  }, []);

  // Show prompt with current directory
  const showShellPrompt = useCallback(() => {
    // Write the prompt (directory path)
    terminalRef.current?.write(`\x1b[32m${cwd}\x1b[0m$ `);
  }, [cwd]);

  // Show welcome on mount
  useEffect(() => {
    showWelcome();
    showShellPrompt();
  }, [showWelcome, showShellPrompt]);

  // Expose terminal content for E2E tests
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as unknown as { __getShellContent?: () => string }).__getShellContent = () => {
        return terminalRef.current?.getContent() ?? '';
      };
    }
    return () => {
      if (typeof window !== 'undefined') {
        delete (window as unknown as { __getShellContent?: () => string }).__getShellContent;
      }
    };
  }, []);

  // Handle command execution
  const handleCommand = useCallback(
    async (input: string) => {
      await executeCommand(input);
      showShellPrompt();
    },
    [executeCommand, showShellPrompt]
  );

  // Clear terminal
  const handleClear = useCallback(() => {
    terminalRef.current?.clear();
    showWelcome();
    showShellPrompt();
  }, [showWelcome, showShellPrompt]);

  return (
    <div className={styles.shellTerminal} data-testid="shell-terminal">
      {!embedded && (
        <div className={styles.header}>
          <span className={styles.title}>Shell</span>
          <span className={styles.cwd}>{cwd}</span>
          <button
            type="button"
            onClick={handleClear}
            className={styles.clearButton}
            aria-label="Clear terminal"
          >
            Clear
          </button>
        </div>
      )}
      <div className={styles.terminalContainer}>
        <BashTerminal
          ref={terminalRef}
          onCommand={handleCommand}
          embedded={embedded}
        />
      </div>
    </div>
  );
}

export default ShellTerminal;
