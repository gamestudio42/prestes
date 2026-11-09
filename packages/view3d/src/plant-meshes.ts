import * as THREE from 'three';
import { pointInPolygon, plantableAt, VEGETATION_KINDS, type BattleMap, type Polygon, type VegetationKind } from '@prestes/shared';
import { toon } from './materials';
import { PALETTE } from './palette';

/**
 * refine-map-editor D1: plants as small code-built meshes, instanced, with a
 * vertex sway. Corn is a stalk with four drooping leaves and a tassel, cane
 * three stalk segments and two long leaves, capim a fan of blades, scrub a
 * low lumpy bush; none is a cone. Corn and cane stand in rows along each
 * field's main axis, fields thin out in their last metre, and at strategic
 * span a capped clump mesh (four plants in one) stands in for them.
 */

type Tri = [THREE.Vector3Tuple, THREE.Vector3Tuple, THREE.Vector3Tuple];

function geometryOf(triangles: readonly Tri[]): THREE.BufferGeometry {
  const positions = new Float32Array(triangles.length * 9);
  triangles.forEach((triangle, index) => triangle.forEach((vertex, corner) => positions.set(vertex, index * 9 + corner * 3)));
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

/** A flat quad from `a` to `b` (its centreline) `width` wide across `side`. */
function quad(a: THREE.Vector3Tuple, b: THREE.Vector3Tuple, width: number, side: THREE.Vector3Tuple, taper = 1): Tri[] {
  const h = width / 2;
  const t = (width * taper) / 2;
  const a0: THREE.Vector3Tuple = [a[0] - side[0] * h, a[1] - side[1] * h, a[2] - side[2] * h];
  const a1: THREE.Vector3Tuple = [a[0] + side[0] * h, a[1] + side[1] * h, a[2] + side[2] * h];
  const b0: THREE.Vector3Tuple = [b[0] - side[0] * t, b[1] - side[1] * t, b[2] - side[2] * t];
  const b1: THREE.Vector3Tuple = [b[0] + side[0] * t, b[1] + side[1] * t, b[2] + side[2] * t];
  return taper === 0 ? [[a0, a1, b]] : [[a0, a1, b1], [a0, b1, b0]];
}

/** A stalk as two crossed quads from `bottom` to `top` metres up. */
function stalk(bottom: number, top: number, width: number, lean: [number, number] = [0, 0]): Tri[] {
  const a: THREE.Vector3Tuple = [0, bottom, 0];
  const b: THREE.Vector3Tuple = [lean[0], top, lean[1]];
  return [...quad(a, b, width, [1, 0, 0], 0.7), ...quad(a, b, width, [0, 0, 1], 0.7)];
}

/** A leaf from the stalk at `height`, out `reach` metres toward `angle`, drooping `droop`. */
function leaf(height: number, angle: number, reach: number, droop: number, width: number): Tri[] {
  const dx = Math.cos(angle);
  const dz = Math.sin(angle);
  const mid: THREE.Vector3Tuple = [dx * reach * 0.55, height + droop * 0.2, dz * reach * 0.55];
  const tip: THREE.Vector3Tuple = [dx * reach, height - droop, dz * reach];
  const side: THREE.Vector3Tuple = [-dz, 0, dx];
  return [...quad([0, height, 0], mid, width, side, 0.9), ...quad(mid, tip, width * 0.9, side, 0)];
}

function corn(simple = false): Tri[] {
  const leaves = simple ? [0.9, 1.4] : [0.6, 0.9, 1.2, 1.5];
  return [
    ...stalk(0, 1.9, 0.07),
    ...leaves.flatMap((height, index) => leaf(height, index * 2.1 + 0.4, 0.5, 0.25, 0.1)),
    // The tassel: three spikes fanning from the top.
    ...(simple ? [] : [0, 2.1, 4.2].flatMap((angle) => quad([0, 1.88, 0], [Math.cos(angle) * 0.12, 2.12, Math.sin(angle) * 0.12], 0.05, [-Math.sin(angle), 0, Math.cos(angle)], 0))),
  ];
}

function cane(simple = false): Tri[] {
  return [
    ...stalk(0, 0.9, 0.08, [0.02, 0]),
    ...(simple ? [] : stalk(0.9, 1.8, 0.07, [0.05, 0.02])),
    ...stalk(simple ? 0.9 : 1.8, 2.5, 0.06, [0.08, 0.03]),
    ...leaf(1.6, 0.3, 0.95, 0.5, 0.09),
    ...leaf(2.0, 3.4, 0.85, 0.45, 0.08),
  ];
}

/** Capim: a fan of thin blades of varied length from one base (8-14 per clump; 10 here). */
function capim(simple = false): Tri[] {
  const blades = simple ? 5 : 10;
  const triangles: Tri[] = [];
  for (let index = 0; index < blades; index += 1) {
    const angle = (index / blades) * Math.PI * 2 + (index % 3) * 0.4;
    const length = 0.65 + ((index * 7) % 5) * 0.1;
    const lean = 0.18 + ((index * 3) % 4) * 0.06;
    const dx = Math.cos(angle);
    const dz = Math.sin(angle);
    triangles.push(...quad([dx * 0.03, 0, dz * 0.03], [dx * lean, length, dz * lean], 0.05, [-dz, 0, dx], 0));
  }
  return triangles;
}

/** Scrub: two squashed lumps. */
function scrub(simple = false): Tri[] {
  const lumps: Array<[number, number, number, number]> = simple ? [[0, 0.45, 0, 0.6]] : [[0, 0.45, 0, 0.55], [0.35, 0.35, 0.2, 0.4]];
  const triangles: Tri[] = [];
  for (const [x, y, z, size] of lumps) {
    const lump = new THREE.IcosahedronGeometry(size, 0).toNonIndexed();
    const position = lump.getAttribute('position');
    for (let index = 0; index < position.count; index += 3) {
      const at = (n: number): THREE.Vector3Tuple => [position.getX(n) + x, position.getY(n) * 0.75 + y, position.getZ(n) + z];
      triangles.push([at(index), at(index + 1), at(index + 2)]);
    }
  }
  return triangles;
}

const BUILDERS: Readonly<Record<VegetationKind, (simple?: boolean) => Tri[]>> = { corn, cane, 'tall-grass': capim, scrub };

const plantGeometries = new Map<string, THREE.BufferGeometry>();

/** One plant of a kind, at its nominal size (metres), base at the origin. */
export function plantGeometry(kind: VegetationKind): THREE.BufferGeometry {
  const key = `plant:${kind}`;
  let geometry = plantGeometries.get(key);
  if (!geometry) {
    geometry = geometryOf(BUILDERS[kind]());
    plantGeometries.set(key, geometry);
  }
  return geometry;
}

/** The strategic-span clump: four simplified plants in one mesh, about a metre across. */
export function clumpGeometry(kind: VegetationKind): THREE.BufferGeometry {
  const key = `clump:${kind}`;
  let geometry = plantGeometries.get(key);
  if (!geometry) {
    const spread = kind === 'scrub' ? 1.3 : 0.5;
    const offsets = [[-spread, -spread], [spread, -spread * 0.6], [-spread * 0.4, spread], [spread * 0.8, spread * 0.9]] as const;
    const one = BUILDERS[kind](true);
    geometry = geometryOf(offsets.flatMap(([ox, oz]) => one.map((tri) => tri.map(([x, y, z]) => [x + ox, y, z + oz]) as Tri)));
    plantGeometries.set(key, geometry);
  }
  return geometry;
}

/** Shared sway clock (seconds), advanced by the map layer each frame. */
export const PLANT_SWAY = { value: 0 };

/** The toon material with a gentle sway: tops move most, each instance on its own phase. */
export function swayingMaterial(amplitude: number): THREE.MeshToonMaterial {
  const material = toon({ color: 0xffffff, side: THREE.DoubleSide });
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uPlantTime = PLANT_SWAY;
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nuniform float uPlantTime;')
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
#ifdef USE_INSTANCING
  float plantPhase = fract(sin(float(gl_InstanceID) * 12.9898) * 43758.5453) * 6.2831;
#else
  float plantPhase = 0.0;
#endif
  float plantBend = max(transformed.y, 0.0) * ${amplitude.toFixed(3)};
  transformed.x += sin(uPlantTime * 1.3 + plantPhase) * plantBend;
  transformed.z += cos(uPlantTime * 1.1 + plantPhase) * plantBend * 0.7;`,
      );
  };
  material.customProgramCacheKey = () => `plant-sway-${amplitude}`;
  return material;
}

/** How each kind is laid out and coloured. */
export const PLANT_LOOK: Readonly<
  Record<VegetationKind, { along: number; across: number; rows: boolean; colors: number[]; sway: number; size: number }>
> = {
  corn: { along: 0.55, across: 0.9, rows: true, colors: [PALETTE.corn, PALETTE.corn, PALETTE.cornTassel], sway: 0.025, size: 1 },
  cane: { along: 0.55, across: 1.2, rows: true, colors: [PALETTE.cane, PALETTE.caneLight], sway: 0.03, size: 1 },
  'tall-grass': { along: 1.0, across: 1.0, rows: false, colors: [PALETTE.capim, PALETTE.grassLight, PALETTE.hay], sway: 0.05, size: 1 },
  scrub: { along: 2.6, across: 2.6, rows: false, colors: [PALETTE.scrub, PALETTE.leafDark, PALETTE.leaf], sway: 0.01, size: 1 },
};

/** At strategic span each kind shows at most this many clumps. */
export const STRATEGIC_CLUMP_CAP = 3000;

export interface PlantSpot {
  x: number;
  y: number;
  /** Turn about the vertical (radians, view convention). */
  turn: number;
  /** Size, height and colour draws for the plant (0 to 1), its own like its place. */
  size: number;
  stretch: number;
  shade: number;
}

/**
 * A plant's own random numbers, from the map seed, its kind and the grid
 * point it grows from (refine-map-editor 7.3: one stream for the whole map
 * moved every plant whenever a field or a bush was added).
 */
function spotRandom(seed: number, kind: number, x: number, y: number): () => number {
  let state = seed ^ Math.imul(kind + 1, 0x9e3779b1);
  state = Math.imul(state ^ Math.round(x * 100), 0x85ebca6b);
  state = Math.imul(state ^ Math.round(y * 100), 0xc2b2ae35);
  state ^= state >>> 16;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A field: a test for being inside it, its cells or polygon's extent, centre and main axis. */
interface Field {
  inside: (x: number, y: number) => boolean;
  /** Within a metre of the field's edge. */
  nearEdge: (x: number, y: number) => boolean;
  centre: { x: number; y: number };
  /** Unit vector along the rows. */
  axis: { x: number; y: number };
  /** Points spanning the field, for its extent along and across the axis. */
  extent: readonly { x: number; y: number }[];
}

/** The main axis of a point cloud (its principal component); x for a round one. */
function principalAxis(points: readonly { x: number; y: number }[]): { centre: { x: number; y: number }; axis: { x: number; y: number } } {
  let sx = 0;
  let sy = 0;
  for (const point of points) {
    sx += point.x;
    sy += point.y;
  }
  const centre = { x: sx / Math.max(1, points.length), y: sy / Math.max(1, points.length) };
  let xx = 0;
  let yy = 0;
  let xy = 0;
  for (const point of points) {
    const dx = point.x - centre.x;
    const dy = point.y - centre.y;
    xx += dx * dx;
    yy += dy * dy;
    xy += dx * dy;
  }
  const angle = Math.abs(xx - yy) < 1e-6 && Math.abs(xy) < 1e-6 ? 0 : 0.5 * Math.atan2(2 * xy, xx - yy);
  return { centre, axis: { x: Math.cos(angle), y: Math.sin(angle) } };
}

/** An authored map's fields of one kind: the connected cells of its vegetation raster. */
function rasterFields(map: BattleMap, kind: VegetationKind): Field[] {
  const raster = map.raster!;
  const code = VEGETATION_KINDS.indexOf(kind) + 1;
  // Cells an object conceals (a bush, a cactus, a tree's shade) show the object, not plants.
  const drawn = (index: number): boolean => !raster.objectCover?.[index];
  const side = Math.round(map.bounds.maxX - map.bounds.minX);
  const { minX, minY } = map.bounds;
  const cellAt = (x: number, y: number): number => {
    const cx = Math.floor(x - minX);
    const cy = Math.floor(y - minY);
    return cx < 0 || cy < 0 || cx >= side || cy >= side ? -1 : cy * side + cx;
  };
  const isCode = (x: number, y: number): boolean => {
    const index = cellAt(x, y);
    return index >= 0 && raster.vegetation[index] === code && drawn(index);
  };
  const seen = new Uint8Array(side * side);
  const fields: Field[] = [];
  for (let start = 0; start < seen.length; start += 1) {
    if (seen[start] || raster.vegetation[start] !== code || !drawn(start)) continue;
    const cells: { x: number; y: number }[] = [];
    const stack = [start];
    seen[start] = 1;
    while (stack.length > 0) {
      const index = stack.pop()!;
      const cx = index % side;
      const cy = Math.floor(index / side);
      cells.push({ x: minX + cx + 0.5, y: minY + cy + 0.5 });
      for (const [nx, ny] of [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]] as const) {
        if (nx < 0 || ny < 0 || nx >= side || ny >= side) continue;
        const next = ny * side + nx;
        if (seen[next] || raster.vegetation[next] !== code || !drawn(next)) continue;
        seen[next] = 1;
        stack.push(next);
      }
    }
    // Rows follow the field; capim and scrub stand on one grid for the whole map,
    // so a field's plants stay put when another field changes.
    const { centre, axis } = PLANT_LOOK[kind].rows ? principalAxis(cells) : { centre: { x: 0, y: 0 }, axis: { x: 1, y: 0 } };
    fields.push({
      inside: isCode,
      nearEdge: (x, y) => !isCode(x + 1, y) || !isCode(x - 1, y) || !isCode(x, y + 1) || !isCode(x, y - 1),
      centre,
      axis,
      extent: cells,
    });
  }
  return fields;
}

function distanceToEdge(x: number, y: number, polygon: Polygon): number {
  let best = Infinity;
  for (let index = 0; index < polygon.length; index += 1) {
    const a = polygon[index]!;
    const b = polygon[(index + 1) % polygon.length]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const length = dx * dx + dy * dy;
    const t = length === 0 ? 0 : Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / length));
    best = Math.min(best, Math.hypot(x - (a.x + dx * t), y - (a.y + dy * t)));
  }
  return best;
}

/** A hand-written map's fields of one kind: its polygons, clipped by where plants grow. */
function polygonFields(map: BattleMap, kind: VegetationKind): Field[] {
  return map.vegetation
    .filter((area) => area.kind === kind)
    .map((area) => {
      // The longest edge gives a box-like field its axis; its vertices its extent.
      let axis = { x: 1, y: 0 };
      let longest = 0;
      for (let index = 0; index < area.polygon.length; index += 1) {
        const a = area.polygon[index]!;
        const b = area.polygon[(index + 1) % area.polygon.length]!;
        const length = Math.hypot(b.x - a.x, b.y - a.y);
        if (length > longest) {
          longest = length;
          axis = { x: (b.x - a.x) / length, y: (b.y - a.y) / length };
        }
      }
      return {
        inside: (x: number, y: number) => pointInPolygon(x, y, area.polygon) && plantableAt(map, x, y),
        nearEdge: (x: number, y: number) => distanceToEdge(x, y, area.polygon) < 1,
        centre: principalAxis(area.polygon).centre,
        axis,
        extent: area.polygon,
      };
    });
}

/**
 * Where the plants of a kind stand: rows along each field's axis (corn,
 * cane) or a jittered grid (capim, scrub), half of them gone in the last
 * metre of a field. Each plant's jitter, size and colour come from its own
 * grid point, so editing one field leaves the others as they were.
 */
export function plantSpots(map: BattleMap, kind: VegetationKind, seed: number): PlantSpot[] {
  const look = PLANT_LOOK[kind];
  const kindIndex = VEGETATION_KINDS.indexOf(kind);
  const fields = [...polygonFields(map, kind), ...(map.raster ? rasterFields(map, kind) : [])];
  const spots: PlantSpot[] = [];
  for (const field of fields) {
    const { axis, centre } = field;
    const across = { x: -axis.y, y: axis.x };
    let minU = Infinity;
    let maxU = -Infinity;
    let minV = Infinity;
    let maxV = -Infinity;
    for (const point of field.extent) {
      const u = (point.x - centre.x) * axis.x + (point.y - centre.y) * axis.y;
      const v = (point.x - centre.x) * across.x + (point.y - centre.y) * across.y;
      minU = Math.min(minU, u - 1);
      maxU = Math.max(maxU, u + 1);
      minV = Math.min(minV, v - 1);
      maxV = Math.max(maxV, v + 1);
    }
    // Rows sit on whole multiples of the row spacing from the centre, so a field's rows are straight and parallel.
    const firstRow = Math.ceil(minV / look.across) * look.across;
    const firstStep = Math.ceil(minU / look.along) * look.along;
    for (let v = firstRow; v <= maxV; v += look.across) {
      for (let u = firstStep; u <= maxU; u += look.along) {
        const random = spotRandom(seed, kindIndex, centre.x + axis.x * u + across.x * v, centre.y + axis.y * u + across.y * v);
        const ju = (random() - 0.5) * look.along * (look.rows ? 0.4 : 0.7);
        const jv = look.rows ? (random() - 0.5) * 0.06 : (random() - 0.5) * look.across * 0.7;
        const x = centre.x + axis.x * (u + ju) + across.x * (v + jv);
        const y = centre.y + axis.y * (u + ju) + across.y * (v + jv);
        const thin = random();
        if (!field.inside(x, y)) continue;
        if (field.nearEdge(x, y) && thin < 0.5) continue;
        spots.push({ x, y, turn: random() * Math.PI * 2, size: random(), stretch: random(), shade: random() });
      }
    }
  }
  return spots;
}
