import { readdirSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CATALOG_OBJECTS, LINE_KINDS } from '../../packages/shared/src';
import { namedFiles, structuresRegisterProblems } from '../../tools/structures-register';
import { FLORA_FILES } from '../../tools/flora-check';

// revise-buildings-and-stone 6.2: the register check over the buildings,
// stones, objects, lines and the model files the game ships.

const register = readFileSync('docs/assets.md', 'utf8');
const shipped = readdirSync('apps/game/public/models')
  .filter((file) => file.endsWith('.glb'))
  .map((file) => file.slice(0, -4))
  .filter((file) => !FLORA_FILES.includes(file));

describe('structures in the asset register', () => {
  it('every building, stone, object, line kind and model file has its row', () => {
    expect(structuresRegisterProblems(CATALOG_OBJECTS, LINE_KINDS, shipped, register)).toEqual([]);
  });

  it('a missing object, line or file, or a row without a licence, is reported', () => {
    const rows = [
      '| A | `x.glb` | Prestes project | CC-BY-4.0 | `boulder` |',
      '| B | `stones{,-basalt}.glb` | Prestes project |  | `rail-fence` |',
    ].join('\n');
    expect(namedFiles(rows)).toEqual(new Set(['stones', 'stones-basalt', 'x']));
    const problems = structuresRegisterProblems(
      CATALOG_OBJECTS.filter((entry) => entry.id === 'boulder' || entry.id === 'church'),
      LINE_KINDS.filter((line) => line.kind === 'rail-fence'),
      ['stones-basalt', 'props'],
      rows,
    );
    expect(problems).toEqual([
      'object church is not in docs/assets.md',
      'line kind rail-fence: its row in docs/assets.md has no author or licence',
      'props.glb is not in docs/assets.md',
    ]);
  });
});
