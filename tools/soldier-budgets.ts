import type { TreeMesh } from './tree-budgets';

/**
 * improve-soldier-models 3.3 (D8): the soldier's triangle budgets, checked
 * by `pnpm models` beside the tree budgets, counted as the Blender build
 * counts them (`check_triangles` in `target_soldier.py`): the near soldier
 * dressed in full (body, heaviest hat, every piece of gear) between 1,500
 * and 3,000 triangles; the far soldier (far body and heaviest far hat) at
 * most 600.
 */
export const SOLDIER_TRIANGLES = { nearMin: 1500, nearMax: 3000, far: 600 } as const;
export const SOLDIER_HATS = ['Slouch', 'Kepi', 'LeatherHat', 'Halfmoon'] as const;

type Counted = Pick<TreeMesh, 'name' | 'triangles'>;

export function soldierTriangles(meshes: readonly Counted[]): { near: number; far: number } | null {
  const count = (name: string) => meshes.find((mesh) => mesh.name === name)?.triangles;
  const body = count('Soldier');
  const farBody = count('SoldierFar');
  if (body === undefined || farBody === undefined) return null;
  const hat = Math.max(0, ...SOLDIER_HATS.map((name) => count(name) ?? 0));
  const farHat = Math.max(0, ...SOLDIER_HATS.map((name) => count(`${name}Far`) ?? 0));
  const gear = meshes.filter((mesh) => mesh.name.startsWith('Gear')).reduce((sum, mesh) => sum + mesh.triangles, 0);
  return { near: body + hat + gear, far: farBody + farHat };
}

export function soldierTriangleProblems(meshes: readonly Counted[]): string[] {
  const counts = soldierTriangles(meshes);
  if (!counts) return ['soldier: no near or no far body (Soldier, SoldierFar)'];
  const problems: string[] = [];
  if (counts.near < SOLDIER_TRIANGLES.nearMin || counts.near > SOLDIER_TRIANGLES.nearMax)
    problems.push(`near soldier: ${counts.near} triangles, outside ${SOLDIER_TRIANGLES.nearMin}-${SOLDIER_TRIANGLES.nearMax}`);
  if (counts.far > SOLDIER_TRIANGLES.far) problems.push(`far soldier: ${counts.far} triangles, over the far budget of ${SOLDIER_TRIANGLES.far}`);
  return problems;
}
