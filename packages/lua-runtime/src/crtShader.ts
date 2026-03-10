/* eslint-disable max-lines -- GLSL shader string inflates line count; logic is ~250 lines */
/**
 * WebGL2 CRT post-processing shader overlay.
 *
 * Creates a WebGL2 canvas on top of a source canvas (e.g. xterm.js CanvasAddon)
 * and applies a CRT monitor effect via fragment shader. Effects include barrel
 * distortion, scanlines, RGB phosphor mask, vignette, bloom, chromatic aberration,
 * contrast, saturation, and subtle flicker — each controlled by its own uniform.
 *
 * CRT fragment shader ported from gingerbeardman/webgl-crt-shader
 * Copyright (c) 2025 Matt Sephton @gingerbeardman — MIT License
 * https://github.com/gingerbeardman/webgl-crt-shader
 */

/** Per-effect CRT configuration. Each value directly controls one shader effect. */
export interface CrtConfig {
  /** Texture smoothing — LINEAR (true) vs NEAREST (false). Default: true */
  smoothing: boolean
  /** Scanline darkness (0–1, default 0.5) */
  scanlineIntensity: number
  /** Number of scanlines (50–1200, default 256) */
  scanlineCount: number
  /** Scanline adaptive modulation (0–1, default 0.3) */
  adaptiveIntensity: number
  /** Brightness multiplier (0.6–1.8, default 1.5) */
  brightness: number
  /** Contrast adjustment (0.5–1.5, default 1.05) */
  contrast: number
  /** Color saturation (0–2, default 1.1) */
  saturation: number
  /** Bright pixel glow (0–1.5, default 0.5) */
  bloomIntensity: number
  /** Bloom luminance threshold (0–1, default 0.5) */
  bloomThreshold: number
  /** Chromatic aberration / color fringing (0–1, default 1.0) */
  rgbShift: number
  /** Edge darkening (0–2, default 0.3) */
  vignetteStrength: number
  /** Barrel distortion amount (0–0.5, default 0.1) */
  curvature: number
  /** Temporal flicker (0–0.15, default 0.01) */
  flickerStrength: number
  /** RGB phosphor mask strength (0–1, default 0.5) — our addition, not in gingerbeardman */
  phosphor: number
}

/** Default CRT config values matching the gingerbeardman/webgl-crt-shader demo. */
export const CRT_DEFAULTS: Readonly<CrtConfig> = {
  smoothing: true,
  scanlineIntensity: 0.5,
  scanlineCount: 256,
  adaptiveIntensity: 0.3,
  brightness: 1.5,
  contrast: 1.05,
  saturation: 1.1,
  bloomIntensity: 0.5,
  bloomThreshold: 0.5,
  rgbShift: 1.0,
  vignetteStrength: 0.3,
  curvature: 0.1,
  flickerStrength: 0.01,
  phosphor: 0.5,
}

// ---------- GLSL ----------

const VERTEX_SHADER = `#version 300 es
precision mediump float;
in vec2 a_position;
in vec2 a_texCoord;
out vec2 v_texCoord;
void main() {
  gl_Position = vec4(a_position, 0.0, 1.0);
  v_texCoord = a_texCoord;
}
`

/**
 * Fragment shader ported from gingerbeardman/webgl-crt-shader (MIT License).
 * Copyright (c) 2025 Matt Sephton @gingerbeardman
 * https://github.com/gingerbeardman/webgl-crt-shader
 *
 * Ported from WebGL1/Three.js to WebGL2 (texture2D→texture, varying→in, etc.).
 * Phosphor mask appended after lightingMask (our addition).
 */
const FRAGMENT_SHADER = `#version 300 es
precision mediump float;

in vec2 v_texCoord;
out vec4 fragColor;

uniform sampler2D u_texture;
uniform float u_time;
uniform vec2 u_resolution;

// Per-effect uniforms
uniform float u_curvature;
uniform float u_scanlineIntensity;
uniform float u_scanlineCount;
uniform float u_adaptiveIntensity;
uniform float u_phosphor;
uniform float u_vignetteStrength;
uniform float u_bloomIntensity;
uniform float u_bloomThreshold;
uniform float u_rgbShift;
uniform float u_flickerStrength;
uniform float u_brightness;
uniform float u_contrast;
uniform float u_saturation;

// Precomputed constants
const float PI = 3.14159265;
const vec3 LUMA = vec3(0.299, 0.587, 0.114);
const float BLOOM_THRESHOLD_FACTOR = 0.5;
const float BLOOM_FACTOR_MULT = 1.5;
const float RGB_SHIFT_SCALE = 0.005;
const float RGB_SHIFT_INTENSITY = 0.08;

// Optimized curvature function
vec2 curveRemapUV(vec2 uv, float curv) {
  vec2 coords = uv * 2.0 - 1.0;
  float curveAmount = curv * 0.25;
  float dist = dot(coords, coords);
  coords = coords * (1.0 + dist * curveAmount);
  return coords * 0.5 + 0.5;
}

// Low-cost symmetric bloom sampling (cross + center, normalized)
vec4 sampleBloom(vec2 uv, float radius, vec4 centerSample) {
  vec2 o = vec2(radius);
  vec4 c = centerSample * 0.4;
  vec4 cross_s = (
    texture(u_texture, uv + vec2(o.x, 0.0)) +
    texture(u_texture, uv - vec2(o.x, 0.0)) +
    texture(u_texture, uv + vec2(0.0, o.y)) +
    texture(u_texture, uv - vec2(0.0, o.y))
  ) * 0.15;
  return c + cross_s;
}

// Approximates vignette using Chebyshev distance squared instead of pow()
float vignetteApprox(vec2 uv, float strength) {
  vec2 vigCoord = uv * 2.0 - 1.0;
  float dist = max(abs(vigCoord.x), abs(vigCoord.y));
  return 1.0 - dist * dist * strength;
}

void main() {
  vec2 uv = v_texCoord;

  // Apply screen curvature if enabled (early out for out-of-bounds)
  if (u_curvature > 0.001) {
    uv = curveRemapUV(uv, u_curvature);
    if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
      fragColor = vec4(0.0);
      return;
    }
  }

  // Get the original pixel color
  vec4 pixel = texture(u_texture, uv);

  // Apply bloom effect with threshold-based sampling (skip if disabled)
  if (u_bloomIntensity > 0.001) {
    float pixelLum = dot(pixel.rgb, LUMA);
    float bloomThresholdHalf = u_bloomThreshold * BLOOM_THRESHOLD_FACTOR;
    if (pixelLum > bloomThresholdHalf) {
      vec4 bloomSample = sampleBloom(uv, 0.005, pixel);
      bloomSample.rgb *= u_brightness;
      float bloomLum = dot(bloomSample.rgb, LUMA);
      float bloomFactor = u_bloomIntensity * max(0.0, (bloomLum - u_bloomThreshold) * BLOOM_FACTOR_MULT);
      pixel.rgb += bloomSample.rgb * bloomFactor;
    }
  }

  // Apply RGB shift (chromatic aberration) only if significant
  if (u_rgbShift > 0.005) {
    float shift = u_rgbShift * RGB_SHIFT_SCALE;
    pixel.r += texture(u_texture, vec2(uv.x + shift, uv.y)).r * RGB_SHIFT_INTENSITY;
    pixel.b += texture(u_texture, vec2(uv.x - shift, uv.y)).b * RGB_SHIFT_INTENSITY;
  }

  // Apply brightness
  pixel.rgb *= u_brightness;

  // Apply contrast and saturation in one pass
  float luminance = dot(pixel.rgb, LUMA);
  pixel.rgb = (pixel.rgb - 0.5) * u_contrast + 0.5;
  pixel.rgb = mix(vec3(luminance), pixel.rgb, u_saturation);

  // Calculate combined lighting mask (scanlines, flicker, vignette)
  float lightingMask = 1.0;

  // Calculate scanlines (skip if disabled)
  if (u_scanlineIntensity > 0.001) {
    float scanlineY = uv.y * u_scanlineCount;
    float scanlinePattern = abs(sin(scanlineY * PI));

    // Adaptive intensity
    float yPattern = sin(uv.y * 30.0) * 0.5 + 0.5;
    float adaptiveFactor = 1.0 - yPattern * u_adaptiveIntensity * 0.2;

    lightingMask *= 1.0 - scanlinePattern * u_scanlineIntensity * adaptiveFactor;
  }

  // Apply flicker effect
  if (u_flickerStrength > 0.001) {
    lightingMask *= 1.0 + sin(u_time * 110.0) * u_flickerStrength;
  }

  // Apply vignette (skip if disabled)
  if (u_vignetteStrength > 0.001) {
    lightingMask *= vignetteApprox(uv, u_vignetteStrength);
  }

  // Apply combined lighting effects
  pixel.rgb *= lightingMask;

  // --- RGB phosphor mask (our addition, not in gingerbeardman's shader) ---
  if (u_phosphor > 0.001) {
    float maskX = mod(gl_FragCoord.x, 3.0);
    vec3 mask = vec3(
      maskX < 1.0 ? 1.0 : 0.85,
      maskX >= 1.0 && maskX < 2.0 ? 1.0 : 0.85,
      maskX >= 2.0 ? 1.0 : 0.85
    );
    pixel.rgb *= mix(vec3(1.0), mask, u_phosphor);
  }

  fragColor = pixel;
}
`

// ---------- CrtShader class ----------

/** Options for configuring the CRT shader fallback behavior. */
export interface CrtShaderOptions {
  /** CSS class to add to the container when falling back to CSS-only mode. */
  fallbackCssClass?: string
  /** CSS custom property name for intensity. Default: '--crt-intensity'. */
  intensityProperty?: string
}

/**
 * WebGL2-based CRT post-processing shader overlay.
 *
 * Usage:
 * ```ts
 * const crt = new CrtShader(xtermCanvas, container)
 * crt.enable(0.7)    // start rendering with 70% intensity
 * crt.setIntensity(1) // crank it up
 * crt.disable()      // stop and remove overlay
 * crt.dispose()      // full cleanup
 * ```
 */
export class CrtShader {
  private readonly sourceCanvas: HTMLCanvasElement
  private readonly container: HTMLElement
  private readonly fallbackCssClass: string
  private readonly intensityProperty: string

  private glCanvas: HTMLCanvasElement | null = null
  private gl: WebGL2RenderingContext | null = null
  private program: WebGLProgram | null = null
  private texture: WebGLTexture | null = null
  private animFrameId = 0
  private config: CrtConfig = { ...CRT_DEFAULTS }
  private startTime = 0
  private enabled = false
  private usingFallback = false

  // Uniform locations (cached after link)
  private uTexture = -1
  private uTime = -1
  private uResolution = -1
  private uCurvature = -1
  private uScanlineIntensity = -1
  private uScanlineCount = -1
  private uAdaptiveIntensity = -1
  private uPhosphor = -1
  private uVignetteStrength = -1
  private uBloomIntensity = -1
  private uBloomThreshold = -1
  private uRgbShift = -1
  private uFlickerStrength = -1
  private uBrightness = -1
  private uContrast = -1
  private uSaturation = -1

  constructor(
    sourceCanvas: HTMLCanvasElement,
    container: HTMLElement,
    options?: CrtShaderOptions,
  ) {
    this.sourceCanvas = sourceCanvas
    this.container = container
    this.fallbackCssClass = options?.fallbackCssClass ?? ''
    this.intensityProperty = options?.intensityProperty ?? '--crt-intensity'
  }

  /** Whether the shader is currently active (WebGL or fallback). */
  isEnabled(): boolean {
    return this.enabled
  }

  /** Whether WebGL2 was unavailable and we fell back to CSS. */
  isFallback(): boolean {
    return this.usingFallback
  }

  /** Get the current CRT config (copy). */
  getConfig(): CrtConfig {
    return { ...this.config }
  }

  /**
   * Enable the CRT effect.
   * @param intensityOrConfig Optional intensity (0–1, scales all defaults) or partial config.
   */
  enable(intensityOrConfig?: number | Partial<CrtConfig>): void {
    if (this.enabled) {
      if (intensityOrConfig !== undefined) {
        if (typeof intensityOrConfig === 'number') this.setIntensity(intensityOrConfig)
        else this.setConfig(intensityOrConfig)
      }
      return
    }
    if (typeof intensityOrConfig === 'number') {
      this.applyIntensity(intensityOrConfig)
    } else if (intensityOrConfig) {
      this.config = { ...CRT_DEFAULTS, ...intensityOrConfig }
    } else {
      this.config = { ...CRT_DEFAULTS }
    }
    this.enabled = true

    if (!this.initWebGL()) {
      this.enableFallback()
      return
    }

    // Hide original canvas, show WebGL overlay
    this.sourceCanvas.style.visibility = 'hidden'
    this.startTime = performance.now()
    this.renderLoop()
  }

  /**
   * Disable the CRT effect and restore the original canvas.
   */
  disable(): void {
    if (!this.enabled) return
    this.enabled = false

    if (this.usingFallback) {
      this.disableFallback()
      return
    }

    this.stopLoop()
    this.sourceCanvas.style.visibility = ''
    this.removeOverlay()
  }

  /**
   * Update per-effect config values. Merges with current config.
   */
  setConfig(partial: Partial<CrtConfig>): void {
    const smoothingChanged = partial.smoothing !== undefined && partial.smoothing !== this.config.smoothing
    Object.assign(this.config, partial)
    if (smoothingChanged) this.applySmoothing()
    if (this.usingFallback) {
      this.container.style.setProperty(this.intensityProperty, String(this.computeFallbackIntensity()))
    }
  }

  /**
   * Update the intensity (0–1) — scales all defaults proportionally.
   */
  setIntensity(intensity: number): void {
    this.applyIntensity(Math.max(0, Math.min(1, intensity)))
    if (this.usingFallback) {
      this.container.style.setProperty(this.intensityProperty, String(this.computeFallbackIntensity()))
    }
  }

  /** Scale all CRT_DEFAULTS by a 0–1 factor and store as current config. */
  private applyIntensity(factor: number): void {
    const d = CRT_DEFAULTS
    this.config = {
      smoothing: d.smoothing,
      scanlineIntensity: d.scanlineIntensity * factor,
      scanlineCount: d.scanlineCount,
      adaptiveIntensity: d.adaptiveIntensity,
      brightness: 1 + (d.brightness - 1) * factor,
      contrast: 1 + (d.contrast - 1) * factor,
      saturation: 1 + (d.saturation - 1) * factor,
      bloomIntensity: d.bloomIntensity * factor,
      bloomThreshold: d.bloomThreshold,
      rgbShift: d.rgbShift * factor,
      vignetteStrength: d.vignetteStrength * factor,
      curvature: d.curvature * factor,
      flickerStrength: d.flickerStrength * factor,
      phosphor: d.phosphor * factor,
    }
  }

  /** Compute a single fallback intensity for CSS mode (average of normalized config). */
  private computeFallbackIntensity(): number {
    const d = CRT_DEFAULTS
    // Use scanlineIntensity as representative intensity for CSS fallback
    return d.scanlineIntensity > 0 ? this.config.scanlineIntensity / d.scanlineIntensity : 0.7
  }

  /**
   * Full cleanup — disable + release all WebGL resources.
   */
  dispose(): void {
    this.disable()
    this.destroyWebGL()
  }

  // ---------- WebGL init ----------

  private initWebGL(): boolean {
    const canvas = document.createElement('canvas')
    const gl = canvas.getContext('webgl2')
    if (!gl) return false

    this.glCanvas = canvas
    this.gl = gl

    // Position overlay on top of source canvas, matching its size
    canvas.style.position = 'absolute'
    canvas.style.pointerEvents = 'none'
    this.syncOverlayPosition()
    this.container.style.position = 'relative'
    this.container.appendChild(canvas)

    // Compile program
    const vs = this.compileShader(gl.VERTEX_SHADER, VERTEX_SHADER)
    const fs = this.compileShader(gl.FRAGMENT_SHADER, FRAGMENT_SHADER)
    if (!vs || !fs) { this.destroyWebGL(); return false }

    const prog = gl.createProgram()!
    gl.attachShader(prog, vs)
    gl.attachShader(prog, fs)
    gl.linkProgram(prog)
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      this.destroyWebGL()
      return false
    }
    this.program = prog

    // Cache uniform locations
    this.uTexture = gl.getUniformLocation(prog, 'u_texture') as number
    this.uTime = gl.getUniformLocation(prog, 'u_time') as number
    this.uResolution = gl.getUniformLocation(prog, 'u_resolution') as number
    this.uCurvature = gl.getUniformLocation(prog, 'u_curvature') as number
    this.uScanlineIntensity = gl.getUniformLocation(prog, 'u_scanlineIntensity') as number
    this.uScanlineCount = gl.getUniformLocation(prog, 'u_scanlineCount') as number
    this.uAdaptiveIntensity = gl.getUniformLocation(prog, 'u_adaptiveIntensity') as number
    this.uPhosphor = gl.getUniformLocation(prog, 'u_phosphor') as number
    this.uVignetteStrength = gl.getUniformLocation(prog, 'u_vignetteStrength') as number
    this.uBloomIntensity = gl.getUniformLocation(prog, 'u_bloomIntensity') as number
    this.uBloomThreshold = gl.getUniformLocation(prog, 'u_bloomThreshold') as number
    this.uRgbShift = gl.getUniformLocation(prog, 'u_rgbShift') as number
    this.uFlickerStrength = gl.getUniformLocation(prog, 'u_flickerStrength') as number
    this.uBrightness = gl.getUniformLocation(prog, 'u_brightness') as number
    this.uContrast = gl.getUniformLocation(prog, 'u_contrast') as number
    this.uSaturation = gl.getUniformLocation(prog, 'u_saturation') as number

    // Full-screen quad (2 triangles)
    const positions = new Float32Array([
      -1, -1,  0, 1,
       1, -1,  1, 1,
      -1,  1,  0, 0,
       1,  1,  1, 0,
    ])
    const buf = gl.createBuffer()!
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW)

    const aPos = gl.getAttribLocation(prog, 'a_position')
    const aTex = gl.getAttribLocation(prog, 'a_texCoord')
    gl.enableVertexAttribArray(aPos)
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 16, 0)
    gl.enableVertexAttribArray(aTex)
    gl.vertexAttribPointer(aTex, 2, gl.FLOAT, false, 16, 8)

    // Create texture
    this.texture = gl.createTexture()!
    gl.bindTexture(gl.TEXTURE_2D, this.texture)
    const filter = this.config.smoothing ? gl.LINEAR : gl.NEAREST
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

    return true
  }

  /** Update texture filtering to match the smoothing config. */
  private applySmoothing(): void {
    const gl = this.gl
    if (!gl || !this.texture) return
    const filter = this.config.smoothing ? gl.LINEAR : gl.NEAREST
    gl.bindTexture(gl.TEXTURE_2D, this.texture)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, filter)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, filter)
  }

  private compileShader(type: number, source: string): WebGLShader | null {
    const gl = this.gl!
    const shader = gl.createShader(type)!
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader)
      return null
    }
    return shader
  }

  /**
   * Sync the WebGL overlay position/size to match the source canvas's
   * bounding box within the container. Called each frame to handle resizes.
   */
  private syncOverlayPosition(): void {
    const canvas = this.glCanvas
    if (!canvas) return
    const srcRect = this.sourceCanvas.getBoundingClientRect()
    const containerRect = this.container.getBoundingClientRect()
    const top = srcRect.top - containerRect.top
    const left = srcRect.left - containerRect.left
    canvas.style.top = `${top}px`
    canvas.style.left = `${left}px`
    canvas.style.width = `${srcRect.width}px`
    canvas.style.height = `${srcRect.height}px`
  }

  // ---------- Render loop ----------

  private renderLoop = (): void => {
    if (!this.enabled || !this.gl || !this.glCanvas) return
    this.syncOverlayPosition()
    this.renderFrame()
    this.animFrameId = requestAnimationFrame(this.renderLoop)
  }

  private renderFrame(): void {
    const gl = this.gl!
    const canvas = this.glCanvas!
    const src = this.sourceCanvas

    // Match overlay resolution to source
    if (canvas.width !== src.width || canvas.height !== src.height) {
      canvas.width = src.width
      canvas.height = src.height
    }

    gl.viewport(0, 0, canvas.width, canvas.height)
    gl.useProgram(this.program)

    // Upload source canvas as texture
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.texture)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, src)

    // Set uniforms
    const loc = (v: number) => v as WebGLUniformLocation & number
    gl.uniform1i(loc(this.uTexture), 0)
    gl.uniform1f(loc(this.uTime), (performance.now() - this.startTime) / 1000)
    gl.uniform2f(loc(this.uResolution), canvas.width, canvas.height)
    gl.uniform1f(loc(this.uCurvature), this.config.curvature)
    gl.uniform1f(loc(this.uScanlineIntensity), this.config.scanlineIntensity)
    gl.uniform1f(loc(this.uScanlineCount), this.config.scanlineCount)
    gl.uniform1f(loc(this.uAdaptiveIntensity), this.config.adaptiveIntensity)
    gl.uniform1f(loc(this.uPhosphor), this.config.phosphor)
    gl.uniform1f(loc(this.uVignetteStrength), this.config.vignetteStrength)
    gl.uniform1f(loc(this.uBloomIntensity), this.config.bloomIntensity)
    gl.uniform1f(loc(this.uBloomThreshold), this.config.bloomThreshold)
    gl.uniform1f(loc(this.uRgbShift), this.config.rgbShift)
    gl.uniform1f(loc(this.uFlickerStrength), this.config.flickerStrength)
    gl.uniform1f(loc(this.uBrightness), this.config.brightness)
    gl.uniform1f(loc(this.uContrast), this.config.contrast)
    gl.uniform1f(loc(this.uSaturation), this.config.saturation)

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }

  private stopLoop(): void {
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId)
      this.animFrameId = 0
    }
  }

  // ---------- Cleanup ----------

  private removeOverlay(): void {
    if (this.glCanvas?.parentNode) {
      this.glCanvas.parentNode.removeChild(this.glCanvas)
    }
  }

  private destroyWebGL(): void {
    this.stopLoop()
    const gl = this.gl
    if (gl) {
      if (this.texture) gl.deleteTexture(this.texture)
      if (this.program) gl.deleteProgram(this.program)
      gl.getExtension('WEBGL_lose_context')?.loseContext()
    }
    this.removeOverlay()
    this.gl = null
    this.glCanvas = null
    this.program = null
    this.texture = null
  }

  // ---------- CSS fallback ----------

  private enableFallback(): void {
    this.usingFallback = true
    if (this.fallbackCssClass) {
      this.container.classList.add(this.fallbackCssClass)
    }
    this.container.style.setProperty(this.intensityProperty, String(this.computeFallbackIntensity()))
  }

  private disableFallback(): void {
    this.usingFallback = false
    if (this.fallbackCssClass) {
      this.container.classList.remove(this.fallbackCssClass)
    }
    this.container.style.removeProperty(this.intensityProperty)
  }
}
