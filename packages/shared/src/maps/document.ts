import type { CoverPoint, Vec2 } from '../protocol';
import type { TerrainSurface } from '../terrain';
import { buildingCover, type Building } from '../world';
import {
  catalogObject,
  lineKind,
  solidBlocksSight,
  solidQuality,
  type CatalogObject,
  type LineKind,
} from './catalog-objects';
import { distanceToPolyline, pointInPolygon, pointsBox, polygonBox, smooth, type Box } from './geometry';
import { GROUND_MATERIAL_IDS, groundMaterial, groundMaterialIndex, type GroundMaterialId } from './ground-materials';
import { decodeRaster, encodeRaster, type EncodedRaster } from './raster';
import { HEIGHT_SPACING, SURFACES, VEGETATION_KINDS } from './runtime';
import { boundsForSize, MAP_SIZE_METRES, MAP_SIZES, type MapSize } from './sizes';
import type { BattleMap, DeploymentZone, LocalizedText, MapLine, PropPlacement, WaterArea } from './types';

/**
 * The map editor's document (add-map-editor): raster layers (heights, paint,
 * vegetation) plus vector objects (roads, rivers, ponds, crossings, walls
 * and fences, placed objects, deployment). `compileMapDocument` turns it into
 * a `BattleMap`, purely and deterministically, so the simulation and the view
 * each compile the same numbers in their own thread.
 */

export const MAP_DOCUMENT_FORMAT = 'prestes-map';
export const MAP_DOCUMENT_VERSION = 1;

/** Heights the editor allows (m). */
export const MIN_HEIGHT = -12;
export const MAX_HEIGHT = 40;

export type RoadType = 'trail' | 'dirt-road' | 'cobbled-street' | 'paved-road';

export interface RoadTypeInfo {
  type: RoadType;
  nameKey: string;
  surface: TerrainSurface;
  material: GroundMaterialId;
  /** How far the road sinks into the ground (m). */
  sink: number;
  defaultWidth: number;
}

export const ROAD_TYPES: readonly RoadTypeInfo[] = [
  { type: 'trail', nameKey: 'editor.road.trail', surface: 'dirt-road', material: 'packed-earth', sink: 0.05, defaultWidth: 2 },
  { type: 'dirt-road', nameKey: 'editor.road.dirt-road', surface: 'dirt-road', material: 'packed-earth', sink: 0.15, defaultWidth: 5 },
  { type: 'cobbled-street', nameKey: 'editor.road.cobbled-street', surface: 'cobbles', material: 'cobbles', sink: 0.05, defaultWidth: 7 },
  { type: 'paved-road', nameKey: 'editor.road.paved-road', surface: 'road', material: 'gravel', sink: 0, defaultWidth: 6 },
];

export function roadType(type: RoadType): RoadTypeInfo {
  return ROAD_TYPES.find((info) => info.type === type) ?? ROAD_TYPES[1]!;
}

/** A drainage ditch (vala) beside a road: this wide and deep (m). */
export const DITCH_WIDTH = 1.5;
export const DITCH_DEPTH = 0.8;
/** Road shoulders blend back into the ground over this many metres. */
const SHOULDER = 3;
/** River banks slope over this many metres. */
const RIVER_BANK = 5;
/** Deep water's bed sits this far under the water surface. */
const DEEP_BED = 1.8;

export interface DocRoad {
  id: number;
  type: RoadType;
  width: number;
  /** How much lower the edges are than the crown (m). */
  camber: number;
  ditches: { left: boolean; right: boolean };
  points: Vec2[];
}

export interface DocRiver {
  id: number;
  width: number;
  points: Vec2[];
  /** One kind per segment (points.length - 1). */
  kinds: ('deep' | 'ford')[];
}

export interface DocPond {
  id: number;
  kind: 'deep' | 'ford';
  polygon: Vec2[];
}

export interface DocBridge {
  id: number;
  x: number;
  y: number;
  rotation: number;
  halfWidth: number;
  halfDepth: number;
  deckHeight: number;
}

export interface DocFerry {
  id: number;
  landingA: Vec2;
  landingB: Vec2;
}

export interface DocLine {
  id: number;
  kind: LineKind;
  height: number;
  points: Vec2[];
}

export interface DocObject {
  id: number;
  /** A catalog object id. */
  type: string;
  x: number;
  y: number;
  /** Radians, the simulation's convention (the view turns by -rotation). */
  rotation: number;
  scale?: number;
}

export type MapUse = 'skirmish' | 'campaign';
export type SettingLabel = BattleMap['setting']['label'];
export type MapPalette = BattleMap['palette'];

interface MapDocumentBody {
  id: string;
  size: MapSize;
  name: LocalizedText;
  description: LocalizedText;
  use: MapUse;
  setting: { label: SettingLabel; sourceNote: string };
  codexKey?: string;
  palette: MapPalette;
  waterLevel: number;
  baseMaterial: GroundMaterialId;
  roads: DocRoad[];
  rivers: DocRiver[];
  ponds: DocPond[];
  bridges: DocBridge[];
  ferries: DocFerry[];
  lines: DocLine[];
  objects: DocObject[];
  deployment: { column: DeploymentZone; legalist: DeploymentZone };
}

/** The file format. */
export interface MapDocument extends MapDocumentBody {
  format: typeof MAP_DOCUMENT_FORMAT;
  version: number;
  layers: { height: EncodedRaster; paint: EncodedRaster; vegetation: EncodedRaster };
}

/** The editor's working form: the same, with the rasters decoded. */
export interface EditableMap extends MapDocumentBody {
  /** Whole centimetres, (side/2 + 1)² nodes, row by row from the north-west. */
  heights: Int16Array;
  /** GROUND_MATERIALS index per 1 m cell. */
  paint: Uint8Array;
  /** 0 none, else VEGETATION_KINDS index + 1, per 1 m cell. */
  vegetation: Uint8Array;
}

export function mapSide(size: MapSize): number {
  return MAP_SIZE_METRES[size];
}

export function heightNodes(size: MapSize): number {
  return mapSide(size) / HEIGHT_SPACING + 1;
}

const ID_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function isValidMapId(id: string): boolean {
  return ID_PATTERN.test(id) && id.length <= 48;
}

/** A new flat map, deployment zones 190 m apart on its north-south axis. */
export function createEditableMap(options: {
  id: string;
  size: MapSize;
  name?: Partial<LocalizedText>;
  baseMaterial?: GroundMaterialId;
  palette?: MapPalette;
  use?: MapUse;
}): EditableMap {
  const side = mapSide(options.size);
  const nodes = heightNodes(options.size);
  const reach = Math.min(95, side / 2 - 20);
  const zone = (y: number, facingY: number): DeploymentZone => ({
    sections: [-44, 0, 44].map((x) => ({ x, y })),
    facing: { x: 0, y: facingY },
  });
  const base = options.baseMaterial ?? 'grass';
  return {
    id: options.id,
    size: options.size,
    name: { en: options.name?.en ?? '', 'pt-BR': options.name?.['pt-BR'] ?? '' },
    description: { en: '', 'pt-BR': '' },
    use: options.use ?? 'skirmish',
    setting: { label: 'historical-setting-fictional-place', sourceNote: '' },
    palette: options.palette ?? 'temperate',
    waterLevel: -1.2,
    baseMaterial: base,
    heights: new Int16Array(nodes * nodes),
    paint: new Uint8Array(side * side).fill(groundMaterialIndex(base)),
    vegetation: new Uint8Array(side * side),
    roads: [],
    rivers: [],
    ponds: [],
    bridges: [],
    ferries: [],
    lines: [],
    objects: [],
    deployment: { column: zone(reach, -1), legalist: zone(-reach, 1) },
  };
}

export function toMapDocument(map: EditableMap): MapDocument {
  const { heights, paint, vegetation, ...body } = map;
  return {
    format: MAP_DOCUMENT_FORMAT,
    version: MAP_DOCUMENT_VERSION,
    ...structuredCloneBody(body),
    layers: { height: encodeRaster(heights), paint: encodeRaster(paint), vegetation: encodeRaster(vegetation) },
  };
}

function structuredCloneBody(body: MapDocumentBody): MapDocumentBody {
  return JSON.parse(JSON.stringify(body)) as MapDocumentBody;
}

export function fromMapDocument(document: MapDocument): EditableMap {
  const body: MapDocumentBody = { ...document };
  delete (body as Partial<MapDocument>).format;
  delete (body as Partial<MapDocument>).version;
  delete (body as Partial<MapDocument>).layers;
  const { layers } = document;
  const side = mapSide(body.size);
  const nodes = heightNodes(body.size);
  const heights = decodeRaster(layers.height, 'i16');
  const paint = decodeRaster(layers.paint, 'u8');
  const vegetation = decodeRaster(layers.vegetation, 'u8');
  if (heights.length !== nodes * nodes) throw new Error('height layer does not match the map size');
  if (paint.length !== side * side || vegetation.length !== side * side) throw new Error('paint layers do not match the map size');
  return { ...structuredCloneBody(body), heights, paint, vegetation };
}

export type ParseResult = { ok: true; document: MapDocument } | { ok: false; error: 'not-a-map' | 'newer-version' | 'invalid'; detail: string };

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const isNumber = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const isString = (value: unknown): value is string => typeof value === 'string';
const isPoint = (value: unknown): value is Vec2 => isObject(value) && isNumber(value.x) && isNumber(value.y);
const isPoints = (value: unknown, min: number): value is Vec2[] => Array.isArray(value) && value.length >= min && value.every(isPoint);
const isText = (value: unknown): value is LocalizedText => isObject(value) && isString(value.en) && isString(value['pt-BR']);
const isRaster = (value: unknown): value is EncodedRaster =>
  isObject(value) && value.encoding === 'rle-base64' && (value.type === 'i16' || value.type === 'u8') && isNumber(value.length) && isString(value.data);
const isZone = (value: unknown): value is DeploymentZone => isObject(value) && isPoints(value.sections, 1) && isPoint(value.facing);

/**
 * Older documents are upgraded here, one version at a time. Version 1 is
 * the first; future versions add their steps.
 */
function migrate(document: Record<string, unknown>): Record<string, unknown> {
  return document;
}

/** Checks and upgrades a parsed JSON value; never throws. */
export function parseMapDocument(value: unknown): ParseResult {
  if (!isObject(value) || value.format !== MAP_DOCUMENT_FORMAT) return { ok: false, error: 'not-a-map', detail: 'format' };
  if (!isNumber(value.version) || value.version < 1) return { ok: false, error: 'invalid', detail: 'version' };
  if (value.version > MAP_DOCUMENT_VERSION) return { ok: false, error: 'newer-version', detail: String(value.version) };
  const doc = migrate(value);
  const fail = (detail: string): ParseResult => ({ ok: false, error: 'invalid', detail });
  if (!isString(doc.id) || !isValidMapId(doc.id)) return fail('id');
  if (!MAP_SIZES.includes(doc.size as MapSize)) return fail('size');
  if (!isText(doc.name) || !isText(doc.description)) return fail('name');
  if (doc.use !== 'skirmish' && doc.use !== 'campaign') return fail('use');
  if (!isObject(doc.setting) || !isString(doc.setting.label) || !isString(doc.setting.sourceNote)) return fail('setting');
  if (!['training-ground', 'historical-setting-fictional-place', 'reconstructed-historical-place'].includes(doc.setting.label)) return fail('setting');
  if (!['temperate', 'cerrado', 'caatinga', 'urban'].includes(doc.palette as string)) return fail('palette');
  if (!isNumber(doc.waterLevel)) return fail('waterLevel');
  if (!GROUND_MATERIAL_IDS.includes(doc.baseMaterial as GroundMaterialId)) return fail('baseMaterial');
  if (!isObject(doc.layers) || !isRaster(doc.layers.height) || !isRaster(doc.layers.paint) || !isRaster(doc.layers.vegetation)) return fail('layers');
  for (const key of ['roads', 'rivers', 'ponds', 'bridges', 'ferries', 'lines', 'objects'] as const) {
    if (!Array.isArray(doc[key])) return fail(key);
  }
  const roads = doc.roads as unknown[];
  if (!roads.every((road) => isObject(road) && isNumber(road.id) && isNumber(road.width) && isNumber(road.camber) && isPoints(road.points, 2) && isObject(road.ditches) && ROAD_TYPES.some((info) => info.type === road.type))) return fail('roads');
  if (!(doc.rivers as unknown[]).every((river) => isObject(river) && isNumber(river.id) && isNumber(river.width) && isPoints(river.points, 2) && Array.isArray(river.kinds))) return fail('rivers');
  if (!(doc.ponds as unknown[]).every((pond) => isObject(pond) && isNumber(pond.id) && (pond.kind === 'deep' || pond.kind === 'ford') && isPoints(pond.polygon, 3))) return fail('ponds');
  if (!(doc.bridges as unknown[]).every((bridge) => isObject(bridge) && ['id', 'x', 'y', 'rotation', 'halfWidth', 'halfDepth', 'deckHeight'].every((key) => isNumber(bridge[key])))) return fail('bridges');
  if (!(doc.ferries as unknown[]).every((ferry) => isObject(ferry) && isNumber(ferry.id) && isPoint(ferry.landingA) && isPoint(ferry.landingB))) return fail('ferries');
  if (!(doc.lines as unknown[]).every((line) => isObject(line) && isNumber(line.id) && isNumber(line.height) && isPoints(line.points, 2) && isString(line.kind))) return fail('lines');
  if (!(doc.objects as unknown[]).every((object) => isObject(object) && isNumber(object.id) && isString(object.type) && isNumber(object.x) && isNumber(object.y) && isNumber(object.rotation))) return fail('objects');
  if (!isObject(doc.deployment) || !isZone(doc.deployment.column) || !isZone(doc.deployment.legalist)) return fail('deployment');
  const document = doc as unknown as MapDocument;
  try {
    fromMapDocument(document);
  } catch (error) {
    return fail(error instanceof Error ? error.message : 'layers');
  }
  return { ok: true, document };
}

/** Parses a map file's text. */
export function parseMapDocumentText(text: string): ParseResult {
  try {
    return parseMapDocument(JSON.parse(text) as unknown);
  } catch {
    return { ok: false, error: 'not-a-map', detail: 'json' };
  }
}

/**
 * Grows or crops every layer around the centre to `size`. New ground is flat
 * at 0 m and painted with the base material. Returns the objects (by id) that
 * now fall outside, without removing them; the caller decides.
 */
export function resizeEditableMap(map: EditableMap, size: MapSize): { map: EditableMap; outside: number[] } {
  if (size === map.size) return { map, outside: [] };
  const oldSide = mapSide(map.size);
  const newSide = mapSide(size);
  const shift = (newSide - oldSide) / 2;
  const paint = new Uint8Array(newSide * newSide).fill(groundMaterialIndex(map.baseMaterial));
  const vegetation = new Uint8Array(newSide * newSide);
  for (let y = 0; y < newSide; y += 1) {
    const oy = y - shift;
    if (oy < 0 || oy >= oldSide) continue;
    for (let x = 0; x < newSide; x += 1) {
      const ox = x - shift;
      if (ox < 0 || ox >= oldSide) continue;
      paint[y * newSide + x] = map.paint[oy * oldSide + ox]!;
      vegetation[y * newSide + x] = map.vegetation[oy * oldSide + ox]!;
    }
  }
  const oldNodes = heightNodes(map.size);
  const newNodes = heightNodes(size);
  const nodeShift = shift / HEIGHT_SPACING;
  const heights = new Int16Array(newNodes * newNodes);
  for (let row = 0; row < newNodes; row += 1) {
    const oldRow = row - nodeShift;
    if (oldRow < 0 || oldRow >= oldNodes) continue;
    for (let column = 0; column < newNodes; column += 1) {
      const oldColumn = column - nodeShift;
      if (oldColumn < 0 || oldColumn >= oldNodes) continue;
      heights[row * newNodes + column] = map.heights[oldRow * oldNodes + oldColumn]!;
    }
  }
  const half = newSide / 2;
  const outside = map.objects.filter((object) => Math.abs(object.x) > half || Math.abs(object.y) > half).map((object) => object.id);
  // Cropped: what falls outside goes (the editor lists it and asks first).
  const objects = map.objects.filter((object) => !outside.includes(object.id));
  return { map: { ...map, size, heights, paint, vegetation, objects }, outside };
}

// --- Compile -------------------------------------------------------------

interface Closest {
  distance: number;
  /** +1 right of the direction of travel (x east, y south), -1 left. */
  side: number;
  point: Vec2;
  segment: number;
}

function closestOnPolyline(x: number, y: number, points: readonly Vec2[]): Closest {
  let best: Closest = { distance: Number.POSITIVE_INFINITY, side: 1, point: points[0]!, segment: 0 };
  for (let index = 1; index < points.length; index += 1) {
    const a = points[index - 1]!;
    const b = points[index]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const length = dx * dx + dy * dy;
    const t = length === 0 ? 0 : Math.max(0, Math.min(1, ((x - a.x) * dx + (y - a.y) * dy) / length));
    const px = a.x + dx * t;
    const py = a.y + dy * t;
    const distance = Math.hypot(x - px, y - py);
    if (distance < best.distance) {
      const cross = dx * (y - a.y) - dy * (x - a.x);
      best = { distance, side: cross >= 0 ? 1 : -1, point: { x: px, y: py }, segment: index - 1 };
    }
  }
  return best;
}

interface Field {
  minX: number;
  minY: number;
  side: number;
  nodes: number;
  heights: Float64Array;
}

function sampleField(field: Field, x: number, y: number): number {
  const gx = Math.max(0, Math.min(field.nodes - 1.000001, (x - field.minX) / HEIGHT_SPACING));
  const gy = Math.max(0, Math.min(field.nodes - 1.000001, (y - field.minY) / HEIGHT_SPACING));
  const column = Math.floor(gx);
  const row = Math.floor(gy);
  const fx = gx - column;
  const fy = gy - row;
  const index = row * field.nodes + column;
  const h = field.heights;
  return (h[index]! * (1 - fx) + h[index + 1]! * fx) * (1 - fy) + (h[index + field.nodes]! * (1 - fx) + h[index + field.nodes + 1]! * fx) * fy;
}

function forNodesIn(field: Field, box: Box, visit: (index: number, x: number, y: number) => void): void {
  const fromX = Math.max(0, Math.floor((box.minX - field.minX) / HEIGHT_SPACING));
  const toX = Math.min(field.nodes - 1, Math.ceil((box.maxX - field.minX) / HEIGHT_SPACING));
  const fromY = Math.max(0, Math.floor((box.minY - field.minY) / HEIGHT_SPACING));
  const toY = Math.min(field.nodes - 1, Math.ceil((box.maxY - field.minY) / HEIGHT_SPACING));
  for (let row = fromY; row <= toY; row += 1) {
    for (let column = fromX; column <= toX; column += 1) {
      visit(row * field.nodes + column, field.minX + column * HEIGHT_SPACING, field.minY + row * HEIGHT_SPACING);
    }
  }
}

function forCellsIn(side: number, minX: number, minY: number, box: Box, visit: (index: number, x: number, y: number) => void): void {
  const fromX = Math.max(0, Math.floor(box.minX - minX));
  const toX = Math.min(side - 1, Math.ceil(box.maxX - minX));
  const fromY = Math.max(0, Math.floor(box.minY - minY));
  const toY = Math.min(side - 1, Math.ceil(box.maxY - minY));
  for (let cy = fromY; cy <= toY; cy += 1) {
    for (let cx = fromX; cx <= toX; cx += 1) visit(cy * side + cx, minX + cx + 0.5, minY + cy + 0.5);
  }
}

function inRotatedBox(x: number, y: number, cx: number, cy: number, halfWidth: number, halfDepth: number, rotation: number): boolean {
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const dx = x - cx;
  const dy = y - cy;
  return Math.abs(dx * cos + dy * sin) <= halfWidth && Math.abs(-dx * sin + dy * cos) <= halfDepth;
}

/** Pieces of at most `maxLength` m along a polyline: centre, rotation, half length. */
function pieces(points: readonly Vec2[], maxLength: number): { x: number; y: number; rotation: number; halfLength: number; from: Vec2; to: Vec2 }[] {
  const out: { x: number; y: number; rotation: number; halfLength: number; from: Vec2; to: Vec2 }[] = [];
  for (let index = 1; index < points.length; index += 1) {
    const from = points[index - 1]!;
    const to = points[index]!;
    const length = Math.hypot(to.x - from.x, to.y - from.y);
    if (length < 1e-6) continue;
    const count = Math.max(1, Math.ceil(length / maxLength));
    for (let piece = 0; piece < count; piece += 1) {
      const t0 = piece / count;
      const t1 = (piece + 1) / count;
      const a = { x: from.x + (to.x - from.x) * t0, y: from.y + (to.y - from.y) * t0 };
      const b = { x: from.x + (to.x - from.x) * t1, y: from.y + (to.y - from.y) * t1 };
      out.push({
        x: (a.x + b.x) / 2,
        y: (a.y + b.y) / 2,
        rotation: Math.atan2(to.y - from.y, to.x - from.x),
        halfLength: length / count / 2,
        from: a,
        to: b,
      });
    }
  }
  return out;
}

/** Offsets a polyline sideways by `offset` m (positive: right of travel). */
function offsetPolyline(points: readonly Vec2[], offset: number): Vec2[] {
  return points.map((point, index) => {
    const a = points[Math.max(0, index - 1)]!;
    const b = points[Math.min(points.length - 1, index + 1)]!;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const length = Math.hypot(dx, dy) || 1;
    // Right of travel in x-east, y-south coordinates is (-dy, dx).
    return { x: point.x - (dy / length) * offset, y: point.y + (dx / length) * offset };
  });
}

const SCRUB = VEGETATION_KINDS.indexOf('scrub') + 1;

/** The cover a catalog object gives, or null (buildings and foliage handled apart). */
function objectCover(entry: CatalogObject, object: DocObject, id: number): CoverPoint | null {
  const scale = object.scale ?? 1;
  const halfWidth = entry.halfWidth * scale;
  const halfDepth = entry.halfDepth * scale;
  const height = entry.height * scale;
  switch (entry.footprint.kind) {
    case 'solid':
      return {
        id,
        kind: entry.footprint.cover,
        x: object.x,
        y: object.y,
        rotation: object.rotation,
        halfWidth,
        halfDepth,
        height,
        radius: Math.max(halfWidth, halfDepth) + 1.4,
        quality: solidQuality(height),
        blocksMovement: true,
        blocksSight: solidBlocksSight(height, halfWidth, halfDepth),
        drawnBy: 'map',
      };
    case 'thin':
      // Sight lines read a cover's height against eye height: a post's is
      // kept under a prone man's eye so it never hides anyone.
      return {
        id,
        kind: 'fence',
        x: object.x,
        y: object.y,
        rotation: object.rotation,
        halfWidth,
        halfDepth,
        height: 0.1,
        radius: 0.5,
        quality: 0,
        blocksMovement: true,
        blocksSight: false,
        drawnBy: 'map',
      };
    default:
      return null;
  }
}

/** A trench line (four bays and their sandbag parapet), turned to `rotation`; the enemy is on its local north. */
function rotatedTrenchLine(firstId: number, object: DocObject): CoverPoint[] {
  const cos = Math.cos(object.rotation);
  const sin = Math.sin(object.rotation);
  const at = (lx: number, ly: number): Vec2 => ({ x: object.x + lx * cos - ly * sin, y: object.y + lx * sin + ly * cos });
  return [-9, -3, 3, 9].flatMap((dx, index): CoverPoint[] => {
    const bay = at(dx, 0);
    const parapet = at(dx, -1.9);
    return [
      { id: firstId + index * 2, kind: 'trench', ...bay, rotation: object.rotation, halfWidth: 2.8, halfDepth: 1.6, height: 0.2, radius: 3.2, quality: 0.4, blocksMovement: false, blocksSight: false },
      { id: firstId + index * 2 + 1, kind: 'sandbag', ...parapet, rotation: object.rotation, halfWidth: 2.8, halfDepth: 0.4, height: 0.9, radius: 3.5, quality: 0.3, blocksMovement: false, blocksSight: false },
    ];
  });
}

/** The id an authored map's locale keys hang off (it carries its own text). */
const textKey = (id: string, field: string): string => `map.${id}.${field}`;

/**
 * Compiles an editable map (or a decoded document) to a battle map. Pure and
 * deterministic: plain float math in a fixed order, heights rounded back to
 * whole centimetres, no RNG.
 */
export function compileMapDocument(source: EditableMap | MapDocument): BattleMap {
  const map = 'layers' in source ? fromMapDocument(source) : source;
  const bounds = boundsForSize(map.size);
  const side = mapSide(map.size);
  const nodes = heightNodes(map.size);
  const field: Field = { minX: bounds.minX, minY: bounds.minY, side, nodes, heights: new Float64Array(nodes * nodes) };
  for (let index = 0; index < field.heights.length; index += 1) field.heights[index] = map.heights[index]! / 100;

  // Water: carve river channels and pond beds under the water surface.
  const water: WaterArea[] = [];
  for (const river of [...map.rivers].sort((a, b) => a.id - b.id)) {
    const box = pointsBox(river.points, river.width / 2 + RIVER_BANK);
    forNodesIn(field, box, (index, x, y) => {
      const near = closestOnPolyline(x, y, river.points);
      const kind = river.kinds[near.segment] ?? 'deep';
      const bed = map.waterLevel - (kind === 'deep' ? DEEP_BED : 0.45);
      const edge = near.distance - river.width / 2;
      const current = field.heights[index]!;
      if (edge <= 0) field.heights[index] = Math.min(current, bed);
      else if (edge < RIVER_BANK) {
        const target = bed + (Math.max(current, map.waterLevel + 0.4) - bed) * smooth(edge / RIVER_BANK);
        field.heights[index] = Math.min(current, target);
      }
    });
    for (let segment = 0; segment + 1 < river.points.length; segment += 1) {
      const a = river.points[segment]!;
      const b = river.points[segment + 1]!;
      const kind = river.kinds[segment] ?? 'deep';
      const area: WaterArea = { kind, strip: { points: [a, b], width: river.width } };
      if (kind === 'ford') {
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        const length = Math.hypot(b.x - a.x, b.y - a.y) || 1;
        const nx = -(b.y - a.y) / length;
        const ny = (b.x - a.x) / length;
        const reach = river.width / 2 + 3;
        area.ends = [
          { x: mid.x + nx * reach, y: mid.y + ny * reach },
          { x: mid.x - nx * reach, y: mid.y - ny * reach },
        ];
      }
      water.push(area);
    }
  }
  for (const pond of [...map.ponds].sort((a, b) => a.id - b.id)) {
    const bed = map.waterLevel - (pond.kind === 'deep' ? DEEP_BED : 0.45);
    forNodesIn(field, polygonBox(pond.polygon), (index, x, y) => {
      if (pointInPolygon(x, y, pond.polygon)) field.heights[index] = Math.min(field.heights[index]!, bed);
    });
    water.push({ kind: pond.kind, polygon: pond.polygon });
  }

  // Surfaces and the view's paint, from the painted materials.
  const paint = map.paint.slice();
  const vegetation = map.vegetation.slice();
  const stampMaterial = (index: number, material: GroundMaterialId): void => {
    paint[index] = groundMaterialIndex(material);
  };

  // Roads: flatten across, sink, camber, ditches; in id order.
  const covers: CoverPoint[] = [];
  let coverId = 5000;
  const roadSurface = new Map<number, TerrainSurface>();
  for (const road of [...map.roads].sort((a, b) => a.id - b.id)) {
    const info = roadType(road.type);
    const half = road.width / 2;
    const reach = half + DITCH_WIDTH + SHOULDER;
    const box = pointsBox(road.points, reach);
    const base = { ...field, heights: field.heights.slice() };
    forNodesIn(field, box, (index, x, y) => {
      const near = closestOnPolyline(x, y, road.points);
      if (near.distance > reach) return;
      const crown = sampleField(base, near.point.x, near.point.y) - info.sink;
      const ditch = near.side > 0 ? road.ditches.right : road.ditches.left;
      const current = base.heights[index]!;
      let target: number;
      let weight = 1;
      if (near.distance <= half) {
        const t = near.distance / Math.max(half, 0.01);
        target = crown - road.camber * t * t;
      } else if (ditch && near.distance <= half + DITCH_WIDTH) {
        target = crown - road.camber - DITCH_DEPTH;
      } else {
        const start = half + (ditch ? DITCH_WIDTH : 0);
        target = crown - road.camber;
        weight = 1 - smooth((near.distance - start) / SHOULDER);
      }
      field.heights[index] = current + (target - current) * weight;
    });
    forCellsIn(side, bounds.minX, bounds.minY, pointsBox(road.points, half + DITCH_WIDTH), (index, x, y) => {
      const near = closestOnPolyline(x, y, road.points);
      if (near.distance <= half) {
        stampMaterial(index, info.material);
        roadSurface.set(index, info.surface);
        vegetation[index] = 0;
      } else if (near.distance <= half + DITCH_WIDTH && (near.side > 0 ? road.ditches.right : road.ditches.left)) {
        roadSurface.set(index, 'trench-floor');
        vegetation[index] = 0;
      }
    });
    // Ditches give the cover of a shallow trench.
    for (const [enabled, sign] of [
      [road.ditches.right, 1],
      [road.ditches.left, -1],
    ] as const) {
      if (!enabled) continue;
      for (const piece of pieces(offsetPolyline(road.points, sign * (half + DITCH_WIDTH / 2)), 12)) {
        covers.push({
          id: coverId++,
          kind: 'trench',
          x: piece.x,
          y: piece.y,
          rotation: piece.rotation,
          halfWidth: piece.halfLength,
          halfDepth: DITCH_WIDTH / 2,
          height: 0.2,
          radius: 2,
          quality: 0.3,
          blocksMovement: false,
          blocksSight: false,
          drawnBy: 'map',
        });
      }
    }
  }

  // Objects.
  const buildings: Building[] = [];
  const props: PropPlacement[] = [];
  let buildingId = 1000;
  const sortedObjects = [...map.objects].sort((a, b) => a.id - b.id);
  for (const object of sortedObjects) {
    const entry = catalogObject(object.type);
    if (!entry) continue;
    const scale = object.scale ?? 1;
    const halfWidth = entry.halfWidth * scale;
    const halfDepth = entry.halfDepth * scale;
    const footprintBox: Box = (() => {
      const reach = Math.hypot(halfWidth, halfDepth) + (entry.concealRadius ?? 0);
      return { minX: object.x - reach, minY: object.y - reach, maxX: object.x + reach, maxY: object.y + reach };
    })();
    const footprintCells = (visit: (index: number) => void): void =>
      forCellsIn(side, bounds.minX, bounds.minY, footprintBox, (index, x, y) => {
        if (inRotatedBox(x, y, object.x, object.y, halfWidth, halfDepth, object.rotation)) visit(index);
      });
    switch (entry.footprint.kind) {
      case 'building': {
        const building: Building = {
          id: buildingId++,
          model: entry.footprint.model,
          x: object.x,
          y: object.y,
          rotation: object.rotation,
          halfWidth,
          halfDepth,
          height: entry.height * scale,
        };
        buildings.push(building);
        covers.push(buildingCover(building));
        continue;
      }
      case 'trench-line':
        covers.push(...rotatedTrenchLine(coverId, object));
        coverId += 8;
        continue;
      case 'decal':
        footprintCells((index) => stampMaterial(index, entry.footprint.kind === 'decal' ? entry.footprint.material : map.baseMaterial));
        continue;
      case 'foliage':
        footprintCells((index) => {
          vegetation[index] = SCRUB;
        });
        break;
      default: {
        const cover = objectCover(entry, object, coverId);
        if (cover) {
          // Sandbags and barricades are drawn by the cover layer, like the hand-written maps'.
          if (entry.group === 'cover') delete cover.drawnBy;
          covers.push(cover);
          coverId += 1;
        }
        if (entry.group === 'cover') continue;
      }
    }
    if (entry.paints) {
      const material = entry.paints;
      footprintCells((index) => stampMaterial(index, material));
    }
    if (entry.concealRadius) {
      const radius = entry.concealRadius * scale;
      forCellsIn(side, bounds.minX, bounds.minY, footprintBox, (index, x, y) => {
        if (Math.hypot(x - object.x, y - object.y) <= radius) vegetation[index] = SCRUB;
      });
    }
    props.push({ model: entry.model, x: object.x, y: object.y, rotation: object.rotation, scale });
  }

  // Walls and fences.
  const lines: MapLine[] = [];
  const fences: Vec2[][] = [];
  for (const line of [...map.lines].sort((a, b) => a.id - b.id)) {
    const info = lineKind(line.kind);
    lines.push({ kind: line.kind, points: line.points, height: line.height });
    if (line.kind === 'wire-fence') fences.push(line.points);
    for (const piece of pieces(line.points, 12)) {
      covers.push({
        id: coverId++,
        kind: info.wall ? 'low-wall' : 'fence',
        x: piece.x,
        y: piece.y,
        rotation: piece.rotation,
        halfWidth: piece.halfLength,
        halfDepth: info.halfDepth,
        height: line.height,
        radius: info.wall ? piece.halfLength + 1.2 : 0.5,
        quality: info.wall ? (line.height >= 1.2 ? 0.4 : 0.35) : 0,
        blocksMovement: true,
        blocksSight: (info.wall || line.kind === 'board-fence' || line.kind === 'hedgerow') && line.height >= 1.75,
        drawnBy: 'map',
      });
    }
    if (info.conceals) {
      forCellsIn(side, bounds.minX, bounds.minY, pointsBox(line.points, info.halfDepth + 1), (index, x, y) => {
        if (distanceToPolyline(x, y, line.points) <= info.halfDepth + 0.5) vegetation[index] = SCRUB;
      });
    }
  }

  // Surfaces: painted material, then roads (water and bridges go over in the bake).
  const surfaces = new Uint8Array(side * side);
  for (let index = 0; index < surfaces.length; index += 1) {
    const surface = roadSurface.get(index) ?? groundMaterial(paint[index]!).surface;
    surfaces[index] = SURFACES.indexOf(surface);
  }

  const centimetres = new Int16Array(nodes * nodes);
  for (let index = 0; index < centimetres.length; index += 1) {
    const metres = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, field.heights[index]!));
    centimetres[index] = Math.round(metres * 100);
  }

  return {
    id: map.id,
    nameKey: textKey(map.id, 'name'),
    descriptionKey: textKey(map.id, 'description'),
    text: { name: { ...map.name }, description: { ...map.description } },
    codexKey: map.codexKey ?? '',
    setting: { ...map.setting },
    bounds,
    height: { kind: 'field', shapes: [], grid: { columns: nodes, rows: nodes, centimetres } },
    raster: { surfaces, vegetation },
    paint,
    baseSurface: groundMaterial(groundMaterialIndex(map.baseMaterial)).surface,
    surfaces: [],
    water,
    waterLevel: map.waterLevel,
    bridges: map.bridges.map((bridge) => ({ ...bridge })),
    ferries: map.ferries.map((ferry) => ({ id: ferry.id, landingA: { ...ferry.landingA }, landingB: { ...ferry.landingB } })),
    vegetation: [],
    buildings,
    covers,
    sightObstacles: [],
    deployment: {
      column: { sections: map.deployment.column.sections.map((p) => ({ ...p })), facing: { ...map.deployment.column.facing } },
      legalist: { sections: map.deployment.legalist.sections.map((p) => ({ ...p })), facing: { ...map.deployment.legalist.facing } },
    },
    props,
    fences,
    lines,
    palette: map.palette,
  };
}

/** The name or description of a map in a language: an authored map's own text, else null (use its locale key). */
export function authoredMapText(map: BattleMap, field: 'name' | 'description', language: string): string | null {
  if (!map.text) return null;
  const text = map.text[field];
  return (language === 'pt-BR' ? text['pt-BR'] : text.en) || text.en || text['pt-BR'] || map.id;
}
