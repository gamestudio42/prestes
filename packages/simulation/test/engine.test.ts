import { describe, expect, it } from 'vitest';
import { SimulationEngine } from '../src/engine';
import { createSimulationHost } from '../src/worker-host';
import { assignBoundingDirect } from '../src/systems/bounding';
import { COVER_POINTS, MAP_BOUNDS, type WorkerResponse } from '@prestes/shared';

function approach(
  engine: SimulationEngine,
  unitIds: number[] = [1],
  ticks = 140,
  to = { x: -7, y: 6 },
): void {
  engine.enqueue({ type: 'move', unitIds, to });
  engine.runTicks(ticks);
}

function incapacitate(engine: SimulationEngine, unitId: number): void {
  engine.enqueue({ type: 'incapacitate', targetId: unitId });
  engine.runTicks(1);
}

describe('SimulationEngine', () => {
  it('starts with the skirmish units', () => {
    const engine = new SimulationEngine({ seed: 1922 });
    const frame = engine.frame();
    expect(frame.tick).toBe(0);
    expect(frame.units).toHaveLength(9);
    expect(frame.units.filter((unit) => unit.faction === 'column')).toHaveLength(6);
    expect(frame.hash).toHaveLength(8);
  });

  it('starts a training scenario without opposition', () => {
    const engine = new SimulationEngine({ seed: 1922, training: true, opposition: false });
    const frame = engine.runTicks(20);
    expect(frame.units).toHaveLength(12);
    expect(frame.units.filter((unit) => unit.squadId === 1)).toHaveLength(11);
    expect(frame.units.filter((unit) => unit.squadId === 99)).toHaveLength(1);
    expect(frame.units.filter((unit) => unit.kind === 'officer')).toHaveLength(1);
    expect(frame.units.every((unit) => unit.faction === 'column')).toBe(true);
    expect(frame.outcome).toBe('playing');
  });
  it('preserves rotation on sandbox covers', () => {
    const engine = new SimulationEngine({ seed: 1922, training: true, opposition: false });
    engine.enqueue({
      type: 'spawn_cover',
      kind: 'sandbag',
      to: { x: -40, y: 40 },
      rotation: Math.PI / 2,
    });
    const frame = engine.runTicks(1);
    const cover = frame.covers.at(-1)!;
    expect(cover.rotation).toBeCloseTo(Math.PI / 2);
  });
  it('starts a 3v3 battle with three troops per side and acquires targets', () => {
    const engine = new SimulationEngine({ seed: 1922, scenario: 'battle3v3', sandbox: true });
    const frame = engine.runTicks(10);
    expect(frame.units).toHaveLength(66);
    expect(frame.units.filter((unit) => unit.faction === 'column')).toHaveLength(33);
    expect(frame.units.filter((unit) => unit.faction === 'legalist')).toHaveLength(33);
    expect(new Set(frame.units.filter((unit) => unit.faction === 'column').map((unit) => unit.squadId)).size).toBe(3);
    expect(new Set(frame.units.filter((unit) => unit.faction === 'legalist').map((unit) => unit.squadId)).size).toBe(3);
    expect(frame.units.some((unit) => unit.targetId !== null)).toBe(true);
  });
  it('spawns whole enemy and command troops in the sandbox', () => {
    const engine = new SimulationEngine({ seed: 1922, training: true, opposition: false });
    engine.enqueue({ type: 'spawn_troop', to: { x: 52, y: -30 }, faction: 'target', count: 11, dummy: true });
    engine.enqueue({ type: 'spawn_troop', to: { x: -40, y: 40 }, faction: 'column', count: 3 });
    const frame = engine.runTicks(1);
    const targetTroop = frame.units.filter((unit) => unit.faction === 'target');
    const commandTroop = frame.units.filter((unit) => unit.faction === 'column' && unit.squadId !== 1 && unit.squadId !== 99);
    expect(targetTroop).toHaveLength(11);
    expect(new Set(targetTroop.map((unit) => unit.squadId)).size).toBe(1);
    expect(commandTroop).toHaveLength(3);
    expect(new Set(commandTroop.map((unit) => unit.squadId)).size).toBe(1);
  });
  it('issues a move_line to every soldier even when a slot lands on cover', () => {
    const engine = new SimulationEngine({ seed: 1922, training: true, opposition: false });
    const unitIds = Array.from({ length: 11 }, (_, index) => index + 1);
    engine.enqueue({
      type: 'move_line',
      unitIds,
      from: { x: -15, y: 4 },
      to: { x: 15, y: 4 },
    });
    const frame = engine.runTicks(1);
    expect(frame.units.filter((unit) => unit.squadId === 1)).toHaveLength(11);
    const internal = engine as unknown as {
      units: Array<{
        id: number;
        path: unknown[];
        currentOrder: string | null;
        boundTeam: string | null;
        aimX: number | null;
        aimY: number | null;
      }>;
    };
    const moving = internal.units.filter((unit) => unitIds.includes(unit.id));
    expect(moving.every((unit) => unit.currentOrder === 'move')).toBe(true);
    expect(moving.every((unit) => unit.path.length > 0)).toBe(true);
    expect(moving.every((unit) => unit.aimY === -1)).toBe(true);
    expect(moving.every((unit) => unit.boundTeam === null)).toBe(true);
  });

  it('a drawn line marches to its slots without bounds', () => {
    const engine = new SimulationEngine({ seed: 1922, training: true, opposition: false, bounding: true });
    const unitIds = Array.from({ length: 11 }, (_, index) => index + 1);
    engine.enqueue({ type: 'move_line', unitIds, from: { x: -14, y: 6 }, to: { x: 14, y: 6 } });
    const started = engine.runTicks(1);
    expect(
      started.units.filter((unit) => unitIds.includes(unit.id)).every((unit) => unit.boundTeam === null),
    ).toBe(true);
    engine.runTicks(1800);
    const internal = engine as unknown as {
      units: Array<{ id: number; x: number; y: number; targetX: number; targetY: number }>;
    };
    const moving = internal.units.filter((unit) => unitIds.includes(unit.id));
    expect(
      moving.every((unit) => (unit.x - unit.targetX) ** 2 + (unit.y - unit.targetY) ** 2 < 1),
    ).toBe(true);
  });
  it('a move marches and an advance bounds, whatever the old switch says', () => {
    const engine = new SimulationEngine({ seed: 1922, training: true, opposition: false, bounding: true });
    const unitIds = [1, 2, 3, 7];
    engine.enqueue({ type: 'move', unitIds, to: { x: 0, y: -5 } });
    const marched = engine.runTicks(1);
    expect(
      marched.units.filter((unit) => unitIds.includes(unit.id)).every((unit) => unit.boundTeam === null),
    ).toBe(true);
    engine.enqueue({ type: 'set_bounding', enabled: false });
    engine.enqueue({ type: 'order', order: 'advance', unitIds, to: { x: 0, y: -20 } });
    const advanced = engine.runTicks(2);
    expect(
      advanced.units.some((unit) => unitIds.includes(unit.id) && unit.boundTeam !== null),
    ).toBe(true);
  });

  it('moves a bounding soldier whose formation slot touches cover to an open point', () => {
    const engine = new SimulationEngine({ seed: 1922, training: true, opposition: false, bounding: true });
    const unit = engine.units.find((entry) => entry.id === 1)!;
    unit.x = 45.85;
    unit.y = -17.87;
    // Within the 0.8 m movement clearance of the training sandbag at (8, 4).
    const blockedSlot = { x: 6, y: 3.1 };

    assignBoundingDirect(engine, [unit], { x: 20, y: 4 }, new Map([[1, blockedSlot]]));

    expect(unit.path.length).toBeGreaterThan(0);
    expect(unit.boundPhase).toBe('advance');
    expect(Math.hypot(unit.targetX - blockedSlot.x, unit.targetY - blockedSlot.y)).toBeLessThanOrEqual(3);
  });

  it('moves every soldier to its slot when an advance by bounds finishes', () => {
    const engine = new SimulationEngine({ seed: 1922, training: true, opposition: false });
    const unitIds = Array.from({ length: 11 }, (_, index) => index + 1);
    engine.enqueue({ type: 'order', order: 'advance', unitIds, to: { x: 0, y: -12 } });
    const started = engine.runTicks(1);
    const teams = new Set(
      started.units.filter((unit) => unitIds.includes(unit.id)).map((unit) => unit.boundTeam),
    );
    expect(teams.has('a')).toBe(true);
    expect(teams.has('b')).toBe(true);
    expect(started.orders.length).toBeLessThanOrEqual(unitIds.length);

    engine.runTicks(1800);
    const internal = engine as unknown as {
      units: Array<{ id: number; x: number; y: number; targetX: number; targetY: number }>;
    };
    const moving = internal.units.filter((unit) => unitIds.includes(unit.id));
    expect(
      moving.every(
        (unit) => (unit.x - unit.targetX) ** 2 + (unit.y - unit.targetY) ** 2 < 1,
      ),
    ).toBe(true);
    expect(
      new Set(
        moving.map((unit) => unit.targetX.toFixed(2) + ':' + unit.targetY.toFixed(2)),
      ).size,
    ).toBe(unitIds.length);
  });

  it('walks every soldier out of a cover margin instead of freezing', () => {
    const engine = new SimulationEngine({ seed: 1922, training: true, opposition: false });
    const unitIds = Array.from({ length: 11 }, (_, index) => index + 1);
    engine.enqueue({ type: 'move', unitIds, to: { x: 30, y: -10 } });
    engine.runTicks(1800);
    const internal = engine as unknown as {
      units: Array<{ id: number; x: number; y: number; targetX: number; targetY: number }>;
    };
    const moving = internal.units.filter((unit) => unitIds.includes(unit.id));
    expect(
      moving.every(
        (unit) => (unit.x - unit.targetX) ** 2 + (unit.y - unit.targetY) ** 2 < 1,
      ),
    ).toBe(true);
  });

  it('spawns sandbox cover and rejects it outside sandbox mode', () => {
    const sandbox = new SimulationEngine({ seed: 1922, sandbox: true });
    sandbox.enqueue({ type: 'spawn_cover', kind: 'stone', to: { x: 12, y: 5 } });
    const spawned = sandbox.runTicks(1);
    expect(spawned.covers).toHaveLength(10);
    expect(spawned.covers.at(-1)?.kind).toBe('stone');

    const mission = new SimulationEngine({ seed: 1922 });
    mission.enqueue({ type: 'spawn_cover', kind: 'sandbag', to: { x: 12, y: 5 } });
    const rejected = mission.runTicks(1);
    expect(rejected.covers).toHaveLength(9);
    expect(rejected.events[0]).toMatchObject({ type: 'command_rejected', reason: 'sandbox_only' });
  });

  it('reinforces both sides in the sandbox', () => {
    const engine = new SimulationEngine({ seed: 1922, sandbox: true });
    engine.enqueue({ type: 'reinforce', faction: 'column' });
    engine.enqueue({ type: 'reinforce', faction: 'column' });
    engine.enqueue({ type: 'reinforce', faction: 'legalist' });
    engine.enqueue({ type: 'reinforce', faction: 'legalist' });
    const frame = engine.runTicks(1);
    expect(frame.units.filter((unit) => unit.faction === 'column')).toHaveLength(8);
    expect(frame.units.filter((unit) => unit.faction === 'legalist')).toHaveLength(5);
    expect(frame.units.filter((unit) => unit.squadId === 3)).toHaveLength(5);
    expect(frame.events.some((event) => event.type === 'command_rejected')).toBe(false);
  });

  it('allows scenario commands in training but not in a normal skirmish', () => {
    const training = new SimulationEngine({ seed: 1922, training: true });
    training.enqueue({ type: 'spawn_dummy', to: { x: 0, y: 0 } });
    training.enqueue({ type: 'reinforce', faction: 'legalist' });
    training.enqueue({ type: 'wound', targetId: 1, hp: 30 });
    const frame = training.runTicks(1);
    expect(frame.events.some((event) => event.type === 'command_rejected')).toBe(false);
    expect(frame.units.some((unit) => unit.dummy)).toBe(true);

    const normal = new SimulationEngine({ seed: 1922 });
    normal.enqueue({ type: 'spawn_dummy', to: { x: 0, y: 0 } });
    const rejected = normal.runTicks(1);
    expect(rejected.events[0]).toMatchObject({ type: 'command_rejected', reason: 'sandbox_only' });
  });

  it('is deterministic across two identical training setups', () => {
    const run = (): string => {
      const engine = new SimulationEngine({ seed: 1922, training: true });
      engine.enqueue({ type: 'spawn_dummy', to: { x: 0, y: 0 } });
      engine.enqueue({ type: 'reinforce', faction: 'legalist' });
      engine.enqueue({ type: 'incapacitate', targetId: 1 });
      return engine.runTicks(20).hash;
    };
    expect(run()).toBe(run());
  });

  it('spawns a target dummy without giving it AI or a weapon', () => {
    const sandbox = new SimulationEngine({ seed: 1922, sandbox: true });
    sandbox.enqueue({ type: 'spawn_dummy', to: { x: 5, y: 7 } });
    const frame = sandbox.runTicks(1);
    const dummy = frame.units.find((unit) => unit.id === 10);
    expect(dummy).toMatchObject({ kind: 'dummy', faction: 'target', dummy: true, magazine: 0 });
    sandbox.enqueue({ type: 'attack', unitIds: [1], targetId: 10 });
    const targeted = sandbox.runTicks(1);
    expect(targeted.units.find((unit) => unit.id === 1)?.targetId).toBe(10);
  });
  it('starts every unit with a Mauser and 5 + 15 rounds', () => {
    const engine = new SimulationEngine({ seed: 1922 });
    const frame = engine.frame();
    expect(frame.units.every((unit) => unit.weaponId === 'mauser-7mm')).toBe(true);
    expect(frame.units.every((unit) => unit.magazine === 5 && unit.reserve === 15)).toBe(true);
  });

  it('reloads the magazine from reserve', () => {
    const engine = new SimulationEngine({ seed: 1922 });
    approach(engine, [1], 60, { x: -7, y: -11 });
    const before = engine.frame().units.find((unit) => unit.id === 1);
    engine.runTicks(90);
    const after = engine.frame().units.find((unit) => unit.id === 1);
    expect(after?.reserve).toBeLessThan(before?.reserve ?? 0);
    expect(after?.magazine).toBeGreaterThan(0);
  });
  it('keeps soldiers from overlapping', () => {
    const engine = new SimulationEngine({ seed: 1922 });
    engine.enqueue({ type: 'move', unitIds: [1], to: { x: 7, y: 7 } });
    const frame = engine.runTicks(140);
    const first = frame.units.find((unit) => unit.id === 1);
    const second = frame.units.find((unit) => unit.id === 2);
    expect(first && second).toBeTruthy();
    expect(Math.hypot(first!.x - second!.x, first!.y - second!.y)).toBeGreaterThan(1.1);
  });
  it('moves a unit along its path', () => {
    const engine = new SimulationEngine({ seed: 1922 });
    engine.enqueue({ type: 'move', unitIds: [1], to: { x: -12, y: 3 } });
    const frame = engine.runTicks(5);
    const unit = frame.units.find((entry) => entry.id === 1);
    expect(unit?.x).toBeLessThan(-7);
    expect(unit?.y).toBeLessThan(7);
  });

  it('faces the enemy and seeks cover automatically', () => {
    const engine = new SimulationEngine({ seed: 1922 });
    approach(engine, [1], 80);
    const frame = engine.runTicks(1);
    const player = frame.units.find((unit) => unit.id === 1);
    const enemy = frame.units.find((unit) => unit.id === 4);
    expect(player?.cover).toBeGreaterThanOrEqual(0.5);
    expect(player?.stance).toBe('crouched');
    expect(player?.facingY).toBeLessThan(0);
    expect(enemy?.facingY).toBeGreaterThan(0);
  });

  it('changes stance and includes it in the hash', () => {
    const engine = new SimulationEngine({ seed: 1922 });
    const before = engine.hashState();
    engine.enqueue({ type: 'stance', unitIds: [1], stance: 'prone' });
    const frame = engine.runTicks(1);
    expect(frame.units.find((entry) => entry.id === 1)?.stance).toBe('prone');
    expect(frame.hash).not.toBe(before);
  });

  it('rejects invalid stance commands without changing the world relative to a control run', () => {
    const control = new SimulationEngine({ seed: 1922 });
    const engine = new SimulationEngine({ seed: 1922 });
    engine.enqueue({ type: 'stance', unitIds: [], stance: 'crouched' });
    const expected = control.runTicks(1);
    const frame = engine.runTicks(1);
    expect(frame.events[0]).toMatchObject({ type: 'command_rejected', reason: 'empty_units' });
    expect(frame.hash).toBe(expected.hash);
  });

  it('rejects invalid move commands and invalid attack targets', () => {
    const control = new SimulationEngine({ seed: 1922 });
    const engine = new SimulationEngine({ seed: 1922 });
    engine.enqueue({ type: 'move', unitIds: [], to: { x: 1, y: 1 } });
    engine.enqueue({ type: 'attack', unitIds: [1], targetId: 999 });
    const expected = control.runTicks(1);
    const frame = engine.runTicks(1);
    expect(frame.events[0]).toMatchObject({ type: 'command_rejected', reason: 'empty_units' });
    expect(frame.events[1]).toMatchObject({ type: 'command_rejected', reason: 'invalid_target' });
    expect(frame.hash).toBe(expected.hash);
  });

  it('does not acquire targets at deployment range', () => {
    const engine = new SimulationEngine({ seed: 1922 });
    const frame = engine.runTicks(20);
    expect(frame.units.every((unit) => unit.magazine + unit.reserve === 20)).toBe(true);
    expect(frame.units.every((unit) => unit.targetId === null)).toBe(true);
  });

  it('does not auto-acquire training dummies without an explicit attack order', () => {
    const engine = new SimulationEngine({ seed: 1922, training: true, opposition: false });
    engine.enqueue({
      type: 'spawn_troop',
      to: { x: 0, y: -10 },
      faction: 'target',
      count: 1,
      dummy: true,
    });
    const started = engine.runTicks(30);
    const column = started.units.filter(
      (unit) => unit.faction === 'column' && unit.alive && !unit.dummy,
    );
    expect(column.every((unit) => unit.targetId === null)).toBe(true);
    expect(column.every((unit) => unit.magazine === 5 && unit.reserve === 45)).toBe(true);
    const target = started.units.find((unit) => unit.faction === 'target');
    if (!target) throw new Error('missing training target');

    engine.enqueue({ type: 'attack', unitIds: [1], targetId: target.id });
    const attacking = engine.runTicks(1);
    expect(attacking.units.find((unit) => unit.id === 1)?.targetId).toBe(target.id);
  });

  it('applies non-lethal training fire without wounding the player troop', () => {
    const engine = new SimulationEngine({ seed: 1922, training: true, opposition: false });
    engine.enqueue({
      type: 'training_phase',
      setup: {
        phase: 'assault',
        playerPoint: { x: 28, y: 4 },
        officerPoint: { x: 28, y: 10 },
        enemyPoint: { x: 52, y: -18 },
        enemyCount: 6,
        releaseTrainingFire: true,
      },
    });
    engine.enqueue({
      type: 'hold_fire',
      unitIds: Array.from({ length: 12 }, (_, index) => index + 1),
      hold: true,
    });
    const frame = engine.runTicks(120);
    const column = frame.units.filter((unit) => unit.faction === 'column' && unit.alive);
    expect(column).toHaveLength(12);
    expect(column.every((unit) => unit.hp === 100)).toBe(true);
    expect(column.every((unit) => unit.wound === 'none')).toBe(true);
    expect(column.every((unit) => unit.alive && !unit.incapacitated && !unit.routed)).toBe(true);
    expect(column.some((unit) => unit.suppression > 0)).toBe(true);
    expect(frame.units.some((unit) => unit.role === 'training-enemy' && unit.nonLethal)).toBe(true);
  });

  it('sets a training phase, despawns its role and rejects the commands outside training', () => {
    const engine = new SimulationEngine({ seed: 1922, training: true, opposition: false });
    engine.enqueue({
      type: 'training_phase',
      setup: {
        phase: 'assault',
        playerPoint: { x: 28, y: 4 },
        officerPoint: { x: 28, y: 10 },
        enemyPoint: { x: 52, y: -18 },
        enemyCount: 6,
        releaseTrainingFire: true,
      },
    });
    const started = engine.runTicks(1);
    expect(started.units.filter((unit) => unit.role === 'training-enemy')).toHaveLength(6);
    expect(
      started.units
        .filter((unit) => unit.role === 'training-enemy')
        .every((unit) => unit.nonLethal === true && unit.holdFire === false),
    ).toBe(true);
    expect(started.units.filter((unit) => unit.squadId === 1).every((unit) => unit.x >= 22)).toBe(
      true,
    );

    engine.enqueue({ type: 'despawn_role', role: 'training-enemy' });
    const cleared = engine.runTicks(1);
    expect(cleared.units.filter((unit) => unit.role === 'training-enemy')).toHaveLength(0);

    const regular = new SimulationEngine({ seed: 1922 });
    regular.enqueue({ type: 'despawn_role', role: 'training-enemy' });
    const rejected = regular.runTicks(1);
    expect(
      rejected.events.some(
        (event) => event.type === 'command_rejected' && event.reason === 'sandbox_only',
      ),
    ).toBe(true);
  });

  it('acquires targets in the forward cone but not behind it', () => {
    const front = new SimulationEngine({ seed: 1922, training: true });
    for (const targetId of [4, 5, 6]) {
      front.enqueue({ type: 'incapacitate', targetId });
    }
    front.enqueue({ type: 'spawn_troop', to: { x: 0, y: 2 }, faction: 'legalist', count: 1 });
    const frontFrame = front.runTicks(1);
    const frontTarget = frontFrame.units.find(
      (unit) => unit.faction === 'legalist' && unit.alive && unit.id > 6,
    );
    expect(frontTarget).toBeDefined();
    expect(frontFrame.units.find((unit) => unit.id === 1)?.targetId).toBe(frontTarget?.id);

    const behind = new SimulationEngine({ seed: 1922, training: true });
    for (const targetId of [4, 5, 6]) {
      behind.enqueue({ type: 'incapacitate', targetId });
    }
    behind.enqueue({ type: 'spawn_troop', to: { x: 0, y: 9 }, faction: 'legalist', count: 1 });
    const behindFrame = behind.runTicks(5);
    const observer = behindFrame.units.find((unit) => unit.id === 1);
    expect(observer?.targetId).toBeNull();
    expect(observer?.facingY).toBeLessThan(0);
  });
  it('selects targets deterministically after contact', () => {
    const engine = new SimulationEngine({ seed: 1922 });
    approach(engine, [1], 60, { x: -7, y: -8 });
    const frame = engine.runTicks(1);
    expect(frame.units.find((unit) => unit.id === 1)?.targetId).toBe(4);
  });

  it('suppresses a target and holds position', () => {
    const engine = new SimulationEngine({ seed: 1922 });
    engine.enqueue({ type: 'suppress', unitIds: [1], targetId: 4 });
    const frame = engine.runTicks(4);
    const unit = frame.units.find((entry) => entry.id === 1);
    expect(unit?.order).toBe('suppress');
    expect(unit?.x).toBeCloseTo(-7);
    expect(unit?.y).toBeCloseTo(7);
    expect((unit?.magazine ?? 0) + (unit?.reserve ?? 0)).toBe(20);
  });

  it('suppression drains morale faster than a normal attack', () => {
    const run = (order: 'attack' | 'suppress') => {
      const engine = new SimulationEngine({ seed: 1922, sandbox: true });
      const internal = engine as unknown as {
        units: Array<{ id: number; x: number; y: number }>;
      };
      const attacker = internal.units.find((unit) => unit.id === 1);
      const target = internal.units.find((unit) => unit.id === 6);
      if (!attacker || !target) throw new Error('missing units');
      attacker.x = -7;
      attacker.y = 0;
      target.x = 0;
      target.y = 0;
      engine.enqueue({ type: order, unitIds: [1], targetId: 6 });
      return engine.runTicks(30).units.find((unit) => unit.id === 6)?.morale ?? 100;
    };
    expect(run('suppress')).toBeLessThan(run('attack'));
  });
  it('rejects a suppress command with an invalid target', () => {
    const control = new SimulationEngine({ seed: 1922 });
    const engine = new SimulationEngine({ seed: 1922 });
    engine.enqueue({ type: 'suppress', unitIds: [1], targetId: 999 });
    const expected = control.runTicks(1);
    const frame = engine.runTicks(1);
    expect(frame.events[0]).toMatchObject({ type: 'command_rejected', reason: 'invalid_target' });
    expect(frame.hash).toBe(expected.hash);
  });

  it('drops cohesion when a soldier is far from the troop', () => {
    const engine = new SimulationEngine({ seed: 1922 });
    engine.enqueue({ type: 'move', unitIds: [1], to: { x: -30, y: 7 } });
    const frame = engine.runTicks(120);
    expect(frame.units.find((unit) => unit.id === 1)?.cohesion).toBeLessThan(100);
  });
  it('issues area, reserve and support orders', () => {
    const engine = new SimulationEngine({ seed: 1922, sandbox: true });
    engine.enqueue({ type: 'order', order: 'defend', unitIds: [1, 2, 3, 7, 8, 9], to: { x: 0, y: 0 } });
    let frame = engine.runTicks(1);
    expect(frame.units.filter((unit) => unit.faction === 'column').every((unit) => unit.order === 'defend')).toBe(true);

    // Reserve is folded into Defend with fire held (compact-orders).
    engine.enqueue({ type: 'order', order: 'reserve', unitIds: [1, 2], to: { x: -10, y: 10 } });
    frame = engine.runTicks(20);
    expect(frame.units.find((unit) => unit.id === 1)?.order).toBe('defend');
    expect(frame.units.find((unit) => unit.id === 1)?.fireControl).toBe('hold');
    expect((frame.units.find((unit) => unit.id === 1)?.magazine ?? 0) + (frame.units.find((unit) => unit.id === 1)?.reserve ?? 0)).toBe(20);

    engine.enqueue({ type: 'order', order: 'protect-officer', unitIds: [1, 2, 7] });
    frame = engine.runTicks(1);
    expect(frame.units.find((unit) => unit.id === 1)?.order).toBe('protect-officer');
  });

  it('carries a recovering soldier into the next battle roster', () => {
    const first = new SimulationEngine({ seed: 1922, sandbox: true });
    incapacitate(first, 1);
    first.enqueue({ type: 'order', order: 'rescue', unitIds: [2], targetId: 1 });
    first.runTicks(150);
    const recovering = first.frame().units.find((unit) => unit.id === 1);
    expect(recovering?.soldierState).toBe('recovering');

    const next = new SimulationEngine({ seed: 1922, sandbox: true, roster: first.roster() });
    const carried = next.frame().units.find((unit) => unit.id === 1);
    expect(carried?.alive).toBe(false);
    expect(carried?.soldierState).toBe('recovering');

    const returned = next.runTicks(320).units.find((unit) => unit.id === 1);
    expect(returned?.alive).toBe(true);
    expect(returned?.wound).toBe('none');
  });

  it('wounds a soldier deterministically without incapacitating him', () => {
    const engine = new SimulationEngine({ seed: 1922, sandbox: true });
    engine.enqueue({ type: 'wound', targetId: 1, hp: 30 });
    const frame = engine.runTicks(1);
    const unit = frame.units.find((entry) => entry.id === 1);
    expect(unit?.hp).toBe(30);
    expect(unit?.incapacitated).toBe(false);
    expect(unit?.soldierState).toBe('wounded');
    expect(unit?.wound).toBe('moderate');

    const light = new SimulationEngine({ seed: 1922, sandbox: true });
    light.enqueue({ type: 'wound', targetId: 1, hp: 80 });
    expect(light.runTicks(1).units.find((entry) => entry.id === 1)?.wound).toBe('light');

    const severe = new SimulationEngine({ seed: 1922, sandbox: true });
    incapacitate(severe, 1);
    expect(severe.frame().units.find((entry) => entry.id === 1)?.wound).toBe('severe');
  });

  it('rejects an order for an incapacitated soldier', () => {
    const engine = new SimulationEngine({ seed: 1922, sandbox: true });
    incapacitate(engine, 1);
    engine.enqueue({ type: 'order', order: 'defend', unitIds: [1], to: { x: 0, y: 0 } });
    const frame = engine.runTicks(1);
    expect(frame.events).toContainEqual(
      expect.objectContaining({ type: 'command_rejected', reason: 'invalid_state' }),
    );
  });

  it('implements each tactical order type, folded ones as their new order', () => {
    // compact-orders: ambush and reserve are Defend with a fire control,
    // disperse is an open-order Move, pursue is Attack.
    const areaOrders = {
      advance: 'advance',
      defend: 'defend',
      ambush: 'defend',
      disperse: 'move',
      recon: 'recon',
      reserve: 'defend',
    } as const;
    for (const [order, expected] of Object.entries(areaOrders)) {
      const engine = new SimulationEngine({ seed: 1922, sandbox: true });
      engine.enqueue({ type: 'order', order: order as keyof typeof areaOrders, unitIds: [1, 2, 3, 7, 8, 9], to: { x: 0, y: 7 } });
      const frame = engine.runTicks(1);
      expect(frame.units.find((unit) => unit.id === 1)?.order).toBe(expected);
    }

    const pursue = new SimulationEngine({ seed: 1922, sandbox: true });
    pursue.enqueue({ type: 'order', order: 'pursue', unitIds: [1, 2], targetId: 4 });
    expect(pursue.runTicks(1).units.find((unit) => unit.id === 1)?.order).toBe('attack');

    for (const order of ['regroup', 'protect-officer'] as const) {
      const engine = new SimulationEngine({ seed: 1922, sandbox: true });
      engine.enqueue({ type: 'order', order, unitIds: [1, 2, 7, 8] });
      expect(engine.runTicks(1).units.find((unit) => unit.id === 1)?.order).toBe(order);
    }
  });
  it('stops a pursuit when the target is lost and reports the interruption', () => {
    const engine = new SimulationEngine({ seed: 1922, sandbox: true });
    // An attack on a withdrawing target turns into a pursuit.
    engine.enqueue({ type: 'attack', unitIds: [1], targetId: 4 });
    engine.runTicks(1);
    // The target falls back out of effective range: the attacker follows.
    const runner = (engine as unknown as { units: Array<{ id: number; x: number; y: number }> }).units.find(
      (unit) => unit.id === 4,
    )!;
    runner.y = -90;
    engine.enqueue({ type: 'withdraw', unitIds: [4] });
    expect(engine.runTicks(3).units.find((unit) => unit.id === 1)?.order).toBe('pursue');
    engine.runTicks(1);
    const internal = engine as unknown as {
      units: Array<{ id: number; alive: boolean }>;
    };
    const target = internal.units.find((unit) => unit.id === 4);
    if (!target) throw new Error('missing target');
    target.alive = false;
    const frame = engine.runTicks(1);
    expect(frame.units.find((unit) => unit.id === 1)?.order).toBe('hold');
    expect(frame.events.some((event) => event.type === 'order_interrupted')).toBe(true);
  });

  it('fires an ambush once and then holds as a defence order', () => {
    const engine = new SimulationEngine({ seed: 1922, sandbox: true });
    const internal = engine as unknown as {
      units: Array<{ id: number; x: number; y: number }>;
    };
    const target = internal.units.find((unit) => unit.id === 4);
    if (!target) throw new Error('missing target');
    target.x = -7;
    target.y = 0;
    engine.enqueue({ type: 'order', order: 'ambush', unitIds: [1], to: { x: -7, y: 7 } });
    const frame = engine.runTicks(1);
    expect(frame.events.some((event) => event.type === 'shot')).toBe(true);
    expect(frame.units.find((unit) => unit.id === 1)?.order).toBe('defend');
  });

  it('keeps the defence primary while a rescue team detaches', () => {
    const engine = new SimulationEngine({ seed: 1922, sandbox: true });
    engine.enqueue({
      type: 'order',
      order: 'defend',
      unitIds: [1, 2, 3, 7, 8, 9],
      to: { x: 0, y: 7 },
    });
    engine.runTicks(1);
    incapacitate(engine, 1);
    engine.enqueue({ type: 'order', order: 'rescue', unitIds: [2], targetId: 1 });
    const frame = engine.runTicks(5);
    expect(frame.units.find((unit) => unit.id === 2)?.order).toBe('rescue');
    for (const id of [3, 7, 8, 9]) {
      expect(frame.units.find((unit) => unit.id === id)?.order).toBe('defend');
    }
  });
  it('keeps a flank or withdraw primary while a rescue team detaches', () => {
    for (const primary of ['flank', 'withdraw'] as const) {
      const engine = new SimulationEngine({ seed: 1922, sandbox: true });
      if (primary === 'flank') {
        engine.enqueue({ type: 'flank', unitIds: [1, 2, 3, 7, 8, 9], targetId: 4 });
      } else {
        engine.enqueue({ type: 'withdraw', unitIds: [1, 2, 3, 7, 8, 9] });
      }
      incapacitate(engine, 1);
      engine.enqueue({ type: 'order', order: 'rescue', unitIds: [2], targetId: 1 });
      const frame = engine.runTicks(2);
      expect(frame.units.find((unit) => unit.id === 2)?.order).toBe('rescue');
      for (const id of [3, 7, 8, 9]) {
        expect(frame.units.find((unit) => unit.id === id)?.order).not.toBeNull();
      }
    }
  });

  it('keeps an ambush primary while a casualty rescue runs', () => {
    const engine = new SimulationEngine({ seed: 1922, sandbox: true });
    engine.enqueue({
      type: 'order',
      order: 'ambush',
      unitIds: [1, 2, 3, 7, 8, 9],
      to: { x: 0, y: 7 },
    });
    engine.runTicks(1);
    incapacitate(engine, 1);
    engine.enqueue({ type: 'order', order: 'rescue', unitIds: [2], targetId: 1 });
    const frame = engine.runTicks(2);
    expect(frame.units.find((unit) => unit.id === 2)?.order).toBe('rescue');
    for (const id of [3, 7, 8, 9]) {
      // Defend; its fire on contact may already have opened (enemy close).
      expect(frame.units.find((unit) => unit.id === id)?.order).toBe('defend');
    }
    expect(frame.units.find((unit) => unit.id === 1)?.incapacitated).toBe(true);
  });

  it('releases a carried casualty when the rescuer receives a new order', () => {
    const engine = new SimulationEngine({ seed: 1922, sandbox: true });
    const internal = engine as unknown as {
      units: Array<{
        id: number;
        x: number;
        y: number;
        incapacitated: boolean;
        beingCarriedBy: number | null;
      }>;
    };
    const casualty = internal.units.find((unit) => unit.id === 1);
    if (!casualty) throw new Error('missing casualty');
    casualty.x = 6;
    casualty.y = 7;
    incapacitate(engine, 1);
    engine.enqueue({ type: 'order', order: 'rescue', unitIds: [2], targetId: 1 });
    engine.runTicks(1);
    expect(casualty.beingCarriedBy).toBe(2);

    engine.enqueue({ type: 'order', order: 'defend', unitIds: [2], to: { x: 0, y: 7 } });
    const frame = engine.runTicks(1);
    expect(frame.units.find((unit) => unit.id === 2)?.order).toBe('defend');
    expect(casualty.beingCarriedBy).toBeNull();
    expect(casualty.incapacitated).toBe(true);
  });

  it('carries the casualty to a covered position before first aid', () => {
    const engine = new SimulationEngine({ seed: 1922, sandbox: true });
    const internal = engine as unknown as {
      units: Array<{ id: number; x: number; y: number; beingCarriedBy: number | null }>;
    };
    const casualty = internal.units.find((unit) => unit.id === 1);
    if (!casualty) throw new Error('missing casualty');
    casualty.x = 6;
    casualty.y = 7;
    incapacitate(engine, 1);
    engine.enqueue({ type: 'order', order: 'rescue', unitIds: [2], targetId: 1 });
    engine.runTicks(1);
    const start = internal.units.find((unit) => unit.id === 2);
    if (!start) throw new Error('missing rescuer');
    const startX = start.x;
    const startY = start.y;
    const frame = engine.runTicks(20);
    const rescuer = frame.units.find((unit) => unit.id === 2);
    expect(Math.hypot((rescuer?.x ?? 0) - startX, (rescuer?.y ?? 0) - startY)).toBeGreaterThan(1);
    expect(casualty.beingCarriedBy).toBe(2);
  });

  it('ends a rescue when the carried casualty dies', () => {
    const engine = new SimulationEngine({ seed: 1922, sandbox: true });
    const internal = engine as unknown as {
      units: Array<{ id: number; x: number; y: number; alive: boolean; beingCarriedBy: number | null }>;
    };
    const casualty = internal.units.find((unit) => unit.id === 1);
    if (!casualty) throw new Error('missing casualty');
    casualty.x = 6;
    casualty.y = 7;
    incapacitate(engine, 1);
    engine.enqueue({ type: 'order', order: 'rescue', unitIds: [2], targetId: 1 });
    engine.runTicks(1);
    expect(casualty.beingCarriedBy).toBe(2);
    casualty.alive = false;
    const frame = engine.runTicks(1);
    expect(frame.units.find((unit) => unit.id === 2)?.rescueTargetId).toBeNull();
    expect(casualty.beingCarriedBy).toBeNull();
    expect(casualty.alive).toBe(false);
  });

  it('rejects a second rescuer for the same casualty while allowing two casualties', () => {
    const engine = new SimulationEngine({ seed: 1922, sandbox: true });
    for (const id of [1, 2]) {
      incapacitate(engine, id);
    }
    engine.enqueue({ type: 'order', order: 'rescue', unitIds: [7], targetId: 1 });
    engine.enqueue({ type: 'order', order: 'rescue', unitIds: [8], targetId: 2 });
    const assigned = engine.runTicks(1);
    expect(assigned.units.find((unit) => unit.id === 7)?.rescueTargetId).toBe(1);
    expect(assigned.units.find((unit) => unit.id === 8)?.rescueTargetId).toBe(2);

    engine.enqueue({ type: 'order', order: 'rescue', unitIds: [9], targetId: 1 });
    const rejected = engine.runTicks(1);
    expect(rejected.events[0]).toMatchObject({ type: 'command_rejected', reason: 'invalid_state' });
  });

  it('releases the casualty when the rescuer is incapacitated', () => {
    const engine = new SimulationEngine({ seed: 1922, sandbox: true });
    const internal = engine as unknown as {
      units: Array<{
        id: number;
        x: number;
        y: number;
        incapacitated: boolean;
        soldierState: string;
        beingCarriedBy: number | null;
        rescueTargetId: number | null;
        currentOrder: string | null;
      }>;
    };
    const casualty = internal.units.find((unit) => unit.id === 1);
    const rescuer = internal.units.find((unit) => unit.id === 2);
    if (!casualty || !rescuer) throw new Error('missing units');
    casualty.x = 6;
    casualty.y = 7;
    incapacitate(engine, 1);
    engine.enqueue({ type: 'order', order: 'rescue', unitIds: [2], targetId: 1 });
    engine.runTicks(1);
    expect(casualty.beingCarriedBy).toBe(2);

    incapacitate(engine, 2);
    expect(casualty.beingCarriedBy).toBeNull();
    expect(casualty.incapacitated).toBe(true);
    expect(rescuer.rescueTargetId).toBeNull();

    engine.enqueue({ type: 'order', order: 'rescue', unitIds: [3], targetId: 1 });
    const reassigned = engine.runTicks(1);
    expect(reassigned.units.find((unit) => unit.id === 3)?.rescueTargetId).toBe(1);
  });

  it('moves a defending section toward nearby cover automatically', () => {
    const engine = new SimulationEngine({ seed: 1922, training: true });
    engine.enqueue({ type: 'spawn_dummy', to: { x: 0, y: 0 } });
    engine.enqueue({ type: 'move', unitIds: [1, 2, 7, 8], to: { x: -4, y: 6 } });
    const internal = engine as unknown as {
      units: Array<{ id: number; x: number; y: number }>;
    };
    for (const id of [4, 5, 6]) {
      const enemy = internal.units.find((unit) => unit.id === id);
      if (enemy) {
        enemy.x = -39;
        enemy.y = -39;
      }
    }
    engine.runTicks(120);
    engine.enqueue({ type: 'order', order: 'defend', unitIds: [1, 2, 7, 8], to: { x: -4, y: 6 } });
    const frame = engine.runTicks(180);
    const covered = frame.units.filter(
      (unit) =>
        [1, 2, 7, 8].includes(unit.id) &&
        unit.faction === 'column' &&
        COVER_POINTS.some(
          (cover) => Math.hypot(cover.x - unit.x, cover.y - unit.y) <= 2.5,
        ),
    );
    expect(covered.length).toBeGreaterThan(0);
  });

  it('aims the section and accepts a click on a low wall for cover distribution', () => {
    const engine = new SimulationEngine({ seed: 1922, training: true, opposition: false, map: 'training-kit' });
    const unitIds = [4, 5, 6, 7];
    const startUnits = engine.frame().units.filter((unit) => unitIds.includes(unit.id));
    const center = startUnits.reduce(
      (sum, unit) => ({ x: sum.x + unit.x / startUnits.length, y: sum.y + unit.y / startUnits.length }),
      { x: 0, y: 0 },
    );
    engine.enqueue({
      type: 'face',
      unitIds,
      to: { x: center.x, y: center.y - 10 },
    });
    engine.enqueue({ type: 'order', order: 'defend', unitIds, to: { x: 0, y: -7 } });
    const frame = engine.runTicks(600);
    expect(
      frame.events.some(
        (event) =>
          event.type === 'command_rejected' && event.reason === 'invalid_position',
      ),
    ).toBe(false);
    const defenders = frame.units.filter((unit) => unitIds.includes(unit.id));
    expect(defenders.every((unit) => unit.facingY < -0.8)).toBe(true);
    expect(defenders.every((unit) => unit.y > -5)).toBe(true);
    const positions = new Set(
      defenders.map((unit) => `${unit.x.toFixed(1)},${unit.y.toFixed(1)}`),
    );
    expect(positions.size).toBe(defenders.length);
    expect(defenders.filter((unit) => unit.cover > 0.1).length).toBeGreaterThanOrEqual(3);
  });

  it('keeps a defend line on the near side of a wall and faces the threat', () => {
    const engine = new SimulationEngine({ seed: 1922 });
    engine.enqueue({
      type: 'order',
      order: 'defend',
      unitIds: [1, 2, 3, 7, 8, 9],
      to: { x: 0, y: 6.5 },
    });
    const frame = engine.runTicks(240);
    const defenders = frame.units.filter(
      (unit) => unit.faction === 'column' && [1, 2, 3, 7, 8, 9].includes(unit.id),
    );
    expect(defenders.every((unit) => unit.y > 5.3)).toBe(true);
    expect(defenders.every((unit) => unit.facingY < -0.8)).toBe(true);
    const positions = new Set(defenders.map((unit) => `${unit.x.toFixed(1)},${unit.y.toFixed(1)}`));
    expect(positions.size).toBe(defenders.length);
  });
  it('keeps a defending group inside its region and uses cover', () => {
    const engine = new SimulationEngine({ seed: 1922, sandbox: true });
    engine.enqueue({
      type: 'order',
      order: 'defend',
      unitIds: [1, 2, 3, 7, 8, 9],
      to: { x: 0, y: 7 },
    });
    const held = engine.runTicks(220);
    const defenders = held.units.filter(
      (unit) => unit.faction === 'column' && unit.alive && !unit.incapacitated,
    );
    expect(defenders.length).toBeGreaterThan(0);
    for (const unit of defenders) {
      expect(Math.hypot(unit.x, unit.y - 7)).toBeLessThan(8.5);
    }
    expect(defenders.some((unit) => unit.cover >= 0.25)).toBe(true);
    const after = engine.runTicks(50);
    const stillHeld = after.units.filter(
      (unit) => unit.faction === 'column' && unit.alive && !unit.incapacitated,
    );
    for (const unit of stillHeld) {
      expect(Math.hypot(unit.x, unit.y - 7)).toBeLessThan(8.5);
    }
    expect(stillHeld.some((unit) => unit.cover >= 0.25)).toBe(true);
  });

  it('interrupts a move when no detour exists', () => {
    const engine = new SimulationEngine({ seed: 1922, sandbox: true });
    engine.enqueue({ type: 'spawn_cover', kind: 'stone', to: { x: -5, y: 7 } });
    engine.runTicks(1);
    const internal = engine as unknown as {
      units: Array<{
        id: number;
        x: number;
        y: number;
        targetX: number;
        targetY: number;
        path: Array<{ x: number; y: number }>;
        pathIndex: number;
      }>;
    };
    const unit = internal.units.find((entry) => entry.id === 1);
    if (!unit) throw new Error('missing unit');
    unit.x = -7;
    unit.y = 7;
    unit.targetX = -5;
    unit.targetY = 7;
    unit.path = [{ x: -5, y: 7 }];
    unit.pathIndex = 0;
    let frame = engine.frame();
    let interrupted = false;
    for (let tick = 0; tick < 20; tick += 1) {
      frame = engine.runTicks(1);
      interrupted ||= frame.events.some((event) => event.type === 'order_interrupted');
    }
    expect(frame.units.find((entry) => entry.id === 1)?.order).toBe('hold');
    expect(interrupted).toBe(true);
  });

  it('recalculates a blocked route instead of freezing', () => {
    const engine = new SimulationEngine({ seed: 1922, sandbox: true });
    engine.enqueue({ type: 'move', unitIds: [1], to: { x: -30, y: 7 } });
    engine.runTicks(1);
    engine.enqueue({ type: 'spawn_cover', kind: 'sandbag', to: { x: -12, y: 7 } });
    const blocked = engine.runTicks(1);
    expect(blocked.covers).toHaveLength(10);
    const frame = engine.runTicks(20);
    const unit = frame.units.find((entry) => entry.id === 1);
    expect(unit?.x).toBeLessThan(-9);
    expect(Math.abs((unit?.y ?? 0) - 7)).toBeGreaterThan(0.1);
  });

  it('kills a previously wounded soldier instead of incapacitating him', () => {
    const engine = new SimulationEngine({ seed: 1922, sandbox: true });
    const internal = engine as unknown as {
      units: Array<{ id: number; x: number; y: number }>;
    };
    const target = internal.units.find((unit) => unit.id === 4);
    if (!target) throw new Error('missing target');
    target.x = -7;
    target.y = 0;
    engine.enqueue({ type: 'wound', targetId: 4, hp: 1 });
    engine.runTicks(1);
    engine.enqueue({ type: 'attack', unitIds: [1, 2, 3, 7, 8, 9], targetId: 4 });
    const frame = engine.runTicks(20);
    const dead = frame.units.find((unit) => unit.id === 4);
    expect(dead?.alive).toBe(false);
    expect(dead?.soldierState).toBe('dead');
    expect(dead?.wound).toBe('fatal');
  });

  it('interrupts protect-officer when the officer is incapacitated', () => {
    const engine = new SimulationEngine({ seed: 1922, sandbox: true });
    engine.enqueue({ type: 'order', order: 'protect-officer', unitIds: [2, 7] });
    engine.runTicks(1);
    engine.enqueue({ type: 'incapacitate', targetId: 3 });
    const frame = engine.runTicks(1);
    expect(frame.units.find((unit) => unit.id === 2)?.order).toBe('hold');
    expect(frame.events.some((event) => event.type === 'order_interrupted')).toBe(true);
  });

  it('reports enemies seen by a recon unit and stops to observe', () => {
    const engine = new SimulationEngine({ seed: 1922, sandbox: true });
    const internal = engine as unknown as {
      units: Array<{ id: number; x: number; y: number }>;
    };
    const target = internal.units.find((unit) => unit.id === 4);
    if (!target) throw new Error('missing target');
    // In clear sight of the observation point (not behind the sandbag at -8, 4).
    target.x = -3;
    target.y = 0;
    engine.enqueue({
      type: 'order',
      order: 'recon',
      unitIds: [1],
      to: { x: -7, y: 7 },
    });
    let frame = engine.runTicks(1);
    let report = frame.events.find((event) => event.type === 'recon_report');
    for (let index = 0; index < 40 && !report; index += 1) {
      frame = engine.runTicks(1);
      report = frame.events.find((event) => event.type === 'recon_report');
    }
    expect(report).toMatchObject({ type: 'recon_report', unitId: 1 });
    expect(report && 'enemyIds' in report ? report.enemyIds : []).toContain(4);
    expect(frame.units.find((unit) => unit.id === 1)?.reconContacts).toBeGreaterThan(0);

    const later = engine.runTicks(5);
    expect(later.events.some((event) => event.type === 'recon_report')).toBe(false);
    expect(later.events.some((event) => event.type === 'shot' && event.source === 1)).toBe(false);
  });

  it('advances a section into its slots on flat ground', () => {
    const engine = new SimulationEngine({ seed: 1922, sandbox: true });
    engine.enqueue({
      type: 'order',
      order: 'advance',
      unitIds: [1, 2, 3, 7, 8, 9],
      to: { x: 0, y: 12 },
    });
    const started = engine.runTicks(1);
    expect(
      started.units
        .filter((unit) => [1, 2, 3, 7, 8, 9].includes(unit.id))
        .every((unit) => unit.order === 'advance'),
    ).toBe(true);

    const arrived = engine.runTicks(200);
    for (const id of [1, 2, 3, 7, 8, 9]) {
      const unit = arrived.units.find((entry) => entry.id === id);
      expect(Math.hypot((unit?.x ?? 0) - 0, (unit?.y ?? 0) - 12)).toBeLessThan(12);
    }
  });

  it('slows an ahead unit so a group move stays within cohesion range', () => {
    const engine = new SimulationEngine({ seed: 1922, sandbox: true });
    engine.enqueue({ type: 'move', unitIds: [2, 3], to: { x: 0, y: 20 } });
    const frame = engine.runTicks(40);
    const infantry = frame.units.find((unit) => unit.id === 2);
    const officer = frame.units.find((unit) => unit.id === 3);
    const separation = Math.hypot(
      (infantry?.x ?? 0) - (officer?.x ?? 0),
      (infantry?.y ?? 0) - (officer?.y ?? 0),
    );
    expect(separation).toBeLessThan(5);
    expect(infantry?.order).toBe('move');
    expect(officer?.order).toBe('move');
  });

  it('regroups only fit soldiers, links protect-officer, and reverses dispersion', () => {
    const engine = new SimulationEngine({ seed: 1922, sandbox: true });
    incapacitate(engine, 1);
    engine.enqueue({
      type: 'order',
      order: 'regroup',
      unitIds: [1, 2, 3, 7, 8, 9],
    });
    const regrouped = engine.runTicks(1);
    expect(regrouped.units.find((unit) => unit.id === 2)?.order).toBe('regroup');
    expect(regrouped.units.find((unit) => unit.id === 1)?.order).not.toBe('regroup');

    engine.enqueue({
      type: 'order',
      order: 'protect-officer',
      unitIds: [2, 7, 8],
    });
    const guarded = engine.runTicks(30);
    expect(guarded.units.find((unit) => unit.id === 2)?.order).toBe('protect-officer');
    const officer = guarded.units.find((unit) => unit.kind === 'officer');
    const guard = guarded.units.find((unit) => unit.id === 2);
    expect(officer && guard ? Math.hypot(officer.x - guard.x, officer.y - guard.y) : 99).toBeLessThan(8);

    engine.enqueue({
      type: 'order',
      order: 'disperse',
      unitIds: [1, 2, 3, 7, 8, 9],
      to: { x: 0, y: 7 },
    });
    const dispersed = engine.runTicks(1);
    expect(dispersed.units.find((unit) => unit.id === 2)?.order).toBe('move');

    engine.enqueue({ type: 'move', unitIds: [1, 2, 3, 7, 8, 9], to: { x: -8, y: 7 } });
    const moved = engine.runTicks(1);
    expect(moved.units.find((unit) => unit.id === 2)?.order).toBe('move');
  });

  it('queues a second casualty for the same rescuer', () => {
    const engine = new SimulationEngine({ seed: 1922, sandbox: true });
    const internal = engine as unknown as {
      units: Array<{ id: number; x: number; y: number }>;
    };
    const first = internal.units.find((unit) => unit.id === 1);
    const second = internal.units.find((unit) => unit.id === 2);
    if (!first || !second) throw new Error('missing casualties');
    first.x = 6;
    first.y = 7;
    second.x = 6;
    second.y = 8;
    incapacitate(engine, 1);
    incapacitate(engine, 2);
    engine.enqueue({ type: 'order', order: 'rescue', unitIds: [7], targetId: 1 });
    engine.runTicks(1);
    engine.enqueue({ type: 'order', order: 'rescue', unitIds: [7], targetId: 2 });
    const queued = engine.runTicks(1);
    expect(queued.units.find((unit) => unit.id === 7)?.rescueTargetId).toBe(1);

    const firstDone = engine.runTicks(120);
    expect(firstDone.units.find((unit) => unit.id === 1)?.soldierState).toBe('recovering');
    expect(firstDone.units.find((unit) => unit.id === 7)?.rescueTargetId).toBe(2);

    const secondDone = engine.runTicks(120);
    expect(secondDone.units.find((unit) => unit.id === 2)?.soldierState).toBe('recovering');
  });

  it('accumulates and recovers fatigue', () => {
    const engine = new SimulationEngine({ seed: 1922, sandbox: true });
    engine.enqueue({ type: 'move', unitIds: [1], to: { x: -30, y: 7 } });
    const moving = engine.runTicks(80);
    const tired = moving.units.find((unit) => unit.id === 1)?.fatigue ?? 0;
    expect(tired).toBeGreaterThan(0);
    engine.enqueue({ type: 'hold', unitIds: [1] });
    const rested = engine.runTicks(200);
    expect(rested.units.find((unit) => unit.id === 1)?.fatigue ?? 0).toBeLessThan(tired);
  });
  it('rescues an incapacitated soldier and recovers him with the same record', () => {
    const engine = new SimulationEngine({ seed: 1922, sandbox: true });
    incapacitate(engine, 1);
    engine.enqueue({ type: 'order', order: 'rescue', unitIds: [2], targetId: 1 });
    const frame = engine.runTicks(150);
    expect(frame.units.find((unit) => unit.id === 1)?.alive).toBe(false);
    expect(frame.units.find((unit) => unit.id === 1)?.soldierState).toBe('recovering');

    const recovered = engine.runTicks(320);
    expect(recovered.units.find((unit) => unit.id === 1)?.alive).toBe(true);
    expect(recovered.units.find((unit) => unit.id === 1)?.incapacitated).toBe(false);
  });
  it('regenerates morale for allies inside the officer radius', () => {
    const engine = new SimulationEngine({ seed: 1922, sandbox: true });
    const internal = engine as unknown as {
      units: Array<{ id: number; morale: number; suppression: number }>;
    };
    const ally = internal.units.find((unit) => unit.id === 2);
    if (!ally) throw new Error('missing ally');
    ally.morale = 40;
    ally.suppression = 0;
    engine.runTicks(1);
    expect(ally.morale).toBeGreaterThan(40);
  });
  it('splits a section flank order into suppressing and flanking halves', () => {
    const engine = new SimulationEngine({ seed: 1922, sandbox: true, bounding: true });
    engine.enqueue({
      type: 'flank',
      unitIds: [1, 2, 3, 7, 8, 9],
      targetId: 4,
    });
    const frame = engine.runTicks(1);
    const orders = frame.units
      .filter((unit) => unit.faction === 'column')
      .map((unit) => unit.order);
    expect(orders.filter((order) => order === 'suppress')).toHaveLength(3);
    expect(orders.filter((order) => order === 'flank' || order === 'attack').length).toBeGreaterThanOrEqual(3);
    const flankPaths = frame.orders.filter((order) => order.kind === 'flank');
    const target = frame.units.find((unit) => unit.id === 4);
    const column = frame.units.filter((unit) => unit.faction === 'column');
    if (target && flankPaths.length > 0) {
      const cx = column.reduce((sum, unit) => sum + unit.x / column.length, 0);
      const cy = column.reduce((sum, unit) => sum + unit.y / column.length, 0);
      const signs = flankPaths.map((order) => {
        const point = order.points.at(-1);
        if (!point) return 0;
        return Math.sign((cx - target.x) * (point.y - target.y) - (cy - target.y) * (point.x - target.x));
      });
      expect(new Set(signs).size).toBe(1);
    }
  });
  it('assigns a flank route and a withdraw route', () => {
    const flank = new SimulationEngine({ seed: 1922 });
    flank.enqueue({ type: 'flank', unitIds: [1], targetId: 4 });
    const flankFrame = flank.runTicks(1);
    expect(flankFrame.orders.some((order) => order.kind === 'flank')).toBe(true);
    expect(flankFrame.units.find((unit) => unit.id === 1)?.order).toBe('flank');

    const withdraw = new SimulationEngine({ seed: 1922 });
    withdraw.enqueue({ type: 'withdraw', unitIds: [1] });
    const withdrawFrame = withdraw.runTicks(1);
    expect(withdrawFrame.orders.some((order) => order.kind === 'withdraw')).toBe(true);
    expect(withdrawFrame.units.find((unit) => unit.id === 1)?.order).toBe('withdraw');
  });

  it('halts within reach of cover and still fires', () => {
    const engine = new SimulationEngine({ seed: 1922 });
    approach(engine, [1], 60, { x: -7, y: -8 });
    const before = engine.frame().units.find((entry) => entry.id === 1);
    engine.enqueue({ type: 'hold', unitIds: [1] });
    const frame = engine.runTicks(20);
    const unit = frame.units.find((entry) => entry.id === 1);
    expect(unit?.order).toBe('hold');
    // Halt takes the cover within 6 m, if any, and holds there.
    expect(Math.hypot((unit?.x ?? 0) - (before?.x ?? 0), (unit?.y ?? 0) - (before?.y ?? 0))).toBeLessThan(6.5);
    expect((unit?.magazine ?? 0) + (unit?.reserve ?? 0)).toBeLessThan(20);
  });

  it('uses the selected formation for a group move and keeps the order when it changes', () => {
    const engine = new SimulationEngine({ seed: 1922 });
    engine.enqueue({ type: 'formation', unitIds: [1, 2], formation: 'column' });
    engine.enqueue({ type: 'move', unitIds: [1, 2], to: { x: 0, y: 30 } });
    const frame = engine.runTicks(1);
    expect(frame.units.filter((unit) => [1, 2].includes(unit.id)).every((unit) => unit.formation === 'column')).toBe(true);
    const columnEnds = frame.orders.map((order) => order.points.at(-1));
    expect(Math.abs((columnEnds[0]?.x ?? 0) - (columnEnds[1]?.x ?? 0))).toBeLessThan(0.01);
    expect(columnEnds[0]?.y).not.toBeCloseTo(columnEnds[1]?.y ?? 0);

    engine.enqueue({ type: 'formation', unitIds: [1, 2], formation: 'wedge' });
    const changed = engine.runTicks(1);
    expect(changed.units.find((unit) => unit.id === 1)?.formation).toBe('wedge');
    expect(changed.units.find((unit) => unit.id === 1)?.order).toBe('move');
    const wedgeEnds = changed.orders.map((order) => order.points.at(-1));
    expect(wedgeEnds.some((end) => Math.abs(end?.x ?? 0) > 0.1)).toBe(true);
  });

  it('spaces a multi-unit move into distinct orders', () => {
    const engine = new SimulationEngine({ seed: 1922 });
    engine.enqueue({ type: 'move', unitIds: [1, 2], to: { x: 0, y: 8 } });
    const frame = engine.runTicks(1);
    expect(frame.orders).toHaveLength(2);
    expect(frame.orders[0]?.points.at(-1)?.x).not.toBeCloseTo(frame.orders[1]?.points.at(-1)?.x ?? 0);
  });

  it('panics a broken unit and routes it at the map edge', () => {
    const engine = new SimulationEngine({ seed: 1922 });
    const internal = engine as unknown as {
      units: Array<{
        id: number;
        state: string;
        routed: boolean;
        morale: number;
        suppression: number;
        panicTicks: number;
        currentOrder: string | null;
        x: number;
        y: number;
        path: unknown[];
      }>;
    };
    const unit = internal.units.find((entry) => entry.id === 1);
    if (!unit) {
      throw new Error('missing unit');
    }
    unit.morale = 0;
    unit.suppression = 100;
    const panicked = engine.runTicks(1);
    expect(panicked.units.find((entry) => entry.id === 1)?.state).toBe('panicked');
    expect(unit.currentOrder).toBe('flee');

    unit.panicTicks = 0;
    unit.x = MAP_BOUNDS.maxX;
    unit.y = 0;
    unit.path = [];
    const routed = engine.runTicks(1);
    expect(routed.units.find((entry) => entry.id === 1)?.routed).toBe(true);
    expect(routed.events.some((event) => event.type === 'unit_routed')).toBe(true);
  });
  it('fires, consumes ammunition and resolves the skirmish after contact', () => {
    const engine = new SimulationEngine({ seed: 1922 });
    approach(engine, [1, 2, 3], 160, { x: 0, y: -8 });
    const frame = engine.runTicks(20);
    const shooter = frame.units.find((unit) => unit.id === 1);
    expect((shooter?.magazine ?? 0) + (shooter?.reserve ?? 0)).toBeLessThan(20);
  });

  it('advances an attack order toward the target instead of standing still', () => {
    const engine = new SimulationEngine({ seed: 1922, sandbox: true });
    const internal = engine as unknown as {
      units: Array<{ id: number; x: number; y: number; targetId: number | null }>;
    };
    const attacker = internal.units.find((unit) => unit.id === 1);
    const target = internal.units.find((unit) => unit.id === 4);
    if (!attacker || !target) throw new Error('missing units');
    attacker.x = 0;
    attacker.y = 20;
    target.x = 0;
    target.y = -30;
    engine.enqueue({ type: 'attack', unitIds: [1], targetId: 4 });
    const frame = engine.runTicks(160);
    const moved = frame.units.find((unit) => unit.id === 1);
    expect(moved?.y).toBeLessThan(20);
    expect(moved?.order).toBe('attack');
  });

  it('holds fire until released and pinned units cannot shoot', () => {
    const engine = new SimulationEngine({ seed: 1922, training: true, opposition: false });
    const internal = engine as unknown as {
      units: Array<{
        id: number;
        x: number;
        y: number;
        facingX: number;
        facingY: number;
      }>;
    };
    const shooter = internal.units.find((unit) => unit.id === 1);
    if (!shooter) throw new Error('missing shooter');
    shooter.x = 0;
    shooter.y = 0;
    shooter.facingX = 0;
    shooter.facingY = -1;
    engine.enqueue({ type: 'spawn_dummy', to: { x: 0, y: -8 } });
    const spawned = engine.runTicks(1);
    const dummyId = spawned.units.at(-1)?.id;
    if (dummyId === undefined) throw new Error('missing dummy');
    engine.enqueue({ type: 'attack', unitIds: [1], targetId: dummyId });
    engine.enqueue({ type: 'hold_fire', unitIds: [1], hold: true });
    const held = engine.runTicks(40);
    const heldMagazine = held.units.find((unit) => unit.id === 1)?.magazine ?? 0;
    expect(heldMagazine).toBeGreaterThan(0);

    engine.enqueue({ type: 'hold_fire', unitIds: [1], hold: false });
    const released = engine.runTicks(40);
    expect(released.units.find((unit) => unit.id === 1)?.magazine ?? 0).toBeLessThan(heldMagazine);

    const pinnedEngine = new SimulationEngine({ seed: 1922 });
    const pinnedInternal = pinnedEngine as unknown as {
      units: Array<{
        id: number;
        morale: number;
        suppression: number;
        stance: string;
        targetId: number | null;
        facingX: number;
        facingY: number;
        state: string;
      }>;
    };
    const target = pinnedInternal.units.find((unit) => unit.id === 4);
    const officer = pinnedInternal.units.find((unit) => unit.id === 3);
    if (!target || !officer) throw new Error('missing pinned units');
    target.morale = 20;
    target.suppression = 80;
    target.targetId = 1;
    target.facingX = 0;
    target.facingY = 1;
    officer.morale = 20;
    officer.suppression = 80;
    const pinned = pinnedEngine.runTicks(5);
    const pinnedTarget = pinned.units.find((unit) => unit.id === 4);
    expect(pinnedTarget?.state).toBe('pinned');
    expect(pinnedTarget?.stance).not.toBe('standing');
    expect(pinned.events.some((event) => event.type === 'shot' && event.source === 4)).toBe(false);
    expect(pinned.units.find((unit) => unit.id === 3)?.state).toBe('pinned');
  });});

describe('determinism', () => {
  it('keeps two engines with the same seed in lockstep', () => {
    const first = new SimulationEngine({ seed: 1922 });
    const second = new SimulationEngine({ seed: 1922 });
    first.enqueue({ type: 'move', unitIds: [1, 2], to: { x: 1, y: 2 } });
    second.enqueue({ type: 'move', unitIds: [1, 2], to: { x: 1, y: 2 } });

    for (let tick = 0; tick < 40; tick += 1) {
      expect(first.tick()).toEqual(second.tick());
    }
  });

  it('diverges with a different seed', () => {
    const first = new SimulationEngine({ seed: 1 });
    const second = new SimulationEngine({ seed: 2 });
    expect(first.hashState()).not.toBe(second.hashState());
  });
});

describe('worker host protocol', () => {
  it('starts, accepts commands and returns frames', () => {
    const messages: WorkerResponse[] = [];
    const host = createSimulationHost(
      (seed) => new SimulationEngine({ seed }),
      { postMessage: (message) => messages.push(message) },
    );

    host.handle({ type: 'start', seed: 1922 });
    expect(messages[0]?.type).toBe('ready');
    host.handle({ type: 'command', command: { type: 'move', unitIds: [1], to: { x: -12, y: 3 } } });
    host.handle({ type: 'step', ticks: 5 });
    const frameMessage = messages.find((message) => message.type === 'frame');
    expect(frameMessage?.type).toBe('frame');
    if (frameMessage?.type === 'frame') {
      expect(frameMessage.frame.tick).toBe(5);
      expect(frameMessage.frame.units).toHaveLength(9);
    }
  });

  it('surfaces a rejected command', () => {
    const messages: WorkerResponse[] = [];
    const host = createSimulationHost(
      (seed) => new SimulationEngine({ seed }),
      { postMessage: (message) => messages.push(message) },
    );
    host.handle({ type: 'start', seed: 1922 });
    host.handle({ type: 'command', command: { type: 'move', unitIds: [], to: { x: 0, y: 0 } } });
    host.handle({ type: 'step', ticks: 1 });
    const frameMessage = messages.find((message) => message.type === 'frame');
    if (frameMessage?.type !== 'frame') {
      throw new Error('missing frame');
    }
    expect(frameMessage.frame.events[0]?.type).toBe('command_rejected');
  });
});













































































