/**
 * WebGL2 CRT post-processing shader overlay.
 *
 * Creates a WebGL2 canvas on top of a source canvas (e.g. xterm.js CanvasAddon)
 * and applies a CRT monitor effect via fragment shader. Effects include barrel
 * distortion, scanlines, RGB phosphor mask, vignette, bloom, chromatic aberration,
 * and subtle flicker — each controlled by its own uniform.
 *
 * Adapted from gingerbeardman/webgl-crt-shader (MIT license).
 * https://github.com/gingerbeardman/webgl-crt-shader
 */

/** Per-effect CRT configuration. Each value directly controls one shader effect. */
export interface CrtConfig {
  /** Barrel distortion amount (0–0.5, default 0.15) */
  curvature: number
  /** Scanline darkness (0–1, default 0.15) */
  scanlines: number
  /** RGB phosphor mask strength (0–1, default 0.5) */
  phosphor: number
  /** Edge darkening (0–1, default 0.3) */
  vignette: number
  /** Bright pixel glow (0–1, default 0.2) */
  bloom: number
  /** Chromatic aberration / color fringing (0–1, default 0.0) */
  chromatic: number
  /** Temporal flicker (0–0.15, default 0.01) */
  flicker: number
  /** Brightness multiplier (0.6–1.8, default 1.1) */
  brightness: number
}

/** Default CRT config values matching the gingerbeardman/webgl-crt-shader defaults. */
export const CRT_DEFAULTS: Readonly<CrtConfig> = {
  curvature: 0.15,
  scanlines: 0.15,
  phosphor: 0.5,
  vignette: 0.3,
  bloom: 0.2,
  chromatic: 0.0,
  flicker: 0.01,
  brightness: 1.1,
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

const FRAGMENT_SHADER = `#version 300 es
precision mediump float;

in vec2 v_texCoord;
out vec4 fragColor;

uniform sampler2D u_texture;
uniform float u_time;
uniform vec2 u_resolution;

// Per-effect uniforms
uniform float u_curvature;
uniform float u_scanlines;
uniform float u_phosphor;
uniform float u_vignette;
uniform float u_bloom;
uniform float u_chromatic;
uniform float u_flicker;
uniform float u_brightness;

// --- Barrel distortion ---
vec2 barrelDistort(vec2 uv, float amt) {
  vec2 cc = uv - 0.5;
  float dist = dot(cc, cc);
  return uv + cc * dist * amt;
}

// --- Chromatic aberration ---
vec3 chromaticAberration(vec2 uv, float amount) {
  vec2 dir = uv - 0.5;
  float r = texture(u_texture, uv + dir * amount).r;
  float g = texture(u_texture, uv).g;
  float b = texture(u_texture, uv - dir * amount).b;
  return vec3(r, g, b);
}

void main() {
  // Apply barrel distortion
  vec2 uv = barrelDistort(v_texCoord, u_curvature);

  // Discard pixels outside [0,1] after distortion (black border)
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    fragColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }

  // Base color with chromatic aberration
  float caAmount = u_chromatic * 0.003;
  vec3 color = chromaticAberration(uv, caAmount);

  // --- Scanlines ---
  float scanFreq = u_resolution.y;
  float scanline = sin(uv.y * scanFreq * 3.14159) * 0.5 + 0.5;
  color *= mix(1.0, 0.7 + 0.3 * scanline, u_scanlines);

  // --- RGB phosphor mask ---
  float maskX = mod(gl_FragCoord.x, 3.0);
  vec3 mask = vec3(
    maskX < 1.0 ? 1.0 : 0.85,
    maskX >= 1.0 && maskX < 2.0 ? 1.0 : 0.85,
    maskX >= 2.0 ? 1.0 : 0.85
  );
  color *= mix(vec3(1.0), mask, u_phosphor);

  // --- Bloom / glow ---
  vec3 bloom = vec3(0.0);
  float texelW = 1.0 / u_resolution.x;
  float texelH = 1.0 / u_resolution.y;
  for (int x = -1; x <= 1; x++) {
    for (int y = -1; y <= 1; y++) {
      vec3 s = texture(u_texture, uv + vec2(float(x) * texelW * 1.5, float(y) * texelH * 1.5)).rgb;
      float luma = dot(s, vec3(0.299, 0.587, 0.114));
      bloom += s * smoothstep(0.5, 1.0, luma);
    }
  }
  bloom /= 9.0;
  color += bloom * u_bloom;

  // --- Vignette ---
  vec2 vigUv = uv * (1.0 - uv);
  float vig = vigUv.x * vigUv.y * 15.0;
  vig = pow(vig, u_vignette);
  color *= vig;

  // --- Flicker ---
  float flicker = 1.0 - u_flicker * sin(u_time * 8.0);
  color *= flicker;

  // --- Brightness ---
  color *= u_brightness;

  fragColor = vec4(color, 1.0);
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
  private uScanlines = -1
  private uPhosphor = -1
  private uVignette = -1
  private uBloom = -1
  private uChromatic = -1
  private uFlicker = -1
  private uBrightness = -1

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
    Object.assign(this.config, partial)
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
      curvature: d.curvature * factor,
      scanlines: d.scanlines * factor,
      phosphor: d.phosphor * factor,
      vignette: d.vignette * factor,
      bloom: d.bloom * factor,
      chromatic: d.chromatic * factor,
      flicker: d.flicker * factor,
      brightness: 1 + (d.brightness - 1) * factor,
    }
  }

  /** Compute a single fallback intensity for CSS mode (average of normalized config). */
  private computeFallbackIntensity(): number {
    const d = CRT_DEFAULTS
    // Use scanlines as representative intensity for CSS fallback
    return d.scanlines > 0 ? this.config.scanlines / d.scanlines : 0.7
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
    this.uScanlines = gl.getUniformLocation(prog, 'u_scanlines') as number
    this.uPhosphor = gl.getUniformLocation(prog, 'u_phosphor') as number
    this.uVignette = gl.getUniformLocation(prog, 'u_vignette') as number
    this.uBloom = gl.getUniformLocation(prog, 'u_bloom') as number
    this.uChromatic = gl.getUniformLocation(prog, 'u_chromatic') as number
    this.uFlicker = gl.getUniformLocation(prog, 'u_flicker') as number
    this.uBrightness = gl.getUniformLocation(prog, 'u_brightness') as number

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
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)

    return true
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
    gl.uniform1f(loc(this.uScanlines), this.config.scanlines)
    gl.uniform1f(loc(this.uPhosphor), this.config.phosphor)
    gl.uniform1f(loc(this.uVignette), this.config.vignette)
    gl.uniform1f(loc(this.uBloom), this.config.bloom)
    gl.uniform1f(loc(this.uChromatic), this.config.chromatic)
    gl.uniform1f(loc(this.uFlicker), this.config.flicker)
    gl.uniform1f(loc(this.uBrightness), this.config.brightness)

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
