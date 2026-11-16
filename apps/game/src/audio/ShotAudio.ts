import { getWeapon, type Frame, type SimEvent, type WeaponId } from '@prestes/shared';
import { publicUrl } from '@prestes/shared';
import { panAt } from './listening';
import { AudioEngine } from './mixer';
import { burstLoudness, burstSound, shellSamples, WHISTLE_CUTOFF, whistleOffset, type ShellSound } from './artillery-audio';

/**
 * machine-gun-fire-feedback 4.1: the sound of a kind of fire. Rifles and
 * pistols use the Mauser recording; the automatic rifle and the machine gun
 * have synthesized reports of their own.
 */
export type ShotSound = 'rifle' | 'automatic' | 'machine-gun';

export interface GunshotOutput {
  unlock(): Promise<boolean>;
  /**
   * One shot; `rate` shifts the pitch a little so a volley does not repeat,
   * `sound` picks the weapon's report, `delay` (s) schedules it and `pan`
   * (-1 left to +1 right) places it.
   */
  play(volume: number, rate?: number, sound?: ShotSound, delay?: number, pan?: number): void;
  /** The rifle's bolt worked `delay` seconds later (outputs that have it). */
  playBolt?(volume: number, delay: number, rate?: number, pan?: number): void;
  /** A round passing close by: whizz `variant` of {@link WHIZZ_PROFILES} (outputs that have it). */
  playWhizz?(volume: number, variant: number, delay: number, rate?: number, pan?: number): void;
  /** add-artillery-bombardment 3.5: a shell's whistle or burst, `offset` seconds into the sound (outputs that have it). */
  playShell?(sound: ShellSound, volume: number, delay: number, pan: number, offset?: number): void;
  dispose(): void;
}

/**
 * The owner (2026-11-15): the player's men under fire hear the rounds go
 * past. Only the player's own (the enemy's would double every volley), only
 * misses aimed at one of them, only on screen, and thinned so a machine gun
 * is a few cracks overhead rather than a hiss.
 */
export const WHIZZ_LEVEL = 0.75;
/** A whizz lasts about this long (ms); it holds a voice for that time. */
export const WHIZZ_MS = 320;
/** Whizzes heard at once. */
export const WHIZZ_VOICES = 2;
/** At least this long between any two whizzes (ms). */
export const WHIZZ_GAP_MS = 140;
/** At least this long between two whizzes at the same man (ms), and while he is pinned or keeps his head down. */
export const WHIZZ_MAN_GAP_MS = 500;
export const WHIZZ_MAN_GAP_PRESSED_MS = 220;
/** Share of the misses at a steady man that are heard; every one at a pressed man. */
export const WHIZZ_CHANCE = 0.6;
/** The whizz follows the report a moment, as the round arrives (s). */
export const WHIZZ_AFTER = 0.03;

/**
 * Whether a round landing at (x, y) is heard going past: inside the view, the
 * same reach where shots are heard at full loudness. Without a listener, no.
 */
export function whizzHeard(listener: AudioListener | null, x: number, y: number): boolean {
  if (!listener) return false;
  const reach = listener.span * 0.6;
  return (x - listener.x) ** 2 + (y - listener.y) ** 2 <= reach * reach;
}

/** The bolt follows a shot like in the recording, 1.3 s later; louder than
 * there (the user could not hear it under a volley). */
export const BOLT_DELAY = 1.3;
export const BOLT_LEVEL = 0.8;
/** Seconds a simulation tick lasts at game speed 1. */
export const TICK_SECONDS = 0.1;
/** A burst holds its voice this long after its last round (ms). */
export const BURST_TAIL_MS = 300;
/** Automatic fire heard at once: bursts, each one voice (machine-gun-fire-feedback 4.2). */
export const AUTOMATIC_VOICES = 2;
/**
 * User, 2026-11-09: the gun could not be told from rifles by ear. Its rounds
 * play louder than a rifle's and at an almost steady pitch, so a burst is a
 * mechanical rattle rather than a ragged volley.
 */
export const MACHINE_GUN_GAIN = 1.5;
export const MACHINE_GUN_PITCH_SPREAD = 0.25;

/** A repeatable playback rate in [0.94, 1.06] for a shot key. */
export function shotRate(key: string): number {
  let hash = 2166136261;
  for (let index = 0; index < key.length; index += 1) {
    hash = Math.imul(hash ^ key.charCodeAt(index), 16777619);
  }
  return 0.94 + ((hash >>> 0) / 4294967296) * 0.12;
}

/** The sound a weapon makes; without a known weapon, a burst round is automatic fire. */
export function shotSound(weaponId: WeaponId | undefined, event: { burstStart?: boolean }): ShotSound {
  const weapon = weaponId ? getWeapon(weaponId) : null;
  if (weapon) {
    if (weapon.fire === 'belt') return 'machine-gun';
    if (weapon.fire === 'burst') return 'automatic';
    return 'rifle';
  }
  return event.burstStart !== undefined ? 'automatic' : 'rifle';
}

interface ShotAudioOptions {
  muted?: boolean;
  volume?: number;
  maxVoices?: number;
  voiceMs?: number;
  automaticVoices?: number;
  /** Wall clock in ms (tests pass their own). */
  now?: () => number;
}

const MAX_SEEN = 512;

/** Where the player is looking: shots far from it are heard faintly. */
export interface AudioListener {
  x: number;
  y: number;
  /** Ground metres across the view. */
  span: number;
  /** The screen's rightward direction on the ground (ambient-sound-and-voices 1.2), for panning. */
  right?: { x: number; y: number };
  /** The player's side: only its rifles' bolts are heard. */
  faction: string;
  /** Faction of a unit by id (the shooter's side). */
  factionOf: (unitId: number) => string | undefined;
  /** Weapon of a unit by id (the shooter's), for the sound of his fire. */
  weaponOf?: (unitId: number) => WeaponId | undefined;
  /** The frame on screen, for the sounds of the men themselves (wading, 3.4); its tick paces their footsteps. */
  frame?: Pick<Frame, 'units' | 'seen' | 'fog'> & { tick?: number };
}

/**
 * ambient-sound-and-voices 1.2, the owner (2026-11-13): shots are panned left
 * or right by where they lie on screen, like every positioned sound; their
 * loudness keeps its own rule below. Centred when the view gives no right.
 */
export function shotPan(listener: AudioListener | null, x: number, y: number): number {
  if (!listener?.right) return 0;
  return panAt({ x: listener.x, y: listener.y, span: listener.span, right: listener.right }, x, y);
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
  private readonly automaticVoices: number;
  private readonly now: () => number;
  private readonly seen = new Set<string>();
  private activeVoices = 0;
  /** Automatic fire: each shooter's burst voice and when it ends (ms). */
  private readonly bursts = new Map<number, number>();
  /** The tick the current run of events is timed from, and when it was heard (ms). */
  private clockTick: number | null = null;
  private clockAt = 0;
  private tickSeconds = TICK_SECONDS;
  /** Scheduled whizzes (ms, wall clock), and each man's last one. */
  private whizzes: number[] = [];
  private readonly whizzAt = new Map<number, number>();
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
    this.automaticVoices = options.automaticVoices ?? AUTOMATIC_VOICES;
    this.now = options.now ?? (() => globalThis.performance?.now() ?? Date.now());
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
    if ((event.type === 'shell_incoming' || event.type === 'shell_impact') && !this.muted && this.ready) {
      this.shell(event);
      return;
    }
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
    const sound = shotSound(this.listener?.weaponOf?.(event.source), event);
    const delay = this.delayFor(event.tick);
    const rate = shotRate(key);
    const loudness = shotLoudness(this.listener, event.x, event.y);
    const pan = shotPan(this.listener, event.x, event.y);
    this.whizz(event, key, delay, rate);
    if (sound !== 'rifle') {
      // Every round of a burst is heard, spaced as it was fired; a burst
      // holds one voice of the automatic budget, so rifles still sound.
      if (!this.burstVoice(event.source, delay)) return;
      const gun = sound === 'machine-gun';
      const gain = gun ? MACHINE_GUN_GAIN : 1;
      const pitch = gun ? 1 + (rate - 1) * MACHINE_GUN_PITCH_SPREAD : rate;
      this.output.play(Math.min(1, this.volume * gain) * loudness, pitch, sound, delay, pan);
      return;
    }
    if (this.activeVoices >= this.maxVoices) {
      return;
    }
    this.activeVoices += 1;
    this.output.play(this.volume * loudness, rate, 'rifle', delay, pan);
    // Only the player's own bolt-action rifles are heard working their bolts:
    // the enemy's would double every shot into noise.
    const side = this.listener?.factionOf(event.source);
    const weaponId = this.listener?.weaponOf?.(event.source);
    const boltAction = weaponId === undefined || getWeapon(weaponId)?.kind === 'bolt-rifle';
    if (boltAction && (!this.listener || side === this.listener.faction)) {
      this.output.playBolt?.(this.volume * BOLT_LEVEL * loudness, BOLT_DELAY + delay, rate, pan);
    }
    globalThis.setTimeout(() => {
      this.activeVoices = Math.max(0, this.activeVoices - 1);
    }, this.voiceMs);
  }

  /**
   * add-artillery-bombardment 3.5: the whistle of a shell on its way, timed to
   * end as it lands (none beyond WHISTLE_CUTOFF), and its burst, near or far.
   */
  private shell(event: Extract<SimEvent, { type: 'shell_incoming' | 'shell_impact' }>): void {
    const key = `${event.type}:${event.tick}:${event.x}:${event.y}`;
    if (this.seen.has(key)) return;
    this.seen.add(key);
    const distance = this.listener ? Math.hypot(event.x - this.listener.x, event.y - this.listener.y) : 0;
    const delay = this.delayFor(event.tick);
    const pan = shotPan(this.listener, event.x, event.y);
    if (event.type === 'shell_incoming') {
      if (distance > WHISTLE_CUTOFF) return;
      const flight = (event.landsAt - event.tick) * this.tickSeconds;
      this.output.playShell?.('whistle', this.volume * 0.8 * burstLoudness(distance), delay, pan, whistleOffset(flight));
      return;
    }
    this.output.playShell?.(burstSound(distance, event.x, event.y, event.tick), Math.min(1, this.volume * 2.2 * burstLoudness(distance)), delay, pan);
  }

  /**
   * Seconds after now to play a round fired on `tick`: events arrive in
   * batches of ticks, and a burst's rounds keep their spacing at the game
   * speed in use. A tick whose moment has already passed starts a new run.
   */
  private delayFor(tick: number): number {
    const now = this.now();
    if (this.clockTick !== null && tick >= this.clockTick) {
      const at = this.clockAt + (tick - this.clockTick) * this.tickSeconds * 1000;
      if (at >= now - 1) return Math.max(0, (at - now) / 1000);
    }
    this.clockTick = tick;
    this.clockAt = now;
    return 0;
  }

  /**
   * A miss at one of the player's men, on screen, is heard passing him: at
   * his place, thinned by the gaps and voices above. Every round of a burst
   * may be the one heard; a pressed man hears them closer together.
   */
  private whizz(event: Extract<SimEvent, { type: 'shot' }>, key: string, delay: number, rate: number): void {
    const listener = this.listener;
    if (!listener || !this.output.playWhizz || event.hit || event.target < 0) return;
    if (listener.factionOf(event.target) !== listener.faction) return;
    if (listener.factionOf(event.source) === listener.faction) return;
    if (!whizzHeard(listener, event.x2, event.y2)) return;
    const man = listener.frame?.units.find((unit) => unit.id === event.target);
    const pressed = man !== undefined && (man.suppressed || man.state !== 'steady');
    // A second hash of the key, apart from the pitch's, picks and thins.
    const roll = (shotRate(`${key}:whizz`) - 0.94) / 0.12;
    if (!pressed && roll >= WHIZZ_CHANCE) return;
    const now = this.now();
    const at = now + (delay + WHIZZ_AFTER) * 1000;
    this.whizzes = this.whizzes.filter((start) => start + WHIZZ_MS > now);
    if (this.whizzes.filter((start) => Math.abs(start - at) < WHIZZ_MS).length >= WHIZZ_VOICES) return;
    if (this.whizzes.some((start) => Math.abs(start - at) < WHIZZ_GAP_MS)) return;
    const last = this.whizzAt.get(event.target);
    if (last !== undefined && Math.abs(at - last) < (pressed ? WHIZZ_MAN_GAP_PRESSED_MS : WHIZZ_MAN_GAP_MS)) return;
    this.whizzes.push(at);
    this.whizzAt.set(event.target, at);
    if (this.whizzAt.size > MAX_SEEN) this.whizzAt.clear();
    const variant = Math.floor(roll * WHIZZ_PROFILES.length) % WHIZZ_PROFILES.length;
    const pan = shotPan(listener, event.x2, event.y2);
    this.output.playWhizz(this.volume * WHIZZ_LEVEL, variant, delay + WHIZZ_AFTER, 2 - rate, pan);
  }

  /** Whether a shooter's round has an automatic voice: his burst's, or a free one. */
  private burstVoice(source: number, delay: number): boolean {
    const now = this.now();
    for (const [shooter, end] of this.bursts) {
      if (end <= now) this.bursts.delete(shooter);
    }
    const ends = now + delay * 1000 + BURST_TAIL_MS;
    const held = this.bursts.get(source);
    if (held !== undefined) {
      this.bursts.set(source, Math.max(held, ends));
      return true;
    }
    if (this.bursts.size >= this.automaticVoices) return false;
    this.bursts.set(source, ends);
    return true;
  }

  /** The view the player hears from (set every frame by the canvas). */
  setListener(listener: AudioListener | null): void {
    this.listener = listener;
  }

  /** The game speed (ticks run 0.1 s each at speed 1). */
  setSpeed(speed: number): void {
    this.tickSeconds = TICK_SECONDS / Math.max(1, speed);
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

function playBuffer(context: BaseAudioContext, destination: AudioNode, buffer: AudioBuffer, volume: number, rate = 1, delay = 0, pan = 0, offset = 0): void {
  const source = context.createBufferSource();
  const gain = context.createGain();
  source.buffer = buffer;
  source.playbackRate.value = rate;
  gain.gain.value = volume;
  source.connect(gain);
  if (pan !== 0 && typeof context.createStereoPanner === 'function') {
    const panner = context.createStereoPanner();
    panner.pan.value = Math.max(-1, Math.min(1, pan));
    gain.connect(panner);
    panner.connect(destination);
  } else {
    gain.connect(destination);
  }
  source.start(context.currentTime + delay, offset);
}

/**
 * ambient-sound-and-voices 1.1: shots play on the mixer's effects bus. An
 * output given no engine makes its own and closes it on dispose; a shared
 * engine is its owner's to close.
 */
abstract class EffectsOutput {
  protected readonly engine: AudioEngine;
  private readonly ownsEngine: boolean;

  constructor(engine?: AudioEngine) {
    this.engine = engine ?? new AudioEngine();
    this.ownsEngine = !engine;
  }

  protected get context(): AudioContext | null {
    return this.engine.context;
  }

  protected playOnEffects(buffer: AudioBuffer, volume: number, rate: number, delay: number, pan = 0, offset = 0): void {
    const context = this.engine.context;
    const mixer = this.engine.mixer;
    if (context && mixer) playBuffer(context, mixer.input('effects'), buffer, volume, rate, delay, pan, offset);
  }

  private shells: Record<ShellSound, AudioBuffer> | null = null;

  /** add-artillery-bombardment 3.5: the shell sounds, made once per context (placeholders, see artillery-audio.ts). */
  playShell(sound: ShellSound, volume: number, delay: number, pan: number, offset = 0): void {
    const context = this.engine.context;
    if (!context) return;
    if (!this.shells) {
      const samples = shellSamples(context.sampleRate);
      const made = {} as Record<ShellSound, AudioBuffer>;
      for (const [name, data] of Object.entries(samples) as Array<[ShellSound, Float32Array]>) {
        const buffer = context.createBuffer(1, data.length, context.sampleRate);
        buffer.getChannelData(0).set(data);
        made[name] = buffer;
      }
      this.shells = made;
    }
    this.playOnEffects(this.shells[sound], volume, 1, delay, pan, offset);
  }

  private whizzBuffers: AudioBuffer[] | null = null;

  /** A round passing: the synthesized whizzes, made on first use. */
  playWhizz(volume: number, variant: number, delay: number, rate = 1, pan = 0): void {
    const context = this.engine.context;
    if (!context) return;
    this.whizzBuffers ??= WHIZZ_PROFILES.map((profile) => {
      const samples = synthesizeWhizz(context.sampleRate, profile);
      const made = context.createBuffer(1, samples.length, context.sampleRate);
      made.getChannelData(0).set(samples);
      return made;
    });
    const buffer = this.whizzBuffers[variant % this.whizzBuffers.length];
    if (buffer) this.playOnEffects(buffer, volume, rate, delay, pan);
  }

  protected releaseEngine(): void {
    this.whizzBuffers = null;
    if (this.ownsEngine) this.engine.dispose();
  }
}

/** The synthesized reports of automatic fire, made once per context. */
function automaticBuffers(context: AudioContext): Record<'automatic' | 'machine-gun', AudioBuffer> {
  const buffer = (profile: ReportProfile): AudioBuffer => {
    const samples = synthesizeReport(context.sampleRate, profile);
    const made = context.createBuffer(1, samples.length, context.sampleRate);
    made.getChannelData(0).set(samples);
    return made;
  };
  return { automatic: buffer(AUTOMATIC_REPORT), 'machine-gun': buffer(MACHINE_GUN_REPORT) };
}

/**
 * The Mauser recorded by the project owner: the shot, then the bolt worked
 * 1.3 s later. Falls back to the synthesized shot if the files do not load.
 * Automatic fire plays the synthesized reports.
 */
export class RecordedGunshotOutput extends EffectsOutput implements GunshotOutput {
  private shot: AudioBuffer | null = null;
  private bolt: AudioBuffer | null = null;
  private automatic: Record<'automatic' | 'machine-gun', AudioBuffer> | null = null;

  constructor(
    private readonly base = './audio/',
    engine?: AudioEngine,
  ) {
    super(engine);
  }

  async unlock(): Promise<boolean> {
    if (!(await this.engine.unlock()) || !this.context) {
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
    this.automatic ??= automaticBuffers(this.context);
    return true;
  }

  play(volume: number, rate = 1, sound: ShotSound = 'rifle', delay = 0, pan = 0): void {
    if (!this.context) return;
    const buffer = sound === 'rifle' ? this.shot : this.automatic?.[sound];
    if (buffer) this.playOnEffects(buffer, volume, rate, delay, pan);
  }

  playBolt(volume: number, delay: number, rate = 1, pan = 0): void {
    if (this.bolt) this.playOnEffects(this.bolt, volume, rate, delay, pan);
  }

  dispose(): void {
    this.releaseEngine();
    this.shot = null;
    this.bolt = null;
    this.automatic = null;
  }

  private async load(file: string): Promise<AudioBuffer | null> {
    try {
      const response = await fetch(publicUrl(`${this.base}${file}`));
      if (!response.ok) return null;
      return await this.context!.decodeAudioData(await response.arrayBuffer());
    } catch {
      return null;
    }
  }
}

/** A procedural shot, used when the recording is not available. */
export class SynthesizedGunshotOutput extends EffectsOutput implements GunshotOutput {
  private buffer: AudioBuffer | null = null;
  private automatic: Record<'automatic' | 'machine-gun', AudioBuffer> | null = null;

  async unlock(): Promise<boolean> {
    if (!(await this.engine.unlock()) || !this.context) {
      return false;
    }
    this.buffer ??= synthesizeGunshot(this.context);
    this.automatic ??= automaticBuffers(this.context);
    return true;
  }

  play(volume: number, rate = 1, sound: ShotSound = 'rifle', delay = 0, pan = 0): void {
    if (!this.context) return;
    const buffer = sound === 'rifle' ? this.buffer : this.automatic?.[sound];
    if (buffer) this.playOnEffects(buffer, volume, rate, delay, pan);
  }

  dispose(): void {
    this.releaseEngine();
    this.buffer = null;
    this.automatic = null;
  }
}

/** The shape of a synthesized report (machine-gun-fire-feedback 4.1). */
export interface ReportProfile {
  seconds: number;
  /** Length of the sharp crack at the start (s). */
  crack: number;
  /** Low-pass of the noise body: higher is brighter. */
  brightness: number;
  /** Frequency (Hz) and level of the low thump. */
  thump: number;
  thumpLevel: number;
  /** Decay rate of the body (1/s). */
  decay: number;
  /** The action cycling: a metallic ring (Hz), its level and its time after the crack (s). */
  ring?: number;
  ringLevel?: number;
  ringAt?: number;
  seed: number;
}

/**
 * The machine gun: a deep boom with a metallic clack of the action after each
 * round, short enough to follow at ten rounds a second. Nothing like it is in
 * the Mauser recording, so a burst is told apart by ear.
 */
export const MACHINE_GUN_REPORT: ReportProfile = {
  seconds: 0.17,
  crack: 0.01,
  brightness: 0.16,
  thump: 46,
  thumpLevel: 0.8,
  decay: 22,
  ring: 1750,
  ringLevel: 0.35,
  ringAt: 0.045,
  seed: 1924,
};

/** The automatic rifle: lighter and brighter. */
export const AUTOMATIC_REPORT: ReportProfile = {
  seconds: 0.13,
  crack: 0.006,
  brightness: 0.4,
  thump: 92,
  thumpLevel: 0.32,
  decay: 34,
  seed: 1925,
};

/**
 * A report as samples, from a fixed-seed noise generator so it is the same on
 * every run: a crack, a filtered noise body and a low thump, decaying fast.
 */
export function synthesizeReport(sampleRate: number, profile: ReportProfile): Float32Array {
  const length = Math.floor(sampleRate * profile.seconds);
  const data = new Float32Array(length);
  let state = profile.seed >>> 0;
  const noise = (): number => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return (state / 4294967296) * 2 - 1;
  };
  let filter = 0;
  for (let index = 0; index < length; index += 1) {
    const time = index / sampleRate;
    const white = noise();
    filter = filter * (1 - profile.brightness) + white * profile.brightness;
    const crack = time < profile.crack ? white * 0.9 : 0;
    const thump = Math.sin(Math.PI * 2 * profile.thump * time) * Math.exp(-time * profile.decay * 0.8) * profile.thumpLevel;
    const body = filter * 1.6 * Math.exp(-time * profile.decay);
    const after = time - (profile.ringAt ?? 0);
    const ring =
      profile.ring && after >= 0
        ? Math.sin(Math.PI * 2 * profile.ring * after) * Math.exp(-after * 90) * (profile.ringLevel ?? 0)
        : 0;
    // A short fade-in and fade-out keep the round from clicking.
    const edge = Math.min(1, index / 24, (length - index) / 64);
    data[index] = Math.max(-0.95, Math.min(0.95, (crack + body + thump + ring) * edge));
  }
  return data;
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

/** The shape of a synthesized whizz: a round going past the man. */
export interface WhizzProfile {
  seconds: number;
  /** The moment the round is closest (s): loudest, and its pitch drops. */
  passAt: number;
  /** Centre of the hiss before and after the pass (Hz): the Doppler drop. */
  from: number;
  to: number;
  /** How fast it swells before the pass and dies after it (s). */
  attack: number;
  release: number;
  /** Damping of the band (lower rings more, a purer whine). */
  damping: number;
  /** Level of a tone under the hiss, the "zing". */
  whine: number;
  /** Level of the supersonic snap at the pass (0: none, a slower round). */
  snap: number;
  seed: number;
}

/** Four rounds, so a fusillade does not repeat: two snaps, a whine, a short zip. */
export const WHIZZ_PROFILES: readonly WhizzProfile[] = [
  { seconds: 0.34, passAt: 0.12, from: 5200, to: 1500, attack: 0.05, release: 0.07, damping: 0.3, whine: 0.25, snap: 0.9, seed: 1931 },
  { seconds: 0.3, passAt: 0.1, from: 4200, to: 1800, attack: 0.04, release: 0.06, damping: 0.4, whine: 0, snap: 0.7, seed: 1932 },
  { seconds: 0.38, passAt: 0.15, from: 3600, to: 1100, attack: 0.07, release: 0.09, damping: 0.22, whine: 0.45, snap: 0, seed: 1933 },
  { seconds: 0.28, passAt: 0.09, from: 6000, to: 2200, attack: 0.035, release: 0.05, damping: 0.35, whine: 0.15, snap: 0.5, seed: 1934 },
];

/**
 * A whizz as samples, from a fixed-seed noise like the reports: noise through
 * a band whose centre falls from `from` to `to` as the round passes, swelling
 * up to the pass and dying after it, with a faint tone and, for a fast round,
 * a sharp snap at the pass. Levelled to a 0.9 peak.
 */
export function synthesizeWhizz(sampleRate: number, profile: WhizzProfile): Float32Array {
  const length = Math.floor(sampleRate * profile.seconds);
  const data = new Float32Array(length);
  const snaps = new Float32Array(length);
  let state = profile.seed >>> 0;
  const noise = (): number => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return (state / 4294967296) * 2 - 1;
  };
  let low = 0;
  let band = 0;
  let phase = 0;
  let peak = 0;
  const snapHalf = 0.0025;
  for (let index = 0; index < length; index += 1) {
    const time = index / sampleRate;
    const centre = profile.to + (profile.from - profile.to) / (1 + Math.exp((time - profile.passAt) * 45));
    const f = Math.min(0.99, 2 * Math.sin((Math.PI * centre) / sampleRate));
    low += f * band;
    const high = noise() - low - profile.damping * band;
    band += f * high;
    const before = (profile.passAt - time) / profile.attack;
    const envelope = time < profile.passAt ? Math.exp(-before * before) : Math.exp(-(time - profile.passAt) / profile.release);
    phase += (Math.PI * 2 * centre * 0.35) / sampleRate;
    const tone = Math.sin(phase) * profile.whine;
    const fromSnap = time - (profile.passAt - snapHalf);
    snaps[index] = fromSnap >= 0 && fromSnap < snapHalf * 2 ? profile.snap * (1 - fromSnap / snapHalf) : 0;
    const value = (band * 0.5 + tone) * envelope;
    data[index] = value;
    peak = Math.max(peak, Math.abs(value));
  }
  // The hiss is levelled to 0.75; the snap rides on top of it.
  const scale = peak > 0 ? 0.75 / peak : 0;
  for (let index = 0; index < length; index += 1) {
    const edge = Math.min(1, index / 24, (length - index) / 64);
    data[index] = Math.max(-0.95, Math.min(0.95, (data[index]! * scale + snaps[index]!) * edge));
  }
  return data;
}
