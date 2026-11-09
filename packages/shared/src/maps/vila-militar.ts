import { SANDBOX_TERRAIN } from '../terrain';
import { BATTLE_COVERS, BUILDINGS } from '../world';
import { band } from './kit';
import type { BattleMap } from './types';

/**
 * The 3v3 field as it was before the battle maps: the training kit around the
 * origin at Vila Militar, with feature terrain. Its data are the existing
 * tables, so its queries and its determinism golden do not change.
 */
export const VILA_MILITAR: BattleMap = {
  id: 'vila-militar',
  nameKey: 'map.vilaMilitar.name',
  descriptionKey: 'map.vilaMilitar.description',
  codexKey: 'vila-militar',
  setting: {
    label: 'training-ground',
    sourceNote: 'Army training field near Vila Militar, Rio de Janeiro (fictional layout).',
  },
  bounds: { minX: -120, minY: -120, maxX: 120, maxY: 120 },
  height: { kind: 'features', features: SANDBOX_TERRAIN },
  baseSurface: 'grass',
  surfaces: [],
  water: [],
  waterLevel: 0,
  bridges: [],
  ferries: [],
  vegetation: [],
  buildings: BUILDINGS,
  covers: BATTLE_COVERS,
  sightObstacles: [],
  deployment: {
    // add-deployment-phase 1.1: fronts 65 m from the centre line, back to the field's edge.
    column: { sections: [{ x: -44, y: 90 }, { x: 0, y: 90 }, { x: 44, y: 90 }], facing: { x: 0, y: -1 }, area: band(-100, 100, 65, 100) },
    legalist: { sections: [{ x: -44, y: -90 }, { x: 0, y: -90 }, { x: 44, y: -90 }], facing: { x: 0, y: 1 }, area: band(-100, 100, -65, -100) },
  },
  props: [],
  fences: [],
  palette: 'temperate',
  // pre-battle-roster 2.3: the enemy's forces, one drawn per battle when the player brings a roster.
  enemyForces: [
    { sections: ['fuzileiros', 'fuzileiros', 'fuzileiros'] },
    { sections: ['comando', 'fuzileiros', 'fuzileiros', 'esquadra-4'] },
  ],
};
