import { describe, expect, it } from 'vitest';
import type { SimEvent } from '@prestes/shared';
import { BOLT_DELAY, BOLT_LEVEL, ShotAudio, shotRate, type GunshotOutput } from '../../apps/game/src/audio/ShotAudio';

class FakeOutput implements GunshotOutput {
  plays = 0;
  rates: number[] = [];
  bolts: Array<{ volume: number; delay: number }> = [];
  disposed = false;
  constructor(private readonly ready = true) {}

  async unlock(): Promise<boolean> {
    return this.ready;
  }

  play(_volume: number, rate = 1): void {
    this.plays += 1;
    this.rates.push(rate);
  }

  playBolt(volume: number, delay: number): void {
    this.bolts.push({ volume, delay });
  }

  dispose(): void {
    this.disposed = true;
  }
}

function shot(tick: number, source = 1, target = 2): SimEvent {
  return {
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
    audio.handleEvent(shot(2, 3));
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

