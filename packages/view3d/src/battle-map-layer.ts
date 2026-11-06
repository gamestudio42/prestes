import * as THREE from 'three';
import {
  pointInPolygon,
  terrainHeightAt,
  type BattleMap,
  type Building,
  type Polygon,
  type Strip,
  type VegetationKind,
  type Vec2,
} from '@prestes/shared';
import { ModelPlacements, warnMissing, type EnvironmentAsset } from './environment-models';
import { toon } from './materials';
import { PALETTE } from './palette';

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

/** A placeholder building from its footprint: block, gable roof, a chimney or a bell tower. */
function placeholderBuilding(building: Building): THREE.Group {
  const look = BUILDING_LOOK[building.model] ?? { wall: PALETTE.plaster, roof: PALETTE.roof };
  const group = new THREE.Group();
  group.name = `placeholder:${building.model}`;
  const width = building.halfWidth * 2;
  const depth = building.halfDepth * 2;
  const wall = building.height * 0.72;
  const ground = terrainHeightAt(building.x, building.y);
  placed(group, unitBox, look.wall, 0, wall / 2, 0, [width, wall, depth]);
  const roof = placed(group, unitPrism, look.roof, 0, wall, 0, [width + 0.4, (building.height - wall) * 2, depth + 0.4]);
  // The ridge runs along the long side.
  if (depth > width) {
    roof.rotation.y = Math.PI / 2;
    roof.scale.set(depth + 0.4, (building.height - wall) * 2, width + 0.4);
  }
  // Doors and windows on the long faces, as dark plates.
  const faces = Math.max(1, Math.floor(width / 3));
  for (let index = 0; index < faces; index += 1) {
    const x = -width / 2 + (index + 0.5) * (width / faces);
    for (const side of [-1, 1]) {
      placed(group, unitBox, PALETTE.window, x, wall * 0.55, side * (depth / 2 + 0.02), [0.7, wall * 0.35, 0.05]);
    }
  }
  if (look.tower === 'chimney') {
    placed(group, unitCylinder, PALETTE.brickDark, width * 0.32, building.height * 0.9, 0, [0.6, building.height * 1.8, 0.6]);
  } else if (look.tower === 'bell') {
    placed(group, unitBox, look.wall, -width / 2 + 1.6, building.height * 0.8, 0, [3, building.height * 1.6, 3]);
    placed(group, unitCone, look.roof, -width / 2 + 1.6, building.height * 1.75, 0, [2.2, 2.4, 2.2], Math.PI / 4);
  }
  group.position.set(building.x, ground, building.y);
  group.rotation.y = -building.rotation;
  return group;
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

/** Each crop's clump: geometry, size, colours and grid spacing. */
const CLUMP: Readonly<
  Record<VegetationKind, { geometry: THREE.BufferGeometry; height: number; width: number; spacing: number; colors: number[] }>
> = {
  corn: { geometry: unitCone, height: 2.0, width: 0.32, spacing: 0.9, colors: [PALETTE.corn, PALETTE.cornTassel, PALETTE.corn] },
  cane: { geometry: unitCone, height: 2.5, width: 0.28, spacing: 0.8, colors: [PALETTE.cane, PALETTE.caneLight] },
  'tall-grass': { geometry: unitCone, height: 1.0, width: 0.35, spacing: 1.0, colors: [PALETTE.capim, PALETTE.grassLight, PALETTE.hay] },
  scrub: { geometry: unitRock, height: 1.4, width: 1.0, spacing: 2.6, colors: [PALETTE.scrub, PALETTE.leafDark, PALETTE.leaf] },
};

/** One instanced mesh per vegetation kind: clumps on a jittered grid inside each area. */
function vegetation(map: BattleMap): THREE.Group {
  const group = new THREE.Group();
  group.name = 'battle-map-vegetation';
  const random = seededRandom(seedOf(map.id));
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3();
  const color = new THREE.Color();
  for (const kind of ['corn', 'cane', 'tall-grass', 'scrub'] as const) {
    const areas = map.vegetation.filter((area) => area.kind === kind);
    if (areas.length === 0) continue;
    const look = CLUMP[kind];
    const points: Vec2[] = [];
    for (const area of areas) {
      const xs = area.polygon.map((point) => point.x);
      const ys = area.polygon.map((point) => point.y);
      for (let y = Math.min(...ys); y <= Math.max(...ys); y += look.spacing) {
        for (let x = Math.min(...xs); x <= Math.max(...xs); x += look.spacing) {
          const px = x + (random() - 0.5) * look.spacing * 0.7;
          const py = y + (random() - 0.5) * look.spacing * 0.7;
          if (pointInPolygon(px, py, area.polygon)) points.push({ x: px, y: py });
        }
      }
    }
    const mesh = new THREE.InstancedMesh(look.geometry, toon({ color: 0xffffff }), points.length);
    mesh.name = `vegetation:${kind}`;
    points.forEach((point, index) => {
      const height = look.height * (0.85 + random() * 0.3);
      const width = look.width * (0.8 + random() * 0.4);
      position.set(point.x, terrainHeightAt(point.x, point.y) + height / 2, point.y);
      quaternion.setFromAxisAngle(up, random() * Math.PI * 2);
      scale.set(width, kind === 'scrub' ? height / 2 : height, width);
      matrix.compose(position, quaternion, scale);
      mesh.setMatrixAt(index, matrix);
      color.setHex(look.colors[Math.floor(random() * look.colors.length)]!);
      mesh.setColorAt(index, color);
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    group.add(mesh);
  }
  return group;
}

/** A wooden bridge: deck, rails on posts, piers. */
function bridge(map: BattleMap, entry: BattleMap['bridges'][number]): THREE.Group {
  const group = new THREE.Group();
  group.name = 'placeholder:bridge';
  const deck = map.waterLevel + entry.deckHeight;
  const length = entry.halfDepth * 2;
  const width = entry.halfWidth * 2;
  placed(group, unitBox, PALETTE.wood, 0, deck - 0.12, 0, [width, 0.24, length]);
  for (const side of [-1, 1]) {
    placed(group, unitBox, PALETTE.bark, side * (entry.halfWidth - 0.1), deck + 0.85, 0, [0.12, 0.1, length]);
    for (let z = -entry.halfDepth; z <= entry.halfDepth + 0.01; z += 2.4) {
      placed(group, unitBox, PALETTE.bark, side * (entry.halfWidth - 0.1), deck + 0.45, z, [0.14, 0.9, 0.14]);
    }
  }
  for (let z = -entry.halfDepth + 3; z < entry.halfDepth - 2; z += 5) {
    for (const side of [-1, 1]) {
      placed(group, unitCylinder, PALETTE.bark, side * (entry.halfWidth - 0.3), deck - 2, z, [0.22, 4, 0.22]);
    }
  }
  group.position.set(entry.x, 0, entry.y);
  group.rotation.y = -entry.rotation;
  return group;
}

/** The ferry's raft (moved from the frame) and its cable. */
function ferryRaft(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'placeholder:ferry';
  placed(group, unitBox, PALETTE.wood, 0, 0.15, 0, [3.2, 0.3, 4.6]);
  for (const side of [-1, 1]) {
    placed(group, unitBox, PALETTE.bark, side * 1.55, 0.55, 0, [0.1, 0.5, 4.6]);
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
    default:
      placed(group, unitBox, PALETTE.sandbag, 0, 0.5, 0, [1, 1, 1]);
      return group;
  }
}

/** Props the Blender environment already has. */
const MODELLED_PROPS = new Set(['tree-broad', 'tree-pine', 'tree-araucaria', 'cart', 'well', 'haystack', 'barrel', 'crate']);

export class BattleMapLayer {
  readonly group = new THREE.Group();
  private readonly placements = new ModelPlacements();
  private readonly rafts = new Map<number, THREE.Group>();

  constructor(private readonly map: BattleMap) {
    this.group.name = `battle-map:${map.id}`;
    this.buildWater();
    this.group.add(vegetation(map));
    for (const building of map.buildings) {
      if (MODELLED.has(building.model)) {
        this.placements.add(building.model, building.x, building.y, building.rotation);
      } else {
        this.group.add(placeholderBuilding(building));
      }
    }
    for (const prop of map.props) {
      if (MODELLED_PROPS.has(prop.model)) {
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
      raft.position.set(ferry.landingA.x, map.waterLevel, ferry.landingA.y);
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
    }
  }

  private buildWater(): void {
    for (const area of this.map.water) {
      const color = area.kind === 'deep' ? PALETTE.waterDeep : PALETTE.ford;
      const opacity = area.kind === 'deep' ? 0.88 : 0.6;
      const height = this.map.waterLevel + (area.kind === 'ford' ? 0.02 : 0);
      if (area.polygon) this.group.add(polygonMesh(area.polygon, height, color, opacity));
      if (area.strip) this.group.add(stripMesh(area.strip, height, color, opacity));
    }
  }

  /** Moves the rafts to where the simulation has them. */
  update(ferries: readonly { id: number; x: number; y: number }[] | undefined): void {
    for (const ferry of ferries ?? []) {
      const raft = this.rafts.get(ferry.id);
      if (raft) raft.position.set(ferry.x, this.map.waterLevel, ferry.y);
    }
  }

  useModels(asset: EnvironmentAsset): void {
    warnMissing('battle map', this.placements.missing(asset));
    this.group.add(this.placements.build(asset));
  }
}
