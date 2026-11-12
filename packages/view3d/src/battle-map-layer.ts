import * as THREE from 'three';
import {
  modelFilesOf,
  buildingOpenings,
  BUILDING_WALL_SHARE,
  buildingTower,
  TOWER_EYE,
  windowHeight,
  windowMiddleHeight,
  type BuildingWall,
  activeMapRuntime,
  bridgeDeckHeight,
  buildTrenchLine,
  catalogObject,
  outlineShapes,
  runtimeBridgeLandings,
  traceWaterOutlines,
  FORD_DEPTH,
  groundHeightAt,
  pointInPolygon,
  terrainHeightAt,
  TRENCH,
  type BattleMap,
  type Building,
  type MapLine,
  type Polygon,
  type Strip,
  type Vec2,
} from '@prestes/shared';
import { CanopyFade } from './canopy';
import { ModelPlacements, warnMissing, type EnvironmentAsset } from './environment-models';
import { toon } from './materials';
import { PALETTE } from './palette';
import { clumpGeometry, PLANT_LOOK, PLANT_SWAY, plantGeometry, plantSpots, STRATEGIC_CLUMP_CAP, swayingMaterial } from './plant-meshes';

/** Past this span (m) the plants give way to their clumps. */
export const STRATEGIC_PLANT_SPAN = 110;

/**
 * A battle map's countryside (add-battle-maps): water, bridges, the ferry,
 * crops and grass, buildings and props, all placed from the map data the
 * simulation reads. Pieces without a Blender model yet are drawn as named
 * low-poly placeholders (`placeholder:<model>`), never passed off as the
 * finished kit.
 */

/** Building models the Blender environment already has. */
const MODELLED = new Set(['farmhouse', 'barn', 'chapel']);

const materials = new Map<number, THREE.Material>();
function material(color: number): THREE.Material {
  let value = materials.get(color);
  if (!value) {
    value = toon({ color });
    materials.set(color, value);
  }
  return value;
}

const unitBox = new THREE.BoxGeometry(1, 1, 1);
const unitCylinder = new THREE.CylinderGeometry(1, 1, 1, 6);
const unitCone = new THREE.ConeGeometry(1, 1, 4);
const unitRock = new THREE.IcosahedronGeometry(1, 0);
const unitPrism = (() => {
  // A gable roof: a triangular prism one unit on each side.
  const shape = new THREE.Shape([new THREE.Vector2(-0.5, 0), new THREE.Vector2(0.5, 0), new THREE.Vector2(0, 0.5)]);
  const geometry = new THREE.ExtrudeGeometry(shape, { depth: 1, bevelEnabled: false });
  geometry.translate(0, 0, -0.5);
  return geometry;
})();

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function seedOf(text: string): number {
  let hash = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    hash = Math.imul(hash ^ text.charCodeAt(index), 16777619);
  }
  return hash >>> 0;
}

function placed(
  parent: THREE.Object3D,
  geometry: THREE.BufferGeometry,
  color: number,
  x: number,
  y: number,
  z: number,
  scale: [number, number, number],
  rotationY = 0,
): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, material(color));
  mesh.position.set(x, y, z);
  mesh.scale.set(...scale);
  mesh.rotation.y = rotationY;
  parent.add(mesh);
  return mesh;
}

/** The look of each placeholder building: walls, roof and height. */
const BUILDING_LOOK: Readonly<Record<string, { wall: number; roof: number; tower?: 'chimney' | 'bell' }>> = {
  'casa-sede': { wall: PALETTE.whitewash, roof: PALETTE.tile },
  'colonist-house': { wall: PALETTE.adobe, roof: PALETTE.roof },
  engenho: { wall: PALETTE.plaster, roof: PALETTE.tile, tower: 'chimney' },
  'ferry-house': { wall: PALETTE.wood, roof: PALETTE.roofDark },
  'terraced-house': { wall: PALETTE.plaster, roof: PALETTE.tile },
  'terraced-house-wide': { wall: PALETTE.plasterShade, roof: PALETTE.tile },
  sobrado: { wall: PALETTE.whitewash, roof: PALETTE.roofDark },
  factory: { wall: PALETTE.brick, roof: PALETTE.roofDark, tower: 'chimney' },
  church: { wall: PALETTE.whitewash, roof: PALETTE.tile, tower: 'bell' },
  warehouse: { wall: PALETTE.brickDark, roof: PALETTE.metal },
  'casa-terrea': { wall: PALETTE.adobe, roof: PALETTE.tile },
  venda: { wall: PALETTE.whitewash, roof: PALETTE.tile },
  armazem: { wall: PALETTE.plasterShade, roof: PALETTE.roofDark },
  coreto: { wall: PALETTE.whitewash, roof: PALETTE.roof },
  'training-house': { wall: PALETTE.plaster, roof: PALETTE.roof },
};

/**
 * Instances of one geometry and colour, gathered while walking the lines and
 * built as one InstancedMesh (the Bairro's walls run to thousands of pieces).
 */
class Instancer {
  private readonly batches = new Map<string, { geometry: THREE.BufferGeometry; color: number; matrices: THREE.Matrix4[] }>();
  private readonly holder = new THREE.Object3D();
  private readonly child = new THREE.Object3D();

  /** Places a piece in the frame of a holder at (x, ground, y) turned `rotation` about the vertical. */
  add(
    geometry: THREE.BufferGeometry,
    color: number,
    frame: { x: number; ground: number; y: number; rotation: number },
    local: [number, number, number],
    scale: [number, number, number],
    spin = 0,
    tilt = 0,
  ): void {
    const key = `${geometry.uuid}:${color}`;
    let batch = this.batches.get(key);
    if (!batch) {
      batch = { geometry, color, matrices: [] };
      this.batches.set(key, batch);
    }
    this.holder.position.set(frame.x, frame.ground, frame.y);
    this.holder.rotation.set(0, frame.rotation, 0);
    this.holder.updateMatrix();
    this.child.position.set(...local);
    this.child.rotation.set(tilt, spin, 0, 'YXZ');
    this.child.scale.set(...scale);
    this.child.updateMatrix();
    batch.matrices.push(new THREE.Matrix4().multiplyMatrices(this.holder.matrix, this.child.matrix));
  }

  build(group: THREE.Group): void {
    for (const batch of this.batches.values()) {
      const mesh = new THREE.InstancedMesh(batch.geometry, material(batch.color), batch.matrices.length);
      batch.matrices.forEach((matrix, index) => mesh.setMatrixAt(index, matrix));
      mesh.instanceMatrix.needsUpdate = true;
      mesh.computeBoundingSphere();
      group.add(mesh);
    }
  }
}

/** Shops with an awning and a blank sign board over the street door. */
const SHOPS = new Set(['venda', 'armazem']);

/** Places one piece of a building in its own frame. */
type Put = (
  geometry: THREE.BufferGeometry,
  color: number,
  x: number,
  y: number,
  z: number,
  scale: [number, number, number],
  spin?: number,
  tilt?: number,
) => void;

const unitOctagon = new THREE.CylinderGeometry(1, 1, 1, 8);

/** A coreto: an open octagonal bandstand on a plinth, posts and a pointed roof. */
function coreto(building: Building, look: { wall: number; roof: number }, put: Put): void {
  const radius = Math.min(building.halfWidth, building.halfDepth);
  put(unitOctagon, look.wall, 0, 0.5, 0, [radius, 1, radius]);
  for (let index = 0; index < 8; index += 1) {
    const angle = (index / 8) * Math.PI * 2 + Math.PI / 8;
    put(unitBox, PALETTE.whitewash, Math.cos(angle) * radius * 0.88, 1 + (building.height - 2) / 2, Math.sin(angle) * radius * 0.88, [0.18, building.height - 2, 0.18]);
  }
  put(unitCone, look.roof, 0, building.height - 0.4, 0, [radius * 1.15, 1.8, radius * 1.15], Math.PI / 8);
}

/**
 * A placeholder building from its footprint (refine-battle-maps 5.2): block,
 * gable roof, a door with windows either side on the street face (shuttered),
 * an awning and a blank sign board on shops, two rows of windows and a
 * balcony on a sobrado, a chimney or a bell tower. Signs carry no text.
 */
function placeholderBuilding(building: Building, pieces: Instancer): void {
  const look = BUILDING_LOOK[building.model] ?? { wall: PALETTE.plaster, roof: PALETTE.roof };
  const frame = { x: building.x, ground: terrainHeightAt(building.x, building.y), y: building.y, rotation: -building.rotation };
  const put: Put = (geometry, color, x, y, z, scale, spin = 0, tilt = 0) => pieces.add(geometry, color, frame, [x, y, z], scale, spin, tilt);
  if (building.model === 'coreto') {
    coreto(building, look, put);
    return;
  }
  const width = building.halfWidth * 2;
  const depth = building.halfDepth * 2;
  const wall = building.height * BUILDING_WALL_SHARE;
  // Sunk a little so a block on a slope shows no gap under it.
  put(unitBox, look.wall, 0, wall / 2 - 0.2, 0, [width, wall + 0.4, depth]);
  // The ridge runs along the long side.
  if (depth > width) put(unitPrism, look.roof, 0, wall, 0, [depth + 0.4, (building.height - wall) * 2, width + 0.4], Math.PI / 2);
  else put(unitPrism, look.roof, 0, wall, 0, [width + 0.4, (building.height - wall) * 2, depth + 0.4]);
  // garrison-and-assault 4.7: the doors and windows are the simulation's entrances and ports.
  const openings = buildingOpenings(building);
  const front = building.front ?? 1;
  const shop = SHOPS.has(building.model);
  const church = building.model === 'church';
  const face = (wall: BuildingWall) => wall === 'front' || wall === 'back';
  for (const door of openings.doors) {
    const x = door.x + door.outX * 0.03;
    const z = door.y + door.outY * 0.03;
    const across = face(door.wall);
    put(unitBox, PALETTE.door, x, door.height / 2, z, across ? [door.width, door.height, 0.06] : [0.06, door.height, door.width]);
    if (church && door.wall === 'front') {
      // A stone frame round the portal.
      put(unitBox, PALETTE.plasterShade, x, door.height + 0.25, z, [door.width + 0.8, 0.5, 0.1]);
      put(unitBox, PALETTE.plasterShade, x - door.width / 2 - 0.2, door.height / 2, z, [0.4, door.height, 0.1]);
      put(unitBox, PALETTE.plasterShade, x + door.width / 2 + 0.2, door.height / 2, z, [0.4, door.height, 0.1]);
    }
  }
  for (const window of openings.windows) {
    const x = window.x + window.outX * 0.03;
    const z = window.y + window.outY * 0.03;
    const across = face(window.wall);
    // The church's are tall and narrow; the rest have shutters folded back on the street face.
    const height = windowHeight(openings, window, building.model);
    const y = windowMiddleHeight(openings, window, building.model);
    const width = church ? 0.7 : 0.8;
    put(unitBox, PALETTE.window, x, y, z, across ? [width, height, 0.05] : [0.05, height, width]);
    if (window.wall === 'front' && !church) {
      put(unitBox, PALETTE.shutter, x - 0.62, y, z, [0.4, height, 0.06]);
      put(unitBox, PALETTE.shutter, x + 0.62, y, z, [0.4, height, 0.06]);
    }
  }
  const frontZ = front * (depth / 2 + 0.03);
  const upperFloor = openings.windows.find((window) => window.level > 0)?.elevation;
  if (building.model === 'sobrado' && upperFloor !== undefined) {
    // A balcony along the upper floor.
    put(unitBox, PALETTE.wood, 0, upperFloor, frontZ + front * 0.45, [width * 0.7, 0.12, 0.9]);
    put(unitBox, PALETTE.wire, 0, upperFloor + 0.5, frontZ + front * 0.88, [width * 0.7, 0.06, 0.04]);
  }
  if (shop) {
    // A canvas awning sloping out over the door, and a blank sign board.
    put(unitBox, building.id % 2 === 0 ? PALETTE.awning : PALETTE.awningAlt, 0, 2.55, frontZ + front * 0.8, [width * 0.86, 0.08, 1.6], 0, front * 0.25);
    put(unitBox, PALETTE.sign, 0, Math.min(wall - 0.4, 3.2), frontZ + front * 0.02, [width * 0.5, 0.55, 0.06]);
  }
  if (look.tower === 'chimney') {
    put(unitCylinder, PALETTE.brickDark, width * 0.32, building.height * 0.9, 0, [0.6, building.height * 1.8, 0.6]);
  } else if (look.tower === 'bell') {
    // The bell tower rises over the façade, above the portal, with a cross on its spire.
    const tower = buildingTower(building)!;
    const { side, top } = tower;
    const towerZ = tower.y;
    put(unitBox, look.wall, 0, top / 2, towerZ, [side, top, side]);
    put(unitBox, PALETTE.plasterShade, 0, wall + 0.2, towerZ, [side + 0.3, 0.3, side + 0.3]);
    // garrison-and-assault 1.4: the posts' openings on every face (a man's eye at 9 m),
    // and the belfry's openings near the top.
    const post = TOWER_EYE - 0.2;
    for (const [height, tall] of [[post, 1.2], [top - 1.6, 1.4]] as const) {
      put(unitBox, PALETTE.window, 0, height, towerZ + side / 2 + 0.03, [0.9, tall, 0.05]);
      put(unitBox, PALETTE.window, 0, height, towerZ - side / 2 - 0.03, [0.9, tall, 0.05]);
      put(unitBox, PALETTE.window, side / 2 + 0.03, height, towerZ, [0.05, tall, 0.9]);
      put(unitBox, PALETTE.window, -side / 2 - 0.03, height, towerZ, [0.05, tall, 0.9]);
    }
    put(unitCone, look.roof, 0, top + 1.2, towerZ, [2.6, 2.4, 2.6], Math.PI / 4);
    put(unitBox, PALETTE.wood, 0, top + 3, towerZ, [0.12, 1.2, 0.12]);
    put(unitBox, PALETTE.wood, 0, top + 3.2, towerZ, [0.6, 0.12, 0.12]);
  }
}

/** A flat mesh over a polygon at a fixed height (water, a ford). */
function polygonMesh(polygon: Polygon, height: number, color: number, opacity: number): THREE.Mesh {
  const shape = new THREE.Shape(polygon.map((point) => new THREE.Vector2(point.x, -point.y)));
  const geometry = new THREE.ShapeGeometry(shape);
  geometry.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 }),
  );
  mesh.position.y = height;
  return mesh;
}

/**
 * Water inside traced outlines (refine-map-editor D4): one flat mesh for the
 * union of the areas, its edge following the water's line rather than the
 * strips' joints or 1 m cells, and overlaps drawn once.
 */
function outlineMesh(loops: readonly Vec2[][], height: number, color: number, opacity: number, name: string): THREE.Mesh | null {
  const shapes = outlineShapes(loops).map(({ outer, holes }) => {
    const shape = new THREE.Shape(outer.map((point) => new THREE.Vector2(point.x, -point.y)));
    for (const hole of holes) shape.holes.push(new THREE.Path(hole.map((point) => new THREE.Vector2(point.x, -point.y))));
    return shape;
  });
  if (shapes.length === 0) return null;
  const geometry = new THREE.ShapeGeometry(shapes);
  geometry.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: opacity >= 1, side: THREE.DoubleSide }),
  );
  mesh.name = name;
  mesh.position.y = height;
  return mesh;
}

/** A ribbon along a strip, at a fixed height. */
function stripMesh(strip: Strip, height: number, color: number, opacity: number): THREE.Mesh {
  const positions: number[] = [];
  const indices: number[] = [];
  const half = strip.width / 2;
  strip.points.forEach((point, index) => {
    const previous = strip.points[Math.max(0, index - 1)]!;
    const next = strip.points[Math.min(strip.points.length - 1, index + 1)]!;
    const dx = next.x - previous.x;
    const dy = next.y - previous.y;
    const length = Math.hypot(dx, dy) || 1;
    const nx = -dy / length;
    const ny = dx / length;
    positions.push(point.x + nx * half, height, point.y + ny * half, point.x - nx * half, height, point.y - ny * half);
    if (index > 0) {
      const base = (index - 1) * 2;
      indices.push(base, base + 2, base + 1, base + 1, base + 2, base + 3);
    }
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return new THREE.Mesh(
    geometry,
    new THREE.MeshBasicMaterial({
      color,
      transparent: opacity < 1,
      opacity,
      depthWrite: opacity >= 1,
      side: THREE.DoubleSide,
    }),
  );
}

/** One instanced mesh per vegetation kind, and its capped clump mesh for strategic span (refine-map-editor D1). */
function vegetation(map: BattleMap): { group: THREE.Group; plants: THREE.InstancedMesh[]; clumps: THREE.InstancedMesh[] } {
  const group = new THREE.Group();
  group.name = 'battle-map-vegetation';
  const seed = seedOf(map.id);
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3();
  const color = new THREE.Color();
  const plants: THREE.InstancedMesh[] = [];
  const clumps: THREE.InstancedMesh[] = [];
  for (const kind of ['corn', 'cane', 'tall-grass', 'scrub'] as const) {
    const spots = plantSpots(map, kind, seed);
    if (spots.length === 0) continue;
    const look = PLANT_LOOK[kind];
    const material = swayingMaterial(look.sway);
    const mesh = new THREE.InstancedMesh(plantGeometry(kind), material, spots.length);
    mesh.name = `vegetation:${kind}`;
    // Every fourth spot carries a clump, up to the cap; each stands for four plants.
    const stride = Math.max(4, Math.ceil(spots.length / STRATEGIC_CLUMP_CAP));
    const clump = new THREE.InstancedMesh(clumpGeometry(kind), material, Math.ceil(spots.length / stride));
    clump.name = `vegetation-clumps:${kind}`;
    clump.visible = false;
    let clumpCount = 0;
    spots.forEach((spot, index) => {
      const size = 0.85 + spot.size * 0.3;
      position.set(spot.x, terrainHeightAt(spot.x, spot.y), spot.y);
      quaternion.setFromAxisAngle(up, spot.turn);
      scale.set(size, size * (0.9 + spot.stretch * 0.2), size);
      matrix.compose(position, quaternion, scale);
      mesh.setMatrixAt(index, matrix);
      color.setHex(look.colors[Math.floor(spot.shade * look.colors.length)]!);
      mesh.setColorAt(index, color);
      if (index % stride === 0) {
        clump.setMatrixAt(clumpCount, matrix);
        clump.setColorAt(clumpCount, color);
        clumpCount += 1;
      }
    });
    clump.count = clumpCount;
    for (const instanced of [mesh, clump]) {
      instanced.instanceMatrix.needsUpdate = true;
      if (instanced.instanceColor) instanced.instanceColor.needsUpdate = true;
      instanced.computeBoundingSphere();
      group.add(instanced);
    }
    plants.push(mesh);
    clumps.push(clump);
  }
  return { group, plants, clumps };
}

/** Deck pieces along a bridge (beams, curbs, rails): short enough to follow its ramps. */
const DECK_PIECE = 1;
/** One deck plank, laid across the bridge. */
const PLANK = 0.42;
/** Plank shades, worn unevenly. */
const PLANK_SHADES = [PALETTE.wood, PALETTE.wood, PALETTE.wood, PALETTE.bark] as const;
/** Railing post spacing and height. */
const RAIL_POST = 2;
const RAIL_HEIGHT = 1;
/** Pile bent spacing, and how deep the piles stand in the bed. */
const BENT = 4.5;
const PILE_FOOT = 0.8;
/** How far the planks stand above the walkable deck height. */
const DECK_LIFT = 0.1;

/**
 * Bridge materials, pulled toward the camera in depth: the ground sheet is
 * lifted to the deck under a bridge, and the far orthographic camera would
 * otherwise let it flicker through the planks.
 */
const bridgeMaterials = new Map<number, THREE.Material>();
function bridgeMaterial(color: number): THREE.Material {
  let value = bridgeMaterials.get(color);
  if (!value) {
    value = material(color).clone();
    value.polygonOffset = true;
    value.polygonOffsetFactor = -4;
    value.polygonOffsetUnits = -16;
    bridgeMaterials.set(color, value);
  }
  return value;
}

/**
 * A timber trestle bridge on stone abutments (refine-map-editor D3): the deck
 * follows the shared profile, meeting each bank at its landing and clearing
 * the water in between, so no ground shows through it. Planks laid across,
 * stringers and curbs along, a two-rail parapet, and pile bents with a cap and
 * cross bracing wherever the deck stands clear of the ground.
 */
function bridge(map: BattleMap, entry: BattleMap['bridges'][number]): THREE.Group {
  const group = new THREE.Group();
  group.name = 'placeholder:bridge';
  const runtime = activeMapRuntime();
  const flat = map.waterLevel + entry.deckHeight;
  const ends: [number, number] = runtime && runtime.map === map ? runtimeBridgeLandings(runtime, entry) : [flat, flat];
  // The ground sheet is lifted to the deck under the bridge, so the planks ride just above it.
  const deckAt = (along: number): number => bridgeDeckHeight(entry, map.waterLevel, ends, along) + DECK_LIFT;
  const slopeAt = (along: number): number => -Math.atan2(deckAt(along + 0.1) - deckAt(along - 0.1), 0.2);
  // The ground under the deck (terrainHeightAt would give the deck itself).
  const cos = Math.cos(entry.rotation);
  const sin = Math.sin(entry.rotation);
  const groundAt = (along: number): number => groundHeightAt(entry.x - along * sin, entry.y + along * cos);
  const half = entry.halfWidth;
  const width = half * 2;
  const random = seededRandom(entry.id * 7919 + 17);
  const pieces = new Instancer();
  const frame = { x: entry.x, ground: 0, y: entry.y, rotation: -entry.rotation };
  const put: Put = (geometry, color, x, y, z, scale, spin = 0, tilt = 0) => pieces.add(geometry, color, frame, [x, y, z], scale, spin, tilt);

  // Planks across, each a little uneven in length and shade.
  const planks = Math.max(1, Math.round((entry.halfDepth * 2) / PLANK));
  const plank = (entry.halfDepth * 2) / planks;
  for (let index = 0; index < planks; index += 1) {
    const z = -entry.halfDepth + (index + 0.5) * plank;
    const shade = PLANK_SHADES[Math.floor(random() * PLANK_SHADES.length)]!;
    const overhang = (random() - 0.5) * 0.16;
    put(unitBox, shade, overhang, deckAt(z) - 0.04, z, [width + 0.1 + Math.abs(overhang), 0.08, plank * 0.9], 0, slopeAt(z));
  }

  // Stringers under the planks, curbs on their edges and the parapet rails, piece by piece along the ramps.
  const steps = Math.max(1, Math.ceil((entry.halfDepth * 2) / DECK_PIECE));
  const step = (entry.halfDepth * 2) / steps;
  for (let index = 0; index < steps; index += 1) {
    const z0 = -entry.halfDepth + index * step;
    const z1 = z0 + step;
    const h0 = deckAt(z0);
    const h1 = deckAt(z1);
    const tilt = -Math.atan2(h1 - h0, step);
    const length = Math.hypot(step, h1 - h0) + 0.03;
    const middle = (h0 + h1) / 2;
    const z = (z0 + z1) / 2;
    // A dark floor under the plank gaps, so the ground sheet beneath never shows between them.
    put(unitBox, PALETTE.revetment, 0, middle - 0.095, z, [width, 0.02, length], 0, tilt);
    for (const across of [-(half - 0.35), 0, half - 0.35]) put(unitBox, PALETTE.bark, across, middle - 0.3, z, [0.26, 0.36, length], 0, tilt);
    for (const side of [-1, 1]) {
      put(unitBox, PALETTE.revetment, side * (half - 0.12), middle + 0.08, z, [0.22, 0.16, length], 0, tilt);
      put(unitBox, PALETTE.wood, side * (half - 0.08), middle + RAIL_HEIGHT, z, [0.12, 0.12, length], 0, tilt);
      put(unitBox, PALETTE.wood, side * (half - 0.08), middle + RAIL_HEIGHT * 0.52, z, [0.07, 0.09, length], 0, tilt);
    }
  }

  // Parapet posts, a stouter pair at each end.
  const posts = Math.max(1, Math.round((entry.halfDepth * 2) / RAIL_POST));
  for (let index = 0; index <= posts; index += 1) {
    const z = -entry.halfDepth + 0.1 + (index / posts) * (entry.halfDepth * 2 - 0.2);
    const end = index === 0 || index === posts;
    const size = end ? 0.26 : 0.16;
    const height = RAIL_HEIGHT + (end ? 0.25 : 0.06);
    for (const side of [-1, 1]) put(unitBox, PALETTE.bark, side * (half - 0.08), deckAt(z) + height / 2, z, [size, height, size]);
  }

  // Pile bents: two piles, a cap beam under the stringers, and an X of braces when tall enough.
  const bents = Math.max(1, Math.round((entry.halfDepth * 2) / BENT));
  for (let index = 1; index < bents; index += 1) {
    const z = -entry.halfDepth + (index / bents) * entry.halfDepth * 2;
    const top = deckAt(z) - 0.48;
    const bed = Math.min(groundAt(z), map.waterLevel);
    if (top - bed < 0.5) continue;
    const foot = bed - PILE_FOOT;
    const spread = half - 0.25;
    for (const side of [-1, 1]) put(unitCylinder, PALETTE.bark, side * spread, (top + foot) / 2, z, [0.2, top - foot, 0.2]);
    put(unitBox, PALETTE.revetment, 0, top - 0.12, z, [width + 0.3, 0.26, 0.32]);
    const low = Math.max(bed, map.waterLevel - 0.2);
    const rise = top - 0.3 - low;
    if (rise > 1.2) {
      const length = Math.hypot(spread * 2, rise);
      const lean = Math.atan2(rise, spread * 2);
      for (const sign of [-1, 1]) put(unitBox, PALETTE.wood, 0, low + rise / 2, z + sign * 0.14, [0.1, 0.16, length], Math.PI / 2, sign * lean);
    }
  }

  // Stone abutments where each bank drops away under the deck, with loose stones at their wings.
  for (const end of [-1, 1]) {
    let edge = end * entry.halfDepth;
    for (let walk = 0; walk < entry.halfDepth; walk += 0.5) {
      const along = end * (entry.halfDepth - walk);
      if (deckAt(along) - groundAt(along) > 0.6) break;
      edge = along;
    }
    const seat = deckAt(edge) - 0.42;
    const bottom = map.waterLevel - 0.6;
    if (seat - bottom < 0.4) continue;
    const depth = 1.6;
    const z = edge + end * (depth / 2 - 0.4);
    put(unitBox, PALETTE.stone, 0, (seat + bottom) / 2, z, [width + 0.9, seat - bottom, depth]);
    put(unitBox, PALETTE.stoneDark, 0, seat - 0.08, z - end * 0.1, [width + 1.05, 0.16, depth + 0.1]);
    for (let course = bottom + 0.45; course < seat - 0.2; course += 0.45) {
      put(unitBox, PALETTE.stoneDark, 0, course, z - end * (depth / 2 + 0.005), [width + 0.92, 0.04, 0.02]);
    }
    for (const side of [-1, 1]) {
      for (let n = 0; n < 3; n += 1) {
        const size = 0.35 + random() * 0.35;
        put(
          unitRock,
          n === 1 ? PALETTE.stoneDark : PALETTE.stone,
          side * (half + 0.55 + random() * 0.5),
          Math.max(map.waterLevel, groundAt(edge)) - size * 0.3 + (2 - n) * 0.25,
          edge + end * (n * 0.55 - 0.3),
          [size, size * 0.7, size],
          random() * 6.28,
        );
      }
    }
  }

  pieces.build(group);
  for (const child of group.children) {
    if (child instanceof THREE.InstancedMesh) child.material = bridgeMaterial((child.material as THREE.MeshToonMaterial).color.getHex());
  }  return group;
}

/** The ferry's raft (moved from the frame), with a pole and pennant that mark it from afar (5.4). */
function ferryRaft(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'placeholder:ferry';
  placed(group, unitBox, PALETTE.wood, 0, 0.15, 0, [3.2, 0.3, 4.6]);
  for (const side of [-1, 1]) {
    placed(group, unitBox, PALETTE.bark, side * 1.55, 0.55, 0, [0.1, 0.5, 4.6]);
  }
  const marker = new THREE.Group();
  marker.name = 'ferry-marker';
  placed(marker, unitCylinder, PALETTE.bark, 1.3, 2.8, 2, [0.12, 5.6, 0.12]);
  placed(marker, unitBox, PALETTE.pennant, 1.3, 5.0, 3.1, [0.1, 1.1, 2.1]);
  group.add(marker);
  return group;
}

/** A landing: two cable posts and a few planks run down into the water. */
function ferryLanding(map: BattleMap, at: Vec2, toward: Vec2): THREE.Group {
  const group = new THREE.Group();
  group.name = 'ferry-landing';
  group.position.set(at.x, Math.max(map.waterLevel, terrainHeightAt(at.x, at.y)), at.y);
  group.rotation.y = -Math.atan2(toward.x - at.x, toward.y - at.y);
  placed(group, unitBox, PALETTE.wood, 0, 0.12, -1.5, [3, 0.18, 4]);
  for (const side of [-1, 1]) placed(group, unitCylinder, PALETTE.bark, side * 1.8, 1.1, -3, [0.14, 2.6, 0.14]);
  return group;
}

/** Is (x, y) at a crossing, where the banks keep clear of reeds and stones? */
function atCrossing(map: BattleMap, x: number, y: number): boolean {
  for (const entry of map.bridges) {
    const dx = x - entry.x;
    const dy = y - entry.y;
    const cos = Math.cos(entry.rotation);
    const sin = Math.sin(entry.rotation);
    const across = dx * cos + dy * sin;
    const along = -dx * sin + dy * cos;
    if (Math.abs(across) < entry.halfWidth + 3 && Math.abs(along) < entry.halfDepth + 3) return true;
  }
  for (const ferry of map.ferries) {
    for (const landing of [ferry.landingA, ferry.landingB]) {
      if ((x - landing.x) ** 2 + (y - landing.y) ** 2 < 7 * 7) return true;
    }
  }
  for (const area of map.water) {
    if (area.kind !== 'ford' || !area.polygon) continue;
    const xs = area.polygon.map((point) => point.x);
    const ys = area.polygon.map((point) => point.y);
    if (x > Math.min(...xs) - 4 && x < Math.max(...xs) + 4 && y > Math.min(...ys) - 4 && y < Math.max(...ys) + 4) return true;
  }
  return false;
}

/** Points along a polyline every `step` metres, with the unit normal to its left. */
function walk(points: readonly Vec2[], step: number): { x: number; y: number; nx: number; ny: number }[] {
  const out: { x: number; y: number; nx: number; ny: number }[] = [];
  for (let index = 1; index < points.length; index += 1) {
    const a = points[index - 1]!;
    const b = points[index]!;
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    if (length === 0) continue;
    const nx = -(b.y - a.y) / length;
    const ny = (b.x - a.x) / length;
    const count = Math.max(1, Math.ceil(length / step));
    for (let n = index === 1 ? 0 : 1; n <= count; n += 1) {
      const t = n / count;
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t, nx, ny });
    }
  }
  // At a bend the normal is the mean of the two segments', so ribbons neither gap nor overlap.
  return out.map((point, index) => {
    const previous = out[Math.max(0, index - 1)]!;
    const next = out[Math.min(out.length - 1, index + 1)]!;
    const length = Math.hypot(next.x - previous.x, next.y - previous.y);
    if (length === 0) return point;
    return { ...point, nx: -(next.y - previous.y) / length, ny: (next.x - previous.x) / length };
  });
}

/** A ribbon laid on the ground from `inner` to `outer` metres off a line, on one side. */
function drapedRibbon(
  map: BattleMap,
  points: readonly Vec2[],
  inner: number,
  outer: number,
  side: 1 | -1,
  color: number,
  name = 'battle-map-gravel',
): THREE.Mesh {
  const positions: number[] = [];
  const indices: number[] = [];
  const floor = map.waterLevel + 0.03;
  walk(points, 2).forEach((point, index) => {
    for (const offset of [inner, outer]) {
      const x = point.x + point.nx * offset * side;
      const y = point.y + point.ny * offset * side;
      positions.push(x, Math.max(floor, terrainHeightAt(x, y) + 0.05), y);
    }
    if (index > 0) {
      const base = (index - 1) * 2;
      indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
    }
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, groundOverlay({ color }));
  mesh.name = name;
  return mesh;
}

/** A toon material for a mesh laid on the ground: pulled forward in depth so it never z-fights the terrain. */
function groundOverlay(params: THREE.MeshToonMaterialParameters): THREE.MeshToonMaterial {
  return toon({ side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -2, ...params });
}

/** Wheel ruts: one pair on a cart road, two (one each way) on a street 6 m or wider. */
function rutCentres(width: number): number[] {
  return width < 6 ? [-0.8, 0.8] : [-width / 4 - 0.8, -width / 4 + 0.8, width / 4 - 0.8, width / 4 + 0.8];
}

const RUT_HALF_WIDTH = 0.22;

/**
 * refine-battle-maps 5.6: a dirt road as rutted earth laid on the heightfield.
 * Across it: a verge at each edge, two wheel ruts and a grassy crown between
 * them, cambered (higher at the crown, ruts sunk). Each band has its own
 * vertices so its colour stays crisp.
 */
function roadMesh(strip: Strip): THREE.Mesh {
  const half = strip.width / 2;
  const ruts = rutCentres(strip.width);
  const cuts = new Set<number>([-half, half, -half + 0.45, half - 0.45]);
  for (const centre of ruts) {
    cuts.add(centre - RUT_HALF_WIDTH);
    cuts.add(centre + RUT_HALF_WIDTH);
  }
  const edges = [...cuts].filter((cut) => cut >= -half && cut <= half).sort((a, b) => a - b);
  const bands = edges.slice(1).map((to, index) => {
    const from = edges[index]!;
    const middle = (from + to) / 2;
    const rut = ruts.some((centre) => Math.abs(middle - centre) < RUT_HALF_WIDTH);
    const pairs = ruts.length / 2;
    let crown = false;
    for (let pair = 0; pair < pairs; pair += 1) {
      if (middle > ruts[pair * 2]! && middle < ruts[pair * 2 + 1]!) crown = true;
    }
    const color = rut ? PALETTE.rut : Math.abs(middle) > half - 0.45 ? PALETTE.roadVerge : crown ? PALETTE.roadCrown : PALETTE.dirtRoad;
    return { from, to, color, sunk: rut ? 0.04 : 0 };
  });
  const camber = (offset: number) => 0.05 + 0.07 * (1 - (offset / half) ** 2);
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const color = new THREE.Color();
  const samples = walk(strip.points, 2);
  for (const band of bands) {
    color.setHex(band.color);
    const base = positions.length / 3;
    samples.forEach((point, index) => {
      for (const offset of [band.from, band.to]) {
        const x = point.x + point.nx * offset;
        const y = point.y + point.ny * offset;
        positions.push(x, terrainHeightAt(x, y) + camber(offset) - band.sunk, y);
        colors.push(color.r, color.g, color.b);
      }
      if (index > 0) {
        const at = base + (index - 1) * 2;
        indices.push(at, at + 1, at + 2, at + 1, at + 3, at + 2);
      }
    });
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, groundOverlay({ color: 0xffffff, vertexColors: true }));
  mesh.name = 'battle-map-road';
  return mesh;
}

/** refine-battle-maps 5.6 and 5.8: the dirt roads, and a headland path round each field. */
function roadsAndHeadlands(map: BattleMap): THREE.Group {
  const group = new THREE.Group();
  group.name = 'battle-map-roads';
  for (const area of map.surfaces) {
    if (area.surface === 'dirt-road' && area.strip) group.add(roadMesh(area.strip));
    if (area.surface === 'crop' && area.polygon && area.polygon.length >= 3) {
      // Just outside the field's edge; the side that is outside follows the polygon's winding.
      const polygon = area.polygon;
      let twice = 0;
      polygon.forEach((point, index) => {
        const next = polygon[(index + 1) % polygon.length]!;
        twice += point.x * next.y - next.x * point.y;
      });
      const outward = twice > 0 ? -1 : 1;
      group.add(drapedRibbon(map, [...polygon, polygon[0]!], 0.6, 3.4, outward, PALETTE.headland, 'battle-map-headland'));
    }
  }
  return group;
}

/**
 * refine-battle-maps 5.4: the riverbanks. A gravel strip along each edge of
 * the deep water, loose stones on it, and reed clumps at the waterline; the
 * crossings are kept clear so a bridge, landing or ford reads at a glance.
 */
function riverbanks(map: BattleMap): THREE.Group {
  const group = new THREE.Group();
  group.name = 'battle-map-banks';
  const pieces = new Instancer();
  const random = seededRandom(seedOf(`${map.id}:banks`));
  const floor = map.waterLevel + 0.02;
  const inBounds = (x: number, y: number) =>
    x > map.bounds.minX && x < map.bounds.maxX && y > map.bounds.minY && y < map.bounds.maxY;
  for (const area of map.water) {
    if (!area.strip) continue;
    const half = area.strip.width / 2;
    for (const side of [1, -1] as const) {
      group.add(drapedRibbon(map, area.strip.points, half - 0.6, half + 2.2, side, PALETTE.gravel));
      for (const point of walk(area.strip.points, 1.6)) {
        const lay = (offset: number) => {
          const x = point.x + point.nx * offset * side;
          const y = point.y + point.ny * offset * side;
          return { x, y, ground: Math.max(floor, terrainHeightAt(x, y)), ok: inBounds(x, y) && !atCrossing(map, x, y) };
        };
        // Loose stones on the gravel.
        for (let n = 0; n < 2; n += 1) {
          const spot = lay(half - 0.4 + random() * 2.4);
          const size = 0.22 + random() * 0.26;
          const turn = random() * 6.28;
          if (!spot.ok) continue;
          pieces.add(
            unitRock,
            n === 0 ? PALETTE.gravelDark : PALETTE.stone,
            { x: spot.x, ground: spot.ground, y: spot.y, rotation: turn },
            [0, size * 0.25, 0],
            [size, size * 0.45, size * 0.8],
          );
        }
        // author-game-maps: no reed clumps; tall cones read as little pines.
      }
    }
  }
  pieces.build(group);
  return group;
}

/** refine-battle-maps 5.10: water colours, so a ford reads lighter than the deep river. */
export const WATER_LOOK = {
  deep: { color: PALETTE.waterDeep, opacity: 0.88 },
  ford: { color: PALETTE.fordShallow, opacity: 0.55 },
} as const;

/** author-game-maps: the deep water shoals toward a ford over this many metres, in bands. */
const SHOAL_LENGTH = 12;
const SHOAL_BANDS = 3;

/** The last `length` metres of a polyline, from its end (`atEnd`) or its start. */
function polylineEnd(points: readonly Vec2[], length: number, atEnd: boolean): Vec2[] {
  const ordered = atEnd ? [...points].reverse() : [...points];
  const out: Vec2[] = [ordered[0]!];
  let left = length;
  for (let index = 1; index < ordered.length && left > 0; index += 1) {
    const a = ordered[index - 1]!;
    const b = ordered[index]!;
    const step = Math.hypot(b.x - a.x, b.y - a.y);
    if (step >= left) {
      const t = left / (step || 1);
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
      break;
    }
    out.push(b);
    left -= step;
  }
  return atEnd ? out.reverse() : out;
}

const near = (a: Vec2, b: Vec2) => Math.hypot(a.x - b.x, a.y - b.y) < 0.5;

/**
 * author-game-maps: where a deep stretch meets a ford, bands of water between
 * the two colours on the deep side, so the river lightens toward the ford
 * instead of changing at a line.
 */
function shoals(map: BattleMap): THREE.Group {
  const group = new THREE.Group();
  group.name = 'water:shoals';
  const deepColor = new THREE.Color(WATER_LOOK.deep.color);
  const fordColor = new THREE.Color(WATER_LOOK.ford.color);
  const fords = map.water.filter((area) => area.kind === 'ford' && area.strip).map((area) => area.strip!);
  for (const area of map.water) {
    if (area.kind !== 'deep' || !area.strip) continue;
    const points = area.strip.points;
    const first = points[0]!;
    const last = points[points.length - 1]!;
    for (const atEnd of [false, true]) {
      const joint = atEnd ? last : first;
      if (!fords.some((strip) => near(strip.points[0]!, joint) || near(strip.points[strip.points.length - 1]!, joint))) continue;
      for (let band = 0; band < SHOAL_BANDS; band += 1) {
        // Band 0 touches the ford and is the lightest.
        const reach = (SHOAL_LENGTH * (band + 1)) / SHOAL_BANDS;
        const piece = polylineEnd(points, reach, atEnd);
        if (piece.length < 2) continue;
        const loops = traceWaterOutlines(map, [{ kind: 'deep', strip: { points: piece, width: area.strip.width } }]);
        // Nested reaches: the shortest, nearest the ford and lightest, draws on top.
        // Distinct steps from the ford's tone to the deep's (the pixel pass would flatten a fine gradient).
        const color = deepColor.clone().lerp(fordColor, 1 - (band + 1) / (SHOAL_BANDS + 1));
        const mesh = outlineMesh(loops, map.waterLevel + 0.01 + (SHOAL_BANDS - band) * 0.004, color.getHex(), WATER_LOOK.ford.opacity, `water:shoal-${band}`);
        if (mesh) group.add(mesh);
      }
    }
  }
  return group;
}

/** One ripple ring on a ford: it widens and fades, then starts again. */
interface Ripple {
  mesh: THREE.Mesh;
  phase: number;
  size: number;
}

const RIPPLE_SECONDS = 2.6;
const rippleRing = new THREE.RingGeometry(0.82, 1, 20).rotateX(-Math.PI / 2);

/**
 * refine-battle-maps 5.10: a ford. A gravel bar on the bed, stones breaking
 * the surface, light shallow water with a foam edge where it meets the deep
 * river, and ripple rings (animated in `update`).
 */
function ford(map: BattleMap, polygon: Polygon, ripples: Ripple[]): THREE.Group {
  const group = new THREE.Group();
  group.name = 'battle-map-ford';
  const bed = polygonMesh(polygon, map.waterLevel - FORD_DEPTH + 0.06, PALETTE.gravel, 1);
  bed.name = 'ford-bed';
  group.add(bed);
  const water = polygonMesh(polygon, map.waterLevel + 0.03, WATER_LOOK.ford.color, WATER_LOOK.ford.opacity);
  water.name = 'ford-water';
  // Drawn after the deep river it lies across, so it reads light all the way over.
  water.renderOrder = 1;
  group.add(water);
  const edge = stripMesh({ points: [...polygon, polygon[0]!], width: 0.7 }, map.waterLevel + 0.05, PALETTE.fordEdge, 0.85);
  edge.name = 'ford-edge';
  edge.renderOrder = 2;
  group.add(edge);
  const xs = polygon.map((point) => point.x);
  const ys = polygon.map((point) => point.y);
  const [minX, maxX, minY, maxY] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  const random = seededRandom(seedOf(`${map.id}:ford:${minX}:${minY}`));
  const inside = (): Vec2 => {
    for (let tries = 0; tries < 50; tries += 1) {
      const point = { x: minX + random() * (maxX - minX), y: minY + random() * (maxY - minY) };
      if (pointInPolygon(point.x, point.y, polygon)) return point;
    }
    return { x: (minX + maxX) / 2, y: (minY + maxY) / 2 };
  };
  const pieces = new Instancer();
  for (let n = 0; n < 34; n += 1) {
    const point = inside();
    const size = 0.5 + random() * 0.6;
    pieces.add(
      unitRock,
      n % 3 === 0 ? PALETTE.stoneDark : PALETTE.stone,
      { x: point.x, ground: map.waterLevel - 0.05, y: point.y, rotation: random() * 6.28 },
      [0, 0, 0],
      [size, size * 0.6, size * 0.8],
    );
  }
  pieces.build(group);
  for (let n = 0; n < 14; n += 1) {
    const point = inside();
    const mesh = new THREE.Mesh(
      rippleRing,
      new THREE.MeshBasicMaterial({ color: PALETTE.fordEdge, transparent: true, opacity: 0, depthWrite: false }),
    );
    mesh.name = 'ford-ripple';
    mesh.renderOrder = 2;
    mesh.position.set(point.x, map.waterLevel + 0.06, point.y);
    ripples.push({ mesh, phase: random(), size: 0.8 + random() * 1.2 });
    group.add(mesh);
  }
  return group;
}

/** Props without a Blender model: buriti, cerrado tree, rock, lamp, rail, barricade, coffee row. */
function placeholderProp(name: string): THREE.Group | null {
  const group = new THREE.Group();
  group.name = `placeholder:${name}`;
  switch (name) {
    case 'buriti':
      placed(group, unitCylinder, PALETTE.bark, 0, 5, 0, [0.28, 10, 0.28]);
      for (let index = 0; index < 6; index += 1) {
        const leaf = placed(group, unitCone, PALETTE.leaf, 0, 10, 0, [0.8, 3.4, 0.4], (index / 6) * Math.PI * 2);
        leaf.rotation.z = 1.2;
      }
      return group;
    case 'cerrado-tree':
      placed(group, unitCylinder, PALETTE.bark, 0, 1.2, 0, [0.18, 2.4, 0.18]);
      placed(group, unitRock, PALETTE.scrub, 0.4, 3, 0, [1.8, 0.9, 1.6]);
      return group;
    case 'rock':
      placed(group, unitRock, PALETTE.rock, 0, 1, 0, [2.6, 2, 2.2]);
      return group;
    case 'lamp':
      placed(group, unitCylinder, PALETTE.metal, 0, 1.8, 0, [0.06, 3.6, 0.06]);
      placed(group, unitBox, PALETTE.brass, 0, 3.7, 0, [0.35, 0.45, 0.35]);
      return group;
    case 'rail':
      for (const side of [-0.72, 0.72]) placed(group, unitBox, PALETTE.steel, side, 0.06, 0, [0.08, 0.08, 1]);
      return group;
    case 'coffee-row':
      for (let index = 0; index < 8; index += 1) {
        placed(group, unitRock, PALETTE.coffee, 0, 0.9, index * 1.5 - 5.25, [0.8, 0.9, 0.8]);
      }
      return group;
    case 'cart':
    case 'well':
    case 'haystack':
      return null;
    // add-map-editor: the catalog's stones, plants, posts and props.
    case 'rock-small':
    case 'boulder':
    case 'matacao':
    case 'stone-pile': {
      const entry = catalogObject(name)!;
      const stones = name === 'stone-pile' ? 5 : 1;
      for (let index = 0; index < stones; index += 1) {
        const spread = stones > 1 ? 0.55 : 0;
        const angle = (index / stones) * Math.PI * 2;
        const size = stones > 1 ? 0.55 : 1;
        placed(
          group,
          unitRock,
          index % 2 === 0 ? PALETTE.rock : PALETTE.stoneDark,
          Math.cos(angle) * entry.halfWidth * spread,
          (entry.height * size) / 2,
          Math.sin(angle) * entry.halfDepth * spread,
          [entry.halfWidth * size, (entry.height * size) / 2, entry.halfDepth * size],
          angle,
        );
      }
      return group;
    }
    case 'outcrop': {
      const entry = catalogObject(name)!;
      for (const [dx, sx, sy] of [
        [-0.55, 0.5, 1],
        [0, 0.6, 0.8],
        [0.55, 0.45, 0.65],
      ] as const) {
        placed(group, unitRock, PALETTE.stone, dx * entry.halfWidth, (entry.height * sy) / 2, 0, [entry.halfWidth * sx, (entry.height * sy) / 2, entry.halfDepth], dx);
      }
      return group;
    }
    case 'lajedo-slab': {
      const entry = catalogObject(name)!;
      placed(group, unitBox, PALETTE.stone, 0, entry.height / 2, 0, [entry.halfWidth * 2, entry.height, entry.halfDepth * 2]);
      placed(group, unitBox, PALETTE.stoneDark, entry.halfWidth * 0.3, entry.height + 0.02, -entry.halfDepth * 0.2, [entry.halfWidth * 0.9, 0.04, entry.halfDepth * 0.7], 0.3);
      return group;
    }
    case 'juazeiro':
      placed(group, unitCylinder, PALETTE.bark, 0, 1.2, 0, [0.3, 2.4, 0.3]);
      placed(group, unitRock, PALETTE.leafDark, 0, 3.6, 0, [2.6, 1.4, 2.4]);
      placed(group, unitRock, PALETTE.leaf, 0.8, 4.4, 0.3, [1.6, 0.9, 1.5]);
      return group;
    case 'mandacaru':
      // A columnar cactus: a trunk and arms that turn up.
      placed(group, unitCylinder, PALETTE.capim, 0, 2, 0, [0.28, 4, 0.28]);
      for (const [side, height] of [
        [-1, 1.8],
        [1, 2.4],
      ] as const) {
        placed(group, unitBox, PALETTE.capim, side * 0.45, height, 0, [0.7, 0.32, 0.32]);
        placed(group, unitCylinder, PALETTE.capim, side * 0.8, height + 0.7, 0, [0.22, 1.5, 0.22]);
      }
      return group;
    case 'xique-xique':
    case 'macambira': {
      const entry = catalogObject(name)!;
      const stems = name === 'xique-xique' ? 9 : 12;
      for (let index = 0; index < stems; index += 1) {
        const angle = (index / stems) * Math.PI * 2;
        const reach = (index % 3) / 3;
        const height = entry.height * (0.6 + (index % 4) * 0.15);
        const stem = placed(
          group,
          name === 'xique-xique' ? unitCylinder : unitCone,
          name === 'xique-xique' ? PALETTE.capim : PALETTE.scrub,
          Math.cos(angle) * entry.halfWidth * reach,
          height / 2,
          Math.sin(angle) * entry.halfDepth * reach,
          name === 'xique-xique' ? [0.14, height, 0.14] : [0.12, height, 0.5],
          angle,
        );
        stem.rotation.z = name === 'xique-xique' ? (reach - 0.3) * 0.6 : 0.5;
      }
      return group;
    }
    case 'bush':
      placed(group, unitRock, PALETTE.scrub, 0, 0.65, 0, [1.4, 0.65, 1.3]);
      placed(group, unitRock, PALETTE.leafDark, 0.5, 0.9, -0.3, [0.8, 0.5, 0.8]);
      return group;
    case 'telegraph-pole':
      placed(group, unitCylinder, PALETTE.wood, 0, 3, 0, [0.12, 6, 0.12]);
      placed(group, unitBox, PALETTE.wood, 0, 5.6, 0, [1.4, 0.12, 0.12]);
      return group;
    case 'flagpole':
      placed(group, unitCylinder, PALETTE.whitewash, 0, 3.5, 0, [0.06, 7, 0.06]);
      return group;
    case 'hitching-post':
      for (const side of [-1, 1]) placed(group, unitBox, PALETTE.wood, side * 1.1, 0.5, 0, [0.14, 1, 0.14]);
      placed(group, unitBox, PALETTE.wood, 0, 0.95, 0, [2.4, 0.1, 0.1]);
      return group;
    case 'water-trough':
      placed(group, unitBox, PALETTE.stone, 0, 0.35, 0, [3, 0.7, 0.8]);
      placed(group, unitBox, PALETTE.water, 0, 0.66, 0, [2.7, 0.04, 0.55]);
      return group;
    case 'woodpile':
      for (let row = 0; row < 3; row += 1) {
        for (let index = 0; index < 4 - row; index += 1) {
          const log = placed(group, unitCylinder, index % 2 ? PALETTE.bark : PALETTE.wood, (index - (3 - row) / 2) * 0.62, 0.2 + row * 0.36, 0, [0.18, 1.2, 0.18]);
          log.rotation.x = Math.PI / 2;
        }
      }
      return group;
    case 'fallen-log': {
      const log = placed(group, unitCylinder, PALETTE.bark, 0, 0.32, 0, [0.32, 6, 0.32]);
      log.rotation.z = Math.PI / 2;
      return group;
    }
    default:
      placed(group, unitBox, PALETTE.sandbag, 0, 0.5, 0, [1, 1, 1]);
      return group;
  }
}

/** The look of each authored wall or fence kind (add-map-editor); wire fences are the world layer's. */
const LINE_LOOK: Readonly<Record<string, { color: number; thickness: number; kind: 'solid' | 'boards' | 'pickets' | 'hedge' }>> = {
  'taipa-wall': { color: PALETTE.adobe, thickness: 0.6, kind: 'solid' },
  'stone-wall': { color: PALETTE.stone, thickness: 0.7, kind: 'solid' },
  'brick-wall': { color: PALETTE.whitewash, thickness: 0.3, kind: 'solid' },
  'board-fence': { color: PALETTE.wood, thickness: 0.08, kind: 'boards' },
  'picket-fence': { color: PALETTE.whitewash, thickness: 0.06, kind: 'pickets' },
  hedgerow: { color: PALETTE.leafDark, thickness: 1.4, kind: 'hedge' },
};

/** The lines the map layer draws: authored walls and fences, and a hand-written map's board fences. */
function mapLines(map: BattleMap): readonly MapLine[] {
  if (map.fenceStyle !== 'boards') return map.lines ?? [];
  return [...(map.lines ?? []), ...map.fences.map((points) => ({ kind: 'board-fence', points, height: 1.5 }))];
}

/** Walls and fences drawn along their polylines, in pieces of at most 2 m that follow the ground. */
export function lines(map: BattleMap): THREE.Group {
  const group = new THREE.Group();
  group.name = 'battle-map-lines';
  const pieces = new Instancer();
  for (const line of mapLines(map)) {
    const look = LINE_LOOK[line.kind];
    if (!look) continue;
    for (let index = 1; index < line.points.length; index += 1) {
      const from = line.points[index - 1]!;
      const to = line.points[index]!;
      const length = Math.hypot(to.x - from.x, to.y - from.y);
      const count = Math.max(1, Math.ceil(length / 2));
      const rotation = -Math.atan2(to.y - from.y, to.x - from.x);
      for (let piece = 0; piece < count; piece += 1) {
        const t = (piece + 0.5) / count;
        const x = from.x + (to.x - from.x) * t;
        const y = from.y + (to.y - from.y) * t;
        const frame = { x, ground: terrainHeightAt(x, y), y, rotation };
        const width = length / count;
        if (look.kind === 'solid') {
          // Sunk a little so a piece on a slope shows no gap under it.
          pieces.add(unitBox, look.color, frame, [0, line.height / 2 - 0.15, 0], [width + 0.02, line.height + 0.3, look.thickness]);
          // A tiled coping on plastered and taipa walls; a stone wall's top stones.
          if (line.kind !== 'stone-wall') pieces.add(unitBox, PALETTE.roofDark, frame, [0, line.height + 0.05, 0], [width + 0.04, 0.1, look.thickness + 0.12]);
          else pieces.add(unitRock, PALETTE.stoneDark, frame, [0, line.height, 0], [width * 0.45, 0.14, look.thickness * 0.5], piece);
        } else if (look.kind === 'boards') {
          pieces.add(unitBox, look.color, frame, [0, line.height / 2, 0], [width, line.height, look.thickness]);
          pieces.add(unitBox, PALETTE.bark, frame, [-width / 2, line.height / 2, 0.06], [0.12, line.height + 0.1, 0.12]);
        } else if (look.kind === 'pickets') {
          const pickets = Math.max(2, Math.round(width / 0.25));
          for (let n = 0; n < pickets; n += 1) pieces.add(unitBox, look.color, frame, [-width / 2 + (n + 0.5) * (width / pickets), line.height / 2, 0], [0.08, line.height, look.thickness]);
          pieces.add(unitBox, look.color, frame, [0, line.height * 0.7, 0.05], [width, 0.08, 0.04]);
        } else {
          pieces.add(unitRock, look.color, frame, [0, line.height / 2, 0], [width * 0.7, line.height / 2, look.thickness / 2], piece);
        }
      }
    }
  }
  pieces.build(group);
  return group;
}

/**
 * refine-map-editor 2.4: trench lines, dressed on the simulation's cut (a man
 * on the floor is drawn where he stands, below the ground): a dark floor with
 * duckboards, revetted walls up to the lip, the parapet (an earth berm or
 * sandbag courses) on the fire side, and the traverses of its bays.
 */
export function trenchWorks(map: BattleMap): THREE.Group {
  const group = new THREE.Group();
  group.name = 'battle-map-trenches';
  const pieces = new Instancer();
  const half = TRENCH.floor / 2;
  for (const line of map.trenches ?? []) {
    const built = buildTrenchLine(line, 0);
    const fire = line.kind === 'fire';
    // Right of travel is +normal; the fire side is +1 for a right-facing line.
    const front = line.facing === 'right' ? 1 : -1;
    const floor = drapedRibbon(map, line.points, -half, half, 1, PALETTE.trenchDeep, 'trench-floor');
    group.add(floor);
    group.add(revetment(line.points, half, 1));
    group.add(revetment(line.points, half, -1));
    // Duckboards: slats across the floor every half metre, on two runners.
    for (const point of walk(line.points, 0.5)) {
      const ground = terrainHeightAt(point.x, point.y);
      const rotation = -Math.atan2(-point.nx, point.ny);
      const frame = { x: point.x, ground, y: point.y, rotation };
      pieces.add(unitBox, PALETTE.duckboard, frame, [0, 0.1, 0], [0.32, 0.04, TRENCH.floor * 0.7]);
    }
    if (fire && line.parapet === 'sandbag') {
      const offset = half + 0.4;
      for (const point of walk(line.points, 0.8)) {
        const x = point.x + point.nx * offset * front;
        const y = point.y + point.ny * offset * front;
        const frame = { x, ground: terrainHeightAt(x, y), y, rotation: -Math.atan2(-point.nx, point.ny) };
        for (let course = 0; course < 2; course += 1) pieces.add(unitBox, PALETTE.sandbag, frame, [course * 0.2, 0.15 + course * 0.3, 0], [0.76, 0.3, 0.46]);
      }
    } else if (built.parapet) {
      group.add(drapedRibbon(map, built.parapet, -TRENCH.parapetWidth / 2, TRENCH.parapetWidth / 2, 1, PALETTE.trenchEarth, 'trench-parapet'));
    }
    for (const traverse of built.traverses) {
      const frame = { x: traverse.x, ground: terrainHeightAt(traverse.x, traverse.y), y: traverse.y, rotation: -traverse.rotation };
      pieces.add(unitBox, PALETTE.trenchEarth, frame, [0, 0.35, 0], [1.0, 0.9, TRENCH.floor * 0.5]);
    }
  }
  pieces.build(group);
  return group;
}

/** A trench wall: a vertical strip from the floor's edge up to the ground just past it. */
function revetment(points: readonly Vec2[], half: number, side: 1 | -1): THREE.Mesh {
  const positions: number[] = [];
  const indices: number[] = [];
  walk(points, 1).forEach((point, index) => {
    const x = point.x + point.nx * half * side;
    const y = point.y + point.ny * half * side;
    const lipX = point.x + point.nx * (half + TRENCH.wall + 0.3) * side;
    const lipY = point.y + point.ny * (half + TRENCH.wall + 0.3) * side;
    positions.push(x, terrainHeightAt(x, y) + 0.02, y, x, Math.max(terrainHeightAt(x, y), terrainHeightAt(lipX, lipY)) + 0.08, y);
    if (index > 0) {
      const base = (index - 1) * 2;
      indices.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
    }
  });
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  const mesh = new THREE.Mesh(geometry, toon({ color: PALETTE.revetment, side: THREE.DoubleSide }));
  mesh.name = 'trench-revetment';
  return mesh;
}

/**
 * One prop as the battle layer draws it, for previews (the editor's tree
 * thumbnails): its model when the environment has one, else its placeholder.
 */
export function propPreview(model: string, asset: EnvironmentAsset | null): THREE.Object3D | null {
  const geometry = isModelled(model) ? asset?.geometry(model) : undefined;
  if (geometry && asset) return new THREE.Mesh(geometry, asset.materialOf(model));
  return placeholderProp(model);
}

/** Props the Blender environment already has. */
const MODELLED_PROPS = new Set(['tree-broad', 'tree-pine', 'tree-araucaria', 'buriti', 'cerrado-tree', 'bush', 'cart', 'well', 'haystack', 'barrel', 'crate']);

/** A modelled prop, or a tree or plant of a biome file (biome-trees-and-plants 4.1). */
const isModelled = (model: string): boolean => MODELLED_PROPS.has(model) || !!catalogObject(model)?.modelFile;

export class BattleMapLayer {
  readonly group = new THREE.Group();
  private readonly placements = new ModelPlacements();
  private readonly rafts = new Map<number, THREE.Group>();
  private readonly ripples: Ripple[] = [];
  private readonly plants: THREE.InstancedMesh[];
  private readonly clumps: THREE.InstancedMesh[];
  private strategicPlants = false;
  /** The trees as drawn up close, and their strategic stand-ins (biome-trees-and-plants 4.1). */
  private trees: THREE.Group | null = null;
  private impostors: THREE.Group | null = null;
  /** biome-trees-and-plants 4.1b: the crowns that fade over the player's men. */
  readonly canopy = new CanopyFade();

  constructor(private readonly map: BattleMap) {
    this.group.name = `battle-map:${map.id}`;
    this.buildWater();
    // An editor map's painted ground draws its own roads.
    if (!map.paint) this.group.add(roadsAndHeadlands(map));
    const plants = vegetation(map);
    this.plants = plants.plants;
    this.clumps = plants.clumps;
    this.group.add(plants.group);
    this.group.add(lines(map));
    this.group.add(trenchWorks(map));
    // Placeholder buildings as instanced pieces (the Bairro has over a hundred).
    const placeholders = new Instancer();
    for (const building of map.buildings) {
      if (MODELLED.has(building.model)) {
        this.placements.add(building.model, building.x, building.y, building.rotation);
      } else {
        placeholderBuilding(building, placeholders);
      }
    }
    const buildings = new THREE.Group();
    buildings.name = 'battle-map-buildings';
    placeholders.build(buildings);
    this.group.add(buildings);
    for (const prop of map.props) {
      if (isModelled(prop.model)) {
        this.placements.add(prop.model, prop.x, prop.y, prop.rotation ?? 0, prop.scale ?? 1);
        continue;
      }
      const piece = placeholderProp(prop.model);
      if (!piece) continue;
      piece.position.set(prop.x, terrainHeightAt(prop.x, prop.y), prop.y);
      // Line props (rails, coffee rows) lie along the line they were laid on.
      piece.rotation.y = prop.model === 'rail' || prop.model === 'coffee-row' ? (prop.rotation ?? 0) : -(prop.rotation ?? 0);
      piece.scale.setScalar(prop.scale ?? 1);
      if (prop.model === 'rail') piece.scale.set(1, 1, prop.scale ?? 1);
      this.group.add(piece);
    }
    for (const entry of map.bridges) this.group.add(bridge(map, entry));
    for (const ferry of map.ferries) {
      const raft = ferryRaft();
      raft.position.set(ferry.landingA.x, this.deckAt(ferry.landingA.x, ferry.landingA.y), ferry.landingA.y);
      raft.rotation.y = -Math.atan2(ferry.landingB.x - ferry.landingA.x, ferry.landingB.y - ferry.landingA.y);
      this.rafts.set(ferry.id, raft);
      this.group.add(raft);
      // The cable, bank post to bank post, a little above the water.
      const cable = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(ferry.landingA.x, map.waterLevel + 1.4, ferry.landingA.y),
          new THREE.Vector3(ferry.landingB.x, map.waterLevel + 1.4, ferry.landingB.y),
        ]),
        new THREE.LineBasicMaterial({ color: PALETTE.wire }),
      );
      this.group.add(cable);
      this.group.add(ferryLanding(map, ferry.landingA, ferry.landingB));
      this.group.add(ferryLanding(map, ferry.landingB, ferry.landingA));
    }
  }

  private buildWater(): void {
    for (const area of this.map.water) {
      if (area.kind === 'ford' && area.polygon) this.group.add(ford(this.map, area.polygon, this.ripples));
    }
    // Deep water, and the fords' river reaches, inside traced outlines.
    const deep = this.map.water.filter((area) => area.kind === 'deep');
    const fordReaches = this.map.water.filter((area) => area.kind === 'ford' && area.strip).map((area) => ({ kind: area.kind, strip: area.strip! }));
    const deepMesh = outlineMesh(traceWaterOutlines(this.map, deep), this.map.waterLevel, WATER_LOOK.deep.color, WATER_LOOK.deep.opacity, 'water:deep');
    if (deepMesh) this.group.add(deepMesh);
    const fordMesh = outlineMesh(traceWaterOutlines(this.map, fordReaches, deep), this.map.waterLevel + 0.03, WATER_LOOK.ford.color, WATER_LOOK.ford.opacity, 'water:ford');
    if (fordMesh) this.group.add(fordMesh);
    this.group.add(shoals(this.map));
    if (this.map.water.some((area) => area.strip)) this.group.add(riverbanks(this.map));
  }

  /** The raft floats on the water, or sits on the landing's ground when docked above it. */
  private deckAt(x: number, y: number): number {
    return Math.max(this.map.waterLevel, terrainHeightAt(x, y));
  }

  /** Moves the rafts to where the simulation has them. */
  update(ferries: readonly { id: number; x: number; y: number }[] | undefined): void {
    for (const ferry of ferries ?? []) {
      const raft = this.rafts.get(ferry.id);
      if (raft) raft.position.set(ferry.x, this.deckAt(ferry.x, ferry.y), ferry.y);
    }
    // The ford's ripples widen and fade on a loop (view time, not simulation time).
    const seconds = performance.now() / 1000;
    for (const ripple of this.ripples) {
      const t = (seconds / RIPPLE_SECONDS + ripple.phase) % 1;
      ripple.mesh.scale.setScalar(ripple.size * (0.3 + t));
      (ripple.mesh.material as THREE.MeshBasicMaterial).opacity = 0.55 * (1 - t);
    }
  }

  /**
   * Each frame: the plants' sway clock, and at strategic span the capped
   * clumps instead of every plant (refine-map-editor D1).
   */
  tick(seconds: number, span: number): void {
    PLANT_SWAY.value = seconds;
    const strategic = span > STRATEGIC_PLANT_SPAN;
    if (strategic === this.strategicPlants) return;
    this.strategicPlants = strategic;
    for (const mesh of this.plants) mesh.visible = !strategic;
    for (const mesh of this.clumps) mesh.visible = strategic;
    if (strategic) this.canopy.clear();
    this.showImpostors();
  }

  /** The biome tree files this map's props need (biome-trees-and-plants 4.1). */
  modelFiles(): string[] {
    return modelFilesOf(this.map.props.map((prop) => prop.model));
  }

  useModels(asset: EnvironmentAsset): void {
    warnMissing('battle map', this.placements.missing(asset));
    this.trees = this.placements.build(asset);
    for (const mesh of this.trees.children) if (asset.isTree(mesh.name)) this.canopy.add(mesh as THREE.InstancedMesh);
    this.impostors = this.placements.buildImpostors(asset);
    this.impostors.name = 'battle-map-tree-impostors';
    this.group.add(this.trees, this.impostors);
    this.showImpostors();
  }

  /** At strategic span the trees give way to their stand-ins; other models stay. */
  private showImpostors(): void {
    if (!this.trees || !this.impostors) return;
    const strategic = this.strategicPlants;
    const stood = new Set(this.impostors.children.map((mesh) => mesh.name));
    for (const mesh of this.trees.children) if (stood.has(mesh.name)) mesh.visible = !strategic;
    this.impostors.visible = strategic;
  }
}
