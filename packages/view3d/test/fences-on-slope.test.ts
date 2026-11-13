import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { setActiveMap, terrainHeightAt } from '@prestes/shared';
import { BattleMapLayer, lines } from '../src/battle-map-layer';
import type { ModelPlacements } from '../src/environment-models';
import { fences, GATES, NEW_LINE_KINDS } from '../../shared/test/fixtures/fences';
import { TEST_MAP } from '../../shared/test/fixtures/test-map';

// revise-buildings-and-stone 5.3: each new fence and wall drawn straight
// down a hillside follows the ground: every piece stands on the ground under
// it, none floats and none is buried, and the open gates are their models.
describe('new fences and walls on a slope', () => {
  for (const kind of NEW_LINE_KINDS) {
    it(`a ${kind} follows the slope`, () => {
      const map = fences([kind]);
      setActiveMap(map);
      const height = map.lines![0]!.height;
      let pieces = 0;
      const matrix = new THREE.Matrix4();
      const position = new THREE.Vector3();
      lines(map).traverse((object) => {
        if (!(object instanceof THREE.InstancedMesh)) return;
        for (let index = 0; index < object.count; index += 1) {
          object.getMatrixAt(index, matrix);
          position.setFromMatrixPosition(matrix.premultiply(object.matrixWorld));
          const ground = terrainHeightAt(position.x, position.z);
          expect(position.y).toBeGreaterThan(ground - 0.6);
          expect(position.y).toBeLessThan(ground + height + 0.6);
          pieces += 1;
        }
      });
      // Down 80 m of slope, rising some 8 m.
      expect(terrainHeightAt(-60, 40) - terrainHeightAt(-60, -40)).toBeGreaterThan(5);
      expect(pieces).toBeGreaterThan(40);
      setActiveMap(TEST_MAP);
    });
  }

  it('the open gates are drawn as their models', () => {
    const map = fences([]);
    setActiveMap(map);
    const layer = new BattleMapLayer(map);
    const placements = (layer as unknown as { placements: ModelPlacements }).placements;
    const names = [...(placements as unknown as { matrices: Map<string, THREE.Matrix4[]> }).matrices.keys()];
    for (const gate of GATES) expect(names).toContain(gate);
    setActiveMap(TEST_MAP);
  });
});
