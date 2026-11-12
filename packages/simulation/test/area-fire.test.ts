import { describe, expect, it } from 'vitest';
import { getWeapon, type SimEvent } from '@prestes/shared';
import { SimulationEngine } from '../src/engine';
import { areaHitChance } from '../src/systems/combat';
import { AREA_FIRE_TICKS, areaFireFloor } from '../src/systems/area-fire';
import type { MutableUnit } from '../src/systems/model';
import { grassField, openField } from './open-field';

// scrub-concealment-and-area-fire: area fire on a suspected contact.

function field(seed = 1922, fog = true, grass = false) {
  const engine = new SimulationEngine({ seed, scenario: 'battle3v3', sandbox: true, fog, battleMap: grass ? grassField() : openField() });
  const place = (unit: MutableUnit, x: number, y: number) => {
    unit.x = x;
    unit.y = y;
    unit.targetX = x;
    unit.targetY = y;
    unit.path = [];
    unit.pathIndex = 0;
  };
  // Everyone parked out of the way, holding fire, far apart.
  engine.units.forEach((unit, index) => {
    place(unit, -110 + (index % 20) * 2, unit.faction === 'column' ? -110 : 110);
    unit.holdFire = true;
    unit.fireControlSet = true;
  });
  const section = engine.units.filter((unit) => unit.faction === 'column' && unit.squadId === 1 && unit.alive && unit.kind !== 'officer');
  const riflemen = section.filter((unit) => unit.weaponId === 'mauser-7mm').slice(0, 8);
  riflemen.forEach((unit, index) => {
    place(unit, -14 + index * 4, grass ? -40 : 0);
    unit.facingX = 0;
    unit.facingY = 1;
  });
  const enemy = engine.units.find((unit) => unit.faction === 'legalist' && unit.kind !== 'officer' && unit.weaponId === 'mauser-7mm')!;
  const events: SimEvent[] = [];
  const run = (ticks: number) => {
    for (let index = 0; index < ticks; index += 1) events.push(...engine.tick().events);
  };
  /** A "?" the column heard at (x, y), as an unseen shot leaves it. */
  const hear = (x: number, y: number, radius = 8) =>
    engine.vision.heard.column.push({ x, y, fromX: x, fromY: y, tick: engine.tickCount, radius });
  /** An enemy crouched in the tall grass (x 20..44, y 24..44): hidden from the section 70 m off. */
  const hide = () => {
    place(enemy, 32, 34);
    enemy.stance = 'crouched';
    enemy.stanceLocked = true;
    enemy.morale = 100;
  };
  return { engine, place, riflemen, enemy, events, run, hear, hide };
}

const rejections = (events: readonly SimEvent[]) => events.filter((event) => event.type === 'command_rejected');
const areaShots = (events: readonly SimEvent[], ids: readonly number[]) =>
  events.filter((event) => event.type === 'shot' && event.area === true && ids.includes(event.source));

describe('area fire: the order', () => {
  it('fires at a "?": the section fires into the disc and the frame shows it', () => {
    const t = field();
    t.hear(0, 70, 9);
    const ids = t.riflemen.map((unit) => unit.id);
    t.engine.enqueue({ type: 'area_fire', unitIds: ids, to: { x: 3, y: 72 } });
    t.run(1);
    expect(rejections(t.events)).toHaveLength(0);
    for (const unit of t.riflemen) {
      expect(unit.currentOrder).toBe('area-fire');
      expect(unit.areaFire).toMatchObject({ x: 0, y: 70, radius: 9 });
    }
    const frame = t.engine.frame();
    expect(frame.units.find((unit) => unit.id === ids[0])!.areaFire).toEqual({ x: 0, y: 70, radius: 9 });
    t.run(60);
    expect(areaShots(t.events, ids).length).toBeGreaterThan(8);
  });

  it('fires at a lost contact: a 5 m disc round its last sighting', () => {
    const t = field();
    t.engine.vision.lastSeen.column.set(t.enemy.id, { x: 10, y: 60, tick: t.engine.tickCount - 50 });
    t.engine.enqueue({ type: 'area_fire', unitIds: [t.riflemen[0]!.id], to: { x: 10, y: 61 } });
    t.run(1);
    expect(rejections(t.events)).toHaveLength(0);
    expect(t.riflemen[0]!.areaFire).toMatchObject({ x: 10, y: 60, radius: 5 });
  });

  it('no contact there: rejected with no_suspected_contact and nothing changes', () => {
    const t = field();
    t.hear(0, 70);
    const before = t.engine.hashState();
    t.engine.enqueue({ type: 'area_fire', unitIds: t.riflemen.map((unit) => unit.id), to: { x: 30, y: 70 } });
    const frame = t.engine.runTicks(1);
    expect(frame.events.find((event) => event.type === 'command_rejected')).toMatchObject({ reason: 'no_suspected_contact' });
    expect(t.riflemen.every((unit) => unit.areaFire === undefined)).toBe(true);
    // Only the tick itself moved on: the same run without the command hashes the same.
    const control = field();
    control.hear(0, 70);
    expect(control.engine.hashState()).toBe(before);
    expect(control.engine.runTicks(1).hash).toBe(frame.hash);
  });

  it('a stale marker or sighting is no contact', () => {
    const t = field();
    t.engine.vision.heard.column.push({ x: 0, y: 70, fromX: 0, fromY: 70, tick: t.engine.tickCount - 120, radius: 6 });
    t.engine.vision.lastSeen.column.set(t.enemy.id, { x: 20, y: 70, tick: t.engine.tickCount - 90 });
    t.engine.enqueue({ type: 'area_fire', unitIds: [t.riflemen[0]!.id], to: { x: 0, y: 70 } });
    t.engine.enqueue({ type: 'area_fire', unitIds: [t.riflemen[0]!.id], to: { x: 20, y: 70 } });
    t.run(1);
    expect(rejections(t.events).map((event) => event.type === 'command_rejected' && event.reason)).toEqual([
      'no_suspected_contact',
      'no_suspected_contact',
    ]);
  });

  it('with fog of war off any point is accepted, with a 6 m disc', () => {
    const t = field(1922, false);
    t.engine.enqueue({ type: 'area_fire', unitIds: [t.riflemen[0]!.id], to: { x: 40, y: 50 } });
    t.run(1);
    expect(t.riflemen[0]!.areaFire).toMatchObject({ x: 40, y: 50, radius: 6 });
  });

  it('the disc is clamped between 4 and 12 m', () => {
    const t = field();
    t.hear(0, 70, 2);
    t.hear(60, 70, 20);
    t.engine.enqueue({ type: 'area_fire', unitIds: [t.riflemen[0]!.id], to: { x: 0, y: 70 } });
    t.engine.enqueue({ type: 'area_fire', unitIds: [t.riflemen[1]!.id], to: { x: 60, y: 70 } });
    t.run(1);
    expect(t.riflemen[0]!.areaFire!.radius).toBe(4);
    expect(t.riflemen[1]!.areaFire!.radius).toBe(12);
  });

  it('one man: only he fires into the area', () => {
    const t = field();
    t.hear(0, 70);
    const one = t.riflemen[2]!;
    t.engine.enqueue({ type: 'area_fire', unitIds: [one.id], to: { x: 0, y: 70 } });
    t.run(80);
    const shooters = new Set(areaShots(t.events, t.riflemen.map((unit) => unit.id)).map((event) => event.type === 'shot' && event.source));
    expect([...shooters]).toEqual([one.id]);
  });
});

describe('area fire: the rounds', () => {
  it('hits are rare: a Mauser at 60 m on a man in the open, about 1.2 %, never over 3 %', () => {
    const t = field();
    const shooter = t.riflemen[0]!;
    t.place(t.enemy, shooter.x, shooter.y + 60);
    t.enemy.stance = 'standing';
    const chance = areaHitChance(t.engine, shooter, t.enemy, 0);
    expect(chance).toBeGreaterThan(0.009);
    expect(chance).toBeLessThan(0.015);
    t.place(t.enemy, shooter.x, shooter.y + 5);
    expect(areaHitChance(t.engine, shooter, t.enemy, 0)).toBeLessThanOrEqual(0.03);
  });

  it('a seeded batch of rounds on one man in the disc hits under 3 %', () => {
    let rounds = 0;
    let hits = 0;
    for (const seed of [1, 2, 3, 4, 5]) {
      const t = field(seed, true, true);
      t.hide();
      t.enemy.hp = 1e6;
      t.hear(32, 34, 6);
      const ids = t.riflemen.map((unit) => unit.id);
      t.engine.enqueue({ type: 'area_fire', unitIds: ids, to: { x: 32, y: 34 } });
      for (let step = 0; step < 200; step += 1) {
        // Keep him there, hidden in the grass and unhurt.
        t.hide();
        t.enemy.suppression = 0;
        t.run(1);
      }
      const shots = areaShots(t.events, ids).filter((event) => event.type === 'shot' && event.target === t.enemy.id);
      rounds += shots.length;
      hits += shots.filter((event) => event.type === 'shot' && event.hit).length;
    }
    expect(rounds).toBeGreaterThan(300);
    expect(hits / rounds).toBeLessThan(0.03);
  });

  it('mostly suppression: an unhit man in the disc is pinned by eight riflemen within 10 s', () => {
    const t = field(1922, true, true);
    t.hide();
    t.hear(32, 34, 6);
    t.engine.enqueue({ type: 'area_fire', unitIds: t.riflemen.map((unit) => unit.id), to: { x: 32, y: 34 } });
    let peak = 0;
    for (let step = 0; step < 100; step += 1) {
      t.hide();
      t.enemy.hp = 100;
      t.run(1);
      peak = Math.max(peak, t.enemy.suppression);
    }
    expect(peak).toBeGreaterThanOrEqual(65);
  });

  it('each round adds half a missed aimed round of suppression', () => {
    const t = field(1922, true, true);
    const shooter = t.riflemen[0]!;
    t.hide();
    t.hear(32, 34, 6);
    t.enemy.suppression = 0;
    t.engine.enqueue({ type: 'area_fire', unitIds: [shooter.id], to: { x: 32, y: 34 } });
    let before = 0;
    let gain: number | null = null;
    for (let step = 0; step < 80 && gain === null; step += 1) {
      t.hide();
      before = t.enemy.suppression;
      const frame = t.engine.runTicks(1);
      const shot = frame.events.find((event) => event.type === 'shot' && event.source === shooter.id && !event.hit);
      if (shot) gain = t.enemy.suppression - before;
    }
    // 12 x Mauser suppression 1 x 0.5, less the tick's recovery.
    expect(gain).not.toBeNull();
    expect(gain!).toBeGreaterThan(4);
    expect(gain!).toBeLessThanOrEqual(6.01);
  });

  it('empty bushes: rounds hit no one and still cost ammunition', () => {
    const t = field();
    t.hear(0, 70, 6);
    const shooter = t.riflemen[0]!;
    const before = shooter.magazine + shooter.reserve;
    t.engine.enqueue({ type: 'area_fire', unitIds: [shooter.id], to: { x: 0, y: 70 } });
    t.run(60);
    const shots = areaShots(t.events, [shooter.id]);
    expect(shots.length).toBeGreaterThan(2);
    expect(shots.every((event) => event.type === 'shot' && event.target === -1 && !event.hit)).toBe(true);
    expect(shooter.magazine + shooter.reserve).toBe(before - shots.length);
    expect(t.events.some((event) => event.type === 'unit_hit')).toBe(false);
  });

  it('no line of fire: a man behind a building holds while the others fire', () => {
    const t = field();
    t.hear(0, 70, 6);
    const blocked = t.riflemen[0]!;
    t.engine.covers.push({
      id: 9001,
      kind: 'building',
      x: blocked.x,
      y: blocked.y + 4,
      halfWidth: 1.5,
      halfDepth: 1.5,
      height: 5,
      radius: 2,
      quality: 1,
      blocksMovement: true,
      blocksSight: true,
    });
    t.engine.enqueue({ type: 'area_fire', unitIds: t.riflemen.map((unit) => unit.id), to: { x: 0, y: 70 } });
    t.run(60);
    expect(areaShots(t.events, [blocked.id])).toHaveLength(0);
    expect(areaShots(t.events, t.riflemen.slice(1).map((unit) => unit.id)).length).toBeGreaterThan(5);
  });

  it('a "?" whose centre is hidden: the men fire into the open part of the disc', () => {
    const t = field();
    const shooter = t.riflemen[0]!;
    t.hear(shooter.x, 70, 10);
    // A building hides the disc's centre (and its near half) from the shooter.
    t.engine.covers.push({
      id: 9002,
      kind: 'building',
      x: shooter.x,
      y: 64,
      halfWidth: 2,
      halfDepth: 2,
      height: 6,
      radius: 3,
      quality: 1,
      blocksMovement: true,
      blocksSight: true,
    });
    t.engine.enqueue({ type: 'area_fire', unitIds: [shooter.id], to: { x: shooter.x, y: 70 } });
    t.run(120);
    const shots = areaShots(t.events, [shooter.id]);
    expect(shots.length).toBeGreaterThan(3);
    // Every round goes to a point off the building's shadow.
    for (const event of shots) {
      if (event.type !== 'shot') continue;
      expect(Math.abs(event.x2 - shooter.x)).toBeGreaterThan(1.5);
    }
  });
});

describe('area fire: the end', () => {
  it('a Mauser rifleman stops with 5 rounds left, or at 20 s', () => {
    const t = field();
    t.hear(0, 70, 6);
    const shooter = t.riflemen[0]!;
    expect(areaFireFloor(shooter)).toBe(Math.ceil((getWeapon('mauser-7mm')!.magazine + getWeapon('mauser-7mm')!.reserve) / 4));
    shooter.magazine = 5;
    shooter.reserve = 3;
    t.engine.enqueue({ type: 'area_fire', unitIds: [shooter.id], to: { x: 0, y: 70 } });
    t.run(150);
    expect(shooter.magazine + shooter.reserve).toBe(areaFireFloor(shooter));
    expect(shooter.areaFire).toBeUndefined();
    expect(shooter.currentOrder).toBeNull();

    const timed = field();
    timed.hear(0, 70, 6);
    const man = timed.riflemen[0]!;
    man.magazine = 5;
    man.reserve = 200;
    timed.engine.enqueue({ type: 'area_fire', unitIds: [man.id], to: { x: 0, y: 70 } });
    timed.run(AREA_FIRE_TICKS - 5);
    expect(man.areaFire).toBeDefined();
    timed.run(10);
    expect(man.areaFire).toBeUndefined();
  });

  it('another order ends it', () => {
    const t = field();
    t.hear(0, 70, 6);
    const ids = t.riflemen.map((unit) => unit.id);
    t.engine.enqueue({ type: 'area_fire', unitIds: ids, to: { x: 0, y: 70 } });
    t.run(5);
    t.engine.enqueue({ type: 'hold', unitIds: ids });
    t.run(1);
    expect(t.riflemen.every((unit) => unit.areaFire === undefined && unit.currentOrder !== 'area-fire')).toBe(true);
  });

  it('the enemy shows himself in the disc: aimed fire at him', () => {
    const t = field();
    t.hear(0, 60, 8);
    const shooter = t.riflemen[3]!;
    shooter.holdFire = false;
    t.engine.enqueue({ type: 'area_fire', unitIds: [shooter.id], to: { x: 0, y: 60 } });
    t.run(5);
    expect(shooter.areaFire).toBeDefined();
    t.place(t.enemy, shooter.x, 60);
    t.enemy.stance = 'standing';
    t.run(5);
    expect(shooter.areaFire).toBeUndefined();
    expect(shooter.targetId).toBe(t.enemy.id);
  });

  it('under hold fire: fires into the area and keeps hold fire afterwards', () => {
    const t = field();
    t.hear(0, 70, 6);
    const ids = t.riflemen.map((unit) => unit.id);
    t.engine.enqueue({ type: 'fire_control', unitIds: ids, mode: 'hold' });
    t.engine.enqueue({ type: 'area_fire', unitIds: ids, to: { x: 0, y: 70 } });
    t.run(AREA_FIRE_TICKS + 10);
    expect(areaShots(t.events, ids).length).toBeGreaterThan(10);
    expect(t.riflemen.every((unit) => unit.areaFire === undefined && unit.holdFire)).toBe(true);
    expect(t.engine.frame().units.filter((unit) => ids.includes(unit.id)).every((unit) => unit.fireControl === 'hold')).toBe(true);
  });

  it('same result every run', () => {
    const run = () => {
      const t = field(7);
      t.place(t.enemy, 2, 70);
      t.hear(0, 70, 6);
      t.engine.enqueue({ type: 'area_fire', unitIds: t.riflemen.map((unit) => unit.id), to: { x: 0, y: 70 } });
      const hashes: string[] = [];
      for (let index = 0; index < 120; index += 1) hashes.push(t.engine.tick().hash);
      return hashes;
    };
    expect(run()).toEqual(run());
  });
});
