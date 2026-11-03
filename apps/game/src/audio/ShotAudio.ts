import type { SimEvent } from '@prestes/shared';

export interface GunshotOutput {
  unlock(): Promise<boolean>;
  play(volume: number): void;
  dispose(): void;
}

interface ShotAudioOptions {
  muted?: boolean;
  volume?: number;
  maxVoices?: number;
  voiceMs?: number;
}

const MAX_SEEN = 512;

export class ShotAudio {
  private muted: boolean;
  private volume: number;
  private readonly maxVoices: number;
  private readonly voiceMs: number;
  private readonly seen = new Set<string>();
  private activeVoices = 0;
  private ready = false;
  private failed = false;

  constructor(
    private readonly output: GunshotOutput,
    options: ShotAudioOptions = {},
  ) {
    this.muted = options.muted ?? false;
    this.volume = options.volume ?? 0.35;
    this.maxVoices = options.maxVoices ?? 4;
    this.voiceMs = options.voiceMs ?? 350;
  }

  async unlock(): Promise<void> {
    if (this.ready || this.failed) {
      return;
    }
    try {
      this.ready = await this.output.unlock();
      this.failed = !this.ready;
    } catch {
      this.ready = false;
      this.failed = true;
    }
  }

  handleEvent(event: SimEvent): void {
    if (event.type !== 'shot' || this.muted || !this.ready) {
      return;
    }
    const key = `${event.tick}:${event.source}:${event.target}`;
    if (this.seen.has(key)) {
      return;
    }
    this.seen.add(key);
    if (this.seen.size > MAX_SEEN) {
      const oldest = this.seen.values().next().value;
      if (oldest !== undefined) {
        this.seen.delete(oldest);
      }
    }
    if (this.activeVoices >= this.maxVoices) {
      return;
    }
    this.activeVoices += 1;
    this.output.play(this.volume);
    globalThis.setTimeout(() => {
      this.activeVoices = Math.max(0, this.activeVoices - 1);
    }, this.voiceMs);
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
  }

  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
  }

  dispose(): void {
    this.output.dispose();
    this.ready = false;
  }
}

interface AudioContextConstructor {
  new (): AudioContext;
}

export class SynthesizedGunshotOutput implements GunshotOutput {
  private context: AudioContext | null = null;
  private buffer: AudioBuffer | null = null;

  async unlock(): Promise<boolean> {
    const Constructor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: AudioContextConstructor }).webkitAudioContext;
    if (!Constructor) {
      return false;
    }
    this.context ??= new Constructor();
    if (this.context.state === 'suspended') {
      await this.context.resume();
    }
    this.buffer ??= this.createBuffer(this.context);
    return true;
  }

  play(volume: number): void {
    if (!this.context || !this.buffer) {
      return;
    }
    const source = this.context.createBufferSource();
    const gain = this.context.createGain();
    source.buffer = this.buffer;
    gain.gain.value = volume;
    source.connect(gain);
    gain.connect(this.context.destination);
    source.start();
  }

  dispose(): void {
    void this.context?.close();
    this.context = null;
    this.buffer = null;
  }

  private createBuffer(context: AudioContext): AudioBuffer {
    const seconds = 0.55;
    const length = Math.floor(context.sampleRate * seconds);
    const buffer = context.createBuffer(1, length, context.sampleRate);
    const data = buffer.getChannelData(0);
    let filter = 0;
    for (let index = 0; index < length; index += 1) {
      const time = index / context.sampleRate;
      const noise = Math.random() * 2 - 1;
      filter = filter * 0.82 + noise * 0.18;
      const crack = time < 0.055 ? noise * 0.5 : 0;
      const thump = Math.sin(Math.PI * 2 * 76 * time) * Math.exp(-time * 16) * 0.32;
      const decay = Math.exp(-time * 7.5);
      data[index] = Math.max(-0.95, Math.min(0.95, (filter * 0.8 + crack + thump) * decay));
    }
    return buffer;
  }
}
