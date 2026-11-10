import type { Faction, Frame, GarrisonSnapshot, SimEvent, UnitSnapshot } from './protocol';
import type { InterpolatedFrame } from './mirror';

/**
 * The player's view under fog of war (fog-of-war). Filters each frame before
 * the HUD, the scene, the effects and the sound see it:
 * - an enemy soldier the player's side does not see is left out, so he is not
 *   drawn and cannot be selected or targeted;
 * - an enemy seen dead or incapacitated stays;
 * - an enemy who drops out of sight leaves a ghost at his last place for 5 s;
 * - an unseen enemy's shot starts at its "?" marker, which stays 8 s.
 * The simulation's frame is untouched; the developer bridge reads it raw.
 */

export const GHOST_TICKS = 50;
export const MARKER_SHOW_TICKS = 80;

export interface FogGhost {
  id: number;
  x: number;
  y: number;
  facingX: number;
  facingY: number;
  faction: Faction;
  untilTick: number;
}

export interface FogMarker {
  x: number;
  y: number;
  radius: number;
  tick: number;
}

/** What the view adds to a fogged frame. */
export interface FogExtras {
  ghosts?: readonly FogGhost[];
  markers?: readonly FogMarker[];
}

type AnyFrame = (Frame | InterpolatedFrame) & FogExtras;

const fit = (unit: UnitSnapshot) => unit.alive && !unit.incapacitated && !unit.routed;

export class FogView {
  /** Off: the view shows everything (bootcamp, control of both sides). */
  enabled = true;
  private readonly seenDown = new Set<number>();
  private readonly ghosts = new Map<number, FogGhost>();
  private markers: FogMarker[] = [];
  private lastShown = new Map<number, UnitSnapshot>();
  private lastTick = -1;

  constructor(private readonly side: 'column' | 'legalist' = 'column') {}

  private get enemy(): 'column' | 'legalist' {
    return this.side === 'column' ? 'legalist' : 'column';
  }

  /** Clears the remembered state (a new battle). */
  reset(): void {
    this.seenDown.clear();
    this.ghosts.clear();
    this.markers = [];
    this.lastShown = new Map();
    this.lastTick = -1;
  }

  apply<T extends AnyFrame>(frame: T): T & FogExtras {
    // The fog lifts when the battle ends: the end panel counts true losses.
    if (!this.enabled || !frame.fog || !frame.seen || frame.outcome !== 'playing') return frame;
    if (frame.tick < this.lastTick) this.reset();
    const seen = new Set(frame.seen[this.side]);
    const fresh = frame.tick !== this.lastTick;

    if (fresh) {
      for (const unit of frame.units) {
        if (unit.faction === this.enemy && seen.has(unit.id) && !fit(unit)) this.seenDown.add(unit.id);
      }
      for (const event of frame.events) {
        if (event.type === 'unseen_fire' && event.side === this.enemy) {
          this.markers.push({ x: event.x, y: event.y, radius: event.radius, tick: frame.tick });
        }
      }
      this.markers = this.markers.filter((marker) => frame.tick - marker.tick <= MARKER_SHOW_TICKS);
    }

    const shown = (unit: UnitSnapshot) =>
      unit.faction !== this.enemy || seen.has(unit.id) || this.seenDown.has(unit.id);
    const units = frame.units.filter(shown);

    if (fresh) {
      const nowShown = new Map(units.map((unit) => [unit.id, unit]));
      for (const [id, unit] of this.lastShown) {
        if (unit.faction !== this.enemy || nowShown.has(id) || !fit(unit)) continue;
        this.ghosts.set(id, {
          id,
          x: unit.x,
          y: unit.y,
          facingX: unit.facingX,
          facingY: unit.facingY,
          faction: unit.faction,
          untilTick: frame.tick + GHOST_TICKS,
        });
      }
      for (const [id, ghost] of this.ghosts) {
        if (nowShown.has(id) || frame.tick > ghost.untilTick) this.ghosts.delete(id);
      }
      this.lastShown = nowShown;
      this.lastTick = frame.tick;
    }

    return {
      ...frame,
      units,
      ...(frame.garrisons ? { garrisons: this.garrisons(frame.garrisons) } : {}),
      events: this.events(frame.events, seen),
      ghosts: [...this.ghosts.values()],
      markers: this.markers,
    };
  }

  /**
   * garrison-and-assault 3.3: an enemy garrison shows only once its side is
   * known to hold it, and without its men until one was seen at a port.
   */
  private garrisons(garrisons: readonly GarrisonSnapshot[]): GarrisonSnapshot[] {
    return garrisons.flatMap((garrison) => {
      if (garrison.side === this.side) return [garrison];
      if (garrison.known === 'counted') return [garrison];
      if (garrison.known === 'occupied') return [{ ...garrison, unitIds: [], suppression: 0, strengthUnknown: true as const }];
      return [];
    });
  }

  /** An unseen enemy's shot starts at its marker and names no shooter. */
  private events(events: readonly SimEvent[], seen: ReadonlySet<number>): SimEvent[] {
    return events.map((event) => {
      if (event.type !== 'shot' || seen.has(event.source)) return event;
      const marker = events.find(
        (entry) =>
          entry.type === 'unseen_fire' &&
          entry.side === this.enemy &&
          entry.target === event.target &&
          entry.tick === event.tick,
      );
      if (!marker || marker.type !== 'unseen_fire') return event;
      return { ...event, source: -1, x: marker.x, y: marker.y };
    });
  }
}
