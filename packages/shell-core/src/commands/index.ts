/**
 * Shell commands module.
 * Exports all built-in commands and a helper to register them.
 */

import type { CommandRegistry } from '../CommandRegistry'
import { pwd } from './pwd'
import { cd } from './cd'
import { ls } from './ls'
import { createHelpCommand } from './help'

// Export individual commands
export { pwd } from './pwd'
export { cd } from './cd'
export { ls } from './ls'
export { createHelpCommand } from './help'

/**
 * Register all built-in commands with a registry.
 * @param registry - The command registry to register commands with
 * @returns The registry for method chaining
 */
export function registerBuiltinCommands(registry: CommandRegistry): CommandRegistry {
  registry.register(pwd)
  registry.register(cd)
  registry.register(ls)
  registry.register(createHelpCommand(registry))
  return registry
}

/**
 * Array of all built-in command instances (except help, which requires a registry).
 */
export const builtinCommands = [pwd, cd, ls] as const
