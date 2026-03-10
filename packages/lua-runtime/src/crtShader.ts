/**
 * WebGL2 CRT post-processing shader overlay.
 *
 * Creates a WebGL2 canvas on top of a source canvas (e.g. xterm.js CanvasAddon)
 * and applies a CRT monitor effect via fragment shader. Effects include barrel
 * distortion, scanlines, RGB phosphor mask, vignette, bloom, chromatic aberration,
 * and subtle flicker — all scaled by an intensity uniform (0–1).
 *
 * Adapted from gingerbeardman/webgl-crt-shader (MIT license).
 * https://github.com/gingerbeardman/webgl-crt-shader
 */

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
uniform float u_intensity;
uniform vec2 u_resolution;

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
  float intensity = u_intensity;

  // Apply barrel distortion
  float distortionAmount = 0.12 * intensity;
  vec2 uv = barrelDistort(v_texCoord, distortionAmount);

  // Discard pixels outside [0,1] after distortion (black border)
  if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
    fragColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }

  // Base color with chromatic aberration
  float caAmount = 0.003 * intensity;
  vec3 color = chromaticAberration(uv, caAmount);

  // --- Scanlines ---
  float scanFreq = u_resolution.y;
  float scanline = sin(uv.y * scanFreq * 3.14159) * 0.5 + 0.5;
  // Mix toward darkened by intensity (0 = no scanlines, 1 = full)
  color *= mix(1.0, 0.7 + 0.3 * scanline, intensity * 0.6);

  // --- RGB phosphor mask ---
  float maskX = mod(gl_FragCoord.x, 3.0);
  vec3 mask = vec3(
    maskX < 1.0 ? 1.0 : 0.85,
    maskX >= 1.0 && maskX < 2.0 ? 1.0 : 0.85,
    maskX >= 2.0 ? 1.0 : 0.85
  );
  color *= mix(vec3(1.0), mask, intensity * 0.35);

  // --- Bloom / glow ---
  // Simple threshold-based bloom: average nearby samples for bright areas
  vec3 bloom = vec3(0.0);
  float texelW = 1.0 / u_resolution.x;
  float texelH = 1.0 / u_resolution.y;
  for (int x = -1; x <= 1; x++) {
    for (int y = -1; y <= 1; y++) {
      vec3 s = texture(u_texture, uv + vec2(float(x) * texelW * 1.5, float(y) * texelH * 1.5)).rgb;
      float brightness = dot(s, vec3(0.299, 0.587, 0.114));
      bloom += s * smoothstep(0.5, 1.0, brightness);
    }
  }
  bloom /= 9.0;
  color += bloom * intensity * 0.3;

  // --- Vignette ---
  vec2 vigUv = uv * (1.0 - uv);
  float vig = vigUv.x * vigUv.y * 15.0;
  vig = pow(vig, 0.25 * intensity);
  color *= vig;

  // --- Flicker ---
  float flicker = 1.0 - intensity * 0.015 * sin(u_time * 8.0);
  color *= flicker;

  // --- Brightness boost to compensate for darkening effects ---
  color *= 1.0 + intensity * 0.15;

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
  private intensity = 0.7
  private startTime = 0
  private enabled = false
  private usingFallback = false

  // Uniform locations (cached after link)
  private uTexture = -1
  private uTime = -1
  private uIntensity = -1
  private uResolution = -1

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

  /**
   * Enable the CRT effect.
   * @param intensity 0–1 scale factor for all effects. Default 0.7.
   */
  enable(intensity?: number): void {
    if (this.enabled) {
      if (intensity !== undefined) this.setIntensity(intensity)
      return
    }
    this.intensity = intensity ?? 0.7
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
   * Update the intensity (0–1) while the effect is active.
   */
  setIntensity(intensity: number): void {
    this.intensity = Math.max(0, Math.min(1, intensity))
    if (this.usingFallback) {
      this.container.style.setProperty(this.intensityProperty, String(this.intensity))
    }
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

    // Position overlay exactly on top of source
    canvas.style.position = 'absolute'
    canvas.style.top = '0'
    canvas.style.left = '0'
    canvas.style.width = '100%'
    canvas.style.height = '100%'
    canvas.style.pointerEvents = 'none'
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
    this.uIntensity = gl.getUniformLocation(prog, 'u_intensity') as number
    this.uResolution = gl.getUniformLocation(prog, 'u_resolution') as number

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

  // ---------- Render loop ----------

  private renderLoop = (): void => {
    if (!this.enabled || !this.gl || !this.glCanvas) return
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
    gl.uniform1i(this.uTexture as WebGLUniformLocation & number, 0)
    gl.uniform1f(this.uTime as WebGLUniformLocation & number, (performance.now() - this.startTime) / 1000)
    gl.uniform1f(this.uIntensity as WebGLUniformLocation & number, this.intensity)
    gl.uniform2f(this.uResolution as WebGLUniformLocation & number, canvas.width, canvas.height)

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
    this.container.style.setProperty(this.intensityProperty, String(this.intensity))
  }

  private disableFallback(): void {
    this.usingFallback = false
    if (this.fallbackCssClass) {
      this.container.classList.remove(this.fallbackCssClass)
    }
    this.container.style.removeProperty(this.intensityProperty)
  }
}
