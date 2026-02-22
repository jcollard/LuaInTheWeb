/**
 * ansi-test command - open a test ANSI terminal tab.
 */

import type { ICommand } from '../interfaces/ICommand'
import type { ShellContext } from '../interfaces/ShellContext'

/**
 * Opens a test ANSI terminal tab for development/demo purposes.
 */
export class AnsiTestCommand implements ICommand {
  readonly name = 'ansi-test'
  readonly description = 'Open a test ANSI terminal tab'
  readonly usage = 'ansi-test'

  execute(_args: string[], context: ShellContext): void {
    if (!context.onRequestAnsiTab) {
      context.error('ansi-test: ANSI tab support not available')
      return
    }
    const ansiId = `ansi-${Date.now()}`
    context.onRequestAnsiTab(ansiId)
    context.output('ANSI terminal opened.\r\n')
  }
}
