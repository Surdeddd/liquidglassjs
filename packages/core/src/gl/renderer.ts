import type { MaterialParams } from '../types'

export interface GlLens {
  rect: { x: number; y: number; width: number; height: number }
  material: MaterialParams
  radius: number
}

export interface GlTexRect {
  x: number
  y: number
  width: number
  height: number
}

const VERT = `#version 300 es
layout(location=0) in vec2 a_pos;
uniform vec4 u_lensRect;
uniform vec2 u_canvasSize;
out vec2 v_local;
void main() {
  v_local = a_pos;
  vec2 px = u_lensRect.xy + a_pos * u_lensRect.zw;
  vec2 clip = (px / u_canvasSize) * 2.0 - 1.0;
  gl_Position = vec4(clip.x, -clip.y, 0.0, 1.0);
}`

const FRAG = `#version 300 es
precision highp float;
uniform sampler2D u_tex;
uniform vec4 u_lensRect;
uniform vec4 u_texRect;
uniform float u_radius;
uniform float u_bevelWidth;
uniform float u_bevelDepth;
uniform float u_displace;
uniform float u_blur;
uniform float u_dispersion;
uniform float u_saturation;
uniform float u_brightness;
uniform vec4 u_tint;
uniform float u_specular;
uniform float u_frost;
in vec2 v_local;
out vec4 outColor;

float sdBox(vec2 p, vec2 halfSize, float r) {
  vec2 q = abs(p) - halfSize + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

vec3 sampleBg(vec2 px) {
  vec2 uv = (px - u_texRect.xy) / u_texRect.zw;
  return texture(u_tex, clamp(uv, 0.001, 0.999)).rgb;
}

vec3 blurredBg(vec2 px, float radius) {
  if (radius < 0.5) return sampleBg(px);
  vec2 taps[8] = vec2[8](
    vec2(0.7071, 0.7071), vec2(-0.7071, 0.7071),
    vec2(0.7071, -0.7071), vec2(-0.7071, -0.7071),
    vec2(1.0, 0.0), vec2(-1.0, 0.0),
    vec2(0.0, 1.0), vec2(0.0, -1.0)
  );
  vec3 acc = sampleBg(px) * 2.0;
  for (int i = 0; i < 8; i++) {
    acc += sampleBg(px + taps[i] * radius);
    acc += sampleBg(px + taps[i] * radius * 0.45);
  }
  return acc / 18.0;
}

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
  vec2 sizePx = u_lensRect.zw;
  vec2 p = (v_local - 0.5) * sizePx;
  float d = sdBox(p, sizePx * 0.5, u_radius);
  float coverage = clamp(0.5 - d / 1.5, 0.0, 1.0);
  if (coverage <= 0.0) { outColor = vec4(0.0); discard; }

  float depth = -d;
  float eps = 1.0;
  vec2 grad = vec2(
    sdBox(p + vec2(eps, 0.0), sizePx * 0.5, u_radius) - sdBox(p - vec2(eps, 0.0), sizePx * 0.5, u_radius),
    sdBox(p + vec2(0.0, eps), sizePx * 0.5, u_radius) - sdBox(p - vec2(0.0, eps), sizePx * 0.5, u_radius)
  );
  float gradLen = max(length(grad), 1e-5);
  grad /= gradLen;

  float t = clamp(depth / max(u_bevelWidth, 1e-3), 0.0, 1.0);
  float mag = pow(1.0 - t, 1.0 + u_bevelDepth * 2.0) * u_displace;

  vec2 base = u_lensRect.xy + v_local * sizePx;
  vec3 col;
  if (u_dispersion > 0.001) {
    col = vec3(
      blurredBg(base + grad * mag * (1.0 + u_dispersion * 0.6), u_blur).r,
      blurredBg(base + grad * mag, u_blur).g,
      blurredBg(base + grad * mag * (1.0 - u_dispersion * 0.6), u_blur).b
    );
  } else {
    col = blurredBg(base + grad * mag, u_blur);
  }

  float grey = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(grey), col, u_saturation) * u_brightness;
  col = mix(col, u_tint.rgb, u_tint.a);

  if (u_frost > 0.001) {
    col += (hash(v_local * sizePx) - 0.5) * u_frost * 0.12;
  }

  float rim = smoothstep(3.0, 0.0, depth);
  float topLight = 0.55 + 0.45 * clamp(-grad.y, 0.0, 1.0);
  col += rim * topLight * u_specular * 0.55;

  float fresnel = smoothstep(u_bevelWidth, 0.0, depth) * 0.08 * u_specular;
  col += fresnel;

  outColor = vec4(col, coverage);
}`

function compile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader | null {
  const shader = gl.createShader(type)
  if (!shader) return null
  gl.shaderSource(shader, source)
  gl.compileShader(shader)
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader)
    return null
  }
  return shader
}

const UNIFORMS = [
  'u_tex',
  'u_lensRect',
  'u_texRect',
  'u_canvasSize',
  'u_radius',
  'u_bevelWidth',
  'u_bevelDepth',
  'u_displace',
  'u_blur',
  'u_dispersion',
  'u_saturation',
  'u_brightness',
  'u_tint',
  'u_specular',
  'u_frost'
] as const

type UniformName = (typeof UNIFORMS)[number]

export class GlRenderer {
  #gl: WebGL2RenderingContext
  #program: WebGLProgram
  #locations: Map<UniformName, WebGLUniformLocation | null>
  #texture: WebGLTexture | null = null
  #width = 0
  #height = 0

  private constructor(
    gl: WebGL2RenderingContext,
    program: WebGLProgram,
    locations: Map<UniformName, WebGLUniformLocation | null>
  ) {
    this.#gl = gl
    this.#program = program
    this.#locations = locations
  }

  static create(canvas: HTMLCanvasElement): GlRenderer | null {
    let gl: WebGL2RenderingContext | null
    try {
      gl = canvas.getContext('webgl2', { alpha: true, premultipliedAlpha: false })
    } catch {
      return null
    }
    if (!gl) return null
    const vert = compile(gl, gl.VERTEX_SHADER, VERT)
    const frag = compile(gl, gl.FRAGMENT_SHADER, FRAG)
    if (!vert || !frag) return null
    const program = gl.createProgram()
    if (!program) return null
    gl.attachShader(program, vert)
    gl.attachShader(program, frag)
    gl.linkProgram(program)
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null
    const buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([0, 0, 1, 0, 0, 1, 1, 1]), gl.STATIC_DRAW)
    gl.enableVertexAttribArray(0)
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0)
    const locations = new Map<UniformName, WebGLUniformLocation | null>()
    gl.useProgram(program)
    for (const name of UNIFORMS) {
      locations.set(name, gl.getUniformLocation(program, name))
    }
    gl.enable(gl.BLEND)
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA)
    return new GlRenderer(gl, program, locations)
  }

  setTexture(source: TexImageSource): void {
    const gl = this.#gl
    if (!this.#texture) this.#texture = gl.createTexture()
    gl.activeTexture(gl.TEXTURE0)
    gl.bindTexture(gl.TEXTURE_2D, this.#texture)
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false)
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  }

  get hasTexture(): boolean {
    return this.#texture !== null
  }

  resize(width: number, height: number): void {
    if (width === this.#width && height === this.#height) return
    this.#width = width
    this.#height = height
    this.#gl.canvas.width = width
    this.#gl.canvas.height = height
    this.#gl.viewport(0, 0, width, height)
  }

  render(lenses: GlLens[], texRect: GlTexRect): void {
    const gl = this.#gl
    if (!this.#texture || this.#width === 0) return
    gl.useProgram(this.#program)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.uniform1i(this.#locations.get('u_tex') ?? null, 0)
    gl.uniform2f(this.#locations.get('u_canvasSize') ?? null, this.#width, this.#height)
    gl.uniform4f(this.#locations.get('u_texRect') ?? null, texRect.x, texRect.y, texRect.width, texRect.height)
    for (const lens of lenses) {
      const { material, rect } = lens
      const tintAlpha = material.tintOpacity
      const tint = parseTint(material.tint)
      gl.uniform4f(this.#locations.get('u_lensRect') ?? null, rect.x, rect.y, rect.width, rect.height)
      gl.uniform1f(this.#locations.get('u_radius') ?? null, lens.radius)
      gl.uniform1f(this.#locations.get('u_bevelWidth') ?? null, material.bevelWidth)
      gl.uniform1f(this.#locations.get('u_bevelDepth') ?? null, material.bevelDepth)
      gl.uniform1f(
        this.#locations.get('u_displace') ?? null,
        material.refraction * material.thickness * 2
      )
      gl.uniform1f(this.#locations.get('u_blur') ?? null, material.blur)
      gl.uniform1f(this.#locations.get('u_dispersion') ?? null, material.dispersion)
      gl.uniform1f(this.#locations.get('u_saturation') ?? null, material.saturation)
      gl.uniform1f(this.#locations.get('u_brightness') ?? null, material.brightness)
      gl.uniform4f(this.#locations.get('u_tint') ?? null, tint[0], tint[1], tint[2], tintAlpha)
      gl.uniform1f(this.#locations.get('u_specular') ?? null, material.specular)
      gl.uniform1f(this.#locations.get('u_frost') ?? null, material.frost)
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
    }
  }

  destroy(): void {
    const gl = this.#gl
    if (this.#texture) gl.deleteTexture(this.#texture)
    gl.deleteProgram(this.#program)
    gl.getExtension('WEBGL_lose_context')?.loseContext()
  }
}

export function parseTint(color: string): [number, number, number] {
  const match = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim())
  if (!match || !match[1]) return [1, 1, 1]
  const hex = match[1]
  const size = hex.length === 3 ? 1 : 2
  const channel = (index: number): number => {
    const part = hex.slice(index * size, index * size + size)
    return parseInt(size === 1 ? part + part : part, 16) / 255
  }
  return [channel(0), channel(1), channel(2)]
}
