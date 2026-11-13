import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AudioEngine } from '../../apps/game/src/audio/mixer';
import { audioSettings } from '../../apps/game/src/audio/settings-store';
import { AUDIO_DEFAULTS, parseAudioSettings } from '../../apps/game/src/storage';

// ambient-sound-and-voices 2.1: the mute and three channel volumes, their
// storage and the old one-volume setting.

class MemoryStorage {
  private readonly values = new Map<string, string>();
  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

describe('parseAudioSettings', () => {
  it('reads an older muted setting as muted, effects at full, the rest at defaults', () => {
    expect(parseAudioSettings({ muted: true, volume: 0.35 })).toEqual({ muted: true, effects: 1, ambience: AUDIO_DEFAULTS.ambience, voices: AUDIO_DEFAULTS.voices });
  });

  it('reads an older volume as the effects volume', () => {
    expect(parseAudioSettings({ muted: false, volume: 0.175 }).effects).toBeCloseTo(0.5);
    expect(parseAudioSettings({ volume: 0 }).effects).toBe(0);
    expect(parseAudioSettings({ volume: 1 }).effects).toBe(1);
  });

  it('reads the three channels when they are stored, ignoring the old volume', () => {
    expect(parseAudioSettings({ muted: false, volume: 0.35, effects: 0.2, ambience: 0, voices: 0.9 })).toEqual({ muted: false, effects: 0.2, ambience: 0, voices: 0.9 });
  });

  it('falls back to the defaults for nothing or nonsense, and clamps', () => {
    expect(parseAudioSettings(null)).toEqual(AUDIO_DEFAULTS);
    expect(parseAudioSettings('loud')).toEqual(AUDIO_DEFAULTS);
    expect(parseAudioSettings({ effects: 3, ambience: -1, voices: 'x' })).toEqual({ ...AUDIO_DEFAULTS, effects: 1, ambience: 0 });
  });
});

describe('the settings store', () => {
  let storage: MemoryStorage;
  beforeEach(() => {
    storage = new MemoryStorage();
    (globalThis as unknown as { window: unknown }).window = { localStorage: storage };
    audioSettings.reset();
  });
  afterEach(() => {
    delete (globalThis as unknown as { window?: unknown }).window;
    audioSettings.reset();
  });

  it('keeps an older muted game muted', () => {
    storage.setItem('prestes.audio.v1', JSON.stringify({ muted: true, volume: 0.35 }));
    expect(audioSettings.get().muted).toBe(true);
  });

  it('saves a channel change and the mute, and they survive a reload', () => {
    let calls = 0;
    const stop = audioSettings.subscribe(() => (calls += 1));
    audioSettings.setChannel('ambience', 0);
    audioSettings.toggleMuted();
    stop();
    expect(calls).toBe(2);
    audioSettings.reset();
    expect(audioSettings.get()).toEqual({ ...AUDIO_DEFAULTS, ambience: 0, muted: true });
    expect(JSON.parse(storage.getItem('prestes.audio.v1')!)).toEqual({ ...AUDIO_DEFAULTS, ambience: 0, muted: true });
  });
});

describe('AudioEngine levels', () => {
  class FakeParam {
    value = 1;
    cancelScheduledValues(): void {}
    setValueAtTime(): void {}
    linearRampToValueAtTime(): void {}
  }
  class FakeNode {
    gain = new FakeParam();
    connect(): void {}
  }
  const context = () =>
    ({ currentTime: 0, state: 'running', destination: new FakeNode(), createGain: () => new FakeNode(), close: async () => {} }) as unknown as AudioContext;

  it('applies levels set before the first unlock once the mixer exists', async () => {
    const engine = new AudioEngine(context);
    engine.setLevels(false, { effects: 0.5, ambience: 0, voices: 1 });
    await engine.unlock();
    expect(engine.mixer!.volume('effects')).toBe(0.5);
    expect(engine.mixer!.volume('ambience')).toBe(0);
    expect(engine.mixer!.volume('voices')).toBe(1);
  });

  it('mutes and unmutes the master after it exists', async () => {
    const engine = new AudioEngine(context);
    await engine.unlock();
    engine.setLevels(true, { effects: 1, ambience: 1, voices: 1 });
    expect(engine.mixer!.master.gain.value).toBe(0);
    engine.setLevels(false, { effects: 1, ambience: 1, voices: 1 });
    expect(engine.mixer!.master.gain.value).toBe(1);
  });
});
