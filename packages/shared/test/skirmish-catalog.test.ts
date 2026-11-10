import { describe, expect, it } from 'vitest';
import { authoredMapIndex, DEFAULT_BATTLE_MAP, loadAuthoredMap, loadSkirmishMaps, sandboxMaps } from '../src/maps';

// author-game-maps 2.2: the test map is the default; dev builds and the
// sandbox list it, the published skirmish list does not.
describe('skirmish catalog by build mode', () => {
  it('the default battle map is the test map', () => {
    const entry = authoredMapIndex().find((candidate) => candidate.id === DEFAULT_BATTLE_MAP);
    expect(entry?.use).toBe('test');
  });

  it('a published build leaves the test map out', async () => {
    const maps = await loadSkirmishMaps({ includeTest: false });
    expect(maps.map((map) => map.id)).not.toContain(DEFAULT_BATTLE_MAP);
  });

  it('a dev build lists the test map', async () => {
    const maps = await loadSkirmishMaps({ includeTest: true });
    expect(maps.map((map) => map.id)).toContain(DEFAULT_BATTLE_MAP);
  });

  it('the sandbox panel lists the test map first once loaded', async () => {
    await loadAuthoredMap(DEFAULT_BATTLE_MAP);
    expect(sandboxMaps()[0]?.id).toBe(DEFAULT_BATTLE_MAP);
  });
});
