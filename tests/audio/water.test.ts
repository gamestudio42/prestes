import { describe, expect, it } from 'vitest';
import { STREAM_MAX_WIDTH, nearestWater, waterSoundKind, type BattleMap, type WaterArea } from '../../packages/shared/src';
import type { AmbientOutput, LoopHandle } from '../../apps/game/src/audio/ambient-player';
import type { ListeningPoint } from '../../apps/game/src/audio/listening';
import { WATER_RANGE, WATER_REACH, WaterPlayer, waterId } from '../../apps/game/src/audio/water-player';

// ambient-sound-and-voices 3.3: the nearest water of each kind, and the
// emitters that sound it.

const strip = (kind: WaterArea['kind'], width: number, points: { x: number; y: number }[]): WaterArea => ({ kind, strip: { points, width } });

// A test map: a wide river along y = 0 (deep from x -200 to 0, a ford from 0
// to 20, deep again beyond), a stream along x = 150, and a pond at (-100, 120).
const RIVER = 20;
const map = {
  water: [
    strip('deep', RIVER, [{ x: -200, y: 0 }, { x: 0, y: 0 }]),
    strip('ford', RIVER, [{ x: 0, y: 0 }, { x: 20, y: 0 }]),
    strip('deep', RIVER, [{ x: 20, y: 0 }, { x: 200, y: 0 }]),
    strip('deep', 4, [{ x: 150, y: 30 }, { x: 150, y: 300 }]),
    { kind: 'deep', polygon: [{ x: -110, y: 110 }, { x: -90, y: 110 }, { x: -90, y: 130 }, { x: -110, y: 130 }] },
  ] as WaterArea[],
} as Pick<BattleMap, 'water'>;

describe('waterSoundKind', () => {
  it('tells a river from a stream by width, a ford by its kind, a pond by its shape', () => {
    expect(waterSoundKind(strip('deep', STREAM_MAX_WIDTH + 1, [{ x: 0, y: 0 }, { x: 1, y: 0 }]))).toBe('river');
    expect(waterSoundKind(strip('deep', STREAM_MAX_WIDTH, [{ x: 0, y: 0 }, { x: 1, y: 0 }]))).toBe('stream');
    expect(waterSoundKind(strip('ford', 30, [{ x: 0, y: 0 }, { x: 1, y: 0 }]))).toBe('ford');
    expect(waterSoundKind(map.water[4]!)).toBe('pond');
    expect(waterSoundKind({ kind: 'ford', polygon: [] })).toBe('ford');
  });
});

describe('nearestWater', () => {
  it('measures to the water edge, with the nearest point on the near bank', () => {
    const [river] = nearestWater(map, -100, 40, 100);
    expect(river).toMatchObject({ kind: 'river', distance: 40 - RIVER / 2 });
    expect(river!.point.x).toBeCloseTo(-100);
    expect(river!.point.y).toBeCloseTo(RIVER / 2);
  });

  it('is at distance 0 on the water, at the point itself', () => {
    expect(nearestWater(map, -50, 3, 100)[0]).toEqual({ kind: 'river', point: { x: -50, y: 3 }, distance: 0 });
    expect(nearestWater(map, -100, 120, 5)[0]).toMatchObject({ kind: 'pond', distance: 0 });
  });

  it('finds nothing beyond the range', () => {
    expect(nearestWater(map, -100, 500, 100)).toEqual([]);
  });

  it('keeps one stretch for a river whose segments meet, and two for separate stretches', () => {
    // Across the ford the river's two deep segments are 20 m apart: the same water.
    expect(nearestWater(map, 10, 25, 100).filter((water) => water.kind === 'river').length).toBe(1);
    // Two rivers 80 m apart, heard from between them: two emitters.
    const two = { water: [strip('deep', RIVER, [{ x: -100, y: 0 }, { x: 100, y: 0 }]), strip('deep', RIVER, [{ x: -100, y: 80 }, { x: 100, y: 80 }])] } as Pick<BattleMap, 'water'>;
    expect(nearestWater(two, 0, 40, 100).length).toBe(2);
    // One long stretch: one emitter, however many segments.
    const long = { water: [strip('deep', RIVER, [{ x: -100, y: 0 }, { x: 0, y: 0 }]), strip('deep', RIVER, [{ x: 0, y: 0 }, { x: 100, y: 0 }])] } as Pick<BattleMap, 'water'>;
    expect(nearestWater(long, 0, 30, 100).length).toBe(1);
  });

  it('gives the ford and the river both, nearest first, at a ford', () => {
    const found = nearestWater(map, 10, 15, 60);
    expect(found[0]!.kind).toBe('ford');
    expect(found.some((water) => water.kind === 'river')).toBe(true);
  });
});

class FakeLoop implements LoopHandle {
  gain = 0;
  pan = 0;
  stopped = false;
  constructor(readonly id: string) {}
  setGain(gain: number): void {
    this.gain = gain;
  }
  setPan(pan: number): void {
    this.pan = pan;
  }
  stop(): void {
    this.stopped = true;
  }
}

class FakeOutput implements AmbientOutput {
  loops: FakeLoop[] = [];
  loop(id: string): LoopHandle | null {
    const loop = new FakeLoop(id);
    this.loops.push(loop);
    return loop;
  }
  has(): boolean {
    return true;
  }
  shot(): void {}
  live(id: string): FakeLoop[] {
    return this.loops.filter((loop) => loop.id === id && !loop.stopped);
  }
}

const NEAR = 25;
const at = (x: number, y: number, span = NEAR): ListeningPoint => ({ x, y, span, right: { x: 1, y: 0 } });

function hearAt(player: WaterPlayer, point: ListeningPoint): void {
  player.update(nearestWater(map, point.x, point.y, WATER_REACH), point);
}

describe('WaterPlayer', () => {
  it('plays a different sound 10 m from a wide river and 10 m from a narrow stream', () => {
    const output = new FakeOutput();
    const player = new WaterPlayer(output);
    hearAt(player, at(-100, -(RIVER / 2 + 10)));
    expect(output.live(waterId('river')).length).toBe(1);
    expect(output.live(waterId('stream')).length).toBe(0);
    hearAt(player, at(150 + 2 + 10, 200));
    expect(output.live(waterId('stream')).length).toBe(1);
    expect(output.live(waterId('river')).length).toBe(0);
  });

  it('changes from the deep sound to the shallow one along the river towards the ford', () => {
    const output = new FakeOutput();
    const player = new WaterPlayer(output);
    const gains: { river: number; ford: number }[] = [];
    for (let x = -120; x <= 10; x += 10) {
      hearAt(player, at(x, -RIVER / 2 - 5));
      const sum = (id: string) => output.live(id).reduce((total, loop) => total + loop.gain, 0);
      gains.push({ river: sum(waterId('river')), ford: sum(waterId('ford')) });
    }
    expect(gains[0]!.ford).toBe(0);
    expect(gains[0]!.river).toBeGreaterThan(0);
    expect(gains.at(-1)!.ford).toBeGreaterThan(gains.at(-1)!.river);
    // The ford rises steadily over the stretch between: no jump from nothing to all.
    for (let index = 1; index < gains.length; index += 1) expect(gains[index]!.ford).toBeGreaterThanOrEqual(gains[index - 1]!.ford);
    expect(gains.filter((gain) => gain.ford > 0 && gain.river > 0).length).toBeGreaterThan(2);
  });

  it('is silent where no water is in range, and stops the loops it no longer needs', () => {
    const output = new FakeOutput();
    const player = new WaterPlayer(output);
    hearAt(player, at(-100, -20));
    expect(player.playing).toContain('river:0');
    hearAt(player, at(-100, -20 - WATER_RANGE.river - 200));
    expect(player.playing).toEqual([]);
    expect(output.loops.every((loop) => loop.stopped)).toBe(true);
  });

  it('pans a river on the left of the screen to the left, and centres it when standing in it', () => {
    const output = new FakeOutput();
    const player = new WaterPlayer(output);
    // The stream runs along x = 150; the listener stands 12 m east of it.
    hearAt(player, at(164, 200));
    expect(output.live(waterId('stream'))[0]!.pan).toBeLessThan(0);
    hearAt(player, at(150, 200));
    expect(output.live(waterId('stream'))[0]!.pan).toBe(0);
  });

  it('starts nothing for a kind whose file is not loaded', () => {
    const output = new FakeOutput();
    output.loop = () => null;
    const player = new WaterPlayer(output);
    expect(() => hearAt(player, at(-100, -15))).not.toThrow();
    expect(player.playing).toEqual([]);
  });
});
