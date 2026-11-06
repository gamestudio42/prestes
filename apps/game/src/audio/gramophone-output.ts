import { createAudioContext } from './context';
import type { GramophoneOutput } from './Gramophone';

const DEFAULT_VOLUME = 0.32;
const ROOM_IMPULSE_SECONDS = 1.8;
const LOWPASS_HZ = 1800;
const HIGHPASS_HZ = 120;
const DRY_LEVEL = 0.85;
const WET_LEVEL = 0.35;

export interface HtmlGramophoneOutputOptions {
  volume?: number;
  muted?: boolean;
}

/**
 * The browser side of the menu gramophone: one media element routed through a
 * short room. The low-pass, high-pass and convolution make the recording sound
 * as if it plays in the next room; the element itself only streams.
 *
 * The audio context is created synchronously inside the first play gesture, so
 * autoplay policy does not reject the element. Without a context the element
 * plays at a low volume, without the room treatment.
 */
export class HtmlGramophoneOutput implements GramophoneOutput {
  private readonly element: HTMLAudioElement;
  private readonly targetVolume: number;
  private context: AudioContext | null = null;
  private source: MediaElementAudioSourceNode | null = null;
  private volumeGain: GainNode | null = null;
  private muteGain: GainNode | null = null;
  private currentSrc = '';
  private muted: boolean;
  private pauseTimer: ReturnType<typeof setTimeout> | null = null;
  private disposed = false;
  private readonly endedListeners = new Set<() => void>();
  private readonly errorListeners = new Set<() => void>();

  constructor(options: HtmlGramophoneOutputOptions = {}) {
    this.targetVolume = Math.max(0, Math.min(1, options.volume ?? DEFAULT_VOLUME));
    this.muted = options.muted ?? false;
    this.element = new Audio();
    this.element.preload = 'metadata';
    this.element.volume = 1;
    this.element.addEventListener('ended', this.handleEnded);
    this.element.addEventListener('error', this.handleError);
  }

  async play(src: string, fadeSeconds: number): Promise<boolean> {
    if (this.disposed) return false;
    this.clearPauseTimer();
    const context = this.ensureGraph();
    if (context) {
      void context.resume();
    }

    const changed = src !== this.currentSrc;
    if (changed) {
      this.currentSrc = src;
      this.element.src = src;
      this.element.load();
    }

    if (!context) {
      this.element.volume = this.muted ? 0 : this.targetVolume;
      try {
        await this.element.play();
        return true;
      } catch {
        return false;
      }
    }

    const now = context.currentTime;
    if (this.volumeGain) {
      const gain = this.volumeGain.gain;
      gain.cancelScheduledValues(now);
      gain.setValueAtTime(changed ? 0 : gain.value, now);
      if (fadeSeconds <= 0) {
        gain.setValueAtTime(this.targetVolume, now);
      } else {
        gain.linearRampToValueAtTime(this.targetVolume, now + fadeSeconds);
      }
    }

    try {
      await this.element.play();
      return true;
    } catch {
      return false;
    }
  }

  pause(fadeSeconds = 0.12): void {
    if (this.disposed) return;
    this.clearPauseTimer();
    if (!this.context || !this.volumeGain) {
      this.element.pause();
      return;
    }
    const now = this.context.currentTime;
    const gain = this.volumeGain.gain;
    gain.cancelScheduledValues(now);
    gain.setValueAtTime(gain.value, now);
    gain.linearRampToValueAtTime(0, now + Math.max(0.02, fadeSeconds));
    this.pauseTimer = setTimeout(() => {
      this.pauseTimer = null;
      this.element.pause();
    }, Math.max(20, fadeSeconds * 1000));
  }

  load(src: string): void {
    if (this.disposed) return;
    this.clearPauseTimer();
    this.currentSrc = src;
    this.element.src = src;
    this.element.load();
    if (this.context && this.volumeGain) {
      const now = this.context.currentTime;
      this.volumeGain.gain.cancelScheduledValues(now);
      this.volumeGain.gain.setValueAtTime(0, now);
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.context && this.muteGain) {
      this.muteGain.gain.setTargetAtTime(muted ? 0 : 1, this.context.currentTime, 0.02);
    } else {
      this.element.volume = muted ? 0 : this.targetVolume;
    }
  }

  getCurrentTime(): number {
    return this.element.currentTime;
  }

  onEnded(callback: () => void): () => void {
    this.endedListeners.add(callback);
    return () => this.endedListeners.delete(callback);
  }

  onError(callback: () => void): () => void {
    this.errorListeners.add(callback);
    return () => this.errorListeners.delete(callback);
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.clearPauseTimer();
    this.element.removeEventListener('ended', this.handleEnded);
    this.element.removeEventListener('error', this.handleError);
    this.element.pause();
    this.element.removeAttribute('src');
    this.element.load();
    this.endedListeners.clear();
    this.errorListeners.clear();
    if (this.context) {
      void this.context.close();
      this.context = null;
    }
    this.source = null;
    this.volumeGain = null;
    this.muteGain = null;
  }

  private ensureGraph(): AudioContext | null {
    if (this.disposed) return null;
    if (this.context) return this.context;
    const context = createAudioContext();
    if (!context) return null;
    this.context = context;
    void context.resume();
    // The Web Audio graph owns the level now; the element's fallback volume
    // must not attenuate it a second time.
    this.element.volume = 1;

    const source = context.createMediaElementSource(this.element);
    const highpass = context.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = HIGHPASS_HZ;
    highpass.Q.value = 0.7;

    const lowpass = context.createBiquadFilter();
    lowpass.type = 'lowpass';
    lowpass.frequency.value = LOWPASS_HZ;
    lowpass.Q.value = 0.6;

    const dry = context.createGain();
    dry.gain.value = DRY_LEVEL;
    const wet = context.createGain();
    wet.gain.value = WET_LEVEL;
    const convolver = context.createConvolver();
    convolver.buffer = createRoomImpulse(context);

    const volume = context.createGain();
    volume.gain.value = 0;
    const mute = context.createGain();
    mute.gain.value = this.muted ? 0 : 1;

    source.connect(highpass);
    highpass.connect(lowpass);
    lowpass.connect(dry);
    dry.connect(volume);
    lowpass.connect(convolver);
    convolver.connect(wet);
    wet.connect(volume);
    volume.connect(mute);
    mute.connect(context.destination);

    this.source = source;
    this.volumeGain = volume;
    this.muteGain = mute;
    return context;
  }

  private clearPauseTimer(): void {
    if (this.pauseTimer !== null) {
      clearTimeout(this.pauseTimer);
      this.pauseTimer = null;
    }
  }

  private readonly handleEnded = (): void => {
    for (const listener of this.endedListeners) listener();
  };

  private readonly handleError = (): void => {
    for (const listener of this.errorListeners) listener();
  };
}

function createRoomImpulse(context: AudioContext): AudioBuffer {
  const length = Math.max(1, Math.floor(context.sampleRate * ROOM_IMPULSE_SECONDS));
  const impulse = context.createBuffer(2, length, context.sampleRate);
  for (let channel = 0; channel < impulse.numberOfChannels; channel += 1) {
    const data = impulse.getChannelData(channel);
    let smoothed = 0;
    for (let index = 0; index < length; index += 1) {
      const noise = Math.random() * 2 - 1;
      smoothed = smoothed * 0.55 + noise * 0.45;
      data[index] = smoothed * Math.pow(1 - index / length, 2.6);
    }
  }
  return impulse;
}
