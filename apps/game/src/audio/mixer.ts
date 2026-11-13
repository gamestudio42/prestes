import { createAudioContext } from './context';

/**
 * ambient-sound-and-voices 1.1 (D1): the battle's mix. Three buses under a
 * master: effects (gunfire and impacts), ambience (air, water, footsteps)
 * and voices. Order lines and their answers come in on the voices bus's
 * priority input; while one plays, effects and ambience are lowered (a
 * side-chain duck) and come back within a second after the last one ends.
 */
export type Bus = 'effects' | 'ambience' | 'voices';

export const BUSES: readonly Bus[] = ['effects', 'ambience', 'voices'];

/** Effects and ambience under an order line, as a share of their level. */
export const DUCK_LEVEL = 0.35;
/** Seconds to go down when an order line starts. */
export const DUCK_ATTACK = 0.08;
/** Seconds to come back after the last order line ends (the spec: under 1 s). */
export const DUCK_RELEASE = 0.6;

/** The part of an AudioContext the mixer uses, so tests can pass a fake. */
export type MixerContext = Pick<BaseAudioContext, 'currentTime' | 'createGain' | 'destination'>;

/** Moves a gain to `value` over `seconds`, from wherever it is now. */
function rampTo(param: AudioParam, value: number, now: number, seconds: number): void {
  param.cancelScheduledValues(now);
  param.setValueAtTime(param.value, now);
  param.linearRampToValueAtTime(value, now + seconds);
}

export class Mixer {
  readonly master: GainNode;
  /** Each bus's volume stage: sounds connect here. */
  private readonly buses: Record<Bus, GainNode>;
  /** The duck stage after effects and ambience. */
  private readonly ducks: Record<'effects' | 'ambience', GainNode>;
  /** Order lines and answers: into the voices bus, and they drive the duck. */
  readonly priority: GainNode;
  private priorityVoices = 0;
  private muted = false;
  private masterVolume = 1;

  constructor(private readonly context: MixerContext) {
    this.master = context.createGain();
    this.master.connect(context.destination);
    const gain = (): GainNode => context.createGain();
    this.buses = { effects: gain(), ambience: gain(), voices: gain() };
    this.ducks = { effects: gain(), ambience: gain() };
    for (const bus of ['effects', 'ambience'] as const) {
      this.buses[bus].connect(this.ducks[bus]);
      this.ducks[bus].connect(this.master);
    }
    this.buses.voices.connect(this.master);
    this.priority = gain();
    this.priority.connect(this.buses.voices);
  }

  /** Where a sound of this bus connects. */
  input(bus: Bus): AudioNode {
    return this.buses[bus];
  }

  setVolume(bus: Bus, volume: number): void {
    this.buses[bus].gain.value = Math.max(0, Math.min(1, volume));
  }

  volume(bus: Bus): number {
    return this.buses[bus].gain.value;
  }

  setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    this.master.gain.value = this.muted ? 0 : this.masterVolume;
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    this.master.gain.value = muted ? 0 : this.masterVolume;
  }

  /** Whether an order line or answer is playing (the duck is down). */
  get ducked(): boolean {
    return this.priorityVoices > 0;
  }

  /**
   * An order line or answer starts: the duck goes down. Returns the call
   * that marks it ended; a second call does nothing.
   */
  beginPriority(): () => void {
    this.priorityVoices += 1;
    if (this.priorityVoices === 1) this.duck(DUCK_LEVEL, DUCK_ATTACK);
    let ended = false;
    return () => {
      if (ended) return;
      ended = true;
      this.priorityVoices -= 1;
      if (this.priorityVoices === 0) this.duck(1, DUCK_RELEASE);
    };
  }

  private duck(level: number, seconds: number): void {
    const now = this.context.currentTime;
    for (const bus of ['effects', 'ambience'] as const) rampTo(this.ducks[bus].gain, level, now, seconds);
  }
}

/**
 * The battle's one audio context and its mixer, made on the first unlock
 * (a player gesture) and shared by every player of sound.
 */
export class AudioEngine {
  private contextValue: AudioContext | null = null;
  private mixerValue: Mixer | null = null;
  /** The player's levels, kept until the mixer exists and applied to it then. */
  private volumes: Record<Bus, number> = { effects: 1, ambience: 1, voices: 1 };
  private mutedValue = false;

  constructor(private readonly create: () => AudioContext | null = createAudioContext) {}

  get context(): AudioContext | null {
    return this.contextValue;
  }

  get mixer(): Mixer | null {
    return this.mixerValue;
  }

  /** Opens or resumes the context; false when the browser has none. */
  async unlock(): Promise<boolean> {
    this.contextValue ??= this.create();
    const context = this.contextValue;
    if (!context) return false;
    if (!this.mixerValue) {
      this.mixerValue = new Mixer(context);
      this.applyLevels();
    }
    if (context.state === 'suspended') await context.resume();
    return true;
  }

  /** The player's mute and channel volumes (ambient-sound-and-voices 2.1). */
  setLevels(muted: boolean, volumes: Readonly<Record<Bus, number>>): void {
    this.mutedValue = muted;
    this.volumes = { ...volumes };
    this.applyLevels();
  }

  private applyLevels(): void {
    const mixer = this.mixerValue;
    if (!mixer) return;
    mixer.setMuted(this.mutedValue);
    for (const bus of BUSES) mixer.setVolume(bus, this.volumes[bus]);
  }

  dispose(): void {
    void this.contextValue?.close();
    this.contextValue = null;
    this.mixerValue = null;
  }
}
