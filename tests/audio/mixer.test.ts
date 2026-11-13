import { describe, expect, it } from 'vitest';
import { AudioEngine, DUCK_ATTACK, DUCK_LEVEL, DUCK_RELEASE, Mixer } from '../../apps/game/src/audio/mixer';
import { ShotAudio, SynthesizedGunshotOutput } from '../../apps/game/src/audio/ShotAudio';

// ambient-sound-and-voices 1.1: the mixer's buses and duck, on a fake
// context that records the graph and the gain automation.

interface Ramp {
  value: number;
  at: number;
}

class FakeParam {
  value = 1;
  ramps: Ramp[] = [];
  cancelScheduledValues(): this {
    this.ramps = [];
    return this;
  }
  setValueAtTime(value: number): this {
    this.value = value;
    return this;
  }
  linearRampToValueAtTime(value: number, at: number): this {
    this.ramps.push({ value, at });
    return this;
  }
}

class FakeNode {
  readonly outputs: FakeNode[] = [];
  readonly gain = new FakeParam();
  readonly playbackRate = new FakeParam();
  buffer: unknown = null;
  startedAt: number | null = null;
  constructor(readonly kind: string) {}
  connect(node: FakeNode): FakeNode {
    this.outputs.push(node);
    return node;
  }
  start(at: number): void {
    this.startedAt = at;
  }
}

class FakeContext {
  currentTime = 10;
  sampleRate = 8000;
  state = 'running';
  readonly destination = new FakeNode('destination');
  readonly sources: FakeNode[] = [];
  closed = false;
  createGain(): FakeNode {
    return new FakeNode('gain');
  }
  createBufferSource(): FakeNode {
    const source = new FakeNode('source');
    this.sources.push(source);
    return source;
  }
  createBuffer(_channels: number, length: number): { getChannelData: () => Float32Array } {
    const data = new Float32Array(length);
    return { getChannelData: () => data };
  }
  async resume(): Promise<void> {}
  async close(): Promise<void> {
    this.closed = true;
  }
}

/** Every node a node reaches, following its connections. */
function reaches(from: FakeNode, to: FakeNode): boolean {
  if (from === to) return true;
  return from.outputs.some((next) => reaches(next, to));
}

function mixerOn(context = new FakeContext()): { context: FakeContext; mixer: Mixer } {
  return { context, mixer: new Mixer(context as unknown as AudioContext) };
}

describe('Mixer', () => {
  it('puts the three buses under a master that reaches the speakers', () => {
    const { context, mixer } = mixerOn();
    for (const bus of ['effects', 'ambience', 'voices'] as const) {
      expect(reaches(mixer.input(bus) as unknown as FakeNode, context.destination)).toBe(true);
      expect(reaches(mixer.input(bus) as unknown as FakeNode, mixer.master as unknown as FakeNode)).toBe(true);
    }
    expect(reaches(mixer.priority as unknown as FakeNode, mixer.input('voices') as unknown as FakeNode)).toBe(true);
  });

  it('sets each bus apart and mutes the master', () => {
    const { mixer } = mixerOn();
    mixer.setVolume('ambience', 0);
    mixer.setVolume('voices', 2);
    expect(mixer.volume('ambience')).toBe(0);
    expect(mixer.volume('voices')).toBe(1);
    expect(mixer.volume('effects')).toBe(1);
    mixer.setMasterVolume(0.5);
    mixer.setMuted(true);
    expect(mixer.master.gain.value).toBe(0);
    mixer.setMuted(false);
    expect(mixer.master.gain.value).toBe(0.5);
  });

  it('lowers effects and ambience while an order line plays and brings them back within 1 s', () => {
    const { context, mixer } = mixerOn();
    const duckOf = (bus: 'effects' | 'ambience'): FakeParam =>
      (mixer.input(bus) as unknown as FakeNode).outputs[0]!.gain;
    const end = mixer.beginPriority();
    expect(mixer.ducked).toBe(true);
    for (const bus of ['effects', 'ambience'] as const) {
      expect(duckOf(bus).ramps).toEqual([{ value: DUCK_LEVEL, at: 10 + DUCK_ATTACK }]);
    }
    // The voices bus itself is not lowered.
    expect((mixer.input('voices') as unknown as FakeNode).gain.ramps).toEqual([]);

    context.currentTime = 12;
    end();
    expect(mixer.ducked).toBe(false);
    for (const bus of ['effects', 'ambience'] as const) {
      const ramp = duckOf(bus).ramps.at(-1)!;
      expect(ramp.value).toBe(1);
      expect(ramp.at - 12).toBeCloseTo(DUCK_RELEASE);
      expect(ramp.at - 12).toBeLessThan(1);
    }
  });

  it('holds the duck down until the last of two overlapping lines ends', () => {
    const { context, mixer } = mixerOn();
    const effects = (mixer.input('effects') as unknown as FakeNode).outputs[0]!.gain;
    const order = mixer.beginPriority();
    const answer = mixer.beginPriority();
    context.currentTime = 11;
    order();
    order();
    expect(mixer.ducked).toBe(true);
    expect(effects.ramps.at(-1)!.value).toBe(DUCK_LEVEL);
    answer();
    expect(mixer.ducked).toBe(false);
    expect(effects.ramps.at(-1)!.value).toBe(1);
  });
});

describe('Shots on the effects bus', () => {
  it('play as before, at the same volume and rate, now through the effects bus', async () => {
    const context = new FakeContext();
    const engine = new AudioEngine(() => context as unknown as AudioContext);
    const audio = new ShotAudio(new SynthesizedGunshotOutput(engine), { volume: 0.4 });
    await audio.unlock();
    audio.handleEvent({ type: 'shot', tick: 1, source: 1, target: 2, x: 0, y: 0, x2: 1, y2: 1, hit: true });
    const source = context.sources[0]!;
    const gain = source.outputs[0]!;
    expect(gain.gain.value).toBe(0.4);
    expect(source.startedAt).toBe(10);
    expect(gain.outputs[0]).toBe(engine.mixer!.input('effects'));
    // Not straight to the speakers any more.
    expect(gain.outputs).not.toContain(context.destination);
  });

  it('are lowered by an order line', async () => {
    const context = new FakeContext();
    const engine = new AudioEngine(() => context as unknown as AudioContext);
    const output = new SynthesizedGunshotOutput(engine);
    await output.unlock();
    output.play(1);
    const end = engine.mixer!.beginPriority();
    const duck = (engine.mixer!.input('effects') as unknown as FakeNode).outputs[0]!;
    expect(reaches(context.sources[0]!, duck)).toBe(true);
    expect(duck.gain.ramps.at(-1)!.value).toBe(DUCK_LEVEL);
    end();
  });

  it('leave a shared engine open on dispose, and close their own', async () => {
    const shared = new FakeContext();
    const engine = new AudioEngine(() => shared as unknown as AudioContext);
    const output = new SynthesizedGunshotOutput(engine);
    await output.unlock();
    output.dispose();
    expect(shared.closed).toBe(false);
    engine.dispose();
    expect(shared.closed).toBe(true);
  });
});
