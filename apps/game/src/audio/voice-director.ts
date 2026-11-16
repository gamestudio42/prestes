import { voiceFile, type VoiceKind, type VoiceLine, type VoiceTake } from '@prestes/content';

/**
 * ambient-sound-and-voices 5.3 (D6): who speaks, and when. A small state
 * machine with three priority levels: the commander's order line, the
 * section's answer, and the call-outs (our soldiers', the curses and the
 * enemy's, which are dropped first). It holds no audio: it asks an output to
 * play a take and is told how long it lasts. Pure and clocked by the caller,
 * so it is unit-tested alone.
 *
 * - An order line waits until the simulation has accepted the command (no
 *   `command_rejected` for its sequence number); a refused order says nothing.
 * - A newer order replaces an order line or answer that has not started, so
 *   nothing plays late.
 * - The answer follows the order line after a short gap.
 * - A call-out never starts while an order or answer is pending or playing,
 *   has a quiet time per section and kind (and a shorter one per kind over
 *   all sections), and is dropped if it cannot start soon.
 * - A curse plays by chance, while its section is engaged, with a longer
 *   quiet time per section and a cap over all sections; none when the curses
 *   setting is off.
 * - No take twice in a row; a take that is not loaded is skipped silently.
 */

/** Gap between the order line's end and the answer (ms). */
export const ANSWER_GAP_MS = 250;
/** Quiet time of a call-out per section and kind (ms). */
export const CALLOUT_QUIET_MS = 8000;
/** The same call-out from any section, at most this often (ms): many men reload, one says so. */
export const CALLOUT_KIND_GAP_MS = 5000;
/** Quiet time of a curse per section (ms). */
export const CURSE_QUIET_MS = 25_000;
/** No curse within this long of any other curse, over all sections (ms). */
export const CURSE_CAP_MS = 6000;
/** The chance that an engaged section curses at an opportunity. */
export const CURSE_CHANCE = 0.2;
/** A call-out that cannot start within this long is dropped (ms). */
export const CALLOUT_WAIT_MS = 1200;

/** How a take is heard: order lines and answers are neither attenuated nor panned. */
export interface VoicePlacement {
  gain: number;
  pan: number;
}

export interface VoiceOutput {
  /**
   * Plays a sound id; returns its length in seconds, or null when it is not
   * loaded (it is skipped). `priority` takes ride the duck of effects and
   * ambience.
   */
  play(id: string, placement: VoicePlacement, priority: boolean): number | null;
}

/** What is said now, for the captions. */
export interface VoiceCaption {
  kind: VoiceKind;
  take: VoiceTake;
  /** Said by the enemy (his call-outs and curses). */
  enemy: boolean;
}

export interface CalloutRequest {
  line: VoiceLine;
  /** The speaker's section (call-outs and curses are quiet per section). */
  section: number;
  placement: VoicePlacement;
  /** The speaker is the enemy. */
  enemy?: boolean;
}

interface Speech {
  line: VoiceLine;
  placement: VoicePlacement;
  priority: boolean;
  /** Earliest start (ms). */
  at: number;
  /** Latest start (ms), for call-outs. */
  until?: number;
  section?: number;
  enemy?: boolean;
}

interface PendingOrder {
  seq: number;
  order: VoiceLine;
  answer: VoiceLine | undefined;
}

export interface VoiceDirectorOptions {
  random?: () => number;
  /** Read at every curse: the player's setting (D11). */
  curses?: () => boolean;
  onCaption?: (caption: VoiceCaption | null) => void;
}

const CENTRE: VoicePlacement = { gain: 1, pan: 0 };

export class VoiceDirector {
  private readonly random: () => number;
  private readonly curses: () => boolean;
  private readonly onCaption: (caption: VoiceCaption | null) => void;
  /** Orders sent and not yet accepted or refused. */
  private awaiting: PendingOrder | null = null;
  /** The order line and answer queued to play. */
  private orderQueue: Speech[] = [];
  private callout: Speech | null = null;
  private playingUntil = 0;
  private playingPriority = false;
  private readonly lastTake = new Map<string, number>();
  private readonly quiet = new Map<string, number>();
  private lastCurse = Number.NEGATIVE_INFINITY;
  /** What started, in order (tests and the dev bridge). */
  readonly spoken: string[] = [];

  constructor(
    private readonly output: VoiceOutput,
    options: VoiceDirectorOptions = {},
  ) {
    this.random = options.random ?? Math.random;
    this.curses = options.curses ?? (() => true);
    this.onCaption = options.onCaption ?? (() => undefined);
  }

  /** The player sent an order: it is spoken once the simulation accepts it. A newer order replaces this one. */
  order(seq: number, order: VoiceLine, answer: VoiceLine | undefined): void {
    this.awaiting = { seq, order, answer };
  }

  /** The simulation refused a command: its order says nothing. */
  rejected(seq: number): void {
    if (this.awaiting?.seq === seq) this.awaiting = null;
  }

  /** The simulation has run every command up to `seq`: an order still awaiting is accepted. */
  accepted(seq: number, now: number): void {
    const pending = this.awaiting;
    if (!pending || pending.seq > seq) return;
    this.awaiting = null;
    // A newer order replaces whatever of the last one has not started.
    this.orderQueue = [{ line: pending.order, placement: CENTRE, priority: true, at: now }];
    if (pending.answer) this.orderQueue.push({ line: pending.answer, placement: CENTRE, priority: true, at: now });
    this.update(now);
  }

  /** A soldier's or the enemy's call-out. */
  callOut(request: CalloutRequest, now: number): boolean {
    const key = `${request.section}:${request.line.kind}:${request.line.key}`;
    const kindKey = `${request.line.kind}:${request.line.key}`;
    if ((this.quiet.get(key) ?? Number.NEGATIVE_INFINITY) > now) return false;
    if ((this.quiet.get(kindKey) ?? Number.NEGATIVE_INFINITY) > now) return false;
    if (this.callout) return false;
    this.quiet.set(kindKey, now + CALLOUT_KIND_GAP_MS);
    this.callout = { line: request.line, placement: request.placement, priority: false, at: now, until: now + CALLOUT_WAIT_MS, section: request.section, enemy: request.enemy === true };
    this.quiet.set(key, now + CALLOUT_QUIET_MS);
    this.update(now);
    return true;
  }

  /** An engaged section's chance to curse: by chance, and only past its quiet times. */
  curse(request: CalloutRequest, now: number): boolean {
    if (!this.curses()) return false;
    const key = `${request.section}:curse`;
    if ((this.quiet.get(key) ?? Number.NEGATIVE_INFINITY) > now) return false;
    if (now - this.lastCurse < CURSE_CAP_MS) return false;
    if (this.callout || this.random() >= CURSE_CHANCE) return false;
    this.quiet.set(key, now + CURSE_QUIET_MS);
    this.lastCurse = now;
    this.callout = { line: request.line, placement: request.placement, priority: false, at: now, until: now + CALLOUT_WAIT_MS, section: request.section, enemy: request.enemy === true };
    this.update(now);
    return true;
  }

  /** Whether an order line or answer is waiting or playing. */
  get ordersBusy(): boolean {
    return this.awaiting !== null || this.orderQueue.length > 0 || this.playingPriority;
  }

  /** Starts what may start; ends the caption of what has ended. Called on a timer and on every request. */
  update(now: number): void {
    if (now < this.playingUntil) {
      // An order does not wait for a call-out: it starts over it.
      if (this.playingPriority || this.orderQueue.length === 0) return;
    } else if (this.playingUntil > 0) {
      this.playingUntil = 0;
      this.playingPriority = false;
      this.onCaption(null);
    }
    while (this.orderQueue.length > 0) {
      const next = this.orderQueue[0]!;
      if (next.at > now) return;
      this.orderQueue.shift();
      const length = this.start(next, now);
      if (length !== null) {
        const answer = this.orderQueue[0];
        if (answer) answer.at = now + length * 1000 + ANSWER_GAP_MS;
        return;
      }
      // Not loaded: the answer may still be.
    }
    const callout = this.callout;
    if (!callout) return;
    if (this.awaiting || now < this.playingUntil) {
      if (callout.until !== undefined && now > callout.until) this.callout = null;
      return;
    }
    this.callout = null;
    if (callout.until !== undefined && now > callout.until) return;
    this.start(callout, now);
  }

  /** Forgets everything (a new battle). */
  reset(): void {
    this.awaiting = null;
    this.orderQueue = [];
    this.callout = null;
    this.playingUntil = 0;
    this.playingPriority = false;
    this.quiet.clear();
    this.lastCurse = Number.NEGATIVE_INFINITY;
    this.onCaption(null);
  }

  private start(speech: Speech, now: number): number | null {
    const { line } = speech;
    const id = `${line.speaker}/${line.kind}/${line.key}`;
    const last = this.lastTake.get(id);
    const choices = line.takes.map((_, index) => index).filter((index) => line.takes.length < 2 || index !== last);
    const index = choices[Math.min(choices.length - 1, Math.floor(this.random() * choices.length))]!;
    const file = voiceFile(line, index + 1);
    const length = this.output.play(file, speech.placement, speech.priority);
    if (length === null) return null;
    this.lastTake.set(id, index);
    this.spoken.push(file);
    this.playingUntil = now + length * 1000;
    this.playingPriority = speech.priority;
    this.onCaption({ kind: line.kind, take: line.takes[index]!, enemy: speech.enemy === true || line.kind === 'enemy' });
    return length;
  }
}
