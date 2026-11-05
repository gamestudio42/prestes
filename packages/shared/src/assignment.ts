import type { Vec2 } from './protocol';

/**
 * Minimum-cost assignment (Hungarian algorithm, O(n²m)) of `rows` to distinct
 * `columns`. Returns, for each row, the index of its column. Requires
 * rows <= columns. Deterministic: ties resolve by input order.
 */
export function minCostAssignment(cost: readonly (readonly number[])[]): number[] {
  const n = cost.length;
  if (n === 0) return [];
  const m = cost[0]!.length;
  if (m < n) {
    throw new Error('minCostAssignment needs at least as many columns as rows');
  }
  const INF = Number.POSITIVE_INFINITY;
  // 1-based potentials and matching, as in the classic formulation.
  const u = new Array<number>(n + 1).fill(0);
  const v = new Array<number>(m + 1).fill(0);
  const match = new Array<number>(m + 1).fill(0); // column -> row
  const way = new Array<number>(m + 1).fill(0);
  for (let row = 1; row <= n; row += 1) {
    match[0] = row;
    let column0 = 0;
    const minv = new Array<number>(m + 1).fill(INF);
    const used = new Array<boolean>(m + 1).fill(false);
    do {
      used[column0] = true;
      const row0 = match[column0]!;
      let delta = INF;
      let column1 = 0;
      for (let column = 1; column <= m; column += 1) {
        if (used[column]) continue;
        const current = cost[row0 - 1]![column - 1]! - u[row0]! - v[column]!;
        if (current < minv[column]!) {
          minv[column] = current;
          way[column] = column0;
        }
        if (minv[column]! < delta) {
          delta = minv[column]!;
          column1 = column;
        }
      }
      for (let column = 0; column <= m; column += 1) {
        if (used[column]) {
          u[match[column]!] = u[match[column]!]! + delta;
          v[column] = v[column]! - delta;
        } else {
          minv[column] = minv[column]! - delta;
        }
      }
      column0 = column1;
    } while (match[column0] !== 0);
    do {
      const column1 = way[column0]!;
      match[column0] = match[column1]!;
      column0 = column1;
    } while (column0 !== 0);
  }
  const result = new Array<number>(n).fill(-1);
  for (let column = 1; column <= m; column += 1) {
    if (match[column]! > 0) result[match[column]! - 1] = column - 1;
  }
  return result;
}

/**
 * Reorders `destinations` so that `destinations[i]` goes to `positions[i]`,
 * minimising the total straight-line distance. With Euclidean cost the
 * straight routes of an optimal assignment never cross. Extra destinations
 * beyond the number of positions are dropped; missing ones stay as given.
 */
/** Weight of the squared distance that breaks ties between equal-length layouts. */
const TIE_BREAK = 1e-4;

export function matchDestinations<T extends Vec2>(
  positions: readonly Vec2[],
  destinations: readonly T[],
): T[] {
  if (positions.length <= 1 || destinations.length < positions.length) {
    return [...destinations];
  }
  const cost = positions.map((position) =>
    destinations.map((destination) => {
      const squared = (destination.x - position.x) ** 2 + (destination.y - position.y) ** 2;
      // Soldiers moving along their own line tie on total distance whatever
      // the order; a small squared term breaks the tie toward keeping the
      // order, so no one overtakes a mate on the same line and collides.
      // Round so floating noise cannot flip ties between equal layouts.
      return Math.round((Math.sqrt(squared) + squared * TIE_BREAK) * 1000) / 1000;
    }),
  );
  const assignment = minCostAssignment(cost);
  return assignment.map((column) => destinations[column]!);
}
