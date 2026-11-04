import type { UnitSnapshot } from '@prestes/shared';
import { RESCUE_CARRY_TICKS, TREAT_TICKS } from './model';
import type { SimContext } from './context';

export function snapshotUnits(ctx: SimContext): UnitSnapshot[] {
  return ctx.units.map((unit) => ({
    id: unit.id,
    x: unit.x,
    y: unit.y,
    facingX: unit.facingX,
    facingY: unit.facingY,
    aimX: unit.aimX,
    aimY: unit.aimY,
    kind: unit.kind,
    faction: unit.faction,
    stance: unit.stance,
    squadId: unit.squadId,
    hp: unit.hp,
    weaponId: unit.weaponId,
    magazine: unit.magazine,
    reserve: unit.reserve,
    morale: unit.morale,
    alive: unit.alive,
    suppressed: unit.suppressed,
    suppression: unit.suppression,
    cohesion: unit.cohesion,
    fatigue: unit.fatigue,
    formation: unit.formation,
    soldierState: unit.soldierState,
    incapacitated: unit.incapacitated,
    rescueTargetId: unit.rescueTargetId,
    reconContacts: unit.currentOrder === 'recon' || unit.recon ? unit.reconContacts : 0,
    rescueQueueLength: unit.rescueQueue.length,
    wound: unit.wound,
    rescueProgress:
      unit.carryingId !== null
        ? 1 - unit.rescueTicks / RESCUE_CARRY_TICKS
        : unit.treatTicks > 0
          ? 1 - unit.treatTicks / TREAT_TICKS
          : 0,
    state: unit.state,
    routed: unit.routed,
    dummy: unit.dummy,
    cover: unit.cover,
    order: unit.currentOrder,
    targetId: unit.targetId,
    slotId: unit.slotId,
    holdFire: unit.holdFire,
    posture: unit.posture,
    boundTeam: unit.boundTeam,
    boundPhase: unit.boundPhase,
    role: unit.role,
    nonLethal: unit.nonLethal,
  }));
}
