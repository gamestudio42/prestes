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

  // author-game-maps 1.2: an index of names and slots, every document loaded on demand.
  it('generates an index of every map and loads every document on demand', () => {
    const skirmish = createEditableMap({ id: 'forte', size: 'small', name: { en: 'Fort', 'pt-BR': 'Forte' } });
    const mission = createEditableMap({ id: 'serra-nova', size: 'medium', use: 'campaign', mission: 'serra-nova', name: { en: 'Serra Nova', 'pt-BR': 'Serra Nova' } });
    write('forte.map.json', toMapDocument(skirmish));
    write('serra-nova.map.json', toMapDocument(mission));
    const source = indexSource(['forte.map.json', 'serra-nova.map.json'], dir!, dir!);
    expect(source).not.toMatch(/^import \w+ from/m);
    expect(source).toContain('{"id":"forte","use":"skirmish","size":"small","name":{"en":"Fort","pt-BR":"Forte"}');
    expect(source).toContain('"id":"serra-nova","use":"campaign","mission":"serra-nova"');
    expect(source).toContain('"preview":false');
    expect(source).toContain("'serra-nova': () => import('./serra-nova.map.json')");
    expect(source).toContain("'forte': () => import('./forte.map.json')");
  });

  it('two maps for one mission fail the check', () => {
    for (const id of ['anel-a', 'anel-b']) {
      const map = createEditableMap({ id, size: 'small', use: 'campaign', mission: 'anel-de-ferro', name: { en: id, 'pt-BR': id } });
      map.setting.sourceNote = 'Macaulay';
      map.deployment.column.sections = map.deployment.column.sections.map((point) => ({ ...point, y: 90 }));
      map.deployment.legalist.sections = map.deployment.legalist.sections.map((point) => ({ ...point, y: -90 }));
      write(`${id}.map.json`, toMapDocument(map));
    }
    expect(checkAuthoredMaps(dir!)).toEqual(['anel-b.map.json: mission anel-de-ferro already has the map anel-a']);
  });
});
