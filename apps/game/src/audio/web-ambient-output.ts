import type { AmbientOutput, LoopHandle } from './ambient-player';
import type { AudioEngine } from './mixer';
import type { SoundBank } from './sound-bank';

/** The ambient player's sounds on the mixer's ambience bus (ambient-sound-and-voices 3.2). */
export class WebAmbientOutput implements AmbientOutput {
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
    source.buffer = buffer;
    source.loop = true;
    gain.gain.value = 0;
    source.connect(gain);
    gain.connect(mixer.input('ambience'));
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
      stop(seconds) {
        if (stopped) return;
        stopped = true;
        source.stop(context.currentTime + seconds);
      },
    };
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
