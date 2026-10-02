import { deflateSync, inflateSync } from 'node:zlib'

const SIGNATURE = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
  return c >>> 0
})

function crc32(buffer) {
  let c = 0xffffffff
  for (const byte of buffer) c = CRC_TABLE[(c ^ byte) & 0xff] ^ (c >>> 8)
  return (c ^ 0xffffffff) >>> 0
}

function paeth(a, b, c) {
  const p = a + b - c
  const pa = Math.abs(p - a)
  const pb = Math.abs(p - b)
  const pc = Math.abs(p - c)
  if (pa <= pb && pa <= pc) return a
  return pb <= pc ? b : c
}

export function decodePng(buffer) {
  if (!buffer.subarray(0, 8).equals(SIGNATURE)) throw new Error('not a png')
  let offset = 8
  let width = 0
  let height = 0
  let colorType = 0
  let iccProfile = false
  const idat = []
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset)
    const type = buffer.toString('latin1', offset + 4, offset + 8)
    const data = buffer.subarray(offset + 8, offset + 8 + length)
    if (type === 'IHDR') {
      width = data.readUInt32BE(0)
      height = data.readUInt32BE(4)
      const depth = data[8]
      colorType = data[9]
      if (depth !== 8 || data[12] !== 0 || (colorType !== 2 && colorType !== 6)) {
        throw new Error(`unsupported png: depth ${depth} colorType ${colorType} interlace ${data[12]}`)
      }
    } else if (type === 'IDAT') {
      idat.push(data)
    } else if (type === 'iCCP') {
      iccProfile = true
    } else if (type === 'IEND') {
      break
    }
    offset += 12 + length
  }
  const channels = colorType === 6 ? 4 : 3
  const stride = width * channels
  const raw = inflateSync(Buffer.concat(idat))
  const rgba = new Uint8Array(width * height * 4)
  let previous = new Uint8Array(stride)
  for (let y = 0; y < height; y++) {
    const filter = raw[y * (stride + 1)]
    const line = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1))
    const current = new Uint8Array(stride)
    for (let x = 0; x < stride; x++) {
      const left = x >= channels ? current[x - channels] : 0
      const up = previous[x]
      const upLeft = x >= channels ? previous[x - channels] : 0
      const value = line[x]
      if (filter === 0) current[x] = value
      else if (filter === 1) current[x] = value + left
      else if (filter === 2) current[x] = value + up
      else if (filter === 3) current[x] = value + ((left + up) >> 1)
      else if (filter === 4) current[x] = value + paeth(left, up, upLeft)
      else throw new Error(`bad png filter ${filter}`)
    }
    for (let x = 0; x < width; x++) {
      const target = (y * width + x) * 4
      rgba[target] = current[x * channels]
      rgba[target + 1] = current[x * channels + 1]
      rgba[target + 2] = current[x * channels + 2]
      rgba[target + 3] = channels === 4 ? current[x * channels + 3] : 255
    }
    previous = current
  }
  return { width, height, rgba, iccProfile }
}

function chunk(type, data) {
  const head = Buffer.alloc(8)
  head.writeUInt32BE(data.length, 0)
  head.write(type, 4, 'latin1')
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0)
  return Buffer.concat([head, data, crc])
}

export function encodePng({ width, height, rgba }) {
  const header = Buffer.alloc(13)
  header.writeUInt32BE(width, 0)
  header.writeUInt32BE(height, 4)
  header[8] = 8
  header[9] = 6
  const raw = Buffer.alloc((width * 4 + 1) * height)
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0
    Buffer.from(rgba.buffer, rgba.byteOffset + y * width * 4, width * 4).copy(raw, y * (width * 4 + 1) + 1)
  }
  return Buffer.concat([
    SIGNATURE,
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 6 })),
    chunk('IEND', Buffer.alloc(0))
  ])
}
