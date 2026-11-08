/**
 * Raster layers of a map document (add-map-editor), run-length encoded and
 * then base64'd so a mostly flat map stays small and JSON-safe. Pure: no DOM,
 * no Node, so the worker, the view and the tools decode the same bytes.
 */

export type RasterType = 'i16' | 'u8';

export interface EncodedRaster {
  encoding: 'rle-base64';
  type: RasterType;
  /** Number of values (columns × rows). */
  length: number;
  data: string;
}

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const LOOKUP = new Int16Array(128).fill(-1);
for (let index = 0; index < ALPHABET.length; index += 1) LOOKUP[ALPHABET.charCodeAt(index)] = index;

export function bytesToBase64(bytes: Uint8Array): string {
  let out = '';
  let index = 0;
  for (; index + 2 < bytes.length; index += 3) {
    const n = (bytes[index]! << 16) | (bytes[index + 1]! << 8) | bytes[index + 2]!;
    out += ALPHABET[(n >> 18) & 63]! + ALPHABET[(n >> 12) & 63]! + ALPHABET[(n >> 6) & 63]! + ALPHABET[n & 63]!;
  }
  const rest = bytes.length - index;
  if (rest === 1) {
    const n = bytes[index]! << 16;
    out += ALPHABET[(n >> 18) & 63]! + ALPHABET[(n >> 12) & 63]! + '==';
  } else if (rest === 2) {
    const n = (bytes[index]! << 16) | (bytes[index + 1]! << 8);
    out += ALPHABET[(n >> 18) & 63]! + ALPHABET[(n >> 12) & 63]! + ALPHABET[(n >> 6) & 63]! + '=';
  }
  return out;
}

export function base64ToBytes(text: string): Uint8Array {
  const clean = text.replace(/=+$/, '');
  const out = new Uint8Array(Math.floor((clean.length * 3) / 4));
  let buffer = 0;
  let bits = 0;
  let at = 0;
  for (let index = 0; index < clean.length; index += 1) {
    const code = clean.charCodeAt(index);
    const value = code < 128 ? LOOKUP[code]! : -1;
    if (value < 0) throw new Error('invalid base64');
    buffer = (buffer << 6) | value;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[at++] = (buffer >> bits) & 0xff;
    }
  }
  return out.subarray(0, at);
}

class ByteWriter {
  private bytes = new Uint8Array(1024);
  private at = 0;
  push(byte: number): void {
    if (this.at === this.bytes.length) {
      const next = new Uint8Array(this.bytes.length * 2);
      next.set(this.bytes);
      this.bytes = next;
    }
    this.bytes[this.at++] = byte;
  }
  varint(value: number): void {
    let rest = value >>> 0;
    while (rest >= 0x80) {
      this.push((rest & 0x7f) | 0x80);
      rest >>>= 7;
    }
    this.push(rest);
  }
  result(): Uint8Array {
    return this.bytes.subarray(0, this.at);
  }
}

const zigzag = (value: number): number => ((value << 1) ^ (value >> 31)) >>> 0;
const unzigzag = (value: number): number => (value >>> 1) ^ -(value & 1);

export function encodeRaster(values: Int16Array | Uint8Array): EncodedRaster {
  const type: RasterType = values instanceof Int16Array ? 'i16' : 'u8';
  const writer = new ByteWriter();
  let index = 0;
  while (index < values.length) {
    const value = values[index]!;
    let run = 1;
    while (index + run < values.length && values[index + run] === value) run += 1;
    writer.varint(type === 'i16' ? zigzag(value) : value);
    writer.varint(run);
    index += run;
  }
  return { encoding: 'rle-base64', type, length: values.length, data: bytesToBase64(writer.result()) };
}

export function decodeRaster(raster: EncodedRaster, type: 'i16'): Int16Array;
export function decodeRaster(raster: EncodedRaster, type: 'u8'): Uint8Array;
export function decodeRaster(raster: EncodedRaster, type: RasterType): Int16Array | Uint8Array {
  if (raster.encoding !== 'rle-base64') throw new Error(`unknown raster encoding ${String(raster.encoding)}`);
  if (raster.type !== type) throw new Error(`raster is ${raster.type}, expected ${type}`);
  const out = type === 'i16' ? new Int16Array(raster.length) : new Uint8Array(raster.length);
  const bytes = base64ToBytes(raster.data);
  let at = 0;
  const read = (): number => {
    let value = 0;
    let shift = 0;
    for (;;) {
      if (at >= bytes.length) throw new Error('raster data ends early');
      const byte = bytes[at++]!;
      value |= (byte & 0x7f) << shift;
      if (byte < 0x80) return value >>> 0;
      shift += 7;
      if (shift > 28) throw new Error('raster varint too long');
    }
  };
  let index = 0;
  while (at < bytes.length) {
    const raw = read();
    const run = read();
    const value = type === 'i16' ? unzigzag(raw) : raw;
    if (run === 0 || index + run > raster.length) throw new Error('raster run out of range');
    out.fill(value, index, index + run);
    index += run;
  }
  if (index !== raster.length) throw new Error('raster data ends early');
  return out;
}
