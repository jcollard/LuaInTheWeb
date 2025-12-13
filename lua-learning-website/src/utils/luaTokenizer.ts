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
      [/\[=+\[/, { token: 'string', next: '@mlstring.$0' }],
      // Multi-line strings without equal signs [[...]]
      [/\[\[/, { token: 'string', next: '@mlstring.[[' }],

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
    mlstring: [
      [/[^\]]+/, 'string'],
      [
        /\]=*\]/,
        {
          cases: {
            // Match closing bracket with same number of equals
            '$0==$S2': { token: 'string', next: '@pop' },
            '@default': 'string',
          },
        },
      ],
      [
        /\]\]/,
        {
          cases: {
            '$S2==[[': { token: 'string', next: '@pop' },
            '@default': 'string',
          },
        },
      ],
      [/./, 'string'],
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
 * Register the enhanced Lua language configuration with Monaco Editor
 * Call this function after Monaco is loaded to override the default Lua tokenizer
 */
export function registerLuaLanguage(monaco: typeof import('monaco-editor')): void {
  // Register language configuration (comments, brackets, etc.)
  monaco.languages.setLanguageConfiguration('lua', luaLanguageConfig)

  // Register the enhanced tokenizer
  monaco.languages.setMonarchTokensProvider('lua', luaTokenizerConfig)
}
