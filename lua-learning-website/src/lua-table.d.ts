declare module '@kilcekru/lua-table' {
  export function stringify(data: unknown, options?: { pretty?: boolean | number | string }): string
  export function parse(input: string, options?: { emptyTables?: 'object' | 'array' }): unknown
}
