import { describe, expect, it } from 'vitest';
import { vegetationAt, type SimEvent } from '@prestes/shared';
import { SimulationEngine } from '../src/engine';
import { searchAreas } from '../src/systems/enemy-commander';

// refine-battle-maps 2.1 / 2.2: the winning side searches using only what it
// knows, and a broken side out of contact falls back so the battle ends.

function fazenda(seed = 1922) {
  const engine = new SimulationEngine({ seed, scenario: 'battle3v3', sandbox: true, fog: true, battleMap: 'fazenda' });
  const events: Array<SimEvent & { at: number }> = [];
  const run = (ticks: number, until?: () => boolean) => {
    for (let index = 0; index < ticks; index += 1) {
      const frame = engine.tick();
      for (const event of frame.events) events.push({ ...event, at: frame.tick });
      if (until?.()) return;
    }
  };
  const side = (faction: 'column' | 'legalist') => engine.units.filter((unit) => unit.faction === faction);
  const strikeDown = (keep: number) => {
    for (const unit of side('legalist').slice(keep)) {
      unit.alive = false;
      unit.hp = 0;
    }
  };
  return { engine, events, run, side, strikeDown };
}

describe('a decided battle ends', () => {
  it('the last survivors of a broken side, out of contact, fall back off the field', () => {
    const t = fazenda();
    t.strikeDown(3);
    const column = t.side('column');
    // The column holds well back, out of sight, and does not fire.
    for (const unit of column) unit.y = 112;
    const ids = column.map((unit) => unit.id);
    t.engine.enqueue({ type: 'hold', unitIds: ids });
    t.engine.enqueue({ type: 'fire_control', unitIds: ids, mode: 'hold' });
    t.run(1500, () => t.engine.outcome !== 'playing');
    const fell = t.events.find((event) => event.type === 'side_fell_back');
    expect(fell).toMatchObject({ side: 'legalist' });
    expect(fell!.at).toBeGreaterThanOrEqual(600);
    expect(t.events.filter((event) => event.type === 'unit_routed')).toHaveLength(3);
    expect(t.engine.outcome).toBe('victory');
  }, 120_000);

  it('a side still in contact does not fall back, however few', () => {
    const t = fazenda();
    t.strikeDown(3);
    t.run(300);
    const legalists = t.side('legalist').filter((unit) => unit.alive);
    // Keep the survivors in sight of the column: contact is fresh every tick.
    for (let index = 0; index < 80; index += 1) {
      for (const [n, unit] of legalists.entries()) {
        unit.x = -10 + n * 4;
        unit.y = 60;
      }
      t.run(10);
    }
    expect(t.events.some((event) => event.type === 'side_fell_back' && event.side === 'legalist')).toBe(false);
  }, 120_000);
});

describe('the winning side searches', () => {
  it('a clue by the cane makes the cane near it a search area, before the enemy deployment', () => {
    const t = fazenda();
    t.run(1);
    t.engine.battle.clues.column.set('test', { x: -60, y: 0 });
    const areas = searchAreas(t.engine, 'column');
    const tiers = areas.map((area) => area.tier);
    expect(tiers).toContain(1);
    expect(tiers).toContain(3);
    const cane = areas.filter((area) => area.tier === 2 && area.id.startsWith('v:'));
    expect(cane.length).toBeGreaterThan(0);
    for (const area of cane) {
      // Vegetation is searched only near a clue, and the canefield ends at x = -56.
      expect(Math.hypot(area.x + 60, area.y)).toBeLessThanOrEqual(60);
    }
    expect(cane.some((area) => area.x < -56)).toBe(true);
  });

  it('no cheating: where an unseen enemy hides does not change the search', () => {
    const t = fazenda();
    t.run(1);
    t.engine.battle.clues.column.set('test', { x: -60, y: 0 });
    const before = searchAreas(t.engine, 'column').map((area) => area.id);
    const hider = t.side('legalist')[0]!;
    hider.x = -100;
    hider.y = 30;
    hider.stance = 'prone';
    expect(t.engine.vision.seen.column.has(hider.id)).toBe(false);
    expect(searchAreas(t.engine, 'column').map((area) => area.id)).toEqual(before);
  });

  it('search the cane: the last column section, seen entering the canefield, is searched for there within 2 minutes', () => {
    const t = fazenda();
    // The column's last section (a third of its strength: not broken) hides
    // crouched in the canefield; the legalists last saw it at the edge.
    const column = t.side('column');
    for (const unit of column.filter((entry) => entry.squadId !== 1)) {
      unit.alive = false;
      unit.hp = 0;
    }
    const hiding = column.filter((unit) => unit.squadId === 1);
    const ids = hiding.map((unit) => unit.id);
    t.engine.enqueue({ type: 'fire_control', unitIds: ids, mode: 'hold' });
    t.engine.enqueue({ type: 'stance', unitIds: ids, stance: 'crouched' });
    t.run(1);
    hiding.forEach((unit, index) => {
      const x = -96 + (index % 4) * 4;
      const y = -6 + Math.floor(index / 4) * 4;
      Object.assign(unit, { x, y, path: [], targetX: x, targetY: y, holdPosition: true, currentOrder: 'hold' });
      t.engine.vision.lastSeen.legalist.set(unit.id, { x: -58, y: -2 + index, tick: 1 });
    });
    // The legalists fought near the cane: they stand 30 m short of its edge.
    for (const unit of t.side('legalist')) {
      unit.y += 60;
      unit.targetY = unit.y;
      unit.path = [];
    }
    const found = () => hiding.some((unit) => t.engine.vision.seen.legalist.has(unit.id));
    // Within 2 minutes an idle legalist section is sweeping the canefield:
    // standing in it, with a cane search area marked swept.
    const sweepingCane = () =>
      t.engine.units.some((unit) => unit.faction === 'legalist' && unit.alive && !unit.routed && vegetationAt(unit.x, unit.y) === 'cane') &&
      [...t.engine.battle.swept.legalist].some((id) => id.startsWith('c:') || id.startsWith('v:'));
    t.run(1200, sweepingCane);
    expect(sweepingCane()).toBe(true);
    // And the search finds the hidden section.
    t.run(3000 - t.engine.tickCount, found);
    expect(found()).toBe(true);
    expect(t.events.some((event) => event.type === 'side_fell_back')).toBe(false);
  }, 120_000);
});
