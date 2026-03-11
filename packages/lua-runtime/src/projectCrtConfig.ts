/**
 * Lightweight project.lua CRT config extractor.
 *
 * Parses a project.lua string with luaparse and extracts CRT-related fields
 * from the `ansi` section. Used by LuaScriptProcess to auto-apply CRT
 * settings when running scripts adjacent to a project.lua.
 */

import * as luaparse from 'luaparse'
import { CRT_DEFAULTS, type CrtConfig } from './crtShader'

interface LuaNode { type: string }
interface LuaChunk extends LuaNode { body: LuaNode[] }
interface LuaReturnStatement extends LuaNode { arguments: LuaNode[] }
interface LuaTableConstructor extends LuaNode { fields: LuaTableField[] }
interface LuaTableField extends LuaNode { type: string; key?: LuaNode; value: LuaNode }
interface LuaIdentifier extends LuaNode { name: string }
interface LuaNumericLiteral extends LuaNode { value: number }
interface LuaBooleanLiteral extends LuaNode { value: boolean }

/**
 * Extract a flat key→value map from a Lua table AST node.
 * Only handles TableKeyString fields with literal values.
 */
function tableToMap(table: LuaTableConstructor): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  for (const field of table.fields) {
    if (field.type !== 'TableKeyString' || !field.key) continue
    const key = (field.key as LuaIdentifier).name
    const val = field.value
    if (val.type === 'NumericLiteral') result[key] = (val as LuaNumericLiteral).value
    else if (val.type === 'BooleanLiteral') result[key] = (val as LuaBooleanLiteral).value
    else if (val.type === 'TableConstructorExpression') result[key] = tableToMap(val as LuaTableConstructor)
  }
  return result
}

/**
 * Parse a project.lua string and return a CrtConfig if CRT is enabled,
 * or null if CRT is not enabled or the file can't be parsed.
 */
export function extractCrtConfig(content: string): CrtConfig | null {
  try {
    const ast = luaparse.parse(content, {
      luaVersion: '5.3',
      comments: false,
      scope: false,
    }) as LuaChunk

    const ret = ast.body.find((n): n is LuaReturnStatement => n.type === 'ReturnStatement')
    if (!ret?.arguments?.[0] || ret.arguments[0].type !== 'TableConstructorExpression') return null

    const root = tableToMap(ret.arguments[0] as LuaTableConstructor)
    const ansi = root.ansi as Record<string, unknown> | undefined
    if (!ansi || ansi.crt !== true) return null

    return {
      smoothing: typeof ansi.crt_smoothing === 'boolean' ? ansi.crt_smoothing : CRT_DEFAULTS.smoothing,
      scanlineIntensity: typeof ansi.crt_scanlineIntensity === 'number' ? ansi.crt_scanlineIntensity : CRT_DEFAULTS.scanlineIntensity,
      scanlineCount: typeof ansi.crt_scanlineCount === 'number' ? ansi.crt_scanlineCount : CRT_DEFAULTS.scanlineCount,
      adaptiveIntensity: typeof ansi.crt_adaptiveIntensity === 'number' ? ansi.crt_adaptiveIntensity : CRT_DEFAULTS.adaptiveIntensity,
      brightness: typeof ansi.crt_brightness === 'number' ? ansi.crt_brightness : CRT_DEFAULTS.brightness,
      contrast: typeof ansi.crt_contrast === 'number' ? ansi.crt_contrast : CRT_DEFAULTS.contrast,
      saturation: typeof ansi.crt_saturation === 'number' ? ansi.crt_saturation : CRT_DEFAULTS.saturation,
      bloomIntensity: typeof ansi.crt_bloomIntensity === 'number' ? ansi.crt_bloomIntensity : CRT_DEFAULTS.bloomIntensity,
      bloomThreshold: typeof ansi.crt_bloomThreshold === 'number' ? ansi.crt_bloomThreshold : CRT_DEFAULTS.bloomThreshold,
      rgbShift: typeof ansi.crt_rgbShift === 'number' ? ansi.crt_rgbShift : CRT_DEFAULTS.rgbShift,
      vignetteStrength: typeof ansi.crt_vignetteStrength === 'number' ? ansi.crt_vignetteStrength : CRT_DEFAULTS.vignetteStrength,
      curvature: typeof ansi.crt_curvature === 'number' ? ansi.crt_curvature : CRT_DEFAULTS.curvature,
      flickerStrength: typeof ansi.crt_flickerStrength === 'number' ? ansi.crt_flickerStrength : CRT_DEFAULTS.flickerStrength,
      phosphor: typeof ansi.crt_phosphor === 'number' ? ansi.crt_phosphor : CRT_DEFAULTS.phosphor,
    }
  } catch {
    return null
  }
}
