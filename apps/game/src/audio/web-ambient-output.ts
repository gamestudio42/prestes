import type { AmbientOutput, LoopHandle } from './ambient-player';
import { stepGrains, type FootstepOutput, type StepGrain } from './footsteps';
import type { AudioEngine } from './mixer';
import type { SoundBank } from './sound-bank';

/** The ambient player's sounds on the mixer's ambience bus (ambient-sound-and-voices 3.2). */
export class WebAmbientOutput implements AmbientOutput, FootstepOutput {
  /** The steps cut from each footstep recording, once it is loaded. */
  private readonly cut = new Map<string, StepGrain[]>();

  constructor(
    private readonly engine: AudioEngine,
    private readonly bank: SoundBank,
  ) {}

  loop(id: string): LoopHandle | null {
    const context = this.engine.context;
    const mixer = this.engine.mixer;
    const buffer = this.bank.get(id);
    if (!context || !mixer || !buffer) return null;
    const source = context.createBufferSource();
    const gain = context.createGain();
    const panner = context.createStereoPanner();
    source.buffer = buffer;
    source.loop = true;
    gain.gain.value = 0;
    source.connect(gain);
    gain.connect(panner);
    panner.connect(mixer.input('ambience'));
    // Each loop starts at its own point, so two beds never beat together.
    source.start(context.currentTime, Math.random() * buffer.duration);
    let stopped = false;
    return {
      setGain(value, seconds) {
        const now = context.currentTime;
        gain.gain.cancelScheduledValues(now);
        gain.gain.setValueAtTime(gain.gain.value, now);
        gain.gain.linearRampToValueAtTime(value, now + seconds);
      },
      setPan(value, seconds) {
        const now = context.currentTime;
        panner.pan.cancelScheduledValues(now);
        panner.pan.setValueAtTime(panner.pan.value, now);
        panner.pan.linearRampToValueAtTime(value, now + seconds);
      },
      stop(seconds) {
        if (stopped) return;
        stopped = true;
        source.stop(context.currentTime + seconds);
      },
    };
  }

  now(): number | null {
    return this.engine.context?.currentTime ?? null;
  }

  grains(id: string): readonly StepGrain[] | null {
    const cut = this.cut.get(id);
    if (cut) return cut;
    const buffer = this.bank.get(id);
    if (!buffer) return null;
    // A crawl is a long rustle of knees and elbows, not a heel's strike.
    const grains = id.startsWith('crawl') ? stepGrains(buffer.getChannelData(0), buffer.sampleRate, 0.3, 0.6) : stepGrains(buffer.getChannelData(0), buffer.sampleRate);
    this.cut.set(id, grains);
    return grains;
  }

  step(id: string, grain: StepGrain, when: number, volume: number, pan: number, rate: number): void {
    const context = this.engine.context;
    const mixer = this.engine.mixer;
    const buffer = this.bank.get(id);
    if (!context || !mixer || !buffer) return;
    const start = Math.max(when, context.currentTime);
    const length = grain.duration / rate;
    const source = context.createBufferSource();
    const gain = context.createGain();
    const panner = context.createStereoPanner();
    source.buffer = buffer;
    source.playbackRate.value = rate;
    // A short fade in and out: a step cut from a take never clicks.
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.004);
    gain.gain.setValueAtTime(volume, start + Math.max(0.005, length - 0.04));
    gain.gain.linearRampToValueAtTime(0, start + length);
    panner.pan.value = pan;
    source.connect(gain);
    gain.connect(panner);
    panner.connect(mixer.input('ambience'));
    source.start(start, grain.offset, grain.duration);
  }

  has(id: string): boolean {
    return this.bank.get(id) !== null;
  }

  shot(id: string, volume: number, pan: number): void {
    const context = this.engine.context;
    const mixer = this.engine.mixer;
    const buffer = this.bank.get(id);
    if (!context || !mixer || !buffer) return;
    const source = context.createBufferSource();
    const gain = context.createGain();
    const panner = context.createStereoPanner();
    source.buffer = buffer;
    gain.gain.value = volume;
    panner.pan.value = pan;
    source.connect(gain);
    gain.connect(panner);
    panner.connect(mixer.input('ambience'));
    source.start();
  }
}
