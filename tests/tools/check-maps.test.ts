import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { createEditableMap, toMapDocument } from '../../packages/shared/src';
import { checkAuthoredMaps, indexSource } from '../../tools/check-maps';

let dir: string | null = null;
afterEach(() => {
  if (dir) rmSync(dir, { recursive: true, force: true });
  dir = null;
});

function write(name: string, value: unknown): void {
  dir ??= mkdtempSync(join(tmpdir(), 'prestes-maps-'));
  writeFileSync(join(dir, name), JSON.stringify(value));
}

describe('check-maps', () => {
  it('a valid authored map passes', () => {
    const map = createEditableMap({ id: 'forte', size: 'small', name: { en: 'Fort', 'pt-BR': 'Forte' } });
    map.deployment.column.sections = map.deployment.column.sections.map((point) => ({ ...point, y: 90 }));
    map.deployment.legalist.sections = map.deployment.legalist.sections.map((point) => ({ ...point, y: -90 }));
    write('forte.map.json', toMapDocument(map));
    expect(checkAuthoredMaps(dir!)).toEqual([]);
  });

  it('broken authored map fails the check, naming the map and the problem', () => {
    const map = createEditableMap({ id: 'alagado', size: 'medium', name: { en: 'Flooded', 'pt-BR': 'Alagado' } });
    map.ponds.push({ id: 1, kind: 'deep', polygon: [{ x: -80, y: 70 }, { x: 80, y: 70 }, { x: 80, y: 120 }, { x: -80, y: 120 }] });
    write('alagado.map.json', toMapDocument(map));
    const errors = checkAuthoredMaps(dir!);
    expect(errors.some((error) => error.startsWith('alagado.map.json: section-not-walkable'))).toBe(true);
  });

  it('refuses a file whose id does not match its name', () => {
    write('outro.map.json', toMapDocument(createEditableMap({ id: 'forte', size: 'small', name: { en: 'a', 'pt-BR': 'b' } })));
    expect(checkAuthoredMaps(dir!).some((error) => error.includes('does not match'))).toBe(true);
  });

  it('generates an index that bundles skirmish maps and loads campaign maps on demand', () => {
    write('forte.map.json', { use: 'skirmish' });
    write('serra-nova.map.json', { use: 'campaign' });
    const source = indexSource(['forte.map.json', 'serra-nova.map.json'], dir!);
    expect(source).toContain("import forteMap from './forte.map.json';");
    expect(source).not.toContain("import serraNovaMap");
    expect(source).toContain("'serra-nova': () => import('./serra-nova.map.json')");
    expect(source).toContain("'forte': () => import('./forte.map.json')");
  });
});
