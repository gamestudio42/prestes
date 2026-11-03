export interface TargetableUnit {
  id: number;
  x: number;
  y: number;
}

/**
 * Suppressive fire covers the whole troop: each attacker takes the nearest
 * target that still has room, so no target gets more than ceil(attackers /
 * targets) shooters. Ties break by id for determinism.
 */
export function spreadTargetGroups(
  attackers: readonly TargetableUnit[],
  targets: readonly TargetableUnit[],
): Map<number, number[]> {
  const groups = new Map<number, number[]>();
  if (targets.length === 0) {
    return groups;
  }
  const capacity = Math.ceil(attackers.length / targets.length);
  const pairs = attackers
    .flatMap((attacker) =>
      targets.map((target) => ({
        attacker: attacker.id,
        target: target.id,
        distance: (target.x - attacker.x) ** 2 + (target.y - attacker.y) ** 2,
      })),
    )
    .sort((left, right) => left.distance - right.distance || left.attacker - right.attacker || left.target - right.target);
  const assigned = new Set<number>();
  for (const pair of pairs) {
    const group = groups.get(pair.target) ?? [];
    if (assigned.has(pair.attacker) || group.length >= capacity) {
      continue;
    }
    group.push(pair.attacker);
    groups.set(pair.target, group);
    assigned.add(pair.attacker);
  }
  return groups;
}

export function nearestTargetGroups(
  attackers: readonly TargetableUnit[],
  targets: readonly TargetableUnit[],
): Map<number, number[]> {
  const groups = new Map<number, number[]>();
  if (targets.length === 0) {
    return groups;
  }
  for (const attacker of attackers) {
    let nearest = targets[0]!;
    let best = Number.POSITIVE_INFINITY;
    for (const target of targets) {
      const distance = (target.x - attacker.x) ** 2 + (target.y - attacker.y) ** 2;
      if (distance < best) {
        best = distance;
        nearest = target;
      }
    }
    const group = groups.get(nearest.id) ?? [];
    group.push(attacker.id);
    groups.set(nearest.id, group);
  }
  return groups;
}
