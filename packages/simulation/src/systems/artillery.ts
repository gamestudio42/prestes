import {
  GUNS,
  MAP_BOUNDS,
  MAX_BOMBARDMENTS,
  SHELL_FLIGHT_TICKS,
  coverAgainst,
  isPointInCover,
  polygonMiddle,
  suppressionDivisor,
  unitValues,
  waterAt,
  type BombardmentTarget,
  type CoverPoint,
  type EventAction,
  type EventSide,
  type GunId,
  type SimEvent,
  type Vec2,
} from '@prestes/shared';
import type { SimContext } from './context';
import type { MutableUnit } from './model';
import type { ScriptedState } from './battle-events';
import { applyDamage } from './combat';
import { garrisonCover } from './garrison';
import { clamp } from './model';

/**
 * add-artillery-bombardment D2 to D5: shells called down by a battle event.
 * A bombardment announces a shell (`shell_incoming`), the shell lands
 * SHELL_FLIGHT_TICKS later (`shell_impact`), wounds and kills by distance,
 * suppresses, and may leave a crater. Every draw comes from the seeded RNG,
 * in a fixed order; nothing runs, and nothing is drawn, without a bombardment.
 */

const TICKS_PER_MINUTE = 600;
/** An enemy the firing side saw this recently (ticks, 30 s) is still a target. */
const KNOWN_TICKS = 300;

/** A hit's chance inside the lethal radius, and at the edge of the wounding radius. */
export const HIT_CHANCE = { core: 0.85, edge: 0.1 } as const;
/** Damage of a hit inside the lethal radius, and in the ring outside it. */
export const SHELL_DAMAGE = { core: [60, 100], ring: [20, 55] } as const;
/** Morale a man loses when a burst hits him (before his army's factor). */
const HIT_MORALE = 20;
/** Suppression and morale at the burst point, before distance and protection. */
export const BURST_SUPPRESSION = 70;
export const BURST_MORALE = 14;
/** A man in a trench is this protected from a burst, unless it lands this close (m). */
export const TRENCH_PROTECTION = 0.8;
export const DIRECT_HIT = 1.5;
/** Protection from a burst never passes this. */
export const MAX_PROTECTION = 0.8;
/** D5: craters per battle, their spacing and size. */
export const MAX_CRATERS = 40;
export const CRATER_SPACING = 3;
export const CRATER_RADIUS = 1.5;

export interface ActiveBombardment {
  eventId: number;
  side: EventSide;
  gun: GunId;
  target: BombardmentTarget;
  spread: number;
  /** Ticks between shells at the rate (before the draw that varies each). */
  interval: number;
  nextTick: number;
  endsAt?: number;
  untilEvent?: number;
}

export interface PendingShell {
  gun: GunId;
  side: EventSide;
  x: number;
  y: number;
  landsAt: number;
}

/** A bombardment action of an event that fired on `tick`: its first shell is announced this tick. */
export function startBombardment(state: ScriptedState, eventId: number, action: Extract<EventAction, { kind: 'bombardment' }>, tick: number): void {
  state.bombardments.push({
    eventId,
    side: action.side,
    gun: action.gun,
    target: action.target.kind === 'area' ? { kind: 'area', area: action.target.area } : { kind: 'enemy' },
    spread: action.spread,
    interval: TICKS_PER_MINUTE / action.perMinute,
    nextTick: tick,
    ...('event' in action.until ? { untilEvent: action.until.event } : { endsAt: tick + action.until.seconds * 10 }),
  });
  // At most four at once: a fifth replaces the oldest.
  while (state.bombardments.length > MAX_BOMBARDMENTS) state.bombardments.shift();
}

const otherSide = (side: EventSide): EventSide => (side === 'column' ? 'legalist' : 'column');

/** D4: an enemy the firing side knows of, at the place it knows; null when it knows of none. */
function enemyAim(ctx: SimContext, side: EventSide, tick: number): Vec2 | null {
  const enemy = otherSide(side);
  const seen = ctx.vision.seen[side];
  const lastSeen = ctx.vision.lastSeen[side];
  const known: Vec2[] = [];
  for (const unit of ctx.units) {
    if (unit.faction !== enemy || !unit.alive || unit.incapacitated || unit.routed || unit.dummy) continue;
    if (!ctx.fog || seen.has(unit.id)) {
      known.push({ x: unit.x, y: unit.y });
      continue;
    }
    const sighting = lastSeen.get(unit.id);
    if (sighting && tick - sighting.tick <= KNOWN_TICKS) known.push({ x: sighting.x, y: sighting.y });
  }
  if (known.length === 0) return null;
  return known[Math.min(known.length - 1, Math.floor(ctx.rng.nextFloat() * known.length))]!;
}

function aimPoint(ctx: SimContext, state: ScriptedState, bombardment: ActiveBombardment, tick: number): Vec2 | null {
  if (bombardment.target.kind === 'enemy') return enemyAim(ctx, bombardment.side, tick);
  const place = state.places.get(bombardment.target.area);
  return place?.kind === 'area' ? polygonMiddle(place.polygon) : null;
}

const round2 = (value: number) => Math.round(value * 100) / 100;

function announce(ctx: SimContext, state: ScriptedState, bombardment: ActiveBombardment, tick: number, events: SimEvent[]): void {
  const aim = aimPoint(ctx, state, bombardment, tick);
  if (aim) {
    const radius = bombardment.spread * Math.sqrt(ctx.rng.nextFloat());
    const angle = 2 * Math.PI * ctx.rng.nextFloat();
    const bounds = ctx.battleMap?.bounds ?? MAP_BOUNDS;
    const x = round2(clamp(aim.x + Math.cos(angle) * radius, bounds.minX, bounds.maxX));
    const y = round2(clamp(aim.y + Math.sin(angle) * radius, bounds.minY, bounds.maxY));
    const landsAt = tick + SHELL_FLIGHT_TICKS;
    state.shells.push({ gun: bombardment.gun, side: bombardment.side, x, y, landsAt });
    events.push({ type: 'shell_incoming', tick, gun: bombardment.gun, x, y, landsAt });
  }
  bombardment.nextTick += Math.max(1, Math.round(bombardment.interval * (0.75 + 0.5 * ctx.rng.nextFloat())));
}

/** D3: a man's protection from a burst at (x, y), `distance` metres away. */
export function burstProtection(ctx: SimContext, unit: MutableUnit, x: number, y: number, distance: number): number {
  const cover = coverAgainst(unit.x, unit.y, x, y, unit.stance, ctx.covers);
  const inTrench = distance > DIRECT_HIT && ctx.covers.some((piece) => piece.kind === 'trench' && isPointInCover(unit.x, unit.y, piece));
  const garrison = garrisonCover(ctx, unit) ?? 0;
  return Math.min(MAX_PROTECTION, Math.max(cover, inTrench ? TRENCH_PROTECTION : 0, garrison));
}

/** D3: the chance a burst `distance` metres away hits an unprotected man. */
export function burstHitChance(gun: GunId, distance: number): number {
  const { lethal, wound } = GUNS[gun];
  if (distance > wound) return 0;
  if (distance <= lethal) return HIT_CHANCE.core;
  return HIT_CHANCE.core - (HIT_CHANCE.core - HIT_CHANCE.edge) * ((distance - lethal) / (wound - lethal));
}

/** D5: a crater where the shell landed, if the ground is open and dry and there is room. */
function leaveCrater(ctx: SimContext, state: ScriptedState, x: number, y: number): number | undefined {
  if (state.craters >= MAX_CRATERS || waterAt(x, y) !== 0) return undefined;
  for (const cover of ctx.covers) {
    if (cover.kind === 'crater') {
      if ((cover.x - x) ** 2 + (cover.y - y) ** 2 < CRATER_SPACING * CRATER_SPACING) return undefined;
    } else if (isPointInCover(x, y, cover)) {
      return undefined;
    }
  }
  const crater: CoverPoint = {
    id: ctx.nextCoverId,
    kind: 'crater',
    x,
    y,
    halfWidth: CRATER_RADIUS,
    halfDepth: CRATER_RADIUS,
    height: 0.5,
    radius: CRATER_RADIUS,
    quality: 0.35,
    blocksMovement: false,
    blocksSight: false,
  };
  ctx.nextCoverId += 1;
  ctx.covers.push(crater);
  state.craters += 1;
  return crater.id;
}

function land(ctx: SimContext, state: ScriptedState, shell: PendingShell, tick: number, events: SimEvent[]): void {
  const gun = GUNS[shell.gun];
  const crater = leaveCrater(ctx, state, shell.x, shell.y);
  events.push({ type: 'shell_impact', tick, gun: shell.gun, x: shell.x, y: shell.y, ...(crater !== undefined ? { crater } : {}) });
  for (const unit of ctx.units) {
    if (!unit.alive || unit.incapacitated || unit.dummy) continue;
    if (unit.faction !== 'column' && unit.faction !== 'legalist') continue;
    const distance = Math.sqrt((unit.x - shell.x) ** 2 + (unit.y - shell.y) ** 2);
    if (distance > gun.suppress) continue;
    const protection = burstProtection(ctx, unit, shell.x, shell.y, distance);
    if (distance <= gun.wound) {
      const chance = burstHitChance(shell.gun, distance) * (1 - protection);
      if (ctx.rng.nextFloat() < chance) {
        const [min, max] = distance <= gun.lethal ? SHELL_DAMAGE.core : SHELL_DAMAGE.ring;
        const damage = min + Math.floor(ctx.rng.nextFloat() * (max - min + 1));
        applyDamage(ctx, unit, damage, Math.round(HIT_MORALE * unitValues(unit).moraleLoss), tick, events);
        if (!unit.alive || unit.incapacitated) continue;
      }
    }
    const near = (1 - distance / gun.suppress) * (1 - 0.5 * protection);
    unit.suppression = clamp(unit.suppression + (BURST_SUPPRESSION * near) / suppressionDivisor(unit), 0, 100);
    unit.morale = Math.max(0, unit.morale - Math.round(BURST_MORALE * near * unitValues(unit).moraleLoss));
  }
}

/** D2: end bombardments that are over, announce shells that are due, land shells that arrive. Runs after the battle events. */
export function updateArtillery(ctx: SimContext, tick: number, events: SimEvent[]): void {
  const state = ctx.scripted;
  if (!state || (state.bombardments.length === 0 && state.shells.length === 0)) return;
  const running = state.bombardments.filter(
    (bombardment) =>
      !(bombardment.endsAt !== undefined && tick >= bombardment.endsAt) && !(bombardment.untilEvent !== undefined && state.fired.has(bombardment.untilEvent)),
  );
  state.bombardments.splice(0, state.bombardments.length, ...running);
  const ordered = [...state.bombardments].sort((a, b) => a.eventId - b.eventId);
  for (const bombardment of ordered) {
    while (bombardment.nextTick <= tick && (bombardment.endsAt === undefined || bombardment.nextTick < bombardment.endsAt)) announce(ctx, state, bombardment, tick, events);
  }
  const due = state.shells.filter((shell) => shell.landsAt <= tick);
  if (due.length === 0) return;
  state.shells.splice(0, state.shells.length, ...state.shells.filter((shell) => shell.landsAt > tick));
  for (const shell of due) land(ctx, state, shell, tick, events);
}

/** D2: the artillery state the engine hashes, only once a bombardment has fired. */
export function artilleryHashState(state: ScriptedState): Record<string, unknown> {
  if (state.bombardments.length === 0 && state.shells.length === 0 && state.craters === 0) return {};
  return { bombardments: state.bombardments, shells: state.shells, craters: state.craters };
}
