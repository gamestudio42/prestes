import { describe, expect, it } from 'vitest';
import type { MutableUnit } from '../src/systems/model';
import { duel } from './garrison-duel';

const down = (units: readonly MutableUnit[]) => units.filter((unit) => !unit.alive || unit.incapacitated).length;

describe('garrison: fire from inside (garrison-and-assault 3.1)', { timeout: 120_000 }, () => {
  it('good cover, real losses: over 20 seeds the garrison loses fewer than the men in the open, and some', () => {
    let lostInside = 0;
    let lostOpen = 0;
    let seedsFewer = 0;
    for (let seed = 1; seed <= 20; seed += 1) {
      const { engine, inside, open } = duel(seed);
      engine.runTicks(600, { hash: false });
      lostInside += down(inside);
      lostOpen += down(open);
      if (down(inside) <= down(open)) seedsFewer += 1;
    }
    expect(lostInside).toBeLessThan(lostOpen);
    expect(lostInside).toBeGreaterThan(0);
    expect(seedsFewer).toBeGreaterThanOrEqual(14);
  });

  it('a shot at the house meets the man at the port facing the shooter, and the garrison shares its suppression', () => {
    const { engine, inside, house, out } = duel(3);
    const ports: { port: number; shooter: { x: number; y: number } }[] = [];
    let peak = 0;
    for (let tick = 0; tick < 600; tick += 1) {
      const frame = engine.runTicks(1, { hash: false });
      const fit = inside.filter((unit) => unit.alive && !unit.incapacitated);
      // Every man inside reads the garrison's one suppression.
      expect(new Set(fit.map((unit) => unit.suppression)).size).toBeLessThanOrEqual(1);
      peak = Math.max(peak, fit[0]?.suppression ?? 0);
      for (const event of frame.events) {
        if (event.type !== 'shot') continue;
        const man = inside.find((unit) => unit.id === event.target);
        // The port he stood at when the shot was fired (a man who falls leaves it).
        if (man) ports.push({ port: man.port ?? house.ports.findIndex((port) => Math.abs(port.x - event.x2) < 1e-6 && Math.abs(port.y - event.y2) < 1e-6), shooter: { x: event.x, y: event.y } });
      }
    }
    expect(ports.length).toBeGreaterThan(0);
    // The man the legalists shoot at is at a port that looks toward them (the
    // wall facing them while its men stand, a side wall's when they are down), never one facing away.
    for (const { port, shooter } of ports) {
      const at = house.ports[port]!;
      expect(at.facing.x * (shooter.x - at.x) + at.facing.y * (shooter.y - at.y)).toBeGreaterThanOrEqual(0);
    }
    expect(ports.filter(({ port }) => house.ports[port]!.facing.x * out.x + house.ports[port]!.facing.y * out.y > 0.7).length).toBeGreaterThan(ports.length / 2);
    expect(peak).toBeGreaterThan(0);
  });

  it('suppressed garrison fires less: a pinned garrison fires no more than pinned men outside', () => {
    // Shots per 30 s by the garrison and by the men in the open, with one side kept pinned.
    const shotsBy = (pinned: 'none' | 'inside' | 'open') => {
      const { engine, inside, open } = duel(5, { garrisonPinned: pinned === 'inside' });
      const shots = { inside: 0, open: 0 };
      for (let tick = 0; tick < 300; tick += 1) {
        // Fire kept on them.
        if (pinned === 'inside') for (const unit of inside) unit.suppression = 100;
        if (pinned === 'open') for (const unit of open) unit.suppression = 100;
        const frame = engine.runTicks(1, { hash: false });
        for (const event of frame.events) {
          if (event.type !== 'shot') continue;
          if (inside.some((unit) => unit.id === event.source)) shots.inside += 1;
          if (open.some((unit) => unit.id === event.source)) shots.open += 1;
        }
      }
      return shots;
    };
    const free = shotsBy('none');
    expect(free.inside).toBeGreaterThan(0);
    expect(free.open).toBeGreaterThan(0);
    const pinnedInside = shotsBy('inside').inside;
    const pinnedOpen = shotsBy('open').open;
    expect(pinnedInside).toBeLessThan(free.inside / 2);
    // As for pinned soldiers outside: the house gives no exception.
    expect(pinnedInside / free.inside).toBeLessThanOrEqual(pinnedOpen / free.open + 0.1);
  });
});
