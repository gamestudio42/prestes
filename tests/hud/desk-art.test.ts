import { readFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  DESK_ART,
  DESK_SCALE,
  PENDING_REDRAW,
  deskArtStyle,
  type DeskArt,
} from '../../apps/game/src/ui/menu/deskArt';

const ART_DIR = resolve(__dirname, '../../apps/game/src/assets/menu/desk');

/** Width and height from a PNG's IHDR chunk. */
function pngSize(file: string): { width: number; height: number } {
  const bytes = readFileSync(file);
  expect(bytes.subarray(1, 4).toString('ascii'), file).toBe('PNG');
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

const entries = Object.entries(DESK_ART as Record<string, DeskArt>);

describe('menu desk sprites', () => {
  it('declares each sprite at the size of its PNG', () => {
    for (const [key, art] of entries) {
      const file = resolve(ART_DIR, basename(art.src.split('?')[0]!));
      expect(pngSize(file), key).toEqual({ width: art.width, height: art.height });
    }
  });

  it('draws closed sprites at the 2x standard unless a redraw is pending', () => {
    expect(DESK_SCALE).toBe(2);
    // polish-menu-desk: remove an id when its redraw lands.
    expect(PENDING_REDRAW).toEqual([]);
    for (const key of PENDING_REDRAW) {
      expect(Number.isInteger((DESK_ART as Record<string, DeskArt>)[key]!.scale)).toBe(true);
    }
  });

  it('sizes a closed box from the sprite, as a ratio of the desk scale', () => {
    expect(deskArtStyle(DESK_ART.campaignClosed)).toEqual({
      '--art-w': 128,
      '--art-h': 96,
      '--art-ratio': 1,
      '--art-trim': 0,
    });
    // polish-menu-desk 3.1 to 3.5: every closed sprite touches its bottom row.
    for (const art of Object.values(DESK_ART) as DeskArt[]) expect(art.trim ?? 0).toBe(0);
    expect(deskArtStyle({ src: '', width: 10, height: 10, scale: 3 })).toMatchObject({ '--art-ratio': 3 / 2 });
  });
});
