/**
 * Documentation for the canvas library module.
 *
 * This module provides documentation lookup for functions and fields
 * in the canvas module that can be required via `require('canvas')`.
 */

import type { LibraryDocEntry } from './luaLibraryDocs'

/**
 * Canvas library documentation.
 * Based on LuaDoc annotations in @lua-learning/lua-runtime canvas.ts
 */
export const canvasLibraryDocs: Record<string, LibraryDocEntry> = {
  // Canvas Lifecycle
  start: {
    name: 'start',
    signature: 'canvas.start()',
    description:
      'Start the canvas and block until canvas.stop() is called or Ctrl+C. Opens a canvas tab and runs the game loop. Call canvas.tick() before this to register your render callback.',
    library: 'canvas',
    returns: 'nil',
  },
  stop: {
    name: 'stop',
    signature: 'canvas.stop()',
    description:
      'Stop the canvas and close the canvas tab. Unblocks the canvas.start() call and returns control to the script.',
    library: 'canvas',
    returns: 'nil',
  },

  // Game Loop
  tick: {
    name: 'tick',
    signature: 'canvas.tick(callback)',
    description:
      'Register the tick callback function. Called once per frame (~60fps). All game logic and drawing should be performed inside this callback.',
    library: 'canvas',
    params: [{ name: 'callback', description: 'Function to call each frame' }],
    returns: 'nil',
  },

  // Canvas Configuration
  set_size: {
    name: 'set_size',
    signature: 'canvas.set_size(width, height)',
    description:
      'Set the canvas size in pixels. Call this before tick() to set the desired canvas dimensions.',
    library: 'canvas',
    params: [
      { name: 'width', description: 'Canvas width in pixels' },
      { name: 'height', description: 'Canvas height in pixels' },
    ],
    returns: 'nil',
  },
  get_width: {
    name: 'get_width',
    signature: 'canvas.get_width()',
    description: 'Get the canvas width in pixels.',
    library: 'canvas',
    returns: 'number - Canvas width',
  },
  get_height: {
    name: 'get_height',
    signature: 'canvas.get_height()',
    description: 'Get the canvas height in pixels.',
    library: 'canvas',
    returns: 'number - Canvas height',
  },

  // Drawing State
  clear: {
    name: 'clear',
    signature: 'canvas.clear()',
    description: 'Clear the canvas with the current background color.',
    library: 'canvas',
    returns: 'nil',
  },
  set_color: {
    name: 'set_color',
    signature: 'canvas.set_color(r, g, b, [a])',
    description:
      'Set the drawing color (RGBA values 0-255). All subsequent drawing operations will use this color.',
    library: 'canvas',
    params: [
      { name: 'r', description: 'Red component (0-255)' },
      { name: 'g', description: 'Green component (0-255)' },
      { name: 'b', description: 'Blue component (0-255)' },
      { name: 'a', description: 'Alpha component (0-255, default: 255) (optional)' },
    ],
    returns: 'nil',
  },
  set_line_width: {
    name: 'set_line_width',
    signature: 'canvas.set_line_width(width)',
    description: 'Set the line width for stroke operations (draw_rect, draw_circle, draw_line).',
    library: 'canvas',
    params: [{ name: 'width', description: 'Line width in pixels' }],
    returns: 'nil',
  },

  // Shape Drawing
  draw_rect: {
    name: 'draw_rect',
    signature: 'canvas.draw_rect(x, y, width, height)',
    description: 'Draw a rectangle outline.',
    library: 'canvas',
    params: [
      { name: 'x', description: 'X coordinate of top-left corner' },
      { name: 'y', description: 'Y coordinate of top-left corner' },
      { name: 'width', description: 'Width of rectangle' },
      { name: 'height', description: 'Height of rectangle' },
    ],
    returns: 'nil',
  },
  fill_rect: {
    name: 'fill_rect',
    signature: 'canvas.fill_rect(x, y, width, height)',
    description: 'Draw a filled rectangle.',
    library: 'canvas',
    params: [
      { name: 'x', description: 'X coordinate of top-left corner' },
      { name: 'y', description: 'Y coordinate of top-left corner' },
      { name: 'width', description: 'Width of rectangle' },
      { name: 'height', description: 'Height of rectangle' },
    ],
    returns: 'nil',
  },
  draw_circle: {
    name: 'draw_circle',
    signature: 'canvas.draw_circle(x, y, radius)',
    description: 'Draw a circle outline.',
    library: 'canvas',
    params: [
      { name: 'x', description: 'X coordinate of center' },
      { name: 'y', description: 'Y coordinate of center' },
      { name: 'radius', description: 'Radius of circle' },
    ],
    returns: 'nil',
  },
  fill_circle: {
    name: 'fill_circle',
    signature: 'canvas.fill_circle(x, y, radius)',
    description: 'Draw a filled circle.',
    library: 'canvas',
    params: [
      { name: 'x', description: 'X coordinate of center' },
      { name: 'y', description: 'Y coordinate of center' },
      { name: 'radius', description: 'Radius of circle' },
    ],
    returns: 'nil',
  },
  draw_line: {
    name: 'draw_line',
    signature: 'canvas.draw_line(x1, y1, x2, y2)',
    description: 'Draw a line between two points.',
    library: 'canvas',
    params: [
      { name: 'x1', description: 'X coordinate of start point' },
      { name: 'y1', description: 'Y coordinate of start point' },
      { name: 'x2', description: 'X coordinate of end point' },
      { name: 'y2', description: 'Y coordinate of end point' },
    ],
    returns: 'nil',
  },
  draw_text: {
    name: 'draw_text',
    signature: 'canvas.draw_text(x, y, text)',
    description: 'Draw text at the specified position.',
    library: 'canvas',
    params: [
      { name: 'x', description: 'X coordinate' },
      { name: 'y', description: 'Y coordinate' },
      { name: 'text', description: 'Text to draw' },
    ],
    returns: 'nil',
  },

  // Timing Functions
  get_delta: {
    name: 'get_delta',
    signature: 'canvas.get_delta()',
    description:
      'Get the time elapsed since the last frame (in seconds). Use this for frame-rate independent movement.',
    library: 'canvas',
    returns: 'number - Time since last frame in seconds',
  },
  get_time: {
    name: 'get_time',
    signature: 'canvas.get_time()',
    description: 'Get the total time since the game started (in seconds).',
    library: 'canvas',
    returns: 'number - Total elapsed time in seconds',
  },

  // Keyboard Input
  is_key_down: {
    name: 'is_key_down',
    signature: 'canvas.is_key_down(key)',
    description: 'Check if a key is currently held down.',
    library: 'canvas',
    params: [{ name: 'key', description: "Key name (e.g., 'w', 'ArrowUp', canvas.keys.SPACE)" }],
    returns: 'boolean - True if key is currently held',
  },
  is_key_pressed: {
    name: 'is_key_pressed',
    signature: 'canvas.is_key_pressed(key)',
    description:
      'Check if a key was pressed this frame. Returns true only on the frame the key was first pressed.',
    library: 'canvas',
    params: [{ name: 'key', description: "Key name (e.g., 'w', 'ArrowUp', canvas.keys.SPACE)" }],
    returns: 'boolean - True if key was just pressed',
  },
  get_keys_down: {
    name: 'get_keys_down',
    signature: 'canvas.get_keys_down()',
    description: 'Get all keys currently held down.',
    library: 'canvas',
    returns: 'table - Array of key codes (KeyboardEvent.code format)',
  },
  get_keys_pressed: {
    name: 'get_keys_pressed',
    signature: 'canvas.get_keys_pressed()',
    description: 'Get all keys pressed this frame.',
    library: 'canvas',
    returns: 'table - Array of key codes pressed this frame',
  },

  // Mouse Input
  get_mouse_x: {
    name: 'get_mouse_x',
    signature: 'canvas.get_mouse_x()',
    description: 'Get the current mouse X position relative to canvas.',
    library: 'canvas',
    returns: 'number - Mouse X coordinate',
  },
  get_mouse_y: {
    name: 'get_mouse_y',
    signature: 'canvas.get_mouse_y()',
    description: 'Get the current mouse Y position relative to canvas.',
    library: 'canvas',
    returns: 'number - Mouse Y coordinate',
  },
  is_mouse_down: {
    name: 'is_mouse_down',
    signature: 'canvas.is_mouse_down(button)',
    description: 'Check if a mouse button is currently held down.',
    library: 'canvas',
    params: [{ name: 'button', description: 'Button number (0 = left, 1 = middle, 2 = right)' }],
    returns: 'boolean - True if button is held',
  },
  is_mouse_pressed: {
    name: 'is_mouse_pressed',
    signature: 'canvas.is_mouse_pressed(button)',
    description:
      'Check if a mouse button was pressed this frame. Returns true only on the frame the button was first pressed.',
    library: 'canvas',
    params: [{ name: 'button', description: 'Button number (0 = left, 1 = middle, 2 = right)' }],
    returns: 'boolean - True if button was just pressed',
  },

  // Key Constants (as a nested object)
  keys: {
    name: 'keys',
    signature: 'canvas.keys',
    description:
      'Table of key constants for use with is_key_down() and is_key_pressed(). Includes: A-Z, DIGIT_0-DIGIT_9, UP/DOWN/LEFT/RIGHT, F1-F12, SHIFT/CTRL/ALT, SPACE/ENTER/ESCAPE, and more.',
    library: 'canvas',
  },
}
