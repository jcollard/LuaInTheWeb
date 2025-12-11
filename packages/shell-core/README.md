# @lua-learning/shell-core

Core shell infrastructure for the Lua learning platform. Provides filesystem abstractions, command registry, and built-in commands.

## Features

- **Filesystem Abstraction**: `IFileSystem` interface decouples shell commands from specific filesystem implementations
- **Command Registry**: Register, lookup, and execute commands with a unified API
- **Path Utilities**: Cross-platform path manipulation (normalizes to forward slashes)
- **Built-in Commands**: `pwd`, `cd`, `ls`, `help` ready to use
- **Extensible**: Easy to add custom commands

## Installation

```bash
# In a monorepo with npm workspaces
npm install @lua-learning/shell-core
```

## Quick Start

```typescript
import {
  CommandRegistry,
  createFileSystemAdapter,
  registerBuiltinCommands,
  parseCommand,
} from '@lua-learning/shell-core'

// 1. Create a filesystem adapter from your external filesystem
const fs = createFileSystemAdapter(externalFileSystem, '/')

// 2. Create and populate the command registry
const registry = new CommandRegistry()
registerBuiltinCommands(registry)

// 3. Parse and execute commands
const parsed = parseCommand('ls -la')
const result = registry.execute(parsed.command, parsed.args, fs)

console.log(result.stdout) // Directory listing
console.log(result.exitCode) // 0 for success
```

## API Reference

### Types

#### `FileEntry`
Represents a file or directory entry.

```typescript
interface FileEntry {
  name: string
  type: 'file' | 'directory'
  path: string
}
```

#### `IFileSystem`
Abstraction for filesystem operations. Implement this interface to use shell-core with any filesystem.

```typescript
interface IFileSystem {
  getCurrentDirectory(): string
  setCurrentDirectory(path: string): void
  exists(path: string): boolean
  isDirectory(path: string): boolean
  isFile(path: string): boolean
  listDirectory(path: string): FileEntry[]
  readFile(path: string): string
  writeFile(path: string, content: string): void
  createDirectory(path: string): void
  delete(path: string): void
}
```

#### `CommandResult`
Result of executing a shell command.

```typescript
interface CommandResult {
  exitCode: number  // 0 for success, non-zero for errors
  stdout: string    // Standard output
  stderr: string    // Standard error
}
```

#### `ParsedCommand`
Parsed representation of a command string.

```typescript
interface ParsedCommand {
  command: string   // The command name (first token)
  args: string[]    // The arguments (remaining tokens)
  raw: string       // Original raw command string
}
```

#### `Command`
A shell command that can be executed.

```typescript
interface Command {
  name: string
  description: string
  usage: string
  execute(args: string[], fs: IFileSystem): CommandResult
}
```

### CommandRegistry

Registry for shell commands. Manages registration, lookup, and execution.

```typescript
const registry = new CommandRegistry()

// Register a command
registry.register(myCommand)

// Check if command exists
registry.has('ls')  // true

// Get command
const cmd = registry.get('ls')

// List all commands
const commands = registry.list()

// Get command names
const names = registry.names()

// Execute command
const result = registry.execute('ls', ['-la'], fs)

// Remove command
registry.unregister('ls')

// Clear all commands
registry.clear()
```

### createFileSystemAdapter

Creates an `IFileSystem` adapter from an external filesystem implementation.

```typescript
import { createFileSystemAdapter } from '@lua-learning/shell-core'

// Your external filesystem must implement ExternalFileSystem
interface ExternalFileSystem {
  exists(path: string): boolean
  readFile(path: string): string | null
  writeFile(path: string, content: string): void
  createFile(path: string, content?: string): void
  createFolder(path: string): void
  deleteFile(path: string): void
  deleteFolder(path: string): void
  listDirectory(path: string): string[]
  isDirectory(path: string): boolean
}

const fs = createFileSystemAdapter(externalFs, '/initial/cwd')
```

### Path Utilities

All paths are normalized to use forward slashes and absolute paths.

```typescript
import {
  normalizePath,
  joinPath,
  resolvePath,
  isAbsolutePath,
  getParentPath,
  getBasename,
} from '@lua-learning/shell-core'

normalizePath('foo\\bar/../baz')  // '/foo/baz'
joinPath('/home', 'user', 'docs') // '/home/user/docs'
resolvePath('/home', 'docs')      // '/home/docs'
isAbsolutePath('/home')           // true
getParentPath('/home/user')       // '/home'
getBasename('/home/user')         // 'user'
```

### parseCommand

Parses a command string into command name and arguments.

```typescript
import { parseCommand } from '@lua-learning/shell-core'

const parsed = parseCommand('ls -la /home')
// { command: 'ls', args: ['-la', '/home'], raw: 'ls -la /home' }

// Handles quoted strings
parseCommand('echo "hello world"')
// { command: 'echo', args: ['hello world'], raw: 'echo "hello world"' }
```

### Built-in Commands

#### `pwd` - Print working directory
```bash
pwd
# Output: /current/directory
```

#### `cd` - Change directory
```bash
cd /path/to/dir    # Absolute path
cd relative/path   # Relative path
cd ..              # Parent directory
cd                 # (no output, stays in current)
```

#### `ls` - List directory contents
```bash
ls                 # List current directory
ls /path           # List specific path
# Output: directories listed first, then files, alphabetically sorted
```

#### `help` - Display help
```bash
help               # List all commands
help ls            # Show help for specific command
```

## Adding Custom Commands

Create a command by implementing the `Command` interface:

```typescript
import type { Command, CommandResult, IFileSystem } from '@lua-learning/shell-core'

const echo: Command = {
  name: 'echo',
  description: 'Display a line of text',
  usage: 'echo [text...]',
  execute(args: string[], fs: IFileSystem): CommandResult {
    return {
      exitCode: 0,
      stdout: args.join(' '),
      stderr: '',
    }
  },
}

// Register your command
registry.register(echo)
```

### Command with Filesystem Access

```typescript
const cat: Command = {
  name: 'cat',
  description: 'Display file contents',
  usage: 'cat <file>',
  execute(args: string[], fs: IFileSystem): CommandResult {
    if (args.length === 0) {
      return { exitCode: 1, stdout: '', stderr: 'cat: missing file operand' }
    }

    try {
      const content = fs.readFile(args[0])
      return { exitCode: 0, stdout: content, stderr: '' }
    } catch (error) {
      return { exitCode: 1, stdout: '', stderr: `cat: ${args[0]}: No such file` }
    }
  },
}
```

## Integration Example

Here's how the shell-core is integrated with the Lua learning website:

```typescript
// useShell.ts - React hook integrating shell-core with editor filesystem
import { useCallback, useRef } from 'react'
import {
  CommandRegistry,
  createFileSystemAdapter,
  registerBuiltinCommands,
  parseCommand,
} from '@lua-learning/shell-core'

export function useShell(externalFs: ExternalFileSystem) {
  const registryRef = useRef<CommandRegistry>()
  const fsRef = useRef<IFileSystem>()

  // Initialize on first use
  if (!registryRef.current) {
    fsRef.current = createFileSystemAdapter(externalFs, '/')
    registryRef.current = new CommandRegistry()
    registerBuiltinCommands(registryRef.current)
  }

  const executeCommand = useCallback((input: string) => {
    const parsed = parseCommand(input)
    if (!parsed.command) {
      return { exitCode: 0, stdout: '', stderr: '' }
    }
    return registryRef.current!.execute(
      parsed.command,
      parsed.args,
      fsRef.current!
    )
  }, [])

  return { executeCommand, cwd: fsRef.current?.getCurrentDirectory() ?? '/' }
}
```

## Testing

```bash
# Run tests
npm test

# Watch mode
npm run test:watch

# Coverage
npm run test:coverage

# Mutation testing
npm run test:mutation
```

## License

MIT
