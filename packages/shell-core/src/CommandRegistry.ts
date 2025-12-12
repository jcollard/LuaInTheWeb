/**
 * Registry for shell commands.
 * Manages command registration, lookup, and execution.
 * Supports both legacy Command and new ICommand interfaces.
 */

import type { Command, CommandResult, IFileSystem } from './types'
import type { ICommand } from './interfaces/ICommand'
import type { IProcess } from './interfaces/IProcess'
import type { ShellContext } from './interfaces/ShellContext'
import { LegacyCommandAdapter } from './adapters/LegacyCommandAdapter'

/**
 * A registry that stores and manages shell commands.
 * Commands can be registered, looked up by name, and executed.
 * Supports both legacy Command interface and new ICommand interface.
 */
export class CommandRegistry {
  private commands: Map<string, Command> = new Map()
  private iCommands: Map<string, ICommand> = new Map()

  /**
   * Register a legacy command with the registry.
   * @param command - The legacy command to register
   * @returns The registry instance for method chaining
   * @throws Error if a command with the same name is already registered
   */
  register(command: Command): this {
    if (this.commands.has(command.name) || this.iCommands.has(command.name)) {
      throw new Error(`Command '${command.name}' is already registered`)
    }
    this.commands.set(command.name, command)
    return this
  }

  /**
   * Register an ICommand with the registry.
   * @param command - The ICommand to register
   * @returns The registry instance for method chaining
   * @throws Error if a command with the same name is already registered
   */
  registerICommand(command: ICommand): this {
    if (this.commands.has(command.name) || this.iCommands.has(command.name)) {
      throw new Error(`Command '${command.name}' is already registered`)
    }
    this.iCommands.set(command.name, command)
    return this
  }

  /**
   * Get a command by name.
   * @param name - The command name to look up
   * @returns The command if found, undefined otherwise
   */
  get(name: string): Command | undefined {
    return this.commands.get(name)
  }

  /**
   * Check if a command is registered (legacy or ICommand).
   * @param name - The command name to check
   * @returns True if the command exists, false otherwise
   */
  has(name: string): boolean {
    return this.commands.has(name) || this.iCommands.has(name)
  }

  /**
   * Get all registered commands.
   * @returns Array of all registered commands in insertion order
   */
  list(): Command[] {
    return Array.from(this.commands.values())
  }

  /**
   * Get all registered command names.
   * @returns Array of command names
   */
  names(): string[] {
    return Array.from(this.commands.keys())
  }

  /**
   * Get the number of registered commands.
   */
  get size(): number {
    return this.commands.size
  }

  /**
   * Unregister a command by name.
   * @param name - The command name to remove
   * @returns True if the command was removed, false if it didn't exist
   */
  unregister(name: string): boolean {
    return this.commands.delete(name)
  }

  /**
   * Remove all registered commands.
   */
  clear(): void {
    this.commands.clear()
  }

  /**
   * Execute a legacy command by name.
   * @param name - The command name to execute
   * @param args - Arguments to pass to the command
   * @param fs - Filesystem to use for command execution
   * @returns The command result
   * @deprecated Use executeWithContext for new code
   */
  execute(name: string, args: string[], fs: IFileSystem): CommandResult {
    const command = this.commands.get(name)
    if (!command) {
      return {
        exitCode: 127,
        stdout: '',
        stderr: `Command not found: ${name}`,
      }
    }
    return command.execute(args, fs)
  }

  /**
   * Execute a command by name using the new ICommand interface.
   * Supports both legacy commands (via adapter) and ICommand.
   * @param name - The command name to execute
   * @param args - Arguments to pass to the command
   * @param context - Shell context with filesystem and I/O handlers
   * @returns IProcess for long-running commands, void for simple commands
   */
  executeWithContext(
    name: string,
    args: string[],
    context: ShellContext
  ): IProcess | void {
    // Check for ICommand first
    const iCommand = this.iCommands.get(name)
    if (iCommand) {
      return iCommand.execute(args, context)
    }

    // Check for legacy Command and adapt it
    const legacyCommand = this.commands.get(name)
    if (legacyCommand) {
      const adapted = LegacyCommandAdapter.adapt(legacyCommand)
      return adapted.execute(args, context)
    }

    // Command not found
    context.error(`Command not found: ${name}`)
    return undefined
  }
}
