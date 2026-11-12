import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import art from '../../apps/game/src/assets/hud/hud.json';

const root = resolve(import.meta.dirname, '../..');
const css = readFileSync(resolve(root, 'apps/game/src/styles/battle-hud.css'), 'utf8');
const slices = art as Record<string, { w: number; h: number; slice?: number[] }>;

describe('battle HUD art (redo-battle-hud D1)', () => {
  it('exports a PNG for every slice in hud.json', () => {
    for (const name of Object.keys(slices)) {
      expect(existsSync(resolve(root, `apps/game/src/assets/hud/${name}.png`)), name).toBe(true);
    }
  });

  it('cuts every nine-slice frame in the CSS where the Aseprite slice says', () => {
    const uses = [...css.matchAll(/url\('\.\.\/assets\/hud\/([\w-]+)\.png'\)\s+([\d ]+?)(?:\s+fill)?\s*\//g)];
    expect(uses.length).toBeGreaterThan(5);
    for (const [, name, numbers] of uses) {
      const entry = slices[name!];
      expect(entry, name).toBeDefined();
      expect(entry!.slice, `${name} has a nine-slice centre`).toBeDefined();
      const given = numbers!.trim().split(/\s+/).map(Number);
      // CSS shorthand: 1 to 4 values, top right bottom left.
      const [top, right = top, bottom = top, left = right] = given;
      expect([top, right, bottom, left], name).toEqual(entry!.slice);
    }
  });

  it('only swaps in frames that exist', () => {
    for (const [, name] of css.matchAll(/assets\/hud\/([\w-]+)\.png/g)) {
      expect(slices[name!], name).toBeDefined();
    }
  });
});
