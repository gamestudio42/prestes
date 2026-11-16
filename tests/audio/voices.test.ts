import { describe, expect, it } from 'vitest';
import { VOICE_LINES, VOICE_ORDERS, curseLines, validateVoiceLines, voiceFile, voiceLine, type VoiceLine } from '../../packages/content/src';
import type { Command, Frame, SimEvent, UnitSnapshot } from '../../packages/shared/src';
import { SOUND_FILES } from '../../apps/game/src/audio/sound-files';
import { captionsOn } from '../../apps/game/src/audio/settings-store';
import { parseAudioSettings } from '../../apps/game/src/storage';
import { ANSWER_GAP_MS, CALLOUT_KIND_GAP_MS, CALLOUT_QUIET_MS, RARE_CALLOUTS, CURSE_CAP_MS, CURSE_QUIET_MS, VoiceDirector, type VoiceCaption, type VoiceOutput } from '../../apps/game/src/audio/voice-director';
import { pickCurse } from '../../apps/game/src/audio/voice-controller';
import { commandOrder } from '../../apps/game/src/audio/voice-orders';
import { VoiceWatch } from '../../apps/game/src/audio/voice-watch';

// ambient-sound-and-voices 5.1, 5.3-5.5: the catalogue, the director's rules,
// the call-outs read from frames, and the captions' default.

class FakeOutput implements VoiceOutput {
  played: { id: string; gain: number; pan: number; priority: boolean }[] = [];
  missing = new Set<string>();
  play(id: string, placement: { gain: number; pan: number }, priority: boolean): number | null {
    if (this.missing.has(id)) return null;
    this.played.push({ id, ...placement, priority });
    return 1;
  }
}

const line = (kind: VoiceLine['kind'], key: string) => voiceLine(kind, key)!;
const near = { gain: 0.5, pan: -0.3 };

function director(options: { random?: () => number; curses?: boolean } = {}) {
  const output = new FakeOutput();
  const captions: (VoiceCaption | null)[] = [];
  const voice = new VoiceDirector(output, { random: options.random ?? (() => 0), curses: () => options.curses ?? true, onCaption: (c) => captions.push(c) });
  const order = (seq: number, key: string) => voice.order(seq, line('order', key), line('answer', key));
  return { output, voice, captions, order };
}

describe('the voice catalogue', () => {
  it('has a line and an answer of three takes for every order, and passes the content check', () => {
    expect(validateVoiceLines()).toEqual([]);
    for (const order of VOICE_ORDERS) {
      expect(voiceLine('order', order)?.takes.length).toBeGreaterThanOrEqual(3);
      expect(voiceLine('answer', order)?.takes.length).toBeGreaterThanOrEqual(3);
    }
  });

  it('names files the sound bank has, and every voice file has a line', () => {
    const ids = VOICE_LINES.flatMap((entry) => entry.takes.map((_, index) => voiceFile(entry, index + 1)));
    expect(ids.filter((id) => !(id in SOUND_FILES))).toEqual([]);
    const voiceFiles = Object.keys(SOUND_FILES).filter((id) => /^(comandante|soldado|inimigo|xingamento)\//.test(id));
    expect(voiceFiles.filter((id) => !ids.includes(id))).toEqual([]);
  });

  it('flags an order without its answer', () => {
    const problems = validateVoiceLines(VOICE_LINES.filter((entry) => !(entry.kind === 'answer' && entry.key === 'move')));
    expect(problems).toContain('voice: order "move" has no answer line');
  });

  it('gives every curse a moment, and picks curses that fit the moment', () => {
    expect(VOICE_LINES.filter((entry) => entry.kind === 'curse' && !entry.moment)).toEqual([]);
    expect(curseLines('column', 'miss').map((entry) => entry.key)).toEqual(['09', '10', '12']);
    expect(pickCurse('column', 'flee', () => 0)?.moment).toBe('flee');
    expect(pickCurse('column', 'flee', () => 0.99)?.moment).toBe('insult');
    // The legalists have no curse for a miss: an insult instead.
    expect(pickCurse('legalist', 'miss', () => 0)?.moment).toBe('insult');
  });

  it('keeps each faction to its own curses', () => {
    for (const faction of ['column', 'legalist', 'cangaceiro'] as const) {
      expect(curseLines(faction).length).toBeGreaterThan(0);
      expect(curseLines(faction).every((entry) => entry.speaker === `xingamento/${faction}`)).toBe(true);
    }
  });
});

describe('commands to spoken orders', () => {
  it('maps the board and the fire control', () => {
    const cases: [Command, string | null][] = [
      [{ type: 'move', unitIds: [1], to: { x: 0, y: 0 } }, 'move'],
      [{ type: 'area_fire', unitIds: [1], to: { x: 0, y: 0 } }, 'area-fire'],
      [{ type: 'face', unitIds: [1], to: { x: 0, y: 0 } }, 'aim'],
      [{ type: 'order', order: 'recon', unitIds: [1] }, 'recon'],
      [{ type: 'order', order: 'regroup', unitIds: [1] }, null],
      [{ type: 'fire_control', unitIds: [1], mode: 'economy' }, 'fire-economy'],
      [{ type: 'stance', unitIds: [1], stance: 'prone' }, null],
    ];
    for (const [command, order] of cases) expect(commandOrder(command)).toBe(order);
  });
});

describe('the voice director', () => {
  it('speaks an accepted order, centred and ducking, and answers after a gap', () => {
    const { output, voice, order } = director();
    order(1, 'attack');
    voice.update(0);
    expect(output.played).toEqual([]);
    voice.accepted(1, 0);
    expect(output.played).toEqual([{ id: 'comandante/attack-1', gain: 1, pan: 0, priority: true }]);
    voice.update(1000 + ANSWER_GAP_MS - 1);
    expect(output.played).toHaveLength(1);
    voice.update(1000 + ANSWER_GAP_MS);
    expect(output.played[1]).toEqual({ id: 'soldado/attack-ack-1', gain: 1, pan: 0, priority: true });
  });

  it('says nothing for a refused order', () => {
    const { output, voice, order } = director();
    order(3, 'move');
    voice.rejected(3);
    voice.accepted(3, 0);
    voice.update(5000);
    expect(output.played).toEqual([]);
  });

  it('a newer order replaces the pending line: nothing plays late', () => {
    const { output, voice, order } = director();
    order(1, 'move');
    voice.accepted(1, 0);
    order(2, 'hold');
    voice.accepted(2, 300);
    for (let t = 300; t <= 6000; t += 100) voice.update(t);
    expect(output.played.map((p) => p.id)).toEqual(['comandante/move-1', 'comandante/hold-1', 'soldado/hold-ack-1']);
  });

  it('never repeats a take twice in a row', () => {
    const { output, voice, order } = director();
    for (let i = 1; i <= 6; i += 1) {
      order(i, 'move');
      voice.accepted(i, i * 10_000);
      voice.update(i * 10_000 + 5000);
    }
    const lines = output.played.map((p) => p.id).filter((id) => id.startsWith('comandante/'));
    for (let i = 1; i < lines.length; i += 1) expect(lines[i]).not.toBe(lines[i - 1]);
  });

  it('skips a missing take silently and still answers', () => {
    const { output, voice, order } = director();
    output.missing.add('comandante/move-1');
    order(1, 'move');
    voice.accepted(1, 0);
    expect(output.played.map((p) => p.id)).toEqual(['soldado/move-ack-1']);
  });

  it('places a call-out, keeps its quiet time, and lets orders go first', () => {
    const { output, voice, order } = director();
    expect(voice.callOut({ line: line('callout', 'pinned'), section: 1, placement: near }, 0)).toBe(true);
    expect(output.played[0]).toEqual({ id: 'soldado/pinned-1', ...near, priority: false });
    voice.update(2000);
    expect(voice.callOut({ line: line('callout', 'pinned'), section: 1, placement: near }, 2000)).toBe(false);
    // Another section's same call-out waits out the gap per kind.
    expect(voice.callOut({ line: line('callout', 'pinned'), section: 2, placement: near }, 2000)).toBe(false);
    expect(voice.callOut({ line: line('callout', 'pinned'), section: 2, placement: near }, CALLOUT_KIND_GAP_MS)).toBe(true);
    voice.update(CALLOUT_QUIET_MS + 1);
    // An order waiting for acceptance holds call-outs back; one that cannot start soon is dropped.
    order(1, 'hold');
    voice.callOut({ line: line('callout', 'pinned'), section: 1, placement: near }, CALLOUT_QUIET_MS + 1);
    voice.update(CALLOUT_QUIET_MS + 3000);
    expect(output.played.map((p) => p.id)).toEqual(['soldado/pinned-1', 'soldado/pinned-2']);
  });

  it('curses by chance, with a quiet time per section and a cap over all', () => {
    const rolls = [0.9, 0, 0, 0, 0, 0];
    const { output, voice } = director({ random: () => rolls.shift() ?? 0 });
    const curse = curseLines('legalist')[0]!;
    expect(voice.curse({ line: curse, section: 1, placement: near }, 0)).toBe(false);
    expect(voice.curse({ line: curse, section: 1, placement: near }, 100)).toBe(true);
    voice.update(2000);
    expect(voice.curse({ line: curse, section: 2, placement: near }, 2000)).toBe(false);
    expect(voice.curse({ line: curse, section: 2, placement: near }, 100 + CURSE_CAP_MS)).toBe(true);
    voice.update(20_000);
    expect(voice.curse({ line: curse, section: 1, placement: near }, 20_000)).toBe(false);
    expect(voice.curse({ line: curse, section: 1, placement: near }, 100 + CURSE_QUIET_MS)).toBe(true);
    expect(output.played.every((p) => p.id.startsWith('xingamento/legalist/'))).toBe(true);
  });

  it('says reloading much more rarely than other call-outs', () => {
    const { voice } = director();
    const reloading = line('callout', 'reloading');
    expect(voice.callOut({ line: reloading, section: 1, placement: near }, 0)).toBe(true);
    voice.update(2000);
    expect(voice.callOut({ line: reloading, section: 2, placement: near }, RARE_CALLOUTS.reloading!.gap - 1)).toBe(false);
    expect(voice.callOut({ line: reloading, section: 2, placement: near }, RARE_CALLOUTS.reloading!.gap)).toBe(true);
    voice.update(40_000);
    expect(voice.callOut({ line: reloading, section: 1, placement: near }, RARE_CALLOUTS.reloading!.gap * 1.5)).toBe(false);
    expect(voice.callOut({ line: reloading, section: 1, placement: near }, RARE_CALLOUTS.reloading!.quiet)).toBe(true);
  });

  it('never curses when the curses setting is off', () => {
    const { output, voice } = director({ curses: false });
    expect(voice.curse({ line: curseLines('column')[0]!, section: 1, placement: near }, 0)).toBe(false);
    expect(output.played).toEqual([]);
  });

  it('captions what plays, and clears it after', () => {
    const { voice, captions, order } = director();
    order(1, 'hold');
    voice.accepted(1, 0);
    expect(captions[0]).toEqual({ kind: 'order', take: line('order', 'hold').takes[0], enemy: false });
    voice.update(1100);
    expect(captions[1]).toBeNull();
  });
});

const unit = (id: number, faction: UnitSnapshot['faction'], over: Partial<UnitSnapshot> = {}): UnitSnapshot =>
  ({ id, faction, squadId: 1, x: id * 5, y: 0, alive: true, incapacitated: false, dummy: false, routed: false, magazine: 5, reserve: 20, state: 'steady', order: null, targetId: null, ...over }) as UnitSnapshot;

const frame = (tick: number, units: UnitSnapshot[], events: SimEvent[] = [], seen: number[] = []): Frame =>
  ({ tick, units, events, outcome: 'playing', phase: 'battle', fog: true, seen: { column: seen, legalist: [] } }) as unknown as Frame;

describe('the call-out watch', () => {
  it('reads reloading, no ammunition, pinned and gun set from the snapshot', () => {
    const watch = new VoiceWatch();
    watch.frame(frame(1, [unit(1, 'column'), unit(2, 'column'), unit(3, 'column'), unit(4, 'column', { gunState: 'setting' })]), 'column');
    const out = watch.frame(frame(2, [unit(1, 'column', { magazine: 0 }), unit(2, 'column', { magazine: 0, reserve: 0 }), unit(3, 'column', { state: 'pinned' }), unit(4, 'column', { gunState: 'set' })]), 'column');
    expect(out.filter((r) => r.kind === 'callout').map((r) => r.kind === 'callout' && r.key)).toEqual(['reloading', 'no-ammo', 'pinned', 'gun-set']);
  });

  it('hears the enemy only when our side sees him', () => {
    const watch = new VoiceWatch();
    const enemies = [unit(10, 'legalist', { squadId: 2 }), unit(11, 'legalist', { squadId: 3 })];
    watch.frame(frame(1, [unit(1, 'column'), ...enemies], [], [10, 11]), 'column');
    const out = watch.frame(frame(2, [unit(1, 'column'), unit(10, 'legalist', { squadId: 2, state: 'pinned' }), unit(11, 'legalist', { squadId: 3, state: 'pinned' })], [], [10]), 'column');
    expect(out.filter((r) => r.kind === 'enemy')).toEqual([{ kind: 'enemy', key: 'pinned', section: 1002, x: 50, y: 0 }]);
  });

  it('gives an engaged section a curse chance once a second, in its own faction', () => {
    const watch = new VoiceWatch();
    const units = [unit(1, 'column'), unit(10, 'cangaceiro', { squadId: 4 })];
    watch.frame(frame(1, units, [], [10]), 'column');
    const shot: SimEvent = { type: 'shot', tick: 2, source: 1, target: 10, x: 0, y: 0, x2: 50, y2: 0, hit: false };
    const out = watch.frame(frame(2, units, [shot], [10]), 'column');
    expect(out.filter((r) => r.kind === 'curse').map((r) => r.kind === 'curse' && `${r.faction}:${r.moment}`)).toEqual(['column:miss', 'cangaceiro:under-fire']);
    expect(watch.frame(frame(3, units, [{ ...shot, tick: 3 }], [10]), 'column').filter((r) => r.kind === 'curse')).toEqual([]);
  });

  it('a rout gives the other side a jeer, the strongest moment of the frame', () => {
    const watch = new VoiceWatch();
    const units = [unit(1, 'column'), unit(10, 'legalist', { squadId: 4 })];
    watch.frame(frame(1, units, [], [10]), 'column');
    const hit: SimEvent = { type: 'shot', tick: 2, source: 1, target: 10, x: 0, y: 0, x2: 50, y2: 0, hit: true };
    const out = watch.frame(frame(2, units, [hit, { type: 'unit_routed', tick: 2, unitId: 10 }], [10]), 'column');
    expect(out.filter((r) => r.kind === 'curse').map((r) => r.kind === 'curse' && `${r.faction}:${r.moment}`)).toEqual(['column:flee', 'legalist:under-fire']);
  });

  it('says nothing in deployment', () => {
    const watch = new VoiceWatch();
    watch.frame(frame(1, [unit(1, 'column')]), 'column');
    const deploying = { ...frame(2, [unit(1, 'column', { state: 'pinned' })]), phase: 'deployment' } as Frame;
    expect(watch.frame(deploying, 'column')).toEqual([]);
  });
});

describe('captions by language', () => {
  it('are on in English and off in Portuguese until the player chooses', () => {
    const fresh = parseAudioSettings(null);
    expect(captionsOn(fresh, 'en')).toBe(true);
    expect(captionsOn(fresh, 'pt-BR')).toBe(false);
    expect(captionsOn(parseAudioSettings({ captions: true }), 'pt-BR')).toBe(true);
    expect(captionsOn(parseAudioSettings({ captions: false }), 'en')).toBe(false);
  });
});

describe('voices heard from a distance', () => {
  it('filters orders at a fixed middle distance, and far call-outs more', async () => {
    const { ORDER_DISTANCE, voiceDistance } = await import('../../apps/game/src/audio/voice-distance');
    expect(voiceDistance(true, 1)).toEqual(ORDER_DISTANCE);
    const near = voiceDistance(false, 1);
    const far = voiceDistance(false, 0.05);
    expect(far.lowpass).toBeLessThan(near.lowpass);
    expect(far.wet).toBeGreaterThan(near.wet);
    expect(near.lowpass).toBeLessThan(5000);
    expect(near.wet).toBeGreaterThan(0);
  });
});
