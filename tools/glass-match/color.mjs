const LINEAR = Float64Array.from({ length: 256 }, (_, value) => {
  const c = value / 255
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
})

const WHITE = [0.95047, 1, 1.08883]

function labF(t) {
  return t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116
}

export function srgbToLab(r, g, b) {
  const lr = LINEAR[r]
  const lg = LINEAR[g]
  const lb = LINEAR[b]
  const x = (0.4124564 * lr + 0.3575761 * lg + 0.1804375 * lb) / WHITE[0]
  const y = (0.2126729 * lr + 0.7151522 * lg + 0.072175 * lb) / WHITE[1]
  const z = (0.0193339 * lr + 0.119192 * lg + 0.9503041 * lb) / WHITE[2]
  const fx = labF(x)
  const fy = labF(y)
  const fz = labF(z)
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)]
}

export function relativeLuminance(r, g, b) {
  return 0.2126729 * LINEAR[r] + 0.7151522 * LINEAR[g] + 0.072175 * LINEAR[b]
}

const RAD = Math.PI / 180

export function deltaE2000([l1, a1, b1], [l2, a2, b2]) {
  const c1 = Math.hypot(a1, b1)
  const c2 = Math.hypot(a2, b2)
  const cMean = (c1 + c2) / 2
  const g = 0.5 * (1 - Math.sqrt(cMean ** 7 / (cMean ** 7 + 25 ** 7)))
  const a1p = (1 + g) * a1
  const a2p = (1 + g) * a2
  const c1p = Math.hypot(a1p, b1)
  const c2p = Math.hypot(a2p, b2)
  const h1p = c1p === 0 ? 0 : (Math.atan2(b1, a1p) / RAD + 360) % 360
  const h2p = c2p === 0 ? 0 : (Math.atan2(b2, a2p) / RAD + 360) % 360
  const dLp = l2 - l1
  const dCp = c2p - c1p
  let dhp = 0
  if (c1p * c2p !== 0) {
    dhp = h2p - h1p
    if (dhp > 180) dhp -= 360
    else if (dhp < -180) dhp += 360
  }
  const dHp = 2 * Math.sqrt(c1p * c2p) * Math.sin((dhp / 2) * RAD)
  const lMean = (l1 + l2) / 2
  const cpMean = (c1p + c2p) / 2
  let hpMean = h1p + h2p
  if (c1p * c2p !== 0) {
    hpMean = Math.abs(h1p - h2p) > 180 ? (h1p + h2p + (h1p + h2p < 360 ? 360 : -360)) / 2 : (h1p + h2p) / 2
  }
  const t = 1 - 0.17 * Math.cos((hpMean - 30) * RAD) + 0.24 * Math.cos(2 * hpMean * RAD) +
    0.32 * Math.cos((3 * hpMean + 6) * RAD) - 0.2 * Math.cos((4 * hpMean - 63) * RAD)
  const dTheta = 30 * Math.exp(-(((hpMean - 275) / 25) ** 2))
  const rc = 2 * Math.sqrt(cpMean ** 7 / (cpMean ** 7 + 25 ** 7))
  const sl = 1 + (0.015 * (lMean - 50) ** 2) / Math.sqrt(20 + (lMean - 50) ** 2)
  const sc = 1 + 0.045 * cpMean
  const sh = 1 + 0.015 * cpMean * t
  const rt = -Math.sin(2 * dTheta * RAD) * rc
  return Math.sqrt((dLp / sl) ** 2 + (dCp / sc) ** 2 + (dHp / sh) ** 2 + rt * (dCp / sc) * (dHp / sh))
}
