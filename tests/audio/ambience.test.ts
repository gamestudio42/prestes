import { describe, expect, it } from 'vitest';
import { CATALOG_OBJECTS, GROUND_MATERIAL_IDS, type BattleMap } from '../../packages/shared/src';
import { FOREST_TREES, ONE_SHOTS, hourOf, nextOneShot, placeAt } from '../../apps/game/src/audio/ambience';
import { AmbientPlayer, BED_LEVEL, CROSSFADE, PLACE_HOLD, type AmbientOutput, type LoopHandle } from '../../apps/game/src/audio/ambient-player';

// ambient-sound-and-voices 3.2: the bed by place and hour, its cross-fade
// and the one-shots.

const SIDE = 240;

function map(overrides: Partial<BattleMap> = {}): BattleMap {
  return {
    bounds: { minX: -SIDE / 2, minY: -SIDE / 2, maxX: SIDE / 2, maxY: SIDE / 2 },
    buildings: [],
    props: [],
    palette: 'temperate',
    ...overrides,
  } as unknown as BattleMap;
}

function painted(material: string, left?: string): Uint8Array {
  const paint = new Uint8Array(SIDE * SIDE).fill(GROUND_MATERIAL_IDS.indexOf(material as never));
  if (left) {
    const code = GROUND_MATERIAL_IDS.indexOf(left as never);
    for (let y = 0; y < SIDE; y += 1) for (let x = 0; x < SIDE / 2; x += 1) paint[y * SIDE + x] = code;
  }
  return paint;
}

const building = (x: number, y: number) => ({ id: x, model: 'casa-terrea', x, y, rotation: 0, halfWidth: 4, halfDepth: 4, height: 5 });
const TREE = CATALOG_OBJECTS.find((entry) => entry.group === 'tree' && !entry.id.startsWith('bush-') && !entry.id.startsWith('stump-'))!.model;

describe('placeAt', () => {
  it('is a town where three buildings stand near', () => {
    expect(placeAt(map({ buildings: [building(0, 0), building(20, 0), building(0, 20)] as never }), 0, 0)).toBe('town');
    expect(placeAt(map({ buildings: [building(0, 0), building(20, 0)] as never }), 0, 0)).not.toBe('town');
  });

  it('is a forest edge where trees are thick', () => {
    const trees = Array.from({ length: FOREST_TREES }, (_, index) => ({ model: TREE, x: index * 3, y: 5 }));
    expect(placeAt(map({ props: trees }), 0, 0)).toBe('forest-edge');
    expect(placeAt(map({ props: trees.slice(1) }), 0, 0)).not.toBe('forest-edge');
  });

  it('follows the painted ground', () => {
    expect(placeAt(map({ paint: painted('caatinga-soil') }), 0, 0)).toBe('caatinga');
    expect(placeAt(map({ paint: painted('cerrado-grass') }), 0, 0)).toBe('cerrado');
    expect(placeAt(map({ paint: painted('grass') }), 0, 0)).toBe('pasture');
  });

  it('changes from one ground to the other across a border (forest to town, cerrado to pasture)', () => {
    const half = map({ paint: painted('grass', 'cerrado-grass') });
    expect(placeAt(half, -80, 0)).toBe('cerrado');
    expect(placeAt(half, 80, 0)).toBe('pasture');
  });

  it("falls back to the map's colour family where the ground says nothing", () => {
    expect(placeAt(map({ palette: 'caatinga' }), 0, 0)).toBe('caatinga');
    expect(placeAt(map({ palette: 'urban', paint: painted('mud') }), 0, 0)).toBe('town');
  });
});

describe('hourOf', () => {
  it('reads dawn, day and dusk from the map time, and night outside it', () => {
    expect(hourOf(6)).toBe('dawn');
    expect(hourOf(7.9)).toBe('dawn');
    expect(hourOf(12)).toBe('day');
    expect(hourOf(17)).toBe('dusk');
    expect(hourOf(18)).toBe('dusk');
    expect(hourOf(22)).toBe('night');
    expect(hourOf(3)).toBe('night');
  });
});

describe('nextOneShot', () => {
  const all = () => true;
  it('picks only what fits the place and hour', () => {
    for (let index = 0; index < 20; index += 1) {
      const id = nextOneShot('town', 'dawn', null, all, () => index / 20)!;
      const shot = ONE_SHOTS.find((entry) => entry.id === id)!;
      expect(shot.places).toContain('town');
      expect(shot.hours).toContain('dawn');
    }
  });

  it('never plays the same one twice in a row', () => {
    let last: string | null = null;
    let seed = 1;
    const random = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let index = 0; index < 200; index += 1) {
      const id = nextOneShot('pasture', 'day', last, all, random);
      expect(id).not.toBe(last);
      last = id;
    }
  });

  it('plays nothing rather than repeat the only one that fits, and skips what is not loaded', () => {
    expect(nextOneShot('forest-edge', 'night', null, (id) => id === 'bird-urutau', Math.random)).toBe('bird-urutau');
    expect(nextOneShot('forest-edge', 'night', 'bird-urutau', (id) => id === 'bird-urutau', Math.random)).toBeNull();
    expect(nextOneShot('town', 'day', null, () => false, Math.random)).toBeNull();
  });
});

class FakeLoop implements LoopHandle {
  gains: { gain: number; seconds: number }[] = [];
  stoppedIn: number | null = null;
  constructor(readonly id: string) {}
  setGain(gain: number, seconds: number): void {
    this.gains.push({ gain, seconds });
  }
  stop(seconds: number): void {
    this.stoppedIn = seconds;
  }
}

class FakeOutput implements AmbientOutput {
  loops: FakeLoop[] = [];
  shots: string[] = [];
  loaded = new Set<string>(['bed-forest-edge', 'bed-town', 'bed-pasture', 'hour-day', 'hour-dawn']);
  loop(id: string): LoopHandle | null {
    if (!this.loaded.has(id)) return null;
    const loop = new FakeLoop(id);
    this.loops.push(loop);
    return loop;
  }
  has(id: string): boolean {
    return this.loaded.has(id);
  }
  shot(id: string): void {
    this.shots.push(id);
  }
}

describe('AmbientPlayer', () => {
  it('plays the place bed and the hour layer, fading them in', () => {
    const output = new FakeOutput();
    const player = new AmbientPlayer(output, () => 0.5);
    player.update('forest-edge', 'day', 0, 0);
    expect(player.playing).toMatchObject({ bed: 'bed-forest-edge', hour: 'hour-day' });
    expect(output.loops[0]!.gains[0]!.seconds).toBe(CROSSFADE);
  });

  it('cross-fades forest to town over at least 2 s, with no silence and no hard cut', () => {
    const output = new FakeOutput();
    const player = new AmbientPlayer(output, () => 0.5);
    player.update('forest-edge', 'day', 0, 0);
    const forest = output.loops.find((loop) => loop.id === 'bed-forest-edge')!;
    for (let step = 1; step <= PLACE_HOLD; step += 1) player.update('town', 'day', 0, step * 0.25);
    const town = output.loops.find((loop) => loop.id === 'bed-town')!;
    expect(player.playing.bed).toBe('bed-town');
    // The forest goes down as the town comes up, over the same time.
    expect(forest.gains.at(-1)).toEqual({ gain: 0, seconds: CROSSFADE });
    expect(forest.stoppedIn).toBe(CROSSFADE);
    expect(town.gains[0]!.seconds).toBe(CROSSFADE);
    expect(CROSSFADE).toBeGreaterThanOrEqual(2);
    expect(town.gains[0]!.gain).toBeCloseTo(BED_LEVEL * 0.6);
  });

  it('does not change bed on a single reading at a border', () => {
    const output = new FakeOutput();
    const player = new AmbientPlayer(output, () => 0.5);
    player.update('forest-edge', 'day', 0, 0);
    player.update('town', 'day', 0, 0.25);
    player.update('forest-edge', 'day', 0, 0.5);
    player.update('town', 'day', 0, 0.75);
    expect(player.playing.bed).toBe('bed-forest-edge');
  });

  it('keeps the old bed playing while the new one has not loaded, then cross-fades', () => {
    const output = new FakeOutput();
    output.loaded.delete('bed-town');
    const player = new AmbientPlayer(output, () => 0.5);
    player.update('forest-edge', 'day', 0, 0);
    for (let step = 1; step <= PLACE_HOLD + 2; step += 1) player.update('town', 'day', 0, step * 0.25);
    expect(player.playing.bed).toBe('bed-forest-edge');
    output.loaded.add('bed-town');
    player.update('town', 'day', 0, 2);
    expect(player.playing.bed).toBe('bed-town');
  });

  it('plays the night layer of a night map, not the day one', () => {
    const output = new FakeOutput();
    output.loaded.add('hour-night');
    const player = new AmbientPlayer(output, () => 0.5);
    player.update('pasture', hourOf(22), 0, 0);
    expect(player.playing.hour).toBe('hour-night');
  });

  it('is silent where nothing is loaded, without an error', () => {
    const output = new FakeOutput();
    output.loaded.clear();
    const player = new AmbientPlayer(output, () => 0.5);
    expect(() => player.update('caatinga', 'dusk', 0, 0)).not.toThrow();
    expect(player.playing).toMatchObject({ bed: null, hour: null });
  });

  it('plays one-shots now and then, never the same twice in a row', () => {
    const output = new FakeOutput();
    for (const shot of ['bird-bem-te-vi', 'bird-gaviao', 'gust', 'horse']) output.loaded.add(shot);
    let seed = 7;
    const player = new AmbientPlayer(output, () => ((seed = (seed * 16807) % 2147483647) / 2147483647));
    for (let second = 0; second < 600; second += 0.25) player.update('pasture', 'day', 0, second);
    expect(output.shots.length).toBeGreaterThan(20);
    expect(output.shots.length).toBeLessThan(90);
    for (let index = 1; index < output.shots.length; index += 1) expect(output.shots[index]).not.toBe(output.shots[index - 1]);
  });
});
