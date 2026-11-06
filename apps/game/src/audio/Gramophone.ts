import {
  clampTrackIndex,
  GRAMOPHONE_TRACKS,
  nextTrackIndex,
  previousTrackIndex,
  type GramophoneTrack,
} from './gramophone-tracks';

/** The playable side of the gramophone, injectable for unit tests. */
export interface GramophoneOutput {
  play(src: string, fadeSeconds: number): Promise<boolean>;
  pause(fadeSeconds?: number): void;
  load(src: string): void;
  setMuted(muted: boolean): void;
  getCurrentTime(): number;
  onEnded(callback: () => void): () => void;
  onError(callback: () => void): () => void;
  dispose(): void;
}

export interface GramophoneState {
  trackIndex: number;
  playing: boolean;
  loading: boolean;
  started: boolean;
  error: boolean;
  /** Increments only when the track changes, so the UI can show its card. */
  changeNonce: number;
}

export interface GramophoneOptions {
  output: GramophoneOutput;
  baseUrl: string;
  tracks?: readonly GramophoneTrack[];
  startIndex?: number;
  muted?: boolean;
  onState?: (state: GramophoneState) => void;
}

const FIRST_FADE_SECONDS = 3;
const RESUME_FADE_SECONDS = 0.4;
const CHANGE_FADE_SECONDS = 0.35;

/**
 * Transport and menu state for the gramophone. The output owns the browser
 * audio; this class owns which track plays and whether it should be playing.
 * It never touches the simulation.
 */
export class Gramophone {
  private readonly output: GramophoneOutput;
  private readonly tracks: readonly GramophoneTrack[];
  private readonly baseUrl: string;
  private readonly onState: ((state: GramophoneState) => void) | undefined;
  private readonly unsubEnded: () => void;
  private readonly unsubError: () => void;
  private index: number;
  private playing = false;
  private loading = false;
  private started = false;
  private error = false;
  private changeNonce = 0;
  private muted: boolean;
  private playGeneration = 0;
  private disposed = false;

  constructor(options: GramophoneOptions) {
    this.output = options.output;
    this.tracks = options.tracks ?? GRAMOPHONE_TRACKS;
    if (this.tracks.length === 0) {
      throw new Error('The gramophone needs at least one track.');
    }
    this.baseUrl = options.baseUrl.endsWith('/') ? options.baseUrl : `${options.baseUrl}/`;
    this.onState = options.onState;
    this.index = clampTrackIndex(options.startIndex ?? 0, this.tracks.length);
    this.muted = options.muted ?? false;
    this.output.setMuted(this.muted);
    this.unsubEnded = this.output.onEnded(() => this.handleEnded());
    this.unsubError = this.output.onError(() => this.handleError());
    this.emit();
  }

  getState(): GramophoneState {
    return {
      trackIndex: this.index,
      playing: this.playing,
      loading: this.loading,
      started: this.started,
      error: this.error,
      changeNonce: this.changeNonce,
    };
  }

  get track(): GramophoneTrack {
    return this.tracks[this.index]!;
  }

  async play(fadeSeconds?: number): Promise<void> {
    if (this.disposed || this.muted || this.playing || this.loading) return;
    if (this.error) {
      this.output.load(this.srcFor(this.track));
    }
    this.error = false;
    await this.playTrack(fadeSeconds ?? (this.started ? RESUME_FADE_SECONDS : FIRST_FADE_SECONDS));
  }

  pause(): void {
    if (this.disposed) return;
    this.playGeneration += 1;
    this.loading = false;
    this.playing = false;
    this.output.pause();
    this.emit();
  }

  toggle(): void {
    if (this.playing || this.loading) {
      this.pause();
    } else {
      void this.play();
    }
  }

  next(): void {
    this.move(1, this.playing || !this.started);
  }

  previous(): void {
    if (this.output.getCurrentTime() > 3) {
      this.restart();
      return;
    }
    this.move(-1, this.playing || !this.started);
  }

  setMuted(muted: boolean): void {
    if (this.muted === muted) return;
    this.muted = muted;
    this.output.setMuted(muted);
    if (muted) {
      this.pause();
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.playGeneration += 1;
    this.unsubEnded();
    this.unsubError();
    this.output.dispose();
  }

  private restart(): void {
    if (this.disposed) return;
    this.error = false;
    this.playGeneration += 1;
    // Loading the same source rewinds the media element before the new play;
    // otherwise play() would continue from where the track already was.
    this.output.load(this.srcFor(this.track));
    if (this.playing) {
      void this.playTrack(CHANGE_FADE_SECONDS);
    } else {
      this.loading = false;
      this.emit();
    }
  }

  private move(delta: number, autoplay: boolean): void {
    if (this.disposed) return;
    this.index =
      delta > 0
        ? nextTrackIndex(this.index, this.tracks.length)
        : previousTrackIndex(this.index, this.tracks.length);
    this.changeNonce += 1;
    this.error = false;
    if (autoplay) {
      void this.playTrack(this.started ? CHANGE_FADE_SECONDS : FIRST_FADE_SECONDS);
      return;
    }
    this.playGeneration += 1;
    this.loading = false;
    this.playing = false;
    this.output.load(this.srcFor(this.track));
    this.emit();
  }

  private async playTrack(fadeSeconds: number): Promise<void> {
    if (this.disposed || this.muted) return;
    const generation = ++this.playGeneration;
    this.loading = true;
    this.emit();
    const ok = await this.output.play(this.srcFor(this.track), fadeSeconds);
    if (this.disposed || generation !== this.playGeneration) return;
    this.loading = false;
    this.playing = ok;
    if (ok) {
      this.started = true;
      this.error = false;
    }
    this.emit();
  }

  private handleEnded(): void {
    if (this.disposed) return;
    this.move(1, true);
  }

  private handleError(): void {
    if (this.disposed) return;
    this.playGeneration += 1;
    this.loading = false;
    this.playing = false;
    this.error = true;
    this.emit();
  }

  private srcFor(track: GramophoneTrack): string {
    return `${this.baseUrl}music/${track.file}`;
  }

  private emit(): void {
    this.onState?.(this.getState());
  }
}
