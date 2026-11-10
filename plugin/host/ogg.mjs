/**
 * Recording Suite — Ogg/Opus muxer for decrypted D3200 audio (Node port).
 *
 * Independent Ogg/Opus muxer based on the public Ogg and Opus container specs. The
 * browser version returns a `Blob`; the Host works on `Buffer`s, so this module
 * is the single Node-side implementation used by `host/ble.mjs`.
 *
 * The D3200 stores bare Opus frames: every 160 bytes is one 20 ms, 16 kHz mono
 * frame. Wrapping them in Ogg/Opus gives a file that Apple Speech, `afinfo` and
 * browsers can decode without a WebAudio step.
 */

export const D3200_FRAME_SIZE = 160
export const D3200_FRAME_DURATION_MS = 20
export const OGG_OPUS_SAMPLE_RATE = 48000
export const OGG_OPUS_SAMPLES_PER_FRAME = 960

function concat(parts) {
  const size = parts.reduce((total, part) => total + part.length, 0)
  const output = Buffer.alloc(size)
  let offset = 0
  for (const part of parts) {
    part.copy(output, offset)
    offset += part.length
  }
  return output
}

/** Ogg CRC-32 (polynomial 0x04C11DB7, no reflection, zero initial value). */
export function crc32Ogg(bytes) {
  let crc = 0
  for (const byte of bytes) {
    crc ^= byte << 24
    for (let bit = 0; bit < 8; bit += 1) {
      crc = crc & 0x80000000 ? ((crc << 1) ^ 0x04c11db7) >>> 0 : (crc << 1) >>> 0
    }
  }
  return crc >>> 0
}

function page(packets, serial, sequence, granule, flags = 0) {
  const segments = []
  const bodyParts = []
  for (const packet of packets) {
    bodyParts.push(packet)
    let remaining = packet.length
    while (remaining >= 255) {
      segments.push(255)
      remaining -= 255
    }
    segments.push(remaining)
  }
  const header = Buffer.alloc(27 + segments.length)
  header.write('OggS', 0, 'latin1')
  header[4] = 0
  header[5] = flags
  header.writeBigUInt64LE(BigInt(granule), 6)
  header.writeUInt32LE(serial >>> 0, 14)
  header.writeUInt32LE(sequence >>> 0, 18)
  header[26] = segments.length
  header.set(segments, 27)
  const output = concat([header, ...bodyParts])
  output.writeUInt32LE(crc32Ogg(output), 22)
  return output
}

/**
 * Wrap raw D3200 Opus frames into an Ogg/Opus stream.
 * @param {Buffer | Uint8Array} raw decrypted audio frame bytes
 * @returns {Buffer} Ogg/Opus file bytes
 */
export function muxOggOpus(raw) {
  const input = Buffer.isBuffer(raw) ? raw : Buffer.from(raw)
  if (input.length === 0) throw new Error('录音数据为空')

  /** @type {Buffer[]} */
  const frames = []
  for (let offset = 0; offset < input.length; offset += D3200_FRAME_SIZE) {
    let frame = input.subarray(offset, offset + D3200_FRAME_SIZE)
    let end = frame.length
    while (end > 0 && frame[end - 1] === 0) end -= 1
    frame = end ? frame.subarray(0, end) : Buffer.from([0])
    frames.push(frame)
  }

  const head = Buffer.alloc(19)
  head.write('OpusHead', 0, 'latin1')
  head.set([1, 1], 8)
  head.writeUInt16LE(3840, 10)
  head.writeUInt32LE(OGG_OPUS_SAMPLE_RATE, 12)
  head.writeInt16LE(0, 16)
  head[18] = 0

  const vendor = Buffer.from('D3200 Native Bridge', 'utf8')
  const tags = Buffer.alloc(16 + vendor.length)
  tags.write('OpusTags', 0, 'latin1')
  tags.writeUInt32LE(vendor.length, 8)
  vendor.copy(tags, 12)
  tags.writeUInt32LE(0, 12 + vendor.length)

  const serial = 0x41524b52
  const pages = [page([head], serial, 0, 0, 0x02), page([tags], serial, 1, 0)]
  let granule = 0
  let sequence = 2
  for (let start = 0; start < frames.length; start += 50) {
    const batch = frames.slice(start, start + 50)
    granule += batch.length * OGG_OPUS_SAMPLES_PER_FRAME
    pages.push(page(batch, serial, sequence, granule, start + 50 >= frames.length ? 0x04 : 0))
    sequence += 1
  }
  return concat(pages)
}

/**
 * Duration derived from the raw frame count (one 160-byte frame = 20 ms).
 * @param {number} byteLength
 */
export function durationMsOfRawOpus(byteLength) {
  const frames = Math.ceil(Number(byteLength) / D3200_FRAME_SIZE)
  return frames * D3200_FRAME_DURATION_MS
}
