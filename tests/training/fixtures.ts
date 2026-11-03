import type { Frame, UnitSnapshot } from '../../packages/shared/src';

export function unit(
  id: number,
  x: number,
  y: number,
  overrides: Partial<UnitSnapshot> = {},
): UnitSnapshot {
  return {
    id,
    x,
    y,
    facingX: 0,
    facingY: -1,
    kind: 'infantry',
    faction: 'column',
    stance: 'standing',
    squadId: 1,
    hp: 100,
    weaponId: 'mauser-7mm',
    magazine: 5,
    reserve: 15,
    morale: 100,
    alive: true,
    suppressed: false,
    suppression: 0,
    cohesion: 100,
    fatigue: 0,
    formation: 'line',
    soldierState: 'idle',
    incapacitated: false,
    rescueTargetId: null,
    rescueProgress: 0,
    reconContacts: 0,
    rescueQueueLength: 0,
    wound: 'none',
    state: 'steady',
    routed: false,
    dummy: false,
    cover: 0,
    order: null,
    targetId: null,
    ...overrides,
  } as UnitSnapshot;
}

export function frame(tick: number, units: UnitSnapshot[]): Frame {
  return {
    tick,
    units,
    orders: [],
    covers: [],
    events: [],
    outcome: 'playing',
    hash: 'test',
    sightObstacles: [],
  } as Frame;
}

export function players(x: number, y: number, count = 5): UnitSnapshot[] {
  return Array.from({ length: count }, (_, index) =>
    unit(index + 1, x + index * 0.5, y),
  );
}

export function officer(x = 52, y = -8, overrides: Partial<UnitSnapshot> = {}): UnitSnapshot {
  return unit(99, x, y, {
    kind: 'officer',
    squadId: 99,
    ...overrides,
  } as Partial<UnitSnapshot>);
}

export function trainingEnemies(count: number, x = 60, y = -18, suppressed = false): UnitSnapshot[] {
  return Array.from({ length: count }, (_, index) =>
    unit(20 + index, x + index, y, {
      faction: 'target',
      role: 'training-enemy',
      nonLethal: true,
      squadId: 10,
      suppressed,
      suppression: suppressed ? 60 : 0,
    } as Partial<UnitSnapshot>),
  );
}

