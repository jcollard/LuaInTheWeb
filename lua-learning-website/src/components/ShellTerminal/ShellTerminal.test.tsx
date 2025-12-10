import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ShellTerminal } from './ShellTerminal';
import type { UseFileSystemReturn } from '../../hooks/useFileSystem';

// Mock BashTerminal
vi.mock('../BashTerminal', () => ({
  default: vi.fn(({ onCommand }) => (
    <div data-testid="mock-bash-terminal">
      <button onClick={() => onCommand?.('pwd')}>Execute</button>
    </div>
  )),
}));

// Mock useTheme
vi.mock('../../contexts/useTheme', () => ({
  useTheme: () => ({ theme: 'dark' }),
}));

describe('ShellTerminal', () => {
  let mockFilesystem: UseFileSystemReturn;

  beforeEach(() => {
    mockFilesystem = {
      createFile: vi.fn(),
      readFile: vi.fn().mockReturnValue(null),
      writeFile: vi.fn(),
      deleteFile: vi.fn(),
      renameFile: vi.fn(),
      moveFile: vi.fn(),
      createFolder: vi.fn(),
      deleteFolder: vi.fn(),
      renameFolder: vi.fn(),
      exists: vi.fn().mockReturnValue(true),
      listDirectory: vi.fn().mockReturnValue([]),
      getTree: vi.fn().mockReturnValue([]),
    };
  });

  it('renders shell terminal', () => {
    render(<ShellTerminal filesystem={mockFilesystem} />);
    expect(screen.getByTestId('shell-terminal')).toBeInTheDocument();
  });

  it('shows header when not embedded', () => {
    render(<ShellTerminal filesystem={mockFilesystem} embedded={false} />);
    expect(screen.getByText('Shell')).toBeInTheDocument();
    expect(screen.getByLabelText('Clear terminal')).toBeInTheDocument();
  });

  it('hides header when embedded', () => {
    render(<ShellTerminal filesystem={mockFilesystem} embedded={true} />);
    expect(screen.queryByText('Shell')).not.toBeInTheDocument();
  });

  it('renders BashTerminal component', () => {
    render(<ShellTerminal filesystem={mockFilesystem} />);
    expect(screen.getByTestId('mock-bash-terminal')).toBeInTheDocument();
  });

  it('shows current working directory', () => {
    render(<ShellTerminal filesystem={mockFilesystem} />);
    expect(screen.getByText('/')).toBeInTheDocument();
  });
});
