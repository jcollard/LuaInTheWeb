import type { Command } from './types';

/**
 * Registry for shell commands
 * Provides registration, lookup, and listing of available commands
 */
export class CommandRegistry {
  private commands: Map<string, Command> = new Map();

  /**
   * Register a command with the registry
   * @throws Error if command with same name is already registered
   */
  register(command: Command): void {
    const name = command.name.toLowerCase();
    if (this.commands.has(name)) {
      throw new Error(`Command "${command.name}" is already registered`);
    }
    this.commands.set(name, command);
  }

  /**
   * Get a command by name
   * @returns The command if found, undefined otherwise
   */
  get(name: string): Command | undefined {
    return this.commands.get(name.toLowerCase());
  }

  /**
   * Check if a command is registered
   */
  has(name: string): boolean {
    return this.commands.has(name.toLowerCase());
  }

  /**
   * Get all registered commands sorted by name
   */
  list(): Command[] {
    return Array.from(this.commands.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
  }

  /**
   * Get all command names sorted alphabetically
   */
  getNames(): string[] {
    return Array.from(this.commands.keys()).sort();
  }
}
