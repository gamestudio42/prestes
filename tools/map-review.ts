import { fileURLToPath } from 'node:url';
import {
  activeMapRuntime,
  allCoverSlots,
  battleMap,
  BATTLE_MAP_IDS,
  bridgePolygon,
  concealmentDistance,
  coverSlots,
  EYE_HEIGHTS,
  findPath,
  isDeepWater,
  isLineBlocked,
  isWalkable,
  setActiveMap,
  vegetationAt,
  type BattleMap,
  type Vec2,
} from '../packages/shared/src';

/**
 * refine-battle-maps 1.1: a per-map review of the built-in battle maps.
 * Prints Markdown (a table per map plus detail lists for what it flags),
 * ready to paste into docs/maps/REVIEW.md.
 *
 *   pnpm exec tsx tools/map-review.ts [--map <id>]
 *
 * Checks: reachability (flood fill), spawns and cover slots on walkable
 * ground, crossings (width, blockers, a path), lines of fire per zone, cover
 * density and open stretches on the attack axis, crop edges against the
 * game's concealment rule, props out of bounds or over water.
 */

type Row = { check: string; result: string; flag: boolean; details: string[] };

const MIN_AREA = 20;
const CROSSING_MIN_WIDTH = 4;
const CROSSING_CLEARANCE = 3;
/** refine-battle-maps 5.7: no lane of the attack axis may run longer than this without cover (m). */
export const OPEN_STRETCH = 60;
const COVER_REACH = 10;
/** Detail lines printed per flagged check (the count is in the table). */
const DETAIL_LIMIT = 12;

const fmt = (n: number, digits = 1): string => n.toFixed(digits);
const pct = (n: number, total: number): string => (total === 0 ? 'n/a' : `${fmt((100 * n) / total, 0)} %`);
const pt = (p: Vec2): string => `(${fmt(p.x, 0)}, ${fmt(p.y, 0)})`;

function centroid(points: readonly Vec2[]): Vec2 {
  return {
    x: points.reduce((sum, p) => sum + p.x, 0) / points.length,
    y: points.reduce((sum, p) => sum + p.y, 0) / points.length,
  };
}

function unit(from: Vec2, to: Vec2): Vec2 {
  const length = Math.hypot(to.x - from.x, to.y - from.y) || 1;
  return { x: (to.x - from.x) / length, y: (to.y - from.y) / length };
}

/** The path grid's extent, as setActiveMapRuntime derives it. */
function gridRange(map: BattleMap): { min: number; max: number } {
  return {
    min: Math.max(map.bounds.minX, map.bounds.minY),
    max: Math.min(map.bounds.maxX, map.bounds.maxY),
  };
}

function walkableAt(map: BattleMap, x: number, y: number): boolean {
  return isWalkable(x, y, map.covers);
}

// ---------------------------------------------------------------- reachability

function reachability(map: BattleMap): { rows: Row[]; reached: Uint8Array; range: { min: number; max: number } } {
  const range = gridRange(map);
  const size = range.max - range.min + 1;
  const walk = new Uint8Array(size * size);
  for (let j = 0; j < size; j += 1) {
    for (let i = 0; i < size; i += 1) walk[j * size + i] = walkableAt(map, range.min + i, range.min + j) ? 1 : 0;
  }
  const reached = new Uint8Array(size * size);
  const queue: number[] = [];
  const seed = (p: Vec2): void => {
    const i = Math.round(p.x) - range.min;
    const j = Math.round(p.y) - range.min;
    if (i < 0 || j < 0 || i >= size || j >= size) return;
    // The nearest walkable cell, if the point itself is blocked.
    for (let r = 0; r <= 3; r += 1) {
      for (let dj = -r; dj <= r; dj += 1) {
        for (let di = -r; di <= r; di += 1) {
          const ni = i + di;
          const nj = j + dj;
          if (ni < 0 || nj < 0 || ni >= size || nj >= size) continue;
          const index = nj * size + ni;
          if (walk[index] && !reached[index]) {
            reached[index] = 1;
            queue.push(index);
            return;
          }
          if (walk[index]) return;
        }
      }
    }
  };
  for (const zone of [map.deployment.column, map.deployment.legalist]) zone.sections.forEach(seed);
  // A ferry is a way across too: its landings seed the far bank.
  for (const ferry of map.ferries) {
    seed(ferry.landingA);
    seed(ferry.landingB);
  }
  const flood = (): void => {
    while (queue.length > 0) {
      const index = queue.pop()!;
      const i = index % size;
      const j = (index - i) / size;
      for (let dj = -1; dj <= 1; dj += 1) {
        for (let di = -1; di <= 1; di += 1) {
          if (di === 0 && dj === 0) continue;
          const ni = i + di;
          const nj = j + dj;
          if (ni < 0 || nj < 0 || ni >= size || nj >= size) continue;
          const next = nj * size + ni;
          if (!walk[next] || reached[next]) continue;
          // No squeezing diagonally between two blocked cells.
          if (di !== 0 && dj !== 0 && (!walk[j * size + ni] || !walk[nj * size + i])) continue;
          reached[next] = 1;
          queue.push(next);
        }
      }
    }
  };
  flood();

  const seen = new Uint8Array(size * size);
  const islands: { cells: number; box: string; centre: Vec2; yard: boolean }[] = [];
  let walkCells = 0;
  let reachedCells = 0;
  for (let k = 0; k < walk.length; k += 1) {
    if (walk[k]) walkCells += 1;
    if (reached[k]) reachedCells += 1;
  }
  for (let start = 0; start < walk.length; start += 1) {
    if (!walk[start] || reached[start] || seen[start]) continue;
    const stack = [start];
    seen[start] = 1;
    let cells = 0;
    let sx = 0;
    let sy = 0;
    let minI = size;
    let maxI = 0;
    let minJ = size;
    let maxJ = 0;
    while (stack.length > 0) {
      const index = stack.pop()!;
      const i = index % size;
      const j = (index - i) / size;
      cells += 1;
      sx += i;
      sy += j;
      minI = Math.min(minI, i);
      maxI = Math.max(maxI, i);
      minJ = Math.min(minJ, j);
      maxJ = Math.max(maxJ, j);
      for (let dj = -1; dj <= 1; dj += 1) {
        for (let di = -1; di <= 1; di += 1) {
          if (di === 0 && dj === 0) continue;
          const ni = i + di;
          const nj = j + dj;
          if (ni < 0 || nj < 0 || ni >= size || nj >= size) continue;
          const next = nj * size + ni;
          if (!walk[next] || reached[next] || seen[next]) continue;
          if (di !== 0 && dj !== 0 && (!walk[j * size + ni] || !walk[nj * size + i])) continue;
          seen[next] = 1;
          stack.push(next);
        }
      }
    }
    if (cells > MIN_AREA) {
      const centre = { x: range.min + sx / cells, y: range.min + sy / cells };
      islands.push({
        cells,
        centre,
        box: `x ${range.min + minI}..${range.min + maxI}, y ${range.min + minJ}..${range.min + maxJ}`,
        yard: (map.yards ?? []).some((yard) => polygonContains(yard, centre)),
      });
    }
  }
  islands.sort((a, b) => b.cells - a.cells);

  const rows: Row[] = [
    {
      check: 'Reachability (flood fill)',
      result: `${pct(reachedCells, walkCells)} of ${walkCells} walkable cells reached; ${islands.length} unreachable area(s) > ${MIN_AREA} m2`,
      flag: islands.length > 0,
      details: islands.map(
        (island) =>
          `unreachable ${island.cells} m2, centroid ${pt(island.centre)}, ${island.box}${island.yard ? ' (inside a yard)' : ''}`,
      ),
    },
  ];
  const yards = map.yards ?? [];
  if (yards.length > 0) {
    let open = 0;
    const closed: string[] = [];
    for (const yard of yards) {
      const c = centroid(yard);
      const i = Math.round(c.x) - range.min;
      const j = Math.round(c.y) - range.min;
      const inside = (di: number, dj: number): boolean => {
        const index = (j + dj) * size + (i + di);
        return reached[index] === 1;
      };
      let ok = false;
      for (let dj = -2; dj <= 2 && !ok; dj += 1) for (let di = -2; di <= 2 && !ok; di += 1) ok = inside(di, dj);
      if (ok) open += 1;
      else closed.push(`yard at ${pt(c)} not reached`);
    }
    rows.push({
      check: 'Yards (quintais) reachable',
      result: `${open} of ${yards.length} reachable`,
      flag: closed.length > 0,
      details: closed,
    });
  }
  return { rows, reached, range };
}

function polygonContains(polygon: readonly Vec2[], p: Vec2): boolean {
  let inside = false;
  for (let a = 0, b = polygon.length - 1; a < polygon.length; b = a, a += 1) {
    const pa = polygon[a]!;
    const pb = polygon[b]!;
    if (pa.y > p.y !== pb.y > p.y && p.x < ((pb.x - pa.x) * (p.y - pa.y)) / (pb.y - pa.y) + pa.x) inside = !inside;
  }
  return inside;
}

// ------------------------------------------------------------- spawns & slots

function spawnsAndSlots(map: BattleMap): Row[] {
  const bad: string[] = [];
  let spawns = 0;
  for (const [side, zone] of [
    ['column', map.deployment.column],
    ['legalist', map.deployment.legalist],
  ] as const) {
    zone.sections.forEach((p, index) => {
      spawns += 1;
      if (!walkableAt(map, p.x, p.y)) bad.push(`${side} section ${index + 1} at ${pt(p)} is not walkable`);
    });
  }
  const slots = allCoverSlots(map.covers);
  const slotBad: string[] = [];
  for (const slot of slots) {
    if (!walkableAt(map, slot.x, slot.y)) slotBad.push(`cover ${slot.coverId} slot ${slot.id} at (${fmt(slot.x)}, ${fmt(slot.y)})`);
  }
  const raw = map.covers.reduce((sum, cover) => sum + coverSlots(cover).length, 0);
  return [
    { check: 'Deployment points walkable', result: `${spawns - bad.length} of ${spawns} walkable`, flag: bad.length > 0, details: bad },
    {
      check: 'Cover slots walkable',
      result: `${slots.length - slotBad.length} of ${slots.length} walkable (${raw - slots.length} of ${raw} raw slots already dropped by the engine's filter)`,
      flag: slotBad.length > 0,
      details: slotBad.slice(0, 30),
    },
  ];
}

// ------------------------------------------------------------------ crossings

interface Crossing {
  label: string;
  a: Vec2;
  b: Vec2;
  /** Outward direction at each end (away from the crossing). */
  outA: Vec2;
  outB: Vec2;
}

function crossings(map: BattleMap): Crossing[] {
  const list: Crossing[] = [];
  for (const bridge of map.bridges) {
    const poly = bridgePolygon(bridge);
    const mid = (p: Vec2, q: Vec2): Vec2 => ({ x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 });
    const a = mid(poly[0]!, poly[1]!);
    const b = mid(poly[2]!, poly[3]!);
    list.push({ label: `bridge ${bridge.id}`, a, b, outA: unit(b, a), outB: unit(a, b) });
  }
  for (const ferry of map.ferries) {
    list.push({
      label: `ferry ${ferry.id}`,
      a: ferry.landingA,
      b: ferry.landingB,
      outA: unit(ferry.landingB, ferry.landingA),
      outB: unit(ferry.landingA, ferry.landingB),
    });
  }
  map.water.forEach((water, index) => {
    if (water.kind === 'ford' && water.ends) {
      const [a, b] = water.ends;
      list.push({ label: `ford ${index}`, a, b, outA: unit(b, a), outB: unit(a, b) });
    }
  });
  return list;
}

/** Walkable width across the approach at `at`, perpendicular to `out` (contiguous, 0.5 m steps). */
function approachWidth(map: BattleMap, at: Vec2, out: Vec2): number {
  const side = { x: -out.y, y: out.x };
  let width = 0;
  for (const sign of [1, -1]) {
    for (let d = 0; d <= 12; d += 0.5) {
      if (!walkableAt(map, at.x + side.x * d * sign, at.y + side.y * d * sign)) break;
      width = d === 0 ? width : width + 0.5;
    }
  }
  return width + 0.5;
}

/** 16 unit directions (no trigonometry: the lint rule restricts it here). */
const RING: readonly Vec2[] = (() => {
  const quarter = [
    [1, 0],
    [0.9239, 0.3827],
    [0.7071, 0.7071],
    [0.3827, 0.9239],
  ] as const;
  const out: Vec2[] = [];
  for (const [x, y] of quarter) out.push({ x, y });
  for (const [x, y] of quarter) out.push({ x: -y, y: x });
  for (const [x, y] of quarter) out.push({ x: -x, y: -y });
  for (const [x, y] of quarter) out.push({ x: y, y: -x });
  return out;
})();

function nearestBlocker(map: BattleMap, at: Vec2): number {
  for (let r = 0.5; r <= CROSSING_CLEARANCE; r += 0.5) {
    for (const d of RING) {
      const x = at.x + d.x * r;
      const y = at.y + d.y * r;
      if (!walkableAt(map, x, y) && !isDeepWater(x, y)) return r;
    }
  }
  return Number.POSITIVE_INFINITY;
}

function crossingRows(map: BattleMap): Row[] {
  const list = crossings(map);
  if (list.length === 0) return [{ check: 'Crossings', result: 'none on this map', flag: false, details: [] }];
  const details: string[] = [];
  let flagged = 0;
  const summary: string[] = [];
  for (const crossing of list) {
    const notes: string[] = [];
    for (const [name, end, out] of [
      ['end A', crossing.a, crossing.outA],
      ['end B', crossing.b, crossing.outB],
    ] as const) {
      const approach = { x: end.x + out.x * 4, y: end.y + out.y * 4 };
      const width = approachWidth(map, approach, out);
      const blocker = nearestBlocker(map, end);
      if (width < CROSSING_MIN_WIDTH) notes.push(`${name} ${pt(end)}: approach width ${fmt(width)} m < ${CROSSING_MIN_WIDTH}`);
      if (blocker <= CROSSING_CLEARANCE) notes.push(`${name} ${pt(end)}: blocker ${fmt(blocker)} m from the end`);
      summary.push(`${crossing.label} ${name}: ${fmt(width)} m wide, ${blocker === Infinity ? 'clear' : `blocker ${fmt(blocker)} m`}`);
    }
    const path = findPath(crossing.a, crossing.b, map.covers);
    const last = path[path.length - 1];
    const ok = path.length > 0 && last !== undefined && Math.hypot(last.x - crossing.b.x, last.y - crossing.b.y) <= 2;
    if (!ok) notes.push(`no path from ${pt(crossing.a)} to ${pt(crossing.b)}`);
    if (notes.length > 0) flagged += 1;
    details.push(...notes.map((note) => `${crossing.label}: ${note}`));
  }
  return [
    {
      check: 'Crossings (width >= 4 m, clear 3 m, pathable)',
      result: `${list.length} crossing(s), ${flagged} flagged; ${summary.join('; ')}`,
      flag: flagged > 0,
      details,
    },
  ];
}

// --------------------------------------------------------------- sight matrix

function axisOf(map: BattleMap): { a: Vec2; b: Vec2; dir: Vec2; length: number } {
  const a = centroid(map.deployment.column.sections);
  const b = centroid(map.deployment.legalist.sections);
  return { a, b, dir: unit(a, b), length: Math.hypot(b.x - a.x, b.y - a.y) };
}

function sightRows(map: BattleMap): Row[] {
  const { a, dir, length } = axisOf(map);
  const mid: Vec2[] = [];
  const step = 10;
  for (let x = Math.ceil(map.bounds.minX / step) * step; x <= map.bounds.maxX; x += step) {
    for (let y = Math.ceil(map.bounds.minY / step) * step; y <= map.bounds.maxY; y += step) {
      const t = ((x - a.x) * dir.x + (y - a.y) * dir.y) / length;
      if (t < 0.25 || t > 0.75) continue;
      if (!walkableAt(map, x, y)) continue;
      mid.push({ x, y });
    }
  }
  const rows: Row[] = [];
  for (const [side, zone] of [
    ['column', map.deployment.column],
    ['legalist', map.deployment.legalist],
  ] as const) {
    let open = 0;
    let total = 0;
    for (const from of zone.sections) {
      for (const to of mid) {
        total += 1;
        if (!isLineBlocked(from.x, from.y, to.x, to.y, map.covers, map.sightObstacles, EYE_HEIGHTS.standing)) open += 1;
      }
    }
    const share = total === 0 ? 0 : (100 * open) / total;
    const flag = total > 0 && (share > 80 || share < 10);
    rows.push({
      check: `Lines of fire, ${side} zone`,
      result: `${fmt(share, 0)} % open (${open} of ${total} lines to ${mid.length} midfield points)`,
      flag,
      details: flag ? [`${side}: ${share > 80 ? 'fully open (> 80 %)' : 'fully closed (< 10 %)'}`] : [],
    });
  }
  return rows;
}

// -------------------------------------------------------------- cover density

/** The lanes probed, offset (m) to either side of the attack axis. */
const LANES = [-40, -20, 0, 20, 40] as const;

export interface OpenStretch {
  /** The lane's offset from the axis (m). */
  offset: number;
  /** The lane's longest run (m) with no cover slot within COVER_REACH. */
  longest: number;
  from: Vec2;
  to: Vec2;
}

/**
 * Along five lanes parallel to the axis between the two deployment zones,
 * the longest run with no cover slot within COVER_REACH m of the lane.
 */
export function openStretches(map: BattleMap): OpenStretch[] {
  const slots = allCoverSlots(map.covers);
  const { a, b, dir } = axisOf(map);
  const side = { x: -dir.y, y: dir.x };
  return LANES.map((offset) => {
    const start = { x: a.x + side.x * offset, y: a.y + side.y * offset };
    const end = { x: b.x + side.x * offset, y: b.y + side.y * offset };
    const length = Math.hypot(end.x - start.x, end.y - start.y);
    let runStart = 0;
    let longest = 0;
    let longestAt = 0;
    for (let d = 0; d <= length; d += 2) {
      const x = start.x + dir.x * d;
      const y = start.y + dir.y * d;
      if (slots.some((slot) => (slot.x - x) ** 2 + (slot.y - y) ** 2 <= COVER_REACH ** 2)) {
        runStart = d + 2;
      } else if (d - runStart + 2 > longest) {
        longest = d - runStart + 2;
        longestAt = runStart;
      }
    }
    return {
      offset,
      longest,
      from: { x: start.x + dir.x * longestAt, y: start.y + dir.y * longestAt },
      to: { x: start.x + dir.x * (longestAt + longest), y: start.y + dir.y * (longestAt + longest) },
    };
  });
}

function coverRows(map: BattleMap): Row[] {
  const slots = allCoverSlots(map.covers);
  const cellSize = 50;
  const columns = Math.ceil((map.bounds.maxX - map.bounds.minX) / cellSize);
  const rowsCount = Math.ceil((map.bounds.maxY - map.bounds.minY) / cellSize);
  const counts = new Array<number>(columns * rowsCount).fill(0);
  for (const slot of slots) {
    const i = Math.floor((slot.x - map.bounds.minX) / cellSize);
    const j = Math.floor((slot.y - map.bounds.minY) / cellSize);
    if (i >= 0 && j >= 0 && i < columns && j < rowsCount) counts[j * columns + i]! += 1;
  }
  const empty = counts.filter((n) => n === 0).length;
  const mean = counts.reduce((sum, n) => sum + n, 0) / counts.length;
  const max = Math.max(...counts);

  const { a, b } = axisOf(map);
  const stretches = openStretches(map);
  const worst = Math.max(0, ...stretches.map((stretch) => stretch.longest));
  const details = stretches
    .filter((stretch) => stretch.longest > OPEN_STRETCH)
    .map(
      (stretch) =>
        `lane ${stretch.offset >= 0 ? '+' : ''}${stretch.offset} m: ${stretch.longest} m without a slot within ${COVER_REACH} m, ${pt(stretch.from)} to ${pt(stretch.to)}`,
    );
  const lanes = LANES;
  return [
    {
      check: 'Cover density (slots per 50 m cell)',
      result: `${slots.length} slots; mean ${fmt(mean)}, max ${max}, ${empty} of ${counts.length} cells empty`,
      flag: false,
      details: [],
    },
    {
      check: `Open stretches on the attack axis (> ${OPEN_STRETCH} m)`,
      result: `longest ${fmt(worst, 0)} m over ${lanes.length} lanes (axis length ${fmt(Math.hypot(b.x - a.x, b.y - a.y), 0)} m)`,
      flag: details.length > 0,
      details,
    },
  ];
}

// ---------------------------------------------------------------- crop edges

const CROP_KINDS = ['cane', 'corn', 'scrub', 'tall-grass'] as const;

function cropRows(map: BattleMap): Row[] {
  const runtime = activeMapRuntime();
  if (!runtime) return [{ check: 'Crop edges', result: 'no runtime', flag: false, details: [] }];
  const distances = [10, 30, 60];
  const rows: Row[] = [];
  const crouchedEye = EYE_HEIGHTS.crouched;
  for (const kind of CROP_KINDS) {
    const areas = map.vegetation.filter((area) => area.kind === kind);
    if (areas.length === 0) continue;
    const seen = distances.map(() => 0);
    const tried = distances.map(() => 0);
    const details: string[] = [];
    let probes = 0;
    for (const area of areas) {
      const points = area.polygon;
      for (let index = 0; index < points.length; index += 1) {
        const p = points[index]!;
        const q = points[(index + 1) % points.length]!;
        const edgeLength = Math.hypot(q.x - p.x, q.y - p.y);
        if (edgeLength < 1) continue;
        const along = unit(p, q);
        const normal = { x: -along.y, y: along.x };
        const samples = Math.max(1, Math.min(4, Math.floor(edgeLength / 20)));
        for (let s = 0; s < samples; s += 1) {
          const f = (s + 0.5) / samples;
          const edge = { x: p.x + (q.x - p.x) * f, y: p.y + (q.y - p.y) * f };
          // Inside: the normal side where the vegetation is of this kind.
          let inward = 1;
          if (vegetationAt(edge.x + normal.x, edge.y + normal.y) !== kind) inward = -1;
          const target = { x: edge.x + normal.x * inward, y: edge.y + normal.y * inward };
          if (vegetationAt(target.x, target.y) !== kind) continue;
          const outward = { x: -normal.x * inward, y: -normal.y * inward };
          const conceal = concealmentDistance(runtime, target.x, target.y, 'crouched', false);
          probes += 1;
          distances.forEach((distance, k) => {
            const observer = { x: edge.x + outward.x * distance, y: edge.y + outward.y * distance };
            if (!walkableAt(map, observer.x, observer.y) || observer.x < map.bounds.minX || observer.x > map.bounds.maxX || observer.y < map.bounds.minY || observer.y > map.bounds.maxY) return;
            tried[k]! += 1;
            const distanceToTarget = distance + 1;
            const hidden = conceal !== null && distanceToTarget > conceal;
            const blocked = isLineBlocked(observer.x, observer.y, target.x, target.y, map.covers, map.sightObstacles, EYE_HEIGHTS.standing, crouchedEye);
            if (!hidden && !blocked) seen[k]! += 1;
          });
        }
      }
    }
    const conceal = concealmentDistance(runtime, areas[0]!.polygon[0]!.x, areas[0]!.polygon[0]!.y, 'crouched', false);
    const cells = distances.map((distance, k) => `${distance} m ${pct(seen[k]!, tried[k]!)}`).join(', ');
    const noHide = tried[1]! > 0 && seen[1]! === tried[1]!;
    if (noHide) details.push(`${kind}: a crouched man at the edge is seen at 30 m in every probe (conceals crouched only within the rule's distance)`);
    rows.push({
      check: `Crop edge: ${kind} (${areas.length} area(s), ${probes} probes)`,
      result: `seen at ${cells}${conceal === null ? '' : ` (crouched concealment ${conceal} m)`}`,
      flag: noHide,
      details,
    });
  }
  if (rows.length === 0) rows.push({ check: 'Crop edges', result: 'no vegetation areas', flag: false, details: [] });
  return rows;
}

// --------------------------------------------------------------------- props

function propRows(map: BattleMap): Row[] {
  const bad: string[] = [];
  for (const prop of map.props) {
    const outside = prop.x < map.bounds.minX || prop.x > map.bounds.maxX || prop.y < map.bounds.minY || prop.y > map.bounds.maxY;
    if (outside) bad.push(`${prop.model} at ${pt(prop)} is outside the bounds`);
    else if (isDeepWater(prop.x, prop.y)) bad.push(`${prop.model} at ${pt(prop)} is over deep water`);
  }
  return [
    {
      check: 'Props in bounds and off deep water',
      result: `${map.props.length - bad.length} of ${map.props.length} fine`,
      flag: bad.length > 0,
      details: bad,
    },
  ];
}

// ---------------------------------------------------------------------- main

function review(map: BattleMap): string {
  setActiveMap(map);
  const reach = reachability(map);
  const rows: Row[] = [
    ...reach.rows,
    ...spawnsAndSlots(map),
    ...crossingRows(map),
    ...sightRows(map),
    ...coverRows(map),
    ...cropRows(map),
    ...propRows(map),
  ];
  const lines = [`## ${map.id}`, '', '| Check | Result | Flag |', '| --- | --- | --- |'];
  for (const row of rows) lines.push(`| ${row.check} | ${row.result.replace(/\|/g, '/')} | ${row.flag ? 'FLAG' : 'ok'} |`);
  const flagged = rows.filter((row) => row.flag && row.details.length > 0);
  if (flagged.length > 0) {
    lines.push('', '### Flagged');
    for (const row of flagged) {
      lines.push('', `**${row.check}**`, '');
      for (const detail of row.details.slice(0, DETAIL_LIMIT)) lines.push(`- ${detail}`);
      if (row.details.length > DETAIL_LIMIT) lines.push(`- ... and ${row.details.length - DETAIL_LIMIT} more`);
    }
  }
  return lines.join('\n');
}

function main(): void {
  const argument = process.argv.indexOf('--map');
  const only = argument >= 0 ? process.argv[argument + 1] : undefined;
  const ids = only ? [only] : [...BATTLE_MAP_IDS];
  const started = Date.now();
  const out = ['# Map review', '', 'Generated by `tools/map-review.ts`.', ''];
  for (const id of ids) {
    out.push(review(battleMap(id)), '');
  }
  out.push(`_Ran in ${fmt((Date.now() - started) / 1000)} s._`);
  console.log(out.join('\n'));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main();
