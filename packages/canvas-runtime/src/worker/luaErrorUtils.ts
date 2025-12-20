/**
 * Utilities for formatting Lua error messages in the canvas runtime.
 * Extracts line numbers from wasmoon error format and formats them
 * for user-friendly display.
 */

/**
 * Result of extracting line number from a Lua error message.
 */
export interface LineExtractionResult {
  /** The line number if found, null otherwise */
  line: number | null;
  /** The error message with line prefix removed */
  message: string;
}

/**
 * Regex patterns for extracting line numbers from Lua error messages.
 * Matches:
 * - [string "filename"]:N: message
 * - filename.lua:N: message
 * - @filename.lua:N: message
 */
const LINE_PATTERNS = [
  /^\[string "[^"]*"\]:(\d+):\s*/,
  /^@?[^:\s]+\.lua:(\d+):\s*/,
];

/**
 * Extract line number from a Lua error message.
 *
 * @param error - The raw error message from Lua/wasmoon
 * @returns Object containing the line number (or null) and the cleaned message
 */
export function extractLineNumber(error: string): LineExtractionResult {
  for (const pattern of LINE_PATTERNS) {
    const match = error.match(pattern);
    if (match) {
      const line = parseInt(match[1], 10);
      const message = error.slice(match[0].length);
      return { line, message };
    }
  }

  return { line: null, message: error };
}

/**
 * Format a Lua error for display as a canvas.tick error.
 * Extracts line number from the error and formats as:
 * - "canvas.tick (line N): message" when line number is present
 * - "canvas.tick: message" when no line number
 *
 * @param error - The raw error message from Lua/wasmoon
 * @returns Formatted error string with canvas.tick prefix
 */
export function formatCanvasTickError(error: string): string {
  const { line, message } = extractLineNumber(error);

  if (line !== null) {
    return `canvas.tick (line ${line}): ${message}`;
  }

  return `canvas.tick: ${message}`;
}
