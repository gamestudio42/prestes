import { describe, expect, it } from 'vitest';
import type { SimEvent } from '@prestes/shared';
import {
  AUTOMATIC_REPORT,
  BOLT_DELAY,
  BOLT_LEVEL,
  MACHINE_GUN_GAIN,
  MACHINE_GUN_PITCH_SPREAD,
  MACHINE_GUN_REPORT,
  ShotAudio,
  shotLoudness,
  shotRate,
  synthesizeReport,
  type GunshotOutput,
  type ShotSound,
} from '../../apps/game/src/audio/ShotAudio';

class FakeOutput implements GunshotOutput {
  plays = 0;
  rates: number[] = [];
  sounds: Array<{ sound: ShotSound; delay: number; volume: number }> = [];
  bolts: Array<{ volume: number; delay: number }> = [];
  disposed = false;
  constructor(private readonly ready = true) {}

  async unlock(): Promise<boolean> {
    return this.ready;
  }

  play(volume: number, rate = 1, sound: ShotSound = 'rifle', delay = 0): void {
    this.plays += 1;
    this.rates.push(rate);
    this.sounds.push({ sound, delay, volume });
  }

  playBolt(volume: number, delay: number): void {
    this.bolts.push({ volume, delay });
  }

  dispose(): void {
    this.disposed = true;
  }
}

function shot(tick: number, source = 1, target = 2, burstStart?: boolean): SimEvent {
  return {
    ...(burstStart !== undefined ? { burstStart } : {}),
    type: 'shot',
    tick,
    source,
    target,
    x: 0,
    y: 0,
    x2: 1,
    y2: 1,
    hit: true,
  };
}

describe('ShotAudio', () => {
  it('works the bolt after each shot, softer, and varies the pitch repeatably', async () => {
    const output = new FakeOutput();
    const audio = new ShotAudio(output, { maxVoices: 4, volume: 0.5 });
    await audio.unlock();
    audio.handleEvent(shot(1));
    audio.handleEvent(shot(1, 3));
    expect(output.bolts).toEqual([
      { volume: 0.5 * BOLT_LEVEL, delay: BOLT_DELAY },
      { volume: 0.5 * BOLT_LEVEL, delay: BOLT_DELAY },
    ]);
    for (const rate of output.rates) {
      expect(rate).toBeGreaterThanOrEqual(0.94);
      expect(rate).toBeLessThanOrEqual(1.06);
    }
    expect(shotRate('1:1:2')).toBe(shotRate('1:1:2'));
  });

  it('plays once per shot event and deduplicates repeats', async () => {
    const output = new FakeOutput();
    const audio = new ShotAudio(output, { maxVoices: 4 });
    await audio.unlock();
    audio.handleEvent(shot(1));
    audio.handleEvent(shot(1));
    expect(output.plays).toBe(1);
  });

  it('caps concurrent voices and releases them after the voice window', async () => {
    const output = new FakeOutput();
    const audio = new ShotAudio(output, { maxVoices: 2, voiceMs: 5 });
    await audio.unlock();
    audio.handleEvent(shot(1));
    audio.handleEvent(shot(2));
    audio.handleEvent(shot(3));
    expect(output.plays).toBe(2);
    await new Promise((resolve) => globalThis.setTimeout(resolve, 15));
    audio.handleEvent(shot(4));
    expect(output.plays).toBe(3);
  });

  it('stays silent when muted, locked or missing an asset', async () => {
    const mutedOutput = new FakeOutput();
    const muted = new ShotAudio(mutedOutput, { muted: true });
    await muted.unlock();
    muted.handleEvent(shot(1));
    expect(mutedOutput.plays).toBe(0);

    const missingOutput = new FakeOutput(false);
    const missing = new ShotAudio(missingOutput);
    await missing.unlock();
    missing.handleEvent(shot(2));
    expect(missingOutput.plays).toBe(0);

    const lockedOutput = new FakeOutput();
    const locked = new ShotAudio(lockedOutput);
    locked.handleEvent(shot(3));
    expect(lockedOutput.plays).toBe(0);
  });

  it('disposes the browser output', () => {
    const output = new FakeOutput();
    const audio = new ShotAudio(output);
    audio.dispose();
    expect(output.disposed).toBe(true);
  });
});

describe('ShotAudio listener', () => {
  const listener = (factions: Record<number, string>) => ({
    x: 0,
    y: 0,
    span: 80,
    faction: 'column',
    factionOf: (id: number) => factions[id],
  });

  it('plays shots in view at full volume and far ones faintly', () => {
    expect(shotLoudness(listener({}), 10, 10)).toBe(1);
    expect(shotLoudness(listener({}), 200, 0)).toBeLessThan(0.1);
    expect(shotLoudness(null, 500, 500)).toBe(1);
  });

  it('works the bolt only for the player own rifles', async () => {
    const output = new FakeOutput();
    const audio = new ShotAudio(output, { maxVoices: 8 });
    await audio.unlock();
    audio.setListener(listener({ 1: 'column', 9: 'target' }));
    audio.handleEvent(shot(1, 1, 9));
    audio.handleEvent(shot(2, 9, 1));
    expect(output.plays).toBe(2);
    expect(output.bolts).toHaveLength(1);
  });
});


describe('automatic fire (machine-gun-fire-feedback 4.1, 4.2)', () => {
  const weapons: Record<number, string> = { 1: 'metralhadora-7mm', 2: 'mauser-7mm', 3: 'fuzil-automatico-7mm', 4: 'metralhadora-7mm', 5: 'metralhadora-7mm' };
  const listener = {
    x: 0,
    y: 0,
    span: 80,
    faction: 'column',
    factionOf: () => 'column',
    weaponOf: (id: number) => weapons[id] as never,
  };
  const burst = (from: number, source: number) => [0, 1, 2, 3, 4, 5].map((round) => shot(from + round, source, 9, round === 0));

  it('a burst is heard as a burst: six reports a tick apart, no bolt', async () => {
    let now = 1000;
    const output = new FakeOutput();
    const audio = new ShotAudio(output, { now: () => now });
    await audio.unlock();
    audio.setListener(listener);
    // The rounds arrive two ticks to a frame, 200 ms apart.
    const rounds = burst(10, 1);
    for (let index = 0; index < rounds.length; index += 2) {
      audio.handleEvent(rounds[index]!);
      audio.handleEvent(rounds[index + 1]!);
      now += 200;
    }
    expect(output.sounds.map((entry) => entry.sound)).toEqual(Array(6).fill('machine-gun'));
    // Each pair: the first at once, the second 100 ms later.
    expect(output.sounds.map((entry) => Number(entry.delay.toFixed(2)))).toEqual([0, 0.1, 0, 0.1, 0, 0.1]);
    expect(output.bolts).toHaveLength(0);
  });

  it('spreads the rounds over a frame at a higher game speed', async () => {
    const output = new FakeOutput();
    const audio = new ShotAudio(output, { now: () => 0 });
    await audio.unlock();
    audio.setListener(listener);
    audio.setSpeed(4);
    for (const event of burst(10, 1)) audio.handleEvent(event);
    expect(output.sounds.map((entry) => Number(entry.delay.toFixed(3)))).toEqual([0, 0.025, 0.05, 0.075, 0.1, 0.125]);
  });

  it('weapons sound different', async () => {
    const output = new FakeOutput();
    const audio = new ShotAudio(output, { now: () => 0 });
    await audio.unlock();
    audio.setListener(listener);
    audio.handleEvent(shot(1, 2));
    audio.handleEvent(shot(1, 3, 9, true));
    audio.handleEvent(shot(1, 1, 9, true));
    expect(output.sounds.map((entry) => entry.sound)).toEqual(['rifle', 'automatic', 'machine-gun']);
    // Only the Mauser works a bolt.
    expect(output.bolts).toHaveLength(1);
    // The gun is louder than a rifle and keeps an almost steady pitch.
    const [rifle, , gun] = output.sounds;
    expect(gun!.volume).toBeCloseTo(rifle!.volume * MACHINE_GUN_GAIN);
    expect(Math.abs(output.rates[2]! - 1)).toBeLessThanOrEqual(0.06 * MACHINE_GUN_PITCH_SPREAD + 1e-9);
  });

  it('rifles are heard under the guns: bursts take their own voices', async () => {
    const output = new FakeOutput();
    const audio = new ShotAudio(output, { now: () => 0, maxVoices: 4, automaticVoices: 2 });
    await audio.unlock();
    audio.setListener(listener);
    for (const source of [1, 4, 5]) audio.handleEvent(shot(1, source, 9, true));
    audio.handleEvent(shot(1, 2));
    audio.handleEvent(shot(2, 1, 9, false));
    // Two guns get voices, the third burst is not heard; the rifle and the first gun's next round are.
    expect(output.sounds.map((entry) => entry.sound)).toEqual(['machine-gun', 'machine-gun', 'rifle', 'machine-gun']);
  });

  it('synthesizes the reports the same on every run, and the two apart', () => {
    const gun = synthesizeReport(44100, MACHINE_GUN_REPORT);
    expect(synthesizeReport(44100, MACHINE_GUN_REPORT)).toEqual(gun);
    const automatic = synthesizeReport(44100, AUTOMATIC_REPORT);
    expect(automatic.length).toBeLessThan(gun.length);
    expect(Math.max(...gun.map(Math.abs))).toBeGreaterThan(0.2);
    expect(Math.max(...gun.map(Math.abs))).toBeLessThanOrEqual(0.95);
    expect(Array.from(automatic.slice(0, 2000))).not.toEqual(Array.from(gun.slice(0, 2000)));
    // Short enough to follow one round every tick.
    expect(gun.length / 44100).toBeLessThanOrEqual(0.2);
  });
});
