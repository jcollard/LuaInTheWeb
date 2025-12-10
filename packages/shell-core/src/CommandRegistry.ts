/**
 * Registry for shell commands.
 * Manages command registration, lookup, and execution.
 */

import type { Command, CommandResult, IFileSystem } from './types'

/**
 * A registry that stores and manages shell commands.
 * Commands can be registered, looked up by name, and executed.
 */
export class CommandRegistry {
  private commands: Map<string, Command> = new Map()

  /**
   * Register a command with the registry.
   * @param command - The command to register
   * @returns The registry instance for method chaining
   * @throws Error if a command with the same name is already registered
   */
  register(command: Command): this {
    if (this.commands.has(command.name)) {
      throw new Error(`Command '${command.name}' is already registered`)
    }
    this.commands.set(command.name, command)
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
   * Check if a command is registered.
   * @param name - The command name to check
   * @returns True if the command exists, false otherwise
   */
  has(name: string): boolean {
    return this.commands.has(name)
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
   * Execute a command by name.
   * @param name - The command name to execute
   * @param args - Arguments to pass to the command
   * @param fs - Filesystem to use for command execution
   * @returns The command result
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
}
