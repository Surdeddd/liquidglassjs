import { resolveBandPx } from '../displacement'
import { globalLightDir } from '../light'
import type { MaterialParams } from '../types'

export interface GlRect {
  x: number
  y: number
  width: number
  height: number
}

export interface GlShape {
  rect: GlRect
  radius: number
}

export interface GlDraw {
  quad: GlRect
  shapes: GlShape[]
  material: MaterialParams
  mergeK: number
}

export const MAX_SHAPES = 8

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
uniform vec4 u_shapes[8];
uniform float u_shapeRadii[8];
uniform int u_shapeCount;
uniform int u_shapeMode;
uniform float u_mergeK;
uniform float u_bevelWidth;
uniform float u_ior;
uniform float u_magnify;
uniform float u_thickness;
uniform vec2 u_center;
uniform vec2 u_lightDir;
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
  float rr = min(r, min(halfSize.x, halfSize.y));
  vec2 q = abs(p) - halfSize + rr;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - rr;
}

float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

float sdSquircle(vec2 p, vec2 halfSize) {
  vec2 h = max(halfSize, vec2(0.001));
  vec2 q = abs(p) / h;
  float v = pow(pow(q.x, 4.0) + pow(q.y, 4.0), 0.25);
  return (v - 1.0) * min(h.x, h.y);
}

float shapeSdf(int i, vec2 px) {
  vec4 s = u_shapes[i];
  vec2 p = px - s.xy - s.zw * 0.5;
  if (u_shapeMode == 1) return sdSquircle(p, s.zw * 0.5);
  return sdBox(p, s.zw * 0.5, u_shapeRadii[i]);
}

float sceneSdf(vec2 px) {
  float d = shapeSdf(0, px);
  for (int i = 1; i < 8; i++) {
    if (i >= u_shapeCount) break;
    d = smin(d, shapeSdf(i, px), max(u_mergeK, 0.001));
  }
  return d;
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

float lensMag(float depth, float band, float ior, float thickness) {
  if (depth < 0.0 || depth >= band || ior <= 1.0) return 0.0;
  float t = depth / band;
  float u = 1.0 - t;
  float slope = (thickness / band) * u * u * u * pow(max(1.0 - u * u * u * u, 1e-4), -0.75);
  float alpha = atan(slope);
  float beta = asin(clamp(sin(alpha) / ior, -1.0, 1.0));
  return min(thickness * tan(alpha - beta), band * 0.9);
}

void main() {
  vec2 basePx = u_lensRect.xy + v_local * u_lensRect.zw;
  float d = sceneSdf(basePx);
  float coverage = clamp(0.5 - d / 1.5, 0.0, 1.0);
  if (coverage <= 0.0) { outColor = vec4(0.0); discard; }

  float depth = -d;
  float eps = 1.0;
  vec2 grad = vec2(
    sceneSdf(basePx + vec2(eps, 0.0)) - sceneSdf(basePx - vec2(eps, 0.0)),
    sceneSdf(basePx + vec2(0.0, eps)) - sceneSdf(basePx - vec2(0.0, eps))
  );
  float gradLen = max(length(grad), 1e-5);
  grad /= gradLen;

  float mag = lensMag(depth, max(u_bevelWidth, 1e-3), u_ior, u_thickness) * u_displace;
  vec2 zoom = (basePx - u_center) * -u_magnify;

  vec3 col;
  if (u_dispersion > 0.001) {
    col = vec3(
      blurredBg(basePx + grad * mag * (1.0 + u_dispersion * 0.6) + zoom, u_blur).r,
      blurredBg(basePx + grad * mag + zoom, u_blur).g,
      blurredBg(basePx + grad * mag * (1.0 - u_dispersion * 0.6) + zoom, u_blur).b
    );
  } else {
    col = blurredBg(basePx + grad * mag + zoom, u_blur);
  }

  float grey = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(grey), col, u_saturation) * u_brightness;
  col = mix(col, u_tint.rgb, u_tint.a);

  if (u_frost > 0.001) {
    col += (hash(basePx) - 0.5) * u_frost * 0.12;
  }

  float rim = smoothstep(3.0, 0.0, depth);
  float facing = clamp(dot(grad, normalize(u_lightDir)), -1.0, 1.0);
  float sheen = pow(max(facing, 0.0), 2.0);
  float counterSheen = pow(max(-facing, 0.0), 2.0);
  col += rim * (0.25 + sheen) * u_specular * 0.5;
  col -= rim * counterSheen * u_specular * 0.22;

  float fresnel = smoothstep(u_bevelWidth, 0.0, depth) * 0.08 * u_specular;
  col += fresnel;

  outColor = vec4(col, coverage);
}`

export const FRAGMENT_SRC = FRAG

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
  'u_shapes',
  'u_shapeRadii',
  'u_shapeCount',
  'u_shapeMode',
  'u_mergeK',
  'u_bevelWidth',
  'u_ior',
  'u_magnify',
  'u_thickness',
  'u_center',
  'u_lightDir',
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

export function unionRect(rects: GlRect[], margin = 0): GlRect {
  let left = Infinity
  let top = Infinity
  let right = -Infinity
  let bottom = -Infinity
  for (const rect of rects) {
    left = Math.min(left, rect.x)
    top = Math.min(top, rect.y)
    right = Math.max(right, rect.x + rect.width)
    bottom = Math.max(bottom, rect.y + rect.height)
  }
  if (!Number.isFinite(left)) return { x: 0, y: 0, width: 0, height: 0 }
  return {
    x: left - margin,
    y: top - margin,
    width: right - left + margin * 2,
    height: bottom - top + margin * 2
  }
}

export class GlRenderer {
  #gl: WebGL2RenderingContext
  #program: WebGLProgram
  #locations: Map<UniformName, WebGLUniformLocation | null>
  #texture: WebGLTexture | null = null
  #width = 0
  #height = 0
  #shapeData = new Float32Array(MAX_SHAPES * 4)
  #radiusData = new Float32Array(MAX_SHAPES)

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

  render(draws: GlDraw[], texRect: GlRect): void {
    const gl = this.#gl
    if (!this.#texture || this.#width === 0) return
    gl.useProgram(this.#program)
    gl.clearColor(0, 0, 0, 0)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.uniform1i(this.#locations.get('u_tex') ?? null, 0)
    gl.uniform2f(this.#locations.get('u_canvasSize') ?? null, this.#width, this.#height)
    gl.uniform4f(
      this.#locations.get('u_texRect') ?? null,
      texRect.x,
      texRect.y,
      texRect.width,
      texRect.height
    )
    for (const draw of draws) {
      const { material, quad } = draw
      const shapes = draw.shapes.slice(0, MAX_SHAPES)
      if (shapes.length === 0) continue
      this.#shapeData.fill(0)
      this.#radiusData.fill(0)
      shapes.forEach((shape, i) => {
        this.#shapeData[i * 4] = shape.rect.x
        this.#shapeData[i * 4 + 1] = shape.rect.y
        this.#shapeData[i * 4 + 2] = shape.rect.width
        this.#shapeData[i * 4 + 3] = shape.rect.height
        this.#radiusData[i] = shape.radius
      })
      const tint = parseTint(material.tint)
      gl.uniform4f(this.#locations.get('u_lensRect') ?? null, quad.x, quad.y, quad.width, quad.height)
      gl.uniform4fv(this.#locations.get('u_shapes') ?? null, this.#shapeData)
      gl.uniform1fv(this.#locations.get('u_shapeRadii') ?? null, this.#radiusData)
      gl.uniform1i(this.#locations.get('u_shapeCount') ?? null, shapes.length)
      gl.uniform1i(this.#locations.get('u_shapeMode') ?? null, material.shape === 'squircle' ? 1 : 0)
      gl.uniform1f(this.#locations.get('u_mergeK') ?? null, draw.mergeK)
      gl.uniform1f(
        this.#locations.get('u_bevelWidth') ?? null,
        resolveBandPx(material.bevelWidth, shapes[0]?.radius ?? 0, quad.width, quad.height)
      )
      gl.uniform1f(this.#locations.get('u_ior') ?? null, material.ior)
      gl.uniform1f(this.#locations.get('u_magnify') ?? null, material.magnify)
      gl.uniform1f(this.#locations.get('u_thickness') ?? null, material.thickness)
      gl.uniform2f(
        this.#locations.get('u_center') ?? null,
        quad.x + quad.width / 2,
        quad.y + quad.height / 2
      )
      const light = globalLightDir()
      gl.uniform2f(this.#locations.get('u_lightDir') ?? null, light[0], light[1])
      gl.uniform1f(this.#locations.get('u_displace') ?? null, material.refraction * 2)
      gl.uniform1f(this.#locations.get('u_blur') ?? null, material.blur)
      gl.uniform1f(this.#locations.get('u_dispersion') ?? null, material.dispersion)
      gl.uniform1f(this.#locations.get('u_saturation') ?? null, material.saturation)
      gl.uniform1f(this.#locations.get('u_brightness') ?? null, material.brightness)
      gl.uniform4f(this.#locations.get('u_tint') ?? null, tint[0], tint[1], tint[2], material.tintOpacity)
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
