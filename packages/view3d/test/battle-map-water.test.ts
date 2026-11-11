import { afterEach, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { battleMap, distanceToPolyline, setActiveMap } from '@prestes/shared';
import { BattleMapLayer } from '../src/battle-map-layer';
import { TEST_MAP } from '../../shared/test/fixtures/test-map';

// refine-map-editor 4.2: water drawn inside traced outlines.
afterEach(() => setActiveMap(TEST_MAP));

describe('battle map water', () => {
  it('the test map stream is drawn inside its bank line', () => {
    const map = battleMap('campo-de-provas');
    setActiveMap(map);
    const layer = new BattleMapLayer(map);
    const meshes: THREE.Mesh[] = [];
    layer.group.traverse((object) => {
      if (object instanceof THREE.Mesh && object.name === 'water:deep') meshes.push(object);
    });
    expect(meshes.length).toBeGreaterThan(0);
    // Every vertex is inside the river or on its bank, never a cell's width off it.
    for (const position of meshes.map((mesh) => mesh.geometry.getAttribute('position'))) for (let index = 0; index < position.count; index += 1) {
      const x = position.getX(index);
      const y = position.getZ(index);
      if (Math.abs(x) > 195 || Math.abs(y) > 195) continue;
      const nearest = Math.min(
        ...map.water.filter((area) => area.kind === 'deep' && area.strip).map((area) => distanceToPolyline(x, y, area.strip!.points) - area.strip!.width / 2),
      );
      expect(nearest).toBeLessThan(0.06);
    }
  });
});
