/**
 * gen-icons.mjs
 * Generates solid teal (#0F766E = RGB 15, 118, 110) PNG icons for the CEEALAR Pulse PWA.
 * Uses only Node.js built-ins (zlib, fs, path) — no external packages.
 *
 * Output files:
 *   public/icon-192.png   (192x192)
 *   public/icon-512.png   (512x512)
 *   public/apple-touch-icon.png (180x180)
 */

import { deflateSync } from 'zlib'
import { writeFileSync, mkdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const publicDir = join(__dirname, '..', 'public')

mkdirSync(publicDir, { recursive: true })

// Teal color RGB
const R = 15
const G = 118
const B = 110

/**
 * Encode a 32-bit unsigned integer as 4 bytes big-endian.
 */
function uint32BE(n) {
  const buf = Buffer.allocUnsafe(4)
  buf.writeUInt32BE(n, 0)
  return buf
}

/**
 * Compute CRC-32 for a PNG chunk (type + data).
 * Uses the standard CRC-32 polynomial 0xEDB88320.
 */
function crc32(buf) {
  // Pre-compute CRC table
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let j = 0; j < 8; j++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[i] = c
  }
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

/**
 * Build a PNG chunk: length (4B) + type (4B) + data + CRC (4B).
 */
function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii')
  const dataLen = uint32BE(data.length)
  const crcInput = Buffer.concat([typeBytes, data])
  const crcBytes = uint32BE(crc32(crcInput))
  return Buffer.concat([dataLen, typeBytes, data, crcBytes])
}

/**
 * Generate a valid PNG buffer for a solid-color image.
 * @param {number} width
 * @param {number} height
 * @param {number} r - Red channel (0-255)
 * @param {number} g - Green channel (0-255)
 * @param {number} b - Blue channel (0-255)
 */
function generatePNG(width, height, r, g, b) {
  // PNG signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])

  // IHDR chunk: width (4), height (4), bit depth (1), color type (2=RGB), compression (0), filter (0), interlace (0)
  const ihdrData = Buffer.concat([
    uint32BE(width),
    uint32BE(height),
    Buffer.from([8, 2, 0, 0, 0]), // 8-bit depth, RGB, no interlace
  ])
  const ihdr = pngChunk('IHDR', ihdrData)

  // Build raw image data: for each scanline, prepend filter byte 0 (None), then RGB pixels
  // Total raw bytes per row: 1 (filter) + width * 3 (RGB)
  const rowSize = 1 + width * 3
  const raw = Buffer.allocUnsafe(height * rowSize)

  for (let y = 0; y < height; y++) {
    const offset = y * rowSize
    raw[offset] = 0 // filter type None
    for (let x = 0; x < width; x++) {
      const pixelOffset = offset + 1 + x * 3
      raw[pixelOffset] = r
      raw[pixelOffset + 1] = g
      raw[pixelOffset + 2] = b
    }
  }

  // Use zlib STORED mode (no compression, level 0) so that solid-color images
  // produce file sizes proportional to their dimensions (required: > 1000 bytes).
  // This is valid per the PNG/DEFLATE spec — the DEFLATE stream uses non-compressed blocks.
  const compressed = deflateSync(raw, { level: 0 })
  const idat = pngChunk('IDAT', compressed)

  // IEND chunk (empty data)
  const iend = pngChunk('IEND', Buffer.alloc(0))

  return Buffer.concat([signature, ihdr, idat, iend])
}

const icons = [
  { filename: 'icon-192.png', width: 192, height: 192 },
  { filename: 'icon-512.png', width: 512, height: 512 },
  { filename: 'apple-touch-icon.png', width: 180, height: 180 },
]

for (const { filename, width, height } of icons) {
  const png = generatePNG(width, height, R, G, B)
  const outPath = join(publicDir, filename)
  writeFileSync(outPath, png)
  console.log(`Generated ${filename}: ${png.length} bytes (${width}x${height})`)
}

console.log('Done.')
