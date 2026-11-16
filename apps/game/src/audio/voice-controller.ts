import { VOICE_LINES, curseLines, voiceFile, voiceLine, type VoiceLine } from '@prestes/content';
import type { Command, Frame, SimEvent } from '@prestes/shared';
import { hear, type ListeningPoint } from './listening';
import type { AudioEngine } from './mixer';
import { audioSettings } from './settings-store';
import { SoundBank } from './sound-bank';
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
  constructor(
    private readonly engine: AudioEngine,
    private readonly bank: SoundBank,
  ) {}

  play(id: string, placement: VoicePlacement, priority: boolean): number | null {
    const context = this.engine.context;
    const mixer = this.engine.mixer;
    const buffer = this.bank.get(id);
    if (!context || !mixer || !buffer) return null;
    const source = context.createBufferSource();
    const gain = context.createGain();
    const panner = context.createStereoPanner();
    source.buffer = buffer;
    gain.gain.value = placement.gain;
    panner.pan.value = placement.pan;
    source.connect(gain);
    gain.connect(panner);
    panner.connect(mixer.input('voices'));
    const end = priority ? mixer.beginPriority() : null;
    source.onended = () => {
      end?.();
      source.disconnect();
      panner.disconnect();
    };
    source.start();
    return buffer.duration;
  }
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
    this.director.reset();
  }

  private request(request: VoiceRequest, now: number): void {
    if (this.director.ordersBusy) return;
    const placement = this.place(request.x, request.y);
    if (!placement) return;
    if (request.kind === 'curse') {
      const lines = curseLines(request.faction);
      const line = lines[Math.floor(this.random() * lines.length)];
      if (line) this.director.curse({ line, section: request.section, placement, enemy: request.enemy }, now);
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

  /** Order lines and answers first, then the rest (D9). */
  private preload(): void {
    if (!this.engine.context) return;
    this.loaded = true;
    const first = (line: VoiceLine) => (line.kind === 'order' || line.kind === 'answer' ? 0 : 1);
    for (const line of [...VOICE_LINES].sort((a, b) => first(a) - first(b))) {
      line.takes.forEach((_, index) => {
        const id = voiceFile(line, index + 1);
        if (this.bank.exists(id)) this.bank.request(id);
      });
    }
  }
}
