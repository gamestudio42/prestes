import { VOICE_LINES, curseLines, voiceFile, voiceLine, type CurseMoment, type VoiceFaction, type VoiceLine } from '@prestes/content';
import type { Command, Frame, SimEvent } from '@prestes/shared';
import { hear, type ListeningPoint } from './listening';
import type { AudioEngine } from './mixer';
import { audioSettings } from './settings-store';
import { SoundBank } from './sound-bank';
import { ECHO_SECONDS, echoImpulse, voiceDistance } from './voice-distance';
import { VoiceDirector, type VoiceCaption, type VoiceOutput, type VoicePlacement } from './voice-director';
import { commandOrder, commandUnits } from './voice-orders';
import { VoiceWatch, type VoiceRequest } from './voice-watch';

/**
 * ambient-sound-and-voices 5.4: the voices in the battle. Order lines and
 * answers play on the voices bus, unattenuated and centred, and duck effects
 * and ambience; call-outs, curses and the enemy's lines are placed at the
 * speaker by the one nearness rule. The director decides what plays; the
 * captions follow what it says.
 */

/** How far a call-out carries at the nearest zoom (m). */
export const CALLOUT_RANGE = 140;
/** A call-out heard thinner than this is not said at all. */
export const CALLOUT_MIN_GAIN = 0.04;
const TICK_MS = 100;
/** The call-outs' files are asked for this long after the order lines' (ms). */
export const LATER_VOICES_MS = 4000;

/** The caption on screen, one store for the HUD. */
let caption: VoiceCaption | null = null;
const captionListeners = new Set<() => void>();
export const voiceCaptions = {
  get: (): VoiceCaption | null => caption,
  subscribe(listener: () => void): () => void {
    captionListeners.add(listener);
    return () => captionListeners.delete(listener);
  },
  set(next: VoiceCaption | null): void {
    caption = next;
    for (const listener of captionListeners) listener();
  },
};

class WebVoiceOutput implements VoiceOutput {
  private room: { context: BaseAudioContext; node: ConvolverNode } | null = null;

  /** One echo for every voice, made with the context. */
  private echo(context: BaseAudioContext, bus: AudioNode): ConvolverNode {
    if (this.room?.context !== context) {
      const node = context.createConvolver();
      node.buffer = echoImpulse(context);
      node.connect(bus);
      this.room = { context, node };
    }
    return this.room.node;
  }

  constructor(
    private readonly engine: AudioEngine,
    private readonly bank: SoundBank,
  ) {}

  play(id: string, placement: VoicePlacement, priority: boolean): number | null {
    const context = this.engine.context;
    const mixer = this.engine.mixer;
    const buffer = this.bank.get(id);
    if (!context || !mixer || !buffer) return null;
    // Heard across the field: filtered, with a share of open-air echo.
    const distance = voiceDistance(priority, placement.gain);
    const bus = mixer.input('voices');
    const source = context.createBufferSource();
    const highpass = context.createBiquadFilter();
    const lowpass = context.createBiquadFilter();
    const gain = context.createGain();
    const panner = context.createStereoPanner();
    const dry = context.createGain();
    const wet = context.createGain();
    source.buffer = buffer;
    highpass.type = 'highpass';
    highpass.frequency.value = distance.highpass;
    lowpass.type = 'lowpass';
    lowpass.frequency.value = distance.lowpass;
    gain.gain.value = placement.gain;
    panner.pan.value = placement.pan;
    dry.gain.value = distance.dry;
    wet.gain.value = distance.wet;
    source.connect(highpass);
    highpass.connect(lowpass);
    lowpass.connect(gain);
    gain.connect(panner);
    panner.connect(dry);
    dry.connect(bus);
    panner.connect(wet);
    wet.connect(this.echo(context, bus));
    const end = priority ? mixer.beginPriority() : null;
    source.onended = () => {
      end?.();
      source.disconnect();
      panner.disconnect();
      // The echo's tail rings on after the voice; its send is let go after it.
      setTimeout(() => wet.disconnect(), ECHO_SECONDS * 1000);
      dry.disconnect();
    };
    source.start();
    return buffer.duration;
  }
}

/** The share of curses taken from the moment's own lines; the rest are insults for any moment. */
export const MOMENT_SHARE = 0.65;

/** A curse that fits the moment: mostly its own lines, else a general insult. */
export function pickCurse(faction: VoiceFaction, moment: CurseMoment, random: () => number): VoiceLine | undefined {
  const own = moment === 'insult' ? [] : curseLines(faction, moment);
  const pool = own.length > 0 && random() < MOMENT_SHARE ? own : curseLines(faction, 'insult');
  return pool[Math.floor(random() * pool.length)];
}

export class VoiceController {
  private readonly bank: SoundBank;
  readonly director: VoiceDirector;
  private readonly watch = new VoiceWatch();
  private readonly timer: ReturnType<typeof setInterval>;
  private listener: ListeningPoint | null = null;
  private side: 'column' | 'legalist' = 'column';
  private frame: Pick<Frame, 'tick' | 'units' | 'phase'> | null = null;
  private loaded = false;
  private later: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private readonly engine: AudioEngine,
    private readonly random: () => number = Math.random,
  ) {
    this.bank = new SoundBank(() => engine.context);
    this.director = new VoiceDirector(new WebVoiceOutput(engine, this.bank), {
      random,
      curses: () => audioSettings.get().curses,
      onCaption: (next) => voiceCaptions.set(next),
    });
    this.timer = setInterval(() => this.director.update(performance.now()), TICK_MS);
  }

  /** Where the player hears from, every view frame. */
  setListener(point: ListeningPoint | null, side?: string): void {
    this.listener = point;
    if (side === 'column' || side === 'legalist') this.side = side;
  }

  /** The player's command, with its sequence number: an order waits to be accepted. */
  command(command: Command, seq: number): void {
    if (!this.frame || this.frame.phase === 'deployment') return;
    const order = commandOrder(command);
    if (!order) return;
    const ids = new Set(commandUnits(command));
    // Only our own sections answer; an order to several is spoken once and answered by one.
    if (!this.frame.units.some((unit) => ids.has(unit.id) && unit.faction === this.side)) return;
    const line = voiceLine('order', order);
    if (line) this.director.order(seq, line, voiceLine('answer', order));
  }

  /** A simulation event: a refused command says nothing. */
  event(event: SimEvent): void {
    if (event.type === 'command_rejected') this.director.rejected(event.seq);
  }

  /** A frame from the simulation, after its events; `lastSeq` is the client's last command before the step it answers. */
  onFrame(frame: Frame, lastSeq: number): void {
    const now = performance.now();
    if (this.frame && frame.tick < this.frame.tick) this.newBattle();
    this.frame = frame;
    if (!this.loaded) this.preload();
    this.director.accepted(lastSeq, now);
    for (const request of this.watch.frame(frame, this.side)) this.request(request, now);
  }

  /** A new battle: the director and the watch forget the last. */
  newBattle(): void {
    this.director.reset();
    this.watch.reset();
    this.frame = null;
  }

  dispose(): void {
    clearInterval(this.timer);
    if (this.later) clearTimeout(this.later);
    this.director.reset();
  }

  private request(request: VoiceRequest, now: number): void {
    if (this.director.ordersBusy) return;
    const placement = this.place(request.x, request.y);
    if (!placement) return;
    if (request.kind === 'curse') {
      const line = pickCurse(request.faction, request.moment, this.random);
      if (line) this.director.curse({ line, section: request.section, placement, enemy: request.enemy }, now);
      return;
    }
    if (request.kind === 'shout') {
      const shout = voiceLine('shout', request.key, request.enemy ? 'inimigo' : 'soldado');
      if (shout) this.director.callOut({ line: shout, section: request.section, placement, enemy: request.enemy }, now);
      return;
    }
    const line = voiceLine(request.kind, request.key);
    if (line) this.director.callOut({ line, section: request.section, placement, enemy: request.kind === 'enemy' }, now);
  }

  private place(x: number, y: number): VoicePlacement | null {
    const point = this.listener;
    if (!point) return null;
    const heard = hear(point, x, y, CALLOUT_RANGE);
    if (heard.gain < CALLOUT_MIN_GAIN) return null;
    return heard;
  }

  /**
   * D9, loading in priority order: the order lines and answers at once; the
   * call-outs, curses and enemy lines a few seconds later, behind the water,
   * beds and footsteps the ambience asks for as the battle opens. Nothing
   * here holds the battle: a take not yet loaded is skipped (or, an order,
   * captioned alone).
   */
  private preload(): void {
    if (!this.engine.context) return;
    this.loaded = true;
    const request = (lines: readonly VoiceLine[]) => {
      for (const line of lines) {
        line.takes.forEach((_, index) => {
          const id = voiceFile(line, index + 1);
          if (this.bank.exists(id)) this.bank.request(id);
        });
      }
    };
    const orders = (line: VoiceLine) => line.kind === 'order' || line.kind === 'answer';
    request(VOICE_LINES.filter(orders));
    this.later = setTimeout(() => request(VOICE_LINES.filter((line) => !orders(line))), LATER_VOICES_MS);
  }
}
