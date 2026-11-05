import type { SimEvent } from '@prestes/shared';

export interface GunshotOutput {
  unlock(): Promise<boolean>;
  /** One shot; `rate` shifts the pitch a little so a volley does not repeat. */
  play(volume: number, rate?: number): void;
  /** The rifle's bolt worked `delay` seconds later (outputs that have it). */
  playBolt?(volume: number, delay: number, rate?: number): void;
  dispose(): void;
}

/** The bolt follows a shot like in the recording, 1.3 s later; louder than
 * there (the user could not hear it under a volley). */
export const BOLT_DELAY = 1.3;
export const BOLT_LEVEL = 0.8;

/** A repeatable playback rate in [0.94, 1.06] for a shot key. */
export function shotRate(key: string): number {
  let hash = 2166136261;
  for (let index = 0; index < key.length; index += 1) {
    hash = Math.imul(hash ^ key.charCodeAt(index), 16777619);
  }
  return 0.94 + ((hash >>> 0) / 4294967296) * 0.12;
}

interface ShotAudioOptions {
  muted?: boolean;
  volume?: number;
  maxVoices?: number;
  voiceMs?: number;
}

const MAX_SEEN = 512;

/** Where the player is looking: shots far from it are heard faintly. */
export interface AudioListener {
  x: number;
  y: number;
  /** Ground metres across the view. */
  span: number;
  /** The player's side: only its rifles' bolts are heard. */
  faction: string;
  /** Faction of a unit by id (the shooter's side). */
  factionOf: (unitId: number) => string | undefined;
}

/**
 * Loudness of a shot for the listener: full inside the view, falling off as
 * the square of distance beyond it, never quite silent (8%).
 */
export function shotLoudness(listener: AudioListener | null, x: number, y: number): number {
  if (!listener) return 1;
  const reach = listener.span * 0.6;
  const distance = Math.sqrt((x - listener.x) ** 2 + (y - listener.y) ** 2);
  return distance <= reach ? 1 : Math.max(0.08, (reach / distance) ** 2);
}

export class ShotAudio {
  private muted: boolean;
  private volume: number;
  private readonly maxVoices: number;
  private readonly voiceMs: number;
  private readonly seen = new Set<string>();
  private activeVoices = 0;
  private listener: AudioListener | null = null;
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
    const rate = shotRate(key);
    const loudness = shotLoudness(this.listener, event.x, event.y);
    this.output.play(this.volume * loudness, rate);
    // Only the player's own rifles are heard working their bolts: the enemy's
    // would double every shot into noise.
    const side = this.listener?.factionOf(event.source);
    if (!this.listener || side === this.listener.faction) {
      this.output.playBolt?.(this.volume * BOLT_LEVEL * loudness, BOLT_DELAY, rate);
    }
    globalThis.setTimeout(() => {
      this.activeVoices = Math.max(0, this.activeVoices - 1);
    }, this.voiceMs);
  }

  /** The view the player hears from (set every frame by the canvas). */
  setListener(listener: AudioListener | null): void {
    this.listener = listener;
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

async function openContext(existing: AudioContext | null): Promise<AudioContext | null> {
  const Constructor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: AudioContextConstructor }).webkitAudioContext;
  if (!Constructor) {
    return null;
  }
  const context = existing ?? new Constructor();
  if (context.state === 'suspended') {
    await context.resume();
  }
  return context;
}

function playBuffer(context: AudioContext, buffer: AudioBuffer, volume: number, rate = 1, delay = 0): void {
  const source = context.createBufferSource();
  const gain = context.createGain();
  source.buffer = buffer;
  source.playbackRate.value = rate;
  gain.gain.value = volume;
  source.connect(gain);
  gain.connect(context.destination);
  source.start(context.currentTime + delay);
}

/**
 * The Mauser recorded by the project owner: the shot, then the bolt worked
 * 1.3 s later. Falls back to the synthesized shot if the files do not load.
 */
export class RecordedGunshotOutput implements GunshotOutput {
  private context: AudioContext | null = null;
  private shot: AudioBuffer | null = null;
  private bolt: AudioBuffer | null = null;

  constructor(private readonly base = './audio/') {}

  async unlock(): Promise<boolean> {
    this.context = await openContext(this.context);
    if (!this.context) {
      return false;
    }
    if (!this.shot) {
      const [shot, bolt] = await Promise.all([
        this.load('mauser-shot.wav'),
        this.load('mauser-bolt.wav'),
      ]);
      this.shot = shot ?? synthesizeGunshot(this.context);
      this.bolt = bolt;
    }
    return true;
  }

  play(volume: number, rate = 1): void {
    if (this.context && this.shot) playBuffer(this.context, this.shot, volume, rate);
  }

  playBolt(volume: number, delay: number, rate = 1): void {
    if (this.context && this.bolt) playBuffer(this.context, this.bolt, volume, rate, delay);
  }

  dispose(): void {
    void this.context?.close();
    this.context = null;
    this.shot = null;
    this.bolt = null;
  }

  private async load(file: string): Promise<AudioBuffer | null> {
    try {
      const response = await fetch(`${this.base}${file}`);
      if (!response.ok) return null;
      return await this.context!.decodeAudioData(await response.arrayBuffer());
    } catch {
      return null;
    }
  }
}

/** A procedural shot, used when the recording is not available. */
export class SynthesizedGunshotOutput implements GunshotOutput {
  private context: AudioContext | null = null;
  private buffer: AudioBuffer | null = null;

  async unlock(): Promise<boolean> {
    this.context = await openContext(this.context);
    if (!this.context) {
      return false;
    }
    this.buffer ??= synthesizeGunshot(this.context);
    return true;
  }

  play(volume: number, rate = 1): void {
    if (this.context && this.buffer) playBuffer(this.context, this.buffer, volume, rate);
  }

  dispose(): void {
    void this.context?.close();
    this.context = null;
    this.buffer = null;
  }
}

function synthesizeGunshot(context: AudioContext): AudioBuffer {
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
