import type { languages } from 'monaco-editor'
import { calculateCorrectIndent, findMatchingBlockIndent } from './luaBlockParser'

/**
 * Storage key for auto-indent setting
 */
const AUTO_INDENT_STORAGE_KEY = 'lua-ide-auto-indent'

/**
 * Check if auto-indent is enabled (defaults to true)
 */
function isAutoIndentEnabled(): boolean {
  try {
    const stored = localStorage.getItem(AUTO_INDENT_STORAGE_KEY)
    return stored !== 'false'
  } catch {
    return true
  }
}

/**
 * Set auto-indent enabled/disabled
 */
export function setAutoIndentEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(AUTO_INDENT_STORAGE_KEY, String(enabled))
  } catch {
    // localStorage not available
  }
}

/**
 * Get current auto-indent setting
 */
export function getAutoIndentEnabled(): boolean {
  return isAutoIndentEnabled()
}

/**
 * IndentAction constants matching Monaco's languages.IndentAction enum.
 * These are used in onEnterRules to specify indentation behavior.
 * We define them as constants since Monaco is loaded dynamically at runtime.
 */
const IndentAction = {
  /** Insert new line and copy the previous line's indentation */
  None: 0,
  /** Insert new line and indent once (relative to the previous line's indentation) */
  Indent: 1,
  /** Insert two new lines: first indented, second at same level as previous line */
  IndentOutdent: 2,
  /** Insert new line and outdent once (relative to the previous line's indentation) */
  Outdent: 3,
} as const

/**
 * All Lua keywords for syntax highlighting
 */
export const LUA_KEYWORDS = [
  'and',
  'break',
  'do',
  'else',
  'elseif',
  'end',
  'false',
  'for',
  'function',
  'goto',
  'if',
  'in',
  'local',
  'nil',
  'not',
  'or',
  'repeat',
  'return',
  'then',
  'true',
  'until',
  'while',
]

/**
 * Monaco language configuration for Lua
 */
export const luaLanguageConfig: languages.LanguageConfiguration = {
  comments: {
    lineComment: '--',
    blockComment: ['--[[', ']]'],
  },
  brackets: [
    ['{', '}'],
    ['[', ']'],
    ['(', ')'],
  ],
  autoClosingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '"', close: '"' },
    { open: "'", close: "'" },
  ],
  surroundingPairs: [
    { open: '{', close: '}' },
    { open: '[', close: ']' },
    { open: '(', close: ')' },
    { open: '"', close: '"' },
    { open: "'", close: "'" },
  ],
  folding: {
    markers: {
      start: /^\s*--\s*#?region\b/,
      end: /^\s*--\s*#?endregion\b/,
    },
  },
  indentationRules: {
    /**
     * Increase indent after block-opening constructs.
     * Pattern breakdown:
     *   ^(?!.*--.*)     - Negative lookahead: line must not contain a comment
     *   .*\b(           - Match any chars, then word boundary, then one of:
     *     function\b.*\)  - function declaration ending with )
     *     |then           - if/elseif...then
     *     |do             - for/while...do or standalone do
     *     |repeat         - repeat block
     *     |else           - else clause
     *     |elseif.*then   - elseif...then
     *   )\s*$           - Optional trailing whitespace, end of line
     */
    increaseIndentPattern:
      /^(?!.*--.*).*\b(function\b.*\)|then|do|repeat|else|elseif.*then)\s*$/,
    /**
     * Decrease indent for block-closing keywords at line start.
     * Pattern: optional whitespace, not a comment, then end/else/elseif/until
     */
    decreaseIndentPattern: /^\s*(?!--)(end|else|elseif|until)\b/,
  },
  onEnterRules: [
    // After block-opening keywords, indent
    {
      beforeText:
        /^\s*\b(function.*\(.*\)|if\b.*\bthen|for\b.*\bdo|while\b.*\bdo|repeat|else|elseif\b.*\bthen)\s*$/,
      action: { indentAction: IndentAction.Indent },
    },
    // After standalone 'do' keyword, indent
    {
      beforeText: /^\s*do\s*$/,
      action: { indentAction: IndentAction.Indent },
    },
    // Before 'end', 'else', 'elseif', 'until' - outdent then indent (for typing these keywords)
    {
      beforeText: /^\s*$/,
      afterText: /^\s*(end|else|elseif|until)\b/,
      action: { indentAction: IndentAction.IndentOutdent },
    },
  ],
}

/**
 * Monarch tokenizer configuration for Lua with enhanced syntax highlighting
 * Includes support for:
 * - Multi-line strings ([[...]] and [=[...]=])
 * - Table constructors with key highlighting
 * - All Lua keywords
 * - Single-line and multi-line comments
 * - Numbers (decimal, hexadecimal, scientific notation)
 */
export const luaTokenizerConfig: languages.IMonarchLanguage = {
  defaultToken: '',
  tokenPostfix: '.lua',

  keywords: LUA_KEYWORDS,

  brackets: [
    { token: 'delimiter.bracket', open: '{', close: '}' },
    { token: 'delimiter.array', open: '[', close: ']' },
    { token: 'delimiter.parenthesis', open: '(', close: ')' },
  ],

  operators: [
    '+',
    '-',
    '*',
    '/',
    '%',
    '^',
    '#',
    '==',
    '~=',
    '<=',
    '>=',
    '<',
    '>',
    '=',
    ';',
    ':',
    ',',
    '.',
    '..',
    '...',
  ],

  symbols: /[=><!~?:&|+\-*/^%]+/,

  escapes:
    /\\(?:[abfnrtv\\"']|x[0-9A-Fa-f]{1,4}|u[0-9A-Fa-f]{4}|U[0-9A-Fa-f]{8})/,

  tokenizer: {
    root: [
      // Multi-line strings with equal signs [=[...]=]
      // Capture the opening bracket pattern for matching the closing
      [/\[=+\[/, { token: 'string.quote', next: '@mlstring.$0' }],
      // Multi-line strings without equal signs [[...]]
      [/\[\[/, { token: 'string.quote', next: '@mlstring.0' }],

      // Identifiers and keywords
      [
        /[a-zA-Z_]\w*/,
        {
          cases: {
            '@keywords': { token: 'keyword.$0' },
            '@default': 'identifier',
          },
        },
      ],

      // Whitespace and comments
      { include: '@whitespace' },

      // Table constructor: enter table state for key highlighting
      [/{/, { token: '@brackets', next: '@table' }],

      // Brackets and delimiters (excluding { which is handled above)
      [/[}()[\]]/, '@brackets'],
      [
        /@symbols/,
        {
          cases: {
            '@operators': 'delimiter',
            '@default': '',
          },
        },
      ],

      // Numbers - order matters: most specific first
      // Hexadecimal with optional decimal and exponent
      [/0[xX][0-9a-fA-F_]*[0-9a-fA-F](\.[0-9a-fA-F]*)?([pP][+-]?\d+)?/, 'number.hex'],
      // Float with exponent
      [/\d*\.\d+([eE][+-]?\d+)?/, 'number.float'],
      // Integer with exponent
      [/\d+[eE][+-]?\d+/, 'number.float'],
      // Simple integer
      [/\d+/, 'number'],

      // Delimiter after numbers (for .method calls)
      [/[;,.]/, 'delimiter'],

      // Strings - detect unterminated strings
      [/"([^"\\]|\\.)*$/, 'string.invalid'],
      [/'([^'\\]|\\.)*$/, 'string.invalid'],
      [/"/, 'string', '@string."'],
      [/'/, 'string', "@string.'"],
    ],

    whitespace: [
      [/[ \t\r\n]+/, ''],
      // Multi-line comments with equal signs --[=[...]=]
      [/--\[([=]*)\[/, 'comment', '@comment.$1'],
      // Single-line comments
      [/--.*$/, 'comment'],
    ],

    comment: [
      [/[^\]]+/, 'comment'],
      [
        /\]([=]*)\]/,
        {
          cases: {
            '$1==$S2': { token: 'comment', next: '@pop' },
            '@default': 'comment',
          },
        },
      ],
      [/./, 'comment'],
    ],

    // Multi-line string state
    // $S2 is either '0' for [[...]] or the full opening pattern like '[=[' for [=[...]=]
    mlstring: [
      // Match any content that's not a closing bracket candidate
      [/[^\]]+/, 'string'],
      // For [[...]] case (state param is '0'), match ]] to close
      [
        /\]\]/,
        {
          cases: {
            '$S2==0': { token: 'string.quote', next: '@pop' },
            '@default': 'string',
          },
        },
      ],
      // For [=[...]=] case, match ]=*] and check equals count matches opening
      [
        /\](=*)\]/,
        {
          cases: {
            // $1 is the captured equals, $S2 is the opening like '[=['
            // Check if ']$1]' would close the string opened by $S2
            '$S2==[=$1[': { token: 'string.quote', next: '@pop' },
            '@default': 'string',
          },
        },
      ],
      // Single ] that doesn't close - treat as string content
      [/\]/, 'string'],
    ],

    string: [
      [/[^\\"']+/, 'string'],
      [/@escapes/, 'string.escape'],
      [/\\./, 'string.escape.invalid'],
      [
        /["']/,
        {
          cases: {
            '$#==$S2': { token: 'string', next: '@pop' },
            '@default': 'string',
          },
        },
      ],
    ],

    // Table constructor state - handles key = value highlighting
    // Only in this state do we highlight identifiers before = as properties
    table: [
      // Exit table on closing brace
      [/}/, { token: '@brackets', next: '@pop' }],

      // Nested table: enter another table state
      [/{/, { token: '@brackets', next: '@table' }],

      // Table key highlighting: key = value (first key after { or ,)
      [
        /([a-zA-Z_]\w*)(\s*)(=)/,
        ['variable.property', '', 'delimiter'],
      ],
      // Table key: key: value style (less common in Lua, but supported)
      [
        /([a-zA-Z_]\w*)(\s*)(:)(?!:)/,
        ['variable.property', '', 'delimiter'],
      ],

      // Include all the standard patterns from root for values inside tables
      // Multi-line strings
      [/\[=+\[/, { token: 'string.quote', next: '@mlstring.$0' }],
      [/\[\[/, { token: 'string.quote', next: '@mlstring.0' }],

      // Identifiers and keywords (for values)
      [
        /[a-zA-Z_]\w*/,
        {
          cases: {
            '@keywords': { token: 'keyword.$0' },
            '@default': 'identifier',
          },
        },
      ],

      // Whitespace and comments
      { include: '@whitespace' },

      // Other brackets and delimiters
      [/[()[\]]/, '@brackets'],
      [
        /@symbols/,
        {
          cases: {
            '@operators': 'delimiter',
            '@default': '',
          },
        },
      ],

      // Numbers
      [/0[xX][0-9a-fA-F_]*[0-9a-fA-F](\.[0-9a-fA-F]*)?([pP][+-]?\d+)?/, 'number.hex'],
      [/\d*\.\d+([eE][+-]?\d+)?/, 'number.float'],
      [/\d+[eE][+-]?\d+/, 'number.float'],
      [/\d+/, 'number'],

      // Delimiter after numbers
      [/[;,.]/, 'delimiter'],

      // Strings
      [/"([^"\\]|\\.)*$/, 'string.invalid'],
      [/'([^'\\]|\\.)*$/, 'string.invalid'],
      [/"/, 'string', '@string."'],
      [/'/, 'string', "@string.'"],
    ],
  },
}

/**
 * Pattern to match dedent keywords at the start of a line (with indentation)
 */
const DEDENT_PATTERN = /^(\s+)(end|else|elseif|until)\b/

/**
 * All lowercase letters and underscore - triggers for auto-indent on empty lines
 * This covers all valid Lua identifier start characters
 */
const AUTO_INDENT_TRIGGER_CHARS = [
  'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l', 'm',
  'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v', 'w', 'x', 'y', 'z',
  '_', // for identifiers starting with underscore
]

/**
 * Register the enhanced Lua language configuration with Monaco Editor
 * Call this function after Monaco is loaded to override the default Lua tokenizer
 */
export function registerLuaLanguage(monaco: typeof import('monaco-editor')): void {
  // Register language configuration (comments, brackets, etc.)
  monaco.languages.setLanguageConfiguration('lua', luaLanguageConfig)

  // Register the enhanced tokenizer
  monaco.languages.setMonarchTokensProvider('lua', luaTokenizerConfig)

  // Register on-type formatting for auto-dedent and auto-indent
  monaco.languages.registerOnTypeFormattingEditProvider('lua', {
    autoFormatTriggerCharacters: AUTO_INDENT_TRIGGER_CHARS,

    provideOnTypeFormattingEdits(model, position, ch) {
      // Check if auto-indent is enabled
      if (!isAutoIndentEnabled()) {
        return []
      }

      const lineNumber = position.lineNumber
      const lineText = model.getLineContent(lineNumber)

      // Case 1: Check for dedent keywords (end, else, elseif, until)
      const dedentMatch = lineText.match(DEDENT_PATTERN)
      if (dedentMatch) {
        const currentIndent = dedentMatch[1]
        const keyword = dedentMatch[2] as 'end' | 'else' | 'elseif' | 'until'

        // Verify cursor is at the end of the keyword
        const keywordEndCol = currentIndent.length + keyword.length + 1
        if (position.column === keywordEndCol) {
          // Get code above to analyze block structure
          const codeAbove =
            lineNumber > 1
              ? model.getValueInRange(
                  new monaco.Range(1, 1, lineNumber - 1, model.getLineMaxColumn(lineNumber - 1))
                )
              : ''

          const targetIndentLength = findMatchingBlockIndent(codeAbove, keyword)
          const useTabs = currentIndent.includes('\t')
          const newIndent = useTabs
            ? '\t'.repeat(targetIndentLength)
            : ' '.repeat(targetIndentLength)

          if (newIndent !== currentIndent) {
            return [
              {
                range: new monaco.Range(lineNumber, 1, lineNumber, currentIndent.length + 1),
                text: newIndent,
              },
            ]
          }
        }
        return []
      }

      // Case 2: Auto-indent on empty line
      // Check if the line was empty/whitespace before this character was typed
      // position.column is 1-indexed and points AFTER the typed character
      // So position.column - 2 gives us everything BEFORE the typed character
      const textBeforeTypedChar = lineText.substring(0, position.column - 2)
      if (textBeforeTypedChar.trim() === '' && position.column === lineText.length + 1) {
        // Line was empty/whitespace, and cursor is at the end (just typed a char)
        // Calculate correct indentation
        const codeAbove =
          lineNumber > 1
            ? model.getValueInRange(
                new monaco.Range(1, 1, lineNumber - 1, model.getLineMaxColumn(lineNumber - 1))
              )
            : ''

        const targetIndentLevel = calculateCorrectIndent(codeAbove)

        if (targetIndentLevel > 0) {
          // Detect indent style from existing code or use spaces (2 per level)
          const tabSize = model.getOptions().tabSize
          const useSpaces = model.getOptions().insertSpaces

          const indentString = useSpaces
            ? ' '.repeat(targetIndentLevel * tabSize)
            : '\t'.repeat(targetIndentLevel)

          // Replace the line content with proper indentation + the typed character
          return [
            {
              range: new monaco.Range(lineNumber, 1, lineNumber, position.column),
              text: indentString + ch,
            },
          ]
        }
      }

      return []
    },
  })
}
