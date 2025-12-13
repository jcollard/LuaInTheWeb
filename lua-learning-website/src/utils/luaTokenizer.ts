import type { languages } from 'monaco-editor'

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
    // Increase indent after: function, if...then, for...do, while...do, repeat, do, else, elseif
    // Uses negative lookahead to exclude lines that are comments
    increaseIndentPattern:
      /^(?!.*--.*).*\b(function\b.*\)|then|do|repeat|else|elseif.*then)\s*$/,
    // Decrease indent on: end, else, elseif, until - must be at start of line (with optional whitespace)
    // Uses negative lookahead to exclude lines that are comments
    decreaseIndentPattern: /^\s*(?!--)(end|else|elseif|until)\b/,
  },
  onEnterRules: [
    // After block-opening keywords, indent
    {
      beforeText:
        /^\s*\b(function.*\(.*\)|if\b.*\bthen|for\b.*\bdo|while\b.*\bdo|repeat|else|elseif\b.*\bthen)\s*$/,
      action: { indentAction: 1 }, // IndentAction.Indent
    },
    // After standalone 'do' keyword, indent
    {
      beforeText: /^\s*do\s*$/,
      action: { indentAction: 1 }, // IndentAction.Indent
    },
    // Before 'end', 'else', 'elseif', 'until' - outdent then indent (for typing these keywords)
    {
      beforeText: /^\s*$/,
      afterText: /^\s*(end|else|elseif|until)\b/,
      action: { indentAction: 2 }, // IndentAction.IndentOutdent
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

      // Table key highlighting: { key = value } or { key: value } (colon style)
      [
        /({)(\s*)([a-zA-Z_]\w*)(\s*)(=)/,
        ['@brackets', '', 'variable.property', '', 'delimiter'],
      ],
      [
        /(,)(\s*)([a-zA-Z_]\w*)(\s*)(=)/,
        ['delimiter', '', 'variable.property', '', 'delimiter'],
      ],
      // Table key: { key: value } style (less common in Lua, but supported)
      [
        /(,)(\s*)([a-zA-Z_]\w*)(\s*)(:)(?!:)/,
        ['delimiter', '', 'variable.property', '', 'delimiter'],
      ],
      [
        /({)(\s*)([a-zA-Z_]\w*)(\s*)(:)(?!:)/,
        ['@brackets', '', 'variable.property', '', 'delimiter'],
      ],

      // Brackets and delimiters
      [/[{}()[\]]/, '@brackets'],
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
  },
}

/**
 * Pattern to match dedent keywords at the start of a line (with indentation)
 */
const DEDENT_PATTERN = /^(\s+)(end|else|elseif|until)\b/

/**
 * Characters that trigger the auto-dedent check
 * These are the last characters of: end, else, elseif, until
 */
const DEDENT_TRIGGER_CHARS = ['d', 'e', 'f', 'l']

/**
 * Register the enhanced Lua language configuration with Monaco Editor
 * Call this function after Monaco is loaded to override the default Lua tokenizer
 */
export function registerLuaLanguage(monaco: typeof import('monaco-editor')): void {
  // Register language configuration (comments, brackets, etc.)
  monaco.languages.setLanguageConfiguration('lua', luaLanguageConfig)

  // Register the enhanced tokenizer
  monaco.languages.setMonarchTokensProvider('lua', luaTokenizerConfig)

  // Register on-type formatting for auto-dedent of end/else/elseif/until
  monaco.languages.registerOnTypeFormattingEditProvider('lua', {
    autoFormatTriggerCharacters: DEDENT_TRIGGER_CHARS,

    provideOnTypeFormattingEdits(model, position, _ch) {
      // Get the current line text
      const lineNumber = position.lineNumber
      const lineText = model.getLineContent(lineNumber)

      // Check if the line matches the dedent pattern
      const match = lineText.match(DEDENT_PATTERN)
      if (!match) {
        return []
      }

      const currentIndent = match[1]
      const keyword = match[2]

      // Verify that the cursor is at the end of the keyword
      // (to avoid triggering on partial matches)
      const keywordEndCol = currentIndent.length + keyword.length + 1
      if (position.column !== keywordEndCol) {
        return []
      }

      // Calculate the new indentation (one level less)
      // Detect indent style from the current indent
      const tabSize = model.getOptions().tabSize
      let newIndent: string

      if (currentIndent.includes('\t')) {
        // Tab-based indent: remove one tab
        newIndent = currentIndent.replace(/\t/, '')
      } else {
        // Space-based indent: remove tabSize spaces
        const spacesToRemove = Math.min(tabSize, currentIndent.length)
        newIndent = currentIndent.slice(spacesToRemove)
      }

      // If indent didn't change, no edit needed
      if (newIndent === currentIndent) {
        return []
      }

      // Return edit to replace the leading whitespace
      return [
        {
          range: new monaco.Range(
            lineNumber,
            1,
            lineNumber,
            currentIndent.length + 1
          ),
          text: newIndent,
        },
      ]
    },
  })
}
