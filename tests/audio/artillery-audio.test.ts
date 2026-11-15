import { describe, expect, it } from 'vitest';
import type { SimEvent } from '@prestes/shared';
import { burstSound, NEAR_BURST, shellSamples, WHISTLE_SECONDS, whistleOffset, type ShellSound } from '../../apps/game/src/audio/artillery-audio';
import { ShotAudio, type GunshotOutput } from '../../apps/game/src/audio/ShotAudio';

// add-artillery-bombardment 3.5: whistle and burst, by distance, through the mute.
class FakeOutput implements GunshotOutput {
  shells: Array<{ sound: ShellSound; volume: number; delay: number; offset: number }> = [];
  async unlock(): Promise<boolean> {
    return true;
  }
  play(): void {}
  playShell(sound: ShellSound, volume: number, delay: number, _pan: number, offset = 0): void {
    this.shells.push({ sound, volume, delay, offset });
  }
  dispose(): void {}
}

const incoming = (x: number, y: number, tick = 100): SimEvent => ({ type: 'shell_incoming', tick, gun: 'field-75', x, y, landsAt: tick + 20 });
const impact = (x: number, y: number, tick = 120): SimEvent => ({ type: 'shell_impact', tick, gun: 'field-75', x, y });
const listener = { x: 0, y: 0, span: 80, faction: 'column', factionOf: () => undefined };

async function audio(muted = false) {
  const output = new FakeOutput();
  const sound = new ShotAudio(output, { muted, now: () => 0 });
  await sound.unlock();
  sound.setListener(listener);
  return { output, sound };
}

describe('artillery sounds', () => {
  it('a whistle that ends as the shell lands, then a close burst', async () => {
    const { output, sound } = await audio();
    sound.handleEvent(incoming(30, 0));
    sound.handleEvent(impact(30, 0));
    expect(output.shells.map((entry) => entry.sound)).toEqual(['whistle', expect.stringMatching(/^burst-near-/)]);
    // 20 ticks at speed 1 is 2 s of flight: the whistle starts 0.2 s in, so it ends on the landing.
    expect(output.shells[0]!.offset).toBeCloseTo(WHISTLE_SECONDS - 2);
  });

  it('no whistle beyond 250 m; a distant rumble instead of a bang', async () => {
    const { output, sound } = await audio();
    sound.handleEvent(incoming(300, 0));
    sound.handleEvent(impact(300, 0));
    expect(output.shells.map((entry) => entry.sound)).toEqual([expect.stringMatching(/^burst-far-/)]);
  });

  it('muted: nothing is heard', async () => {
    const { output, sound } = await audio(true);
    sound.handleEvent(incoming(10, 0));
    sound.handleEvent(impact(10, 0));
    expect(output.shells).toEqual([]);
  });

  it('picks between two bursts from the shell itself, the same every time', () => {
    const picks = new Set(Array.from({ length: 20 }, (_, index) => burstSound(10, index * 3, 7, 50)));
    expect(picks).toEqual(new Set(['burst-near-a', 'burst-near-b']));
    expect(burstSound(10, 4, 7, 50)).toBe(burstSound(10, 4, 7, 50));
    expect(burstSound(NEAR_BURST + 1, 4, 7, 50)).toMatch(/^burst-far-/);
    expect(whistleOffset(5)).toBe(0);
  });

  it('the synthesized sounds are the same on every run and never clip', () => {
    const first = shellSamples(8000);
    const second = shellSamples(8000);
    for (const name of Object.keys(first) as ShellSound[]) {
      expect(second[name]).toEqual(first[name]);
      expect(Math.max(...first[name].map(Math.abs))).toBeLessThanOrEqual(1);
    }
  });
});
