import { fromMapDocument, GROUND_MATERIALS, mapSide, type MapDocument, type Vec2 } from '@prestes/shared';

/**
 * player-skirmish-maps D4: a player map has no print in `maps/`, so its sheet
 * gets one drawn from the map itself: the ground's colours under a hill
 * shade, low ground under water, woods darker, then the rivers, ponds, roads
 * and objects. The sheet's sepia makes it look printed like the game's maps.
 */

/** The print's size (px); the sheet's window shows it at about this size. */
export const PRINT_SIZE = 96;

const WATER: readonly [number, number, number] = [62, 92, 108];
const ROAD = '#b59a6a';
const OBJECT = '#3a2a1c';

const rgb = (color: number): [number, number, number] => [(color >> 16) & 255, (color >> 8) & 255, color & 255];

/** The per-pixel colours of the print, row by row from the north-west (RGBA). */
export function printPixels(document: MapDocument, size = PRINT_SIZE): Uint8ClampedArray<ArrayBuffer> {
  const map = fromMapDocument(document);
  const side = mapSide(map.size);
  const nodes = Math.round(Math.sqrt(map.heights.length));
  const height = (cx: number, cy: number): number => {
    const nx = Math.max(0, Math.min(nodes - 1, Math.round(cx / 2)));
    const ny = Math.max(0, Math.min(nodes - 1, Math.round(cy / 2)));
    return map.heights[ny * nodes + nx]! / 100;
  };
  const water = map.waterLevel;
  const pixels = new Uint8ClampedArray(size * size * 4);
  const step = side / size;
  for (let py = 0; py < size; py += 1) {
    for (let px = 0; px < size; px += 1) {
      const cx = Math.min(side - 1, Math.floor((px + 0.5) * step));
      const cy = Math.min(side - 1, Math.floor((py + 0.5) * step));
      const index = cy * side + cx;
      const here = height(cx, cy);
      let colour = here < water ? [...WATER] : rgb(GROUND_MATERIALS[map.paint[index]!]?.color ?? 0x6a7a3a);
      if (here >= water) {
        // Light from the north-west: slopes facing it lighter, the far side darker.
        const slope = height(cx - step, cy - step) - height(cx + step, cy + step);
        const shade = Math.max(0.7, Math.min(1.3, 1 + slope * 0.12));
        const wood = map.vegetation[index]! > 0 ? 0.8 : 1;
        colour = colour.map((channel) => channel * shade * wood);
      }
      const at = (py * size + px) * 4;
      pixels[at] = colour[0]!;
      pixels[at + 1] = colour[1]!;
      pixels[at + 2] = colour[2]!;
      pixels[at + 3] = 255;
    }
  }
  return pixels;
}

/** The print as a data URL, or null where there is no canvas. */
export function drawPrint(document: MapDocument, size = PRINT_SIZE): string | null {
  try {
    const canvas = window.document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d');
    if (!context) return null;
    context.putImageData(new ImageData(printPixels(document, size), size, size), 0, 0);
    const side = mapSide(document.size);
    const scale = size / side;
    const at = (point: Vec2): [number, number] => [(point.x + side / 2) * scale, (point.y + side / 2) * scale];
    const line = (points: readonly Vec2[], width: number, colour: string) => {
      if (points.length < 2) return;
      context.beginPath();
      context.moveTo(...at(points[0]!));
      for (const point of points.slice(1)) context.lineTo(...at(point));
      context.strokeStyle = colour;
      context.lineWidth = Math.max(1, width * scale);
      context.lineCap = 'round';
      context.lineJoin = 'round';
      context.stroke();
    };
    const water = `rgb(${WATER.join(',')})`;
    for (const pond of document.ponds) {
      if (pond.polygon.length < 3) continue;
      context.beginPath();
      context.moveTo(...at(pond.polygon[0]!));
      for (const point of pond.polygon.slice(1)) context.lineTo(...at(point));
      context.closePath();
      context.fillStyle = water;
      context.fill();
    }
    for (const river of document.rivers) line(river.points, river.width, water);
    for (const road of document.roads) line(road.points, road.width, ROAD);
    context.fillStyle = OBJECT;
    for (const object of document.objects) {
      const [x, y] = at(object);
      context.fillRect(Math.round(x), Math.round(y), 1, 1);
    }
    return canvas.toDataURL('image/png');
  } catch {
    return null;
  }
}
