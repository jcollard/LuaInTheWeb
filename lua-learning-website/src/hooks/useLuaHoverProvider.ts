import { useState, useCallback, useEffect, useRef } from 'react'
import type { Monaco } from '@monaco-editor/react'
import type { editor, IDisposable, languages, IRange, IMarkdownString } from 'monaco-editor'
import type { EditorReadyInfo } from '../components/CodeEditor/types'
import { getLuaDocumentation, type LuaDocEntry } from '../utils/luaStandardLibrary'
import { parseLuaDocComments, type UserFunctionDoc } from '../utils/luaDocParser'
import { parseRequireStatements } from '../utils/luaRequireParser'
import {
  getLibraryDocumentation,
  getAvailableLibraries,
  type LibraryDocEntry,
} from '../utils/luaLibraryDocs'
import { resolveModulePath } from '../utils/luaModuleResolver'
import { moduleDocCache } from '../utils/moduleDocCache'

/**
 * Options for the useLuaHoverProvider hook
 */
export interface UseLuaHoverProviderOptions {
  /** Function to read file content from the filesystem */
  fileReader?: (path: string) => string | null
  /** Absolute path to the current file being edited */
  currentFilePath?: string | null
}

/**
 * Return type for the useLuaHoverProvider hook
 */
export interface UseLuaHoverProviderReturn {
  /** Callback to be passed to CodeEditor's onEditorReady */
  handleEditorReady: (info: EditorReadyInfo) => void
}

/**
 * Formats documentation entry into Markdown for Monaco hover tooltip
 */
function formatHoverContent(doc: LuaDocEntry): IMarkdownString {
  const lines: string[] = []

  // Add signature as code block
  lines.push('```lua')
  lines.push(doc.signature)
  lines.push('```')

  // Add description
  lines.push('')
  lines.push(doc.description)

  return {
    value: lines.join('\n'),
    isTrusted: true,
  }
}

/**
 * Formats user function documentation into Markdown for Monaco hover tooltip
 */
function formatUserFunctionDoc(doc: UserFunctionDoc): IMarkdownString {
  const lines: string[] = []

  // Add signature as code block
  lines.push('```lua')
  lines.push(doc.signature)
  lines.push('```')

  // Add description
  if (doc.description) {
    lines.push('')
    lines.push(doc.description)
  }

  // Add parameters
  if (doc.params && doc.params.length > 0) {
    lines.push('')
    lines.push('**Parameters:**')
    for (const param of doc.params) {
      lines.push(`- \`${param.name}\` - ${param.description}`)
    }
  }

  // Add return value
  if (doc.returns) {
    lines.push('')
    lines.push(`**Returns:** ${doc.returns}`)
  }

  return {
    value: lines.join('\n'),
    isTrusted: true,
  }
}

/**
 * Formats library documentation into Markdown for Monaco hover tooltip
 */
function formatLibraryDoc(doc: LibraryDocEntry): IMarkdownString {
  const lines: string[] = []

  // Add signature as code block
  lines.push('```lua')
  lines.push(doc.signature)
  lines.push('```')

  // Add description
  if (doc.description) {
    lines.push('')
    lines.push(doc.description)
  }

  // Add parameters
  if (doc.params && doc.params.length > 0) {
    lines.push('')
    lines.push('**Parameters:**')
    for (const param of doc.params) {
      lines.push(`- \`${param.name}\` - ${param.description}`)
    }
  }

  // Add return value
  if (doc.returns) {
    lines.push('')
    lines.push(`**Returns:** ${doc.returns}`)
  }

  return {
    value: lines.join('\n'),
    isTrusted: true,
  }
}

/**
 * Gets the qualified name (e.g., "string.sub") by looking at the context around the word
 */
function getQualifiedName(
  model: editor.ITextModel,
  position: { lineNumber: number; column: number },
  word: { word: string; startColumn: number; endColumn: number }
): string {
  const lineContent = model.getLineContent(position.lineNumber)

  // Check if there's a dot before the word (e.g., "string.sub")
  const dotPosition = word.startColumn - 2 // -1 for 1-based index, -1 for the dot itself
  if (dotPosition >= 0 && lineContent[dotPosition] === '.') {
    // Get the word before the dot
    const beforeDot = lineContent.substring(0, dotPosition)
    const prefixMatch = beforeDot.match(/([a-zA-Z_][a-zA-Z0-9_]*)$/)
    if (prefixMatch) {
      const prefix = prefixMatch[1]
      return `${prefix}.${word.word}`
    }
  }

  return word.word
}

/**
 * Creates a hover provider for Lua that shows documentation for standard library,
 * user-defined functions, and required library modules.
 */
function createHoverProvider(
  _monaco: Monaco,
  options?: UseLuaHoverProviderOptions
): languages.HoverProvider {
  // Cache for parsed documentation
  let cachedCode: string | null = null
  let cachedUserDocs: Map<string, UserFunctionDoc> = new Map()
  let cachedRequireMappings: Map<string, string> = new Map() // localName -> moduleName

  // Get available libraries for require resolution
  const availableLibraries = new Set(getAvailableLibraries())

  // Extract options
  const fileReader = options?.fileReader
  const currentFilePath = options?.currentFilePath

  return {
    provideHover(
      model: editor.ITextModel,
      position: { lineNumber: number; column: number }
    ): languages.ProviderResult<languages.Hover> {
      const wordInfo = model.getWordAtPosition(position)

      if (!wordInfo) {
        return null
      }

      // Get the qualified name (handles "string.sub", "table.insert", etc.)
      const qualifiedName = getQualifiedName(model, position, wordInfo)

      // Parse user functions and require statements from current code if needed
      const currentCode = model.getValue()
      if (currentCode !== cachedCode) {
        cachedCode = currentCode
        cachedUserDocs = new Map()
        cachedRequireMappings = new Map()

        // Parse user-defined functions
        const userFunctions = parseLuaDocComments(currentCode)
        for (const fn of userFunctions) {
          cachedUserDocs.set(fn.name, fn)
        }

        // Parse require statements - track ALL mappings for user module support
        const requireMappings = parseRequireStatements(currentCode)
        for (const mapping of requireMappings) {
          cachedRequireMappings.set(mapping.localName, mapping.moduleName)
        }
      }

      // First, check for user-defined function
      const userDoc = cachedUserDocs.get(qualifiedName) || cachedUserDocs.get(wordInfo.word)
      if (userDoc) {
        const range: IRange = {
          startLineNumber: position.lineNumber,
          startColumn: wordInfo.startColumn,
          endLineNumber: position.lineNumber,
          endColumn: wordInfo.endColumn,
        }
        return {
          contents: [formatUserFunctionDoc(userDoc)],
          range,
        }
      }

      // Check for library/module documentation (e.g., shell.foreground, utils.greet)
      if (qualifiedName.includes('.')) {
        const [prefix, memberName] = qualifiedName.split('.')
        const moduleName = cachedRequireMappings.get(prefix)
        if (moduleName) {
          // First, check hardcoded library docs (e.g., shell)
          if (availableLibraries.has(moduleName)) {
            const libraryDoc = getLibraryDocumentation(moduleName, memberName)
            if (libraryDoc) {
              const startColumn = wordInfo.startColumn - prefix.length - 1 // Include prefix and dot
              const range: IRange = {
                startLineNumber: position.lineNumber,
                startColumn,
                endLineNumber: position.lineNumber,
                endColumn: wordInfo.endColumn,
              }
              return {
                contents: [formatLibraryDoc(libraryDoc)],
                range,
              }
            }
          }

          // Then, check user module docs (requires filesystem access)
          if (fileReader && currentFilePath) {
            const resolved = resolveModulePath({
              moduleName,
              currentFilePath,
              fileExists: (path) => {
                try {
                  return fileReader(path) !== null
                } catch {
                  return false
                }
              },
            })

            if (resolved) {
              try {
                const content = fileReader(resolved.path)
                if (content) {
                  const moduleDocs = moduleDocCache.get(resolved.path, content)
                  // Look up the member - try direct match first, then look for tbl.member patterns
                  let funcDoc = moduleDocs.get(memberName)
                  if (!funcDoc) {
                    // Module may define functions as tbl.func() - search for any *.memberName or *:memberName
                    for (const [name, doc] of moduleDocs) {
                      if (name.endsWith(`.${memberName}`) || name.endsWith(`:${memberName}`)) {
                        funcDoc = doc
                        break
                      }
                    }
                  }
                  if (funcDoc) {
                    const startColumn = wordInfo.startColumn - prefix.length - 1
                    const range: IRange = {
                      startLineNumber: position.lineNumber,
                      startColumn,
                      endLineNumber: position.lineNumber,
                      endColumn: wordInfo.endColumn,
                    }
                    return {
                      contents: [formatUserFunctionDoc(funcDoc)],
                      range,
                    }
                  }
                }
              } catch {
                // File read failed, continue to standard library lookup
              }
            }
          }
        }
      }

      // Look up standard library documentation
      const doc = getLuaDocumentation(qualifiedName)

      if (!doc) {
        // Try just the word itself for global functions
        const simpleDoc = getLuaDocumentation(wordInfo.word)
        if (!simpleDoc) {
          return null
        }

        const range: IRange = {
          startLineNumber: position.lineNumber,
          startColumn: wordInfo.startColumn,
          endLineNumber: position.lineNumber,
          endColumn: wordInfo.endColumn,
        }

        return {
          contents: [formatHoverContent(simpleDoc)],
          range,
        }
      }

      // Calculate the range - for qualified names, include the prefix
      let startColumn = wordInfo.startColumn
      if (qualifiedName.includes('.')) {
        const prefix = qualifiedName.split('.')[0]
        startColumn = wordInfo.startColumn - prefix.length - 1 // -1 for the dot
      }

      const range: IRange = {
        startLineNumber: position.lineNumber,
        startColumn,
        endLineNumber: position.lineNumber,
        endColumn: wordInfo.endColumn,
      }

      return {
        contents: [formatHoverContent(doc)],
        range,
      }
    },
  }
}

/**
 * Hook to provide hover documentation for Lua code in Monaco editor
 *
 * Shows documentation for Lua standard library functions when hovering over them
 * in the editor. Supports both global functions (print, type) and library functions
 * (string.sub, table.insert, math.floor).
 *
 * When fileReader and currentFilePath are provided, also shows documentation
 * for user-created modules loaded via require().
 *
 * @param options - Configuration options for filesystem access
 * @returns Functions to handle editor ready event
 */
export function useLuaHoverProvider(
  options?: UseLuaHoverProviderOptions
): UseLuaHoverProviderReturn {
  const [monacoInstance, setMonacoInstance] = useState<Monaco | null>(null)
  const disposableRef = useRef<IDisposable | null>(null)
  const optionsRef = useRef(options)

  // Keep options ref up to date
  optionsRef.current = options

  // Handle editor ready event
  const handleEditorReady = useCallback((info: EditorReadyInfo) => {
    setMonacoInstance(info.monaco)
  }, [])

  // Register hover provider when Monaco is available
  useEffect(() => {
    if (!monacoInstance) {
      return
    }

    const provider = createHoverProvider(monacoInstance, optionsRef.current)
    disposableRef.current = monacoInstance.languages.registerHoverProvider('lua', provider)

    return () => {
      if (disposableRef.current) {
        disposableRef.current.dispose()
        disposableRef.current = null
      }
    }
  }, [monacoInstance])

  return {
    handleEditorReady,
  }
}
