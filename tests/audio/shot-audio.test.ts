import { describe, expect, it } from 'vitest';
import type { SimEvent } from '@prestes/shared';
import { ShotAudio, type GunshotOutput } from '../../apps/game/src/audio/ShotAudio';

class FakeOutput implements GunshotOutput {
  plays = 0;
  disposed = false;
  constructor(private readonly ready = true) {}

  async unlock(): Promise<boolean> {
    return this.ready;
  }

  play(): void {
    this.plays += 1;
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

