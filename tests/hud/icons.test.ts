import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { ORDER_CATALOG } from '../../packages/content/src';
import { ICONS, POSTURES, POSTURE_ICONS, orderIcon } from '../../apps/game/src/ui/hud/orderMeta';
import { iconSliceNames } from '../../apps/game/src/ui/icons';
import sheet from '../../apps/game/src/assets/icons.json';

describe('HUD icon map', () => {
  it('gives every catalogue order its own icon', () => {
    const missing = ORDER_CATALOG.filter((entry) => !orderIcon(entry.id)).map((entry) => entry.id);
    expect(missing).toEqual([]);
  });

  it('gives every posture an icon', () => {
    expect(POSTURES.every((posture) => POSTURE_ICONS[posture] !== undefined)).toBe(true);
  });

  it('never shows the same icon for two controls', () => {
    const owners = new Map<string, string[]>();
    for (const [id, icon] of Object.entries(ICONS)) {
      owners.set(icon.slice, [...(owners.get(icon.slice) ?? []), id]);
    }
    const shared = [...owners.values()].filter((ids) => ids.length > 1);
    expect(shared).toEqual([]);
  });

  it('lists the nine orders of the board (compact-orders)', () => {
    expect(ORDER_CATALOG.map((entry) => entry.id).sort()).toEqual(
      ['advance', 'attack', 'defend', 'flank', 'hold', 'move', 'recon', 'suppress', 'withdraw'].sort(),
    );
  });

  it('draws every control from a slice of the exported sheet', () => {
    const slices = new Set(iconSliceNames());
    const missing = Object.values(ICONS).map((icon) => icon.slice).filter((slice) => !slices.has(slice));
    expect(missing).toEqual([]);
  });

  it('keeps the exported index in step with the PNG sheet', () => {
    const png = readFileSync(resolve(__dirname, '../../apps/game/src/assets/icons.png'));
    // PNG IHDR: width and height are big-endian at bytes 16 and 20.
    expect({ w: png.readUInt32BE(16), h: png.readUInt32BE(20) }).toEqual(sheet.meta.size);
    for (const slice of sheet.meta.slices) {
      const { x, y, w, h } = slice.keys[0]!.bounds;
      expect(x + w <= sheet.meta.size.w && y + h <= sheet.meta.size.h, slice.name).toBe(true);
    }
  });
});
