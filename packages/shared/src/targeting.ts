export interface TargetableUnit {
  id: number;
  x: number;
  y: number;
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
