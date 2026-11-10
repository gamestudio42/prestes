import { describe, expect, it } from 'vitest';
import { allCoverSlots, battleMap, compileMapDocument, createEditableMap, insideDeploymentArea, toMapDocument, type BattleMap, type BattleRosters } from '@prestes/shared';
import { SimulationEngine } from '../src';

/** A medium authored map with a 60 m fire trench 15 m in front of the legalists' points, facing the column. */
function trenchMap(): BattleMap {
  const editable = createEditableMap({ id: 'enemy-trench', size: 'medium', name: { en: 'Trench', 'pt-BR': 'Trincheira' } });
  const front = editable.deployment.legalist.sections[1]!;
  const y = front.y + 15;
  // Travelling west, left is south: the parapet faces +y, toward the column.
  editable.trenches.push({ id: 1, kind: 'fire', depth: 1.2, facing: 'left', bays: false, parapet: 'earth', points: [{ x: front.x + 30, y }, { x: front.x - 30, y }] });
  return compileMapDocument(toMapDocument(editable));
}

const legalists = (engine: SimulationEngine) =>
  engine.frame().units.filter((unit) => unit.faction === 'legalist').map(({ id, x, y, stance }) => ({ id, x, y, stance }));

describe('enemy deployment (add-deployment-phase 2.3)', () => {
  it('same seed, same deployment', () => {
    const start = () => new SimulationEngine({ seed: 77, scenario: 'battle3v3', battleMap: trenchMap(), deployment: true, enemyDeployment: true });
    expect(legalists(start())).toEqual(legalists(start()));
  });

  it('enemy takes the trenches: a legalist section starts on the fire step, inside its area', () => {
    const map = trenchMap();
    const engine = new SimulationEngine({ seed: 77, scenario: 'battle3v3', battleMap: map, deployment: true, enemyDeployment: true });
    const trench = new Set(map.covers.filter((cover) => cover.kind === 'trench' && cover.facing).map((cover) => cover.id));
    expect(map.covers.find((cover) => trench.has(cover.id))!.facing!.y).toBeGreaterThan(0.9);
    const steps = allCoverSlots(map.covers).filter((slot) => trench.has(slot.coverId));
    const men = engine.frame().units.filter((unit) => unit.faction === 'legalist');
    const onStep = men.filter((unit) => steps.some((slot) => Math.hypot(slot.x - unit.x, slot.y - unit.y) < 0.3));
    expect(onStep.length).toBeGreaterThanOrEqual(8);
    for (const unit of men) expect(insideDeploymentArea(map.deployment.legalist.area, unit.x, unit.y)).toBe(true);
  });

  it('the test map: the enemy deploys inside its area', () => {
    for (const battleMap of ['campo-de-provas'] as const) {
      const engine = new SimulationEngine({ seed: 5, scenario: 'battle3v3', battleMap, deployment: true, enemyDeployment: true });
      const area = engine.battleMap!.deployment.legalist.area;
      for (const unit of engine.frame().units.filter((entry) => entry.faction === 'legalist')) {
        expect(insideDeploymentArea(area, unit.x, unit.y), `${battleMap} ${unit.id}`).toBe(true);
      }
    }
  });

  it('the commander reads the map, not the player: another column leaves its deployment unchanged', () => {
    const map = trenchMap();
    const legalist = { sections: ['fuzileiros', 'fuzileiros', 'fuzileiros'] } as BattleRosters['column'];
    const start = (column: BattleRosters['column']) =>
      new SimulationEngine({ seed: 77, scenario: 'battle3v3', battleMap: map, deployment: true, enemyDeployment: true, rosters: { column, legalist } });
    const a = legalists(start({ sections: ['fuzileiros', 'fuzileiros', 'fuzileiros'] }));
    const b = legalists(start({ sections: ['comando', 'metralhadora', 'esquadra-5', 'irregulares'] }));
    expect(b.map(({ x, y, stance }) => ({ x, y, stance }))).toEqual(a.map(({ x, y, stance }) => ({ x, y, stance })));
  });
  it('takes the test map line: the trench and the sandbag rows before its points', () => {
    const engine = new SimulationEngine({ seed: 1922, scenario: 'battle3v3', battleMap: 'campo-de-provas', deployment: true, enemyDeployment: true });
    const men = engine.frame().units.filter((unit) => unit.faction === 'legalist');
    expect(men.filter((unit) => unit.slotId != null).length).toBeGreaterThanOrEqual(20);
  });
  it('sections stay near their places: every section centre within 50 m of its start, on the test map', () => {
    for (const map of [battleMap('campo-de-provas')]) {
      for (const seed of [1922, 1924, 1925]) {
        const centre = (deployed: boolean, squadId: number) => {
          const men = new SimulationEngine({ seed, scenario: 'battle3v3', battleMap: map.id, deployment: true, enemyDeployment: deployed })
            .frame()
            .units.filter((unit) => unit.faction === 'legalist' && unit.squadId === squadId);
          return { x: men.reduce((sum, unit) => sum + unit.x, 0) / men.length, y: men.reduce((sum, unit) => sum + unit.y, 0) / men.length };
        };
        const squads = [...new Set(new SimulationEngine({ seed, scenario: 'battle3v3', battleMap: map.id }).frame().units.filter((unit) => unit.faction === 'legalist').map((unit) => unit.squadId))];
        for (const squadId of squads) {
          const from = centre(false, squadId);
          const to = centre(true, squadId);
          expect(Math.sqrt((to.x - from.x) ** 2 + (to.y - from.y) ** 2), `${map.id} ${seed} section ${squadId}`).toBeLessThanOrEqual(50);
        }
      }
    }
  });
});
