/**
 * Shell commands module.
 * Exports all built-in commands and a helper to register them.
 */

import type { CommandRegistry } from '../CommandRegistry'
import { pwd } from './pwd'
import { cd } from './cd'
import { ls } from './ls'
import { createHelpCommand } from './help'
import { clear } from './clear'
import { mkdir } from './mkdir'
import { touch } from './touch'
import { cp } from './cp'
import { mv } from './mv'
import { OpenCommand } from './open'

// Export individual commands
export { pwd } from './pwd'
export { cd } from './cd'
export { ls } from './ls'
export { createHelpCommand } from './help'
export { clear } from './clear'
export { mkdir } from './mkdir'
export { touch } from './touch'
export { cp } from './cp'
export { mv } from './mv'
export { OpenCommand } from './open'

/**
 * Register all built-in commands with a registry.
 * @param registry - The command registry to register commands with
 * @returns The registry for method chaining
 */
export function registerBuiltinCommands(registry: CommandRegistry): CommandRegistry {
  registry.register(pwd)
  registry.register(cd)
  registry.register(ls)
  registry.register(clear)
  registry.register(mkdir)
  registry.register(touch)
  registry.register(cp)
  registry.register(mv)
  registry.register(createHelpCommand(registry))
  // Register ICommand implementations
  registry.registerICommand(new OpenCommand())
  return registry
}

/**
 * Array of all built-in command instances (except help, which requires a registry).
 */
export const builtinCommands = [pwd, cd, ls, clear, mkdir, touch, cp, mv] as const
