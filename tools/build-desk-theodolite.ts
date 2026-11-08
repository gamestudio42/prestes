import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { encodePng } from './png';

/**
 * The menu desk's theodolite (add-map-editor): the closed sprite that opens
 * the map editor. Drawn in code, pixel by pixel, in the desk palette
 * (art-src/menu/desk-palette.pal): a brass surveying instrument with a dark
 * telescope on a wooden tripod, outlined in the desk's darkest ink.
 * `pnpm art:theodolite` rewrites the PNG.
 */

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = resolve(root, 'apps/game/src/assets/menu/desk/theodolite.png');

export const WIDTH = 64;
/** Drawn on a 96-row canvas; the empty rows above the finder are cropped. */
const CANVAS_HEIGHT = 96;
const TOP = 16;
export const HEIGHT = CANVAS_HEIGHT - TOP;

type Rgb = readonly [number, number, number];
// Desk palette entries.
const INK: Rgb = [18, 13, 8];
const WOOD_LIGHT: Rgb = [138, 74, 44];
const WOOD: Rgb = [107, 52, 32];
const WOOD_DARK: Rgb = [74, 34, 22];
const WOOD_BACK: Rgb = [58, 43, 27];
const BRASS_LIGHT: Rgb = [239, 226, 196];
const BRASS_HI: Rgb = [224, 184, 90];
const BRASS: Rgb = [168, 135, 63];
const BRASS_DARK: Rgb = [109, 81, 48];
const IRON: Rgb = [58, 43, 27];
const IRON_HI: Rgb = [90, 74, 48];
const ENAMEL_HI: Rgb = [111, 143, 174];
const ENAMEL_MID: Rgb = [59, 74, 107];
const ENAMEL: Rgb = [44, 58, 82];
const ENAMEL_DARK: Rgb = [27, 20, 13];
const GLASS: Rgb = [143, 163, 196];
const GLINT: Rgb = [255, 244, 218];

export function theodolitePixels(): Uint8Array {
  const data = new Uint8Array(WIDTH * CANVAS_HEIGHT * 4);
  const set = (x: number, y: number, colour: Rgb): void => {
    if (x < 0 || y < 0 || x >= WIDTH || y >= CANVAS_HEIGHT) return;
    const i = (y * WIDTH + x) * 4;
    data[i] = colour[0];
    data[i + 1] = colour[1];
    data[i + 2] = colour[2];
    data[i + 3] = 255;
  };
  const rect = (x0: number, y0: number, x1: number, y1: number, colour: Rgb): void => {
    for (let y = y0; y <= y1; y += 1) for (let x = x0; x <= x1; x += 1) set(x, y, colour);
  };
  /** A leg three pixels wide, lit from the left, with a brass shoe and clamp band. */
  const leg = (x0: number, y0: number, x1: number, y1: number, shades: readonly [Rgb, Rgb, Rgb]): void => {
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let s = 0; s <= steps; s += 1) {
      const t = s / steps;
      const x = Math.round(x0 + (x1 - x0) * t);
      const y = Math.round(y0 + (y1 - y0) * t);
      const shoe = y1 - y <= 4;
      const band = Math.abs(t - 0.45) < 0.03;
      shades.forEach((shade, k) => set(x - 1 + k, y, shoe || band ? (k === 0 ? BRASS_HI : k === 1 ? BRASS : BRASS_DARK) : shade));
    }
  };

  // Tripod: the back leg first, then the two front legs.
  leg(33, 56, 36, 93, [WOOD_DARK, WOOD_BACK, WOOD_BACK]);
  leg(27, 56, 9, 94, [WOOD_LIGHT, WOOD, WOOD_DARK]);
  leg(37, 56, 55, 94, [WOOD_LIGHT, WOOD, WOOD_DARK]);

  // Tripod head.
  rect(18, 52, 46, 52, BRASS_HI);
  rect(18, 53, 46, 55, BRASS);
  rect(18, 56, 46, 56, BRASS_DARK);
  set(19, 53, BRASS_LIGHT);
  set(20, 53, BRASS_LIGHT);

  // Levelling base with its three screws.
  rect(23, 47, 41, 51, IRON);
  rect(23, 47, 41, 47, IRON_HI);
  for (const x of [23, 32, 41]) {
    rect(x - 1, 49, x + 1, 51, BRASS);
    set(x - 1, 49, BRASS_HI);
  }

  // Horizontal circle: a flat brass disc.
  for (let x = 19; x <= 45; x += 1) {
    const half = Math.round(3 * Math.sqrt(Math.max(0, 1 - ((x - 32) / 13.5) ** 2)));
    for (let dy = -half; dy <= half; dy += 1) set(x, 44 + dy, dy < 0 ? BRASS_HI : dy === half ? BRASS_DARK : BRASS);
  }
  rect(24, 43, 28, 43, BRASS_LIGHT);

  // Standards: two brass uprights on a bridge, with the level vial between.
  rect(21, 40, 43, 42, BRASS);
  rect(21, 40, 43, 40, BRASS_HI);
  for (const x of [21, 40]) {
    rect(x, 25, x + 3, 41, BRASS);
    rect(x, 25, x, 41, BRASS_HI);
    rect(x + 3, 25, x + 3, 41, BRASS_DARK);
  }
  rect(26, 35, 38, 38, BRASS_DARK);
  rect(27, 36, 37, 37, GLASS);
  set(31, 36, GLINT);
  set(32, 36, GLINT);

  // Telescope: dark enamel barrel, brass eyepiece and objective rings.
  const barrel = [ENAMEL_HI, ENAMEL_MID, ENAMEL, ENAMEL, ENAMEL, ENAMEL_MID, ENAMEL_DARK] as const;
  barrel.forEach((colour, k) => rect(10, 21 + k, 53, 21 + k, colour));
  rect(54, 19, 58, 29, BRASS);
  rect(54, 19, 58, 19, BRASS_HI);
  rect(58, 19, 58, 29, BRASS_DARK);
  rect(59, 20, 59, 28, GLASS);
  set(59, 21, GLINT);
  rect(4, 22, 9, 26, BRASS);
  rect(4, 22, 9, 22, BRASS_HI);
  rect(4, 26, 9, 26, BRASS_DARK);
  rect(3, 23, 3, 25, ENAMEL_DARK);
  for (const x of [18, 46]) rect(x, 21, x, 27, BRASS);

  // Trunnion caps on the uprights, over the barrel.
  for (const cx of [22, 41]) {
    for (let dy = -3; dy <= 3; dy += 1) {
      for (let dx = -3; dx <= 3; dx += 1) {
        if (dx * dx + dy * dy > 10) continue;
        set(cx + dx, 24 + dy, dx + dy < -1 ? BRASS_HI : dx + dy > 2 ? BRASS_DARK : BRASS);
      }
    }
    set(cx, 24, IRON);
  }

  // Finder tube on top of the barrel.
  rect(26, 17, 38, 19, ENAMEL);
  rect(26, 17, 38, 17, ENAMEL_HI);
  rect(25, 17, 25, 19, BRASS);
  rect(39, 17, 39, 19, BRASS);
  rect(30, 20, 31, 20, BRASS_DARK);
  rect(34, 20, 35, 20, BRASS_DARK);

  // Outline: every empty pixel next to the drawing takes the desk's ink.
  const opaque = (x: number, y: number): boolean =>
    x >= 0 && y >= 0 && x < WIDTH && y < CANVAS_HEIGHT && data[(y * WIDTH + x) * 4 + 3] === 255;
  const edge: [number, number][] = [];
  for (let y = 0; y < CANVAS_HEIGHT; y += 1) {
    for (let x = 0; x < WIDTH; x += 1) {
      if (opaque(x, y)) continue;
      if (opaque(x - 1, y) || opaque(x + 1, y) || opaque(x, y - 1) || opaque(x, y + 1)) edge.push([x, y]);
    }
  }
  for (const [x, y] of edge) set(x, y, INK);
  return data.slice(TOP * WIDTH * 4);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  writeFileSync(OUT, encodePng(WIDTH, HEIGHT, theodolitePixels()));
  console.log(`Wrote ${OUT}`);
}
