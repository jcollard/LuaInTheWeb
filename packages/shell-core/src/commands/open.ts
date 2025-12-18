/**
 * open command - open a file in the editor.
 */

import type { ICommand } from '../interfaces/ICommand'
import type { ShellContext } from '../interfaces/ShellContext'
import { resolvePath } from '../pathUtils'

/**
 * Open command implementation.
 * Opens a file in the editor via the onRequestOpenFile callback.
 * When no editor integration is available, outputs an informative message.
 */
export class OpenCommand implements ICommand {
  readonly name = 'open'
  readonly description = 'Open a file in the editor'
  readonly usage = 'open <file>'

  execute(args: string[], context: ShellContext): void {
    // Check for required argument
    if (args.length === 0) {
      context.error('open: missing file operand\nusage: open <file>')
      return
    }

    const targetPath = args[0]
    const resolvedPath = resolvePath(context.cwd, targetPath)

    // Check if file exists
    if (!context.filesystem.exists(resolvedPath)) {
      context.error(`open: cannot open '${targetPath}': No such file or directory`)
      return
    }

    // Check if editor integration is available
    if (!context.onRequestOpenFile) {
      context.error('open: Editor integration not available in standalone mode')
      return
    }

    // Request file to be opened in editor
    context.onRequestOpenFile(resolvedPath)
    context.output(`Opened: ${resolvedPath}`)
  }
}
