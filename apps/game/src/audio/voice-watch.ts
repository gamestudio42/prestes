import type { VoiceCallout, VoiceEnemyCallout, VoiceFaction } from '@prestes/content';
import type { Frame, UnitSnapshot } from '@prestes/shared';

/**
 * ambient-sound-and-voices 5.1 and 5.4: what is worth saying, read from the
 * difference between two frames. Pure: frames in, requests out; the voice
 * controller places them and the director decides what plays.
 *
 * From the snapshot (5.1's decision):
 * - out of ammunition: a man's magazine and reserve both reach 0;
 * - reloading: his magazine reaches 0 with rounds in reserve;
 * - gun set: a machine gun's `gunState` becomes `set`.
 *
 * Enemy lines are asked for only when our side sees the speaker, and curses
 * only for a section that is engaged (firing, or fired on) at that moment, at
 * most one chance per section a second.
 */

export type VoiceRequest =
  | { kind: 'callout'; key: VoiceCallout; section: number; x: number; y: number }
  | { kind: 'enemy'; key: VoiceEnemyCallout; section: number; x: number; y: number }
  | { kind: 'curse'; faction: VoiceFaction; section: number; x: number; y: number; enemy: boolean };

/** Ticks with no enemy seen before seeing one is "contact" again (10 ticks a second). */
export const CONTACT_AGAIN_TICKS = 300;
/** Ticks between two curse chances of one section. */
export const CURSE_CHANCE_TICKS = 10;
/** Our machine gun fires within this many metres of a seen enemy: "the machine gun!" */
export const MACHINE_GUN_NEAR = 40;

const VOICE_FACTIONS: readonly string[] = ['column', 'legalist', 'cangaceiro'];

interface Was {
  magazine: number;
  reserve: number;
  state: UnitSnapshot['state'];
  gunState: UnitSnapshot['gunState'];
  order: UnitSnapshot['order'];
  targetId: number | null;
}

/** A section's id over both sides (squad ids repeat between sides). */
export const sectionOf = (unit: Pick<UnitSnapshot, 'faction' | 'squadId'>): number => unit.squadId + (unit.faction === 'column' ? 0 : 1000);

export class VoiceWatch {
  private was = new Map<number, Was>();
  private lastTick = -1;
  private seenBefore = 0;
  private noneSeenSince = 0;
  private readonly curseAt = new Map<number, number>();

  reset(): void {
    this.was = new Map();
    this.lastTick = -1;
    this.seenBefore = 0;
    this.noneSeenSince = 0;
    this.curseAt.clear();
  }

  /** The requests of a new frame for the player's side `side`. */
  frame(frame: Pick<Frame, 'tick' | 'units' | 'events' | 'seen' | 'fog' | 'phase' | 'outcome'>, side: 'column' | 'legalist'): VoiceRequest[] {
    if (frame.tick < this.lastTick) this.reset();
    if (frame.tick === this.lastTick) return [];
    const first = this.lastTick < 0;
    this.lastTick = frame.tick;
    const units = new Map(frame.units.map((unit) => [unit.id, unit]));
    const out: VoiceRequest[] = [];
    if (frame.phase === 'deployment' || frame.outcome !== 'playing') {
      this.remember(frame.units);
      return out;
    }
    const seenSet = frame.fog && frame.seen ? new Set(frame.seen[side]) : null;
    const ours = (unit: UnitSnapshot) => (side === 'column' ? unit.faction === 'column' : unit.faction !== 'column' && VOICE_FACTIONS.includes(unit.faction));
    const enemy = (unit: UnitSnapshot) => !ours(unit) && VOICE_FACTIONS.includes(unit.faction);
    const visible = (unit: UnitSnapshot) => seenSet === null || seenSet.has(unit.id);
    const fit = (unit: UnitSnapshot) => unit.alive && !unit.incapacitated && !unit.dummy;
    const say = (unit: UnitSnapshot, key: VoiceCallout | VoiceEnemyCallout) => {
      if (ours(unit)) out.push({ kind: 'callout', key: key as VoiceCallout, section: sectionOf(unit), x: unit.x, y: unit.y });
      else if (enemy(unit) && visible(unit)) out.push({ kind: 'enemy', key: key as VoiceEnemyCallout, section: sectionOf(unit), x: unit.x, y: unit.y });
    };

    // Contact: our side sees an enemy after a while of seeing none.
    const seenEnemies = frame.units.filter((unit) => enemy(unit) && fit(unit) && visible(unit));
    if (seenEnemies.length === 0) {
      if (this.seenBefore > 0) this.noneSeenSince = frame.tick;
    } else if (this.seenBefore === 0 && !first && (this.noneSeenSince === 0 || frame.tick - this.noneSeenSince >= CONTACT_AGAIN_TICKS)) {
      const target = seenEnemies[0]!;
      const speaker = nearest(frame.units.filter((unit) => ours(unit) && fit(unit)), target);
      if (speaker) say(speaker, 'contact');
    }
    this.seenBefore = seenEnemies.length;

    if (!first) {
      for (const unit of frame.units) {
        const was = this.was.get(unit.id);
        if (!was || !fit(unit)) continue;
        if (unit.magazine === 0 && was.magazine > 0) {
          if (unit.reserve === 0) say(unit, 'no-ammo');
          else if (ours(unit)) say(unit, 'reloading');
        }
        if (unit.state === 'pinned' && was.state !== 'pinned') say(unit, 'pinned');
        if (ours(unit) && unit.gunState === 'set' && was.gunState !== 'set') say(unit, 'gun-set');
        if (enemy(unit) && unit.order !== was.order) {
          if (unit.order === 'advance' || unit.order === 'assault' || unit.order === 'flank') say(unit, 'advance');
          else if (unit.order === 'hold' || unit.order === 'defend') say(unit, 'hold');
        }
        // The enemy has seen us: he takes one of ours as his target.
        if (enemy(unit) && unit.targetId !== null && was.targetId === null) {
          const target = units.get(unit.targetId);
          if (target && ours(target)) say(unit, 'contact');
        }
      }
    }

    const engaged = new Map<number, UnitSnapshot>();
    const engage = (unit: UnitSnapshot | undefined) => {
      if (unit && fit(unit) && VOICE_FACTIONS.includes(unit.faction) && !engaged.has(sectionOf(unit))) engaged.set(sectionOf(unit), unit);
    };
    for (const event of frame.events) {
      switch (event.type) {
        case 'unit_died':
        case 'unit_incapacitated': {
          const down = units.get(event.unitId);
          if (!down) break;
          // A comrade says it: the nearest fit man of his section.
          const comrade = nearest(frame.units.filter((unit) => fit(unit) && unit.id !== down.id && sectionOf(unit) === sectionOf(down)), down);
          if (comrade) say(comrade, 'man-down');
          break;
        }
        case 'unit_routed': {
          const routed = units.get(event.unitId);
          if (routed) say(routed, 'falling-back');
          break;
        }
        case 'objective_taken': {
          const taker = frame.units.find((unit) => fit(unit) && (event.side === 'column' ? unit.faction === 'column' : unit.faction !== 'column'));
          if (taker) say(taker, 'objective');
          break;
        }
        case 'shot': {
          const shooter = units.get(event.source);
          engage(shooter);
          engage(units.get(event.target));
          // Our machine gun firing near an enemy our side sees.
          if (shooter && ours(shooter) && event.burstStart === true) {
            const scared = seenEnemies.find((unit) => Math.hypot(unit.x - event.x2, unit.y - event.y2) <= MACHINE_GUN_NEAR);
            if (scared) say(scared, 'machine-gun');
          }
          break;
        }
        case 'unit_hit':
          engage(units.get(event.unitId));
          break;
        default:
          break;
      }
    }
    for (const [section, unit] of engaged) {
      if (frame.tick - (this.curseAt.get(section) ?? Number.NEGATIVE_INFINITY) < CURSE_CHANCE_TICKS) continue;
      if (enemy(unit) && !visible(unit)) continue;
      this.curseAt.set(section, frame.tick);
      out.push({ kind: 'curse', faction: unit.faction as VoiceFaction, section, x: unit.x, y: unit.y, enemy: enemy(unit) });
    }

    this.remember(frame.units);
    return out;
  }

  private remember(units: readonly UnitSnapshot[]): void {
    this.was = new Map(units.map((unit) => [unit.id, { magazine: unit.magazine, reserve: unit.reserve, state: unit.state, gunState: unit.gunState, order: unit.order, targetId: unit.targetId }]));
  }
}

function nearest<T extends { x: number; y: number }>(candidates: readonly T[], to: { x: number; y: number }): T | undefined {
  let best: T | undefined;
  let distance = Number.POSITIVE_INFINITY;
  for (const candidate of candidates) {
    const d = Math.hypot(candidate.x - to.x, candidate.y - to.y);
    if (d < distance) {
      distance = d;
      best = candidate;
    }
  }
  return best;
}
