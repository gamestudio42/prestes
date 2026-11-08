import { GROUND_ATLAS, GROUND_MATERIALS, type GroundMaterialId } from '@prestes/shared';

/**
 * The ground material tiles (add-map-editor): original 32 × 32 pixel-art
 * tiles, generated from seeded patterns, seamless on every edge. Named
 * placeholders (`placeholder-ground-<material>`) until the author retouches
 * the exported atlas (`pnpm art:ground` writes it as a PNG). Pure: the same
 * bytes every run.
 */

const T = GROUND_ATLAS.tile;

type Palette = readonly [number, number, number, number];

function hash(x: number, y: number, seed: number): number {
  let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(seed | 0, 2147483647);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

const wrap = (value: number): number => ((value % T) + T) % T;

/** Value noise on a lattice of `cell` px, wrapping at the tile size. */
function noise(x: number, y: number, cell: number, seed: number): number {
  const cells = T / cell;
  const gx = x / cell;
  const gy = y / cell;
  const x0 = Math.floor(gx);
  const y0 = Math.floor(gy);
  const fx = gx - x0;
  const fy = gy - y0;
  const at = (cx: number, cy: number) => hash(((cx % cells) + cells) % cells, ((cy % cells) + cells) % cells, seed);
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const top = at(x0, y0) * (1 - sx) + at(x0 + 1, y0) * sx;
  const bottom = at(x0, y0 + 1) * (1 - sx) + at(x0 + 1, y0 + 1) * sx;
  return top * (1 - sy) + bottom * sy;
}

const BAYER4 = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
const bayer = (x: number, y: number): number => (BAYER4[(y & 3) * 4 + (x & 3)]! + 0.5) / 16;

/** Toroidal Voronoi: distance to the nearest and second nearest of `count` seeds. */
function voronoi(count: number, seed: number): (x: number, y: number) => { d1: number; d2: number; cell: number } {
  const points = Array.from({ length: count }, (_, index) => ({ x: hash(index, 1, seed) * T, y: hash(index, 2, seed) * T }));
  return (x, y) => {
    let d1 = Infinity;
    let d2 = Infinity;
    let cell = 0;
    points.forEach((point, index) => {
      let dx = Math.abs(point.x - x);
      let dy = Math.abs(point.y - y);
      dx = Math.min(dx, T - dx);
      dy = Math.min(dy, T - dy);
      const d = Math.hypot(dx, dy);
      if (d < d1) {
        d2 = d1;
        d1 = d;
        cell = index;
      } else if (d < d2) d2 = d;
    });
    return { d1, d2, cell };
  };
}

type Tile = Uint8Array; // palette index per pixel

function blank(): Tile {
  return new Uint8Array(T * T);
}

/** Two-tone base from noise with ordered dither: indices `low`..`high`. */
function base(tile: Tile, seed: number, low = 1, high = 2, cell = 8, bias = 0): void {
  for (let y = 0; y < T; y += 1) {
    for (let x = 0; x < T; x += 1) {
      const value = noise(x, y, cell, seed) * 0.7 + noise(x, y, 4, seed + 7) * 0.3 + bias;
      tile[y * T + x] = value > bayer(x, y) * 0.6 + 0.2 ? high : low;
    }
  }
}

function dot(tile: Tile, x: number, y: number, index: number): void {
  tile[wrap(y) * T + wrap(x)] = index;
}

function specks(tile: Tile, seed: number, count: number, index: number, size = 1): void {
  for (let n = 0; n < count; n += 1) {
    const x = Math.floor(hash(n, 3, seed) * T);
    const y = Math.floor(hash(n, 4, seed) * T);
    for (let dy = 0; dy < size; dy += 1) for (let dx = 0; dx < size; dx += 1) dot(tile, x + dx, y + dy, index);
  }
}

function blades(tile: Tile, seed: number, count: number, light: number, dark: number, length = 3): void {
  for (let n = 0; n < count; n += 1) {
    const x = Math.floor(hash(n, 5, seed) * T);
    const y = Math.floor(hash(n, 6, seed) * T);
    const lean = hash(n, 7, seed) < 0.5 ? 0 : hash(n, 8, seed) < 0.5 ? -1 : 1;
    for (let step = 0; step < length; step += 1) dot(tile, x + (step === length - 1 ? lean : 0), y - step, step === 0 ? dark : light);
  }
}

function cracks(tile: Tile, seed: number, cells: number, index: number, width = 1): void {
  const cellAt = voronoi(cells, seed);
  for (let y = 0; y < T; y += 1) {
    for (let x = 0; x < T; x += 1) {
      const { d1, d2 } = cellAt(x + 0.5, y + 0.5);
      if (d2 - d1 < width) tile[y * T + x] = index;
    }
  }
}

function pebbles(tile: Tile, seed: number, count: number, light: number, dark: number, radius: number): void {
  for (let n = 0; n < count; n += 1) {
    const cx = hash(n, 9, seed) * T;
    const cy = hash(n, 10, seed) * T;
    const r = radius * (0.7 + hash(n, 11, seed) * 0.6);
    for (let dy = -Math.ceil(r); dy <= Math.ceil(r); dy += 1) {
      for (let dx = -Math.ceil(r); dx <= Math.ceil(r); dx += 1) {
        const d = Math.hypot(dx, dy);
        if (d > r) continue;
        dot(tile, Math.floor(cx + dx), Math.floor(cy + dy), d > r - 0.9 && dy >= 0 ? dark : dx < 0 && dy < 0 ? 3 : light);
      }
    }
  }
}

type DetailedId = Exclude<GroundMaterialId, `basic-${string}`>;

const TILES: Record<DetailedId, { palette: Palette; draw: (tile: Tile) => void }> = {
  grass: {
    palette: [0x3f5a2a, 0x5b7f36, 0x75983f, 0x9bb85a],
    draw: (t) => {
      base(t, 11);
      blades(t, 12, 70, 3, 0);
    },
  },
  'dry-grass': {
    palette: [0x6d6634, 0x8f8746, 0xaba257, 0xcdc27a],
    draw: (t) => {
      base(t, 21);
      blades(t, 22, 45, 3, 0);
    },
  },
  'packed-earth': {
    palette: [0x6a5236, 0x8a6c47, 0xa4835a, 0xc2a37a],
    draw: (t) => {
      base(t, 31);
      specks(t, 32, 18, 0);
      specks(t, 33, 10, 3);
    },
  },
  'red-earth': {
    palette: [0x6e3720, 0x8f4a2c, 0xab5c37, 0xc97a52],
    draw: (t) => {
      base(t, 41);
      specks(t, 42, 16, 0);
      specks(t, 43, 8, 3);
    },
  },
  mud: {
    palette: [0x3b2e20, 0x54422e, 0x6b553b, 0x8a8068],
    draw: (t) => {
      base(t, 51, 0, 1, 8);
      for (let y = 0; y < T; y += 1) for (let x = 0; x < T; x += 1) if (noise(x, y, 16, 52) > 0.72) t[y * T + x] = (x + y) % 5 === 0 ? 3 : 2;
    },
  },
  sand: {
    palette: [0xa8925f, 0xc2aa73, 0xd6c08a, 0xe8d6a6],
    draw: (t) => {
      for (let y = 0; y < T; y += 1) {
        for (let x = 0; x < T; x += 1) {
          const ripple = Math.sin(((y + noise(x, y, 8, 61) * 6) / T) * Math.PI * 2 * 4);
          t[y * T + x] = ripple > 0.6 ? 3 : ripple < -0.7 ? 0 : (x * 7 + y * 3) % 11 === 0 ? 1 : 2;
        }
      }
    },
  },
  gravel: {
    palette: [0x5f5a52, 0x7d776d, 0x9a948a, 0xbdb7ac],
    draw: (t) => {
      base(t, 71, 1, 2, 4);
      specks(t, 72, 90, 0);
      specks(t, 73, 70, 3);
      specks(t, 74, 20, 3, 2);
    },
  },
  stone: {
    palette: [0x4e4c48, 0x6b6964, 0x86847e, 0xa3a19a],
    draw: (t) => {
      base(t, 81, 1, 2, 8);
      cracks(t, 82, 6, 0);
      specks(t, 83, 12, 3);
    },
  },
  cobbles: {
    palette: [0x46423d, 0x6e6a63, 0x8c877f, 0xaaa59c],
    draw: (t) => {
      // Rows of stones 8 × 6 px, every other row shifted half a stone.
      for (let y = 0; y < T; y += 1) {
        for (let x = 0; x < T; x += 1) {
          const row = Math.floor(y / 6.4);
          const shift = row % 2 === 0 ? 0 : 4;
          const lx = wrap(x + shift) % 8;
          const ly = y - Math.floor(row * 6.4);
          const gap = lx === 0 || ly === 0;
          const tone = hash(Math.floor(wrap(x + shift) / 8), row, 91) > 0.5 ? 2 : 1;
          t[y * T + x] = gap ? 0 : lx <= 2 && ly <= 2 ? 3 : tone;
        }
      }
    },
  },
  'quintal-floor': {
    palette: [0x7f6446, 0xa4845e, 0xbb9a70, 0xd4b88e],
    draw: (t) => {
      base(t, 101, 1, 2, 16, 0.1);
      for (let y = 0; y < T; y += 1) for (let x = 0; x < T; x += 1) if ((x + y * 3) % 13 === 0 && noise(x, y, 8, 102) > 0.5) t[y * T + x] = 3;
      specks(t, 103, 8, 0);
    },
  },
  'leaf-litter': {
    palette: [0x3e3220, 0x6d5a32, 0x8f6a35, 0xb4823e],
    draw: (t) => {
      base(t, 111, 0, 1, 8);
      specks(t, 112, 40, 2, 2);
      specks(t, 113, 24, 3, 2);
      specks(t, 114, 20, 0);
    },
  },
  'field-soil': {
    palette: [0x4b3624, 0x6a4c32, 0x7f5c3e, 0x9a7656],
    draw: (t) => {
      for (let y = 0; y < T; y += 1) {
        for (let x = 0; x < T; x += 1) {
          // Furrows 4 px apart, broken by clods so they read as soil, not planks.
          const n = noise(x, y, 4, 121);
          const furrow = (y + (n > 0.62 ? 1 : 0)) % 4;
          const clod = hash(x, y, 122) > 0.86;
          t[y * T + x] = clod ? (n > 0.5 ? 3 : 0) : furrow === 0 ? 0 : furrow === 1 ? (bayer(x, y) > 0.4 ? 3 : 2) : n > 0.45 ? 2 : 1;
        }
      }
    },
  },
  'cerrado-red-soil': {
    palette: [0x7a3b22, 0xa2532f, 0xbd6a3f, 0x8f8a4a],
    draw: (t) => {
      base(t, 131);
      specks(t, 132, 14, 0);
      blades(t, 133, 10, 3, 0, 2);
    },
  },
  'cerrado-grass': {
    palette: [0x6b5f2c, 0x8f843f, 0xab9f52, 0xcfc06e],
    draw: (t) => {
      base(t, 141, 0, 1, 8, -0.05);
      // Tufts: clumps of blades, the campo limpo's bunch grass.
      for (let n = 0; n < 10; n += 1) {
        const cx = Math.floor(hash(n, 1, 142) * T);
        const cy = Math.floor(hash(n, 2, 142) * T);
        // A fan of blades from one root, leaning out.
        for (let k = -2; k <= 2; k += 1) {
          const length = 3 + Math.floor(hash(n, k + 3, 143) * 3);
          for (let step = 0; step < length; step += 1) {
            const x = cx + Math.round((k * step) / 3);
            dot(t, x, cy - step, step === 0 ? 0 : step >= length - 1 ? 3 : 2);
          }
        }
      }
    },
  },
  'cerrado-litter': {
    palette: [0x4f3f24, 0x735d34, 0x8f7444, 0xa99a5a],
    draw: (t) => {
      base(t, 151, 0, 1, 8);
      specks(t, 152, 30, 2, 2);
      // Twigs: short diagonal strokes.
      for (let n = 0; n < 10; n += 1) {
        const x = Math.floor(hash(n, 1, 153) * T);
        const y = Math.floor(hash(n, 2, 153) * T);
        for (let step = 0; step < 5; step += 1) dot(t, x + step, y + (n % 2 === 0 ? step : -step), 0);
      }
      specks(t, 154, 10, 3);
    },
  },
  'caatinga-soil': {
    palette: [0x7d6a50, 0xa99272, 0xc2ab88, 0xd8c6a6],
    draw: (t) => {
      base(t, 161, 1, 2, 16, 0.05);
      cracks(t, 162, 9, 0, 0.9);
      specks(t, 163, 10, 3);
    },
  },
  'caatinga-dry-grass': {
    palette: [0x8a7f5e, 0xa89d78, 0xc0b48c, 0x9a9a8a],
    draw: (t) => {
      base(t, 171, 1, 2, 8);
      blades(t, 172, 30, 3, 0, 3);
      specks(t, 173, 10, 0);
    },
  },
  lajedo: {
    palette: [0x5c5852, 0x7d7870, 0x969087, 0x8a9a6a],
    draw: (t) => {
      base(t, 181, 1, 2, 16);
      cracks(t, 182, 3, 0, 0.8);
      // Lichen.
      for (let y = 0; y < T; y += 1) for (let x = 0; x < T; x += 1) if (noise(x, y, 8, 183) > 0.8 && t[y * T + x] !== 0) t[y * T + x] = 3;
    },
  },
  pebbles: {
    palette: [0x6e675c, 0xb8a888, 0x9a9282, 0xd0c8b6],
    draw: (t) => {
      base(t, 191, 1, 1);
      for (let y = 0; y < T; y += 1) for (let x = 0; x < T; x += 1) if ((x * 5 + y * 3) % 7 === 0) t[y * T + x] = 2;
      pebbles(t, 192, 14, 2, 0, 1.8);
    },
  },
};

/**
 * How much of a detailed tile's contrast is kept: its four tones are pulled
 * toward their mean so the pattern reads up close without buzzing at a
 * distance (the first tiles were too loud).
 */
export const DETAILED_CONTRAST = 0.5;
/** A basic tile's tones: the colour ±4 %, in large soft patches. */
const BASIC_SPREAD = 0.04;

const channels = (color: number): [number, number, number] => [(color >> 16) & 0xff, (color >> 8) & 0xff, color & 0xff];
const pack = ([r, g, b]: readonly number[]): number =>
  (Math.round(Math.max(0, Math.min(255, r!))) << 16) | (Math.round(Math.max(0, Math.min(255, g!))) << 8) | Math.round(Math.max(0, Math.min(255, b!)));

function soften(palette: Palette, contrast: number): Palette {
  const rgb = palette.map(channels);
  const mean = [0, 1, 2].map((c) => rgb.reduce((sum, color) => sum + color[c]!, 0) / rgb.length);
  return rgb.map((color) => pack(color.map((value, c) => mean[c]! + (value - mean[c]!) * contrast))) as unknown as Palette;
}

function basicPalette(color: number): Palette {
  const rgb = channels(color);
  const tone = (factor: number) => pack(rgb.map((value) => value * factor));
  return [tone(1 - BASIC_SPREAD), tone(1 - BASIC_SPREAD / 2), tone(1), tone(1 + BASIC_SPREAD / 2)];
}

function basicTile(seed: number): Tile {
  const tile = blank();
  for (let y = 0; y < T; y += 1) {
    for (let x = 0; x < T; x += 1) {
      const value = noise(x, y, 16, seed) * 0.8 + noise(x, y, 8, seed + 3) * 0.2;
      tile[y * T + x] = value < 0.3 ? 0 : value < 0.5 ? 1 : value < 0.72 ? 2 : 3;
    }
  }
  return tile;
}

/** One material's tile: palette indices and the four colours. */
export function groundTile(id: GroundMaterialId): { tile: Tile; palette: Palette } {
  const material = GROUND_MATERIALS.find((entry) => entry.id === id)!;
  if (material.kind === 'basic') return { tile: basicTile(200 + GROUND_MATERIALS.indexOf(material)), palette: basicPalette(material.color) };
  const spec = TILES[id as DetailedId];
  const tile = blank();
  spec.draw(tile);
  return { tile, palette: soften(spec.palette, DETAILED_CONTRAST) };
}

/** The atlas as RGBA bytes, row 0 at the top, tiles in GROUND_MATERIALS order. */
export function groundAtlasPixels(): { width: number; height: number; data: Uint8Array } {
  const width = GROUND_ATLAS.columns * T;
  const height = GROUND_ATLAS.rows * T;
  const data = new Uint8Array(width * height * 4);
  GROUND_MATERIALS.forEach((material, index) => {
    const { tile, palette } = groundTile(material.id);
    const ox = (index % GROUND_ATLAS.columns) * T;
    const oy = Math.floor(index / GROUND_ATLAS.columns) * T;
    for (let y = 0; y < T; y += 1) {
      for (let x = 0; x < T; x += 1) {
        const color = palette[tile[y * T + x]!]!;
        const at = ((oy + y) * width + ox + x) * 4;
        data[at] = (color >> 16) & 0xff;
        data[at + 1] = (color >> 8) & 0xff;
        data[at + 2] = color & 0xff;
        data[at + 3] = 255;
      }
    }
  });
  return { width, height, data };
}
