import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Points,
  ShaderMaterial,
  Vector2
} from 'three'
import type { GlyphField } from './type'

const VERTEX = `
attribute float aSeed;
uniform float uTime;
uniform float uSettle;
uniform float uPointSize;
uniform vec2 uResolution;
varying float vSeed;

void main() {
  vSeed = aSeed;
  vec2 target = position.xy;
  float phase = aSeed * 6.2831853;
  vec2 wander = vec2(sin(uTime * 0.55 + phase), cos(uTime * 0.47 + phase * 1.7));
  wander *= 3.0 + aSeed * 9.0;
  vec2 origin = vec2(
    uResolution.x * (0.5 + (fract(aSeed * 13.31) - 0.5) * 1.6),
    uResolution.y * (0.5 + (fract(aSeed * 7.77) - 0.5) * 1.8)
  );
  float settle = clamp(uSettle * 1.4 - aSeed * 0.4, 0.0, 1.0);
  vec2 pos = mix(origin, target + wander, settle);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 0.0, 1.0);
  gl_PointSize = uPointSize * (0.55 + fract(aSeed * 3.71) * 1.05);
}
`

const FRAGMENT = `
precision mediump float;
varying float vSeed;

void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float d = length(uv);
  if (d > 0.5) discard;
  float glow = smoothstep(0.5, 0.0, d);
  vec3 cyan = vec3(0.35, 0.92, 1.0);
  vec3 amber = vec3(1.0, 0.72, 0.35);
  vec3 color = mix(cyan, amber, fract(vSeed * 5.17));
  gl_FragColor = vec4(color, glow * glow * 0.85);
}
`

export interface FlowHandle {
  points: Points
  setTime(seconds: number): void
  setSettle(value: number): void
  resize(width: number, height: number): void
  dispose(): void
}

export function createFlow(field: GlyphField, pointSize: number): FlowHandle {
  const geometry = new BufferGeometry()
  const positions = new Float32Array(field.count * 3)
  const seeds = new Float32Array(field.count)
  for (let i = 0; i < field.count; i++) {
    positions[i * 3] = field.points[i * 2] ?? 0
    positions[i * 3 + 1] = field.points[i * 2 + 1] ?? 0
    positions[i * 3 + 2] = 0
    seeds[i] = Math.random()
  }
  geometry.setAttribute('position', new BufferAttribute(positions, 3))
  geometry.setAttribute('aSeed', new BufferAttribute(seeds, 1))

  const material = new ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uSettle: { value: 0 },
      uPointSize: { value: pointSize },
      uResolution: { value: new Vector2(field.width, field.height) }
    }
  })

  const points = new Points(geometry, material)
  points.frustumCulled = false

  return {
    points,
    setTime(seconds) {
      material.uniforms['uTime']!.value = seconds
    },
    setSettle(value) {
      material.uniforms['uSettle']!.value = value
    },
    resize(width, height) {
      ;(material.uniforms['uResolution']!.value as Vector2).set(width, height)
    },
    dispose() {
      geometry.dispose()
      material.dispose()
    }
  }
}
