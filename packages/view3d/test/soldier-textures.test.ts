import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * soldier-animation-and-textures 3.1: the soldier atlases are 128 x 128 with
 * 16 x 16 swatches, every swatch inside the atlas, and stay small on the wire.
 */
const url = (path: string) => fileURLToPath(new URL(path, import.meta.url));
const TEXTURES = url('../../../apps/game/public/models/textures/');
const REGIONS = JSON.parse(readFileSync(url('../../../art-src/textures/regions.json'), 'utf8')) as {
  soldier: { size: [number, number]; regions: Record<string, [number, number, number, number]> };
};
/** Bytes a soldier atlas may weigh (each of them). */
const ATLAS_BUDGET = 8 * 1024;

/** Width and height from a PNG's IHDR chunk. */
function pngSize(file: Buffer): [number, number] {
  return [file.readUInt32BE(16), file.readUInt32BE(20)];
}

describe('soldier textures (3.1)', () => {
  const atlases = readdirSync(TEXTURES).filter((name) => name.startsWith('soldier-') && name.endsWith('.png'));

  it('there is an atlas per outfit, 128 x 128 and within the budget', () => {
    expect(atlases.length).toBeGreaterThanOrEqual(3);
    for (const name of atlases) {
      const file = readFileSync(TEXTURES + name);
      expect(pngSize(file), name).toEqual([128, 128]);
      expect(file.length, name).toBeLessThanOrEqual(ATLAS_BUDGET);
    }
  });

  it('the regions match the atlas and each swatch lies inside it', () => {
    expect(REGIONS.soldier.size).toEqual([128, 128]);
    for (const [name, [x, y, w, h]] of Object.entries(REGIONS.soldier.regions)) {
      expect([w, h], name).toEqual([16, 16]);
      expect(x + w, name).toBeLessThanOrEqual(128);
      expect(y + h, name).toBeLessThanOrEqual(128);
    }
  });

  it('the painted layers have their own swatches', () => {
    for (const name of ['tunic-front', 'tunic-back', 'trousers-front', 'belt-front', 'hat-front', 'hat-top', 'face']) {
      expect(REGIONS.soldier.regions[name], name).toBeDefined();
    }
  });
});
