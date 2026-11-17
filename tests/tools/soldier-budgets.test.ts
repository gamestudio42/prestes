import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { MeshoptDecoder } from 'meshoptimizer';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { soldierTriangleProblems, soldierTriangles } from '../../tools/soldier-budgets';
import { meshTriangles } from '../../tools/tree-budgets';

// improve-soldier-models 3.3: the near and far triangle budgets fail the build.

describe('soldier triangle budgets', () => {
  it('passes the shipped soldier', async () => {
    await MeshoptDecoder.ready;
    const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.decoder': MeshoptDecoder });
    const document = await io.read(fileURLToPath(new URL('../../apps/game/public/models/soldier.glb', import.meta.url)));
    expect(soldierTriangleProblems(meshTriangles(document))).toEqual([]);
    expect(soldierTriangles(meshTriangles(document))).toEqual({ near: 1646, far: 264 });
  });

  it('counts the soldier dressed in full, as the Blender build does', () => {
    expect(soldierTriangles([{ name: 'Soldier', triangles: 1200 }, { name: 'Kepi', triangles: 60 }, { name: 'Slouch', triangles: 90 }, { name: 'GearCanteen', triangles: 40 }, { name: 'GearBlanket', triangles: 50 }, { name: 'SoldierFar', triangles: 200 }, { name: 'SlouchFar', triangles: 40 }])).toEqual({ near: 1380, far: 240 });
  });

  it('fails a fixture over either limit, or with a body missing, and names it', () => {
    expect(soldierTriangleProblems([{ name: 'Soldier', triangles: 2900 }, { name: 'Kepi', triangles: 101 }, { name: 'SoldierFar', triangles: 560 }, { name: 'KepiFar', triangles: 41 }])).toEqual([
      'near soldier: 3001 triangles, outside 1500-3000',
      'far soldier: 601 triangles, over the far budget of 600',
    ]);
    expect(soldierTriangleProblems([{ name: 'Soldier', triangles: 1200 }, { name: 'SoldierFar', triangles: 300 }])).toEqual(['near soldier: 1200 triangles, outside 1500-3000']);
    expect(soldierTriangleProblems([{ name: 'Soldier', triangles: 2000 }])).toEqual(['soldier: no near or no far body (Soldier, SoldierFar)']);
  });
});
