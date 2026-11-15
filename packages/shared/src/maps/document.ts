import type { CoverPoint, Vec2 } from '../protocol';
import type { TerrainSurface } from '../terrain';
import { buildingCover, type Building } from '../world';
import {
  catalogObject,
  lineKind,
  solidBlocksSight,
  solidQuality,
  type BushClass,
  type CatalogObject,
  type LineKind,
} from './catalog-objects';
import { isBuildingVariant } from './building-variants';
import { corralWalls, isRockKind } from './rock-kinds';
import { isCampSide } from './camp-sides';
import { distanceToPolyline, pointInPolygon, pointsBox, polygonBox, smooth, type Box } from './geometry';
import { GROUND_MATERIAL_IDS, groundMaterial, groundMaterialIndex, type GroundMaterialId } from './ground-materials';
import { VEGETATION } from './concealment';
import { decodeRaster, encodeRaster, type EncodedRaster } from './raster';
import { BRIDGE_RAMP, bridgeDeckHeight, bridgeLandings, bridgePolygon, HEIGHT_SPACING, inArea, SURFACES, VEGETATION_KINDS, vegetationDensityOf, vegetationKindOf } from './runtime';
import { boundsForSize, MAP_SIZE_METRES, MAP_SIZES, type MapSize } from './sizes';
import { growthMask } from './growth-mask';
import { buildTrenchLines, TRENCH, type TrenchLineDef } from './trench-lines';
import { noteCoverPieces, type CoverPiece } from './cover-preview';
import { defaultDeploymentArea, sectionStartsFromArea } from './deployment-areas';
import { smoothCentreline } from './water-outline';
import { detectWallYards, type YardWall } from './wall-yards';
import { migrateEnemyPreset, type Roster } from '../sections';
import { compileEventPlaces, compileEvents, isBattleEvent, isEventPlace, type BattleEvent, type EventPlace } from './events';
import { DEFAULT_MAP_LIGHT, MAP_LIGHT_TIME, type BattleMap, type DeploymentZone, type HeightShape, type LocalizedText, type MapLight, type Objective, type MapLine, type PropPlacement, type WaterArea } from './types';

/**
 * The map editor's document (add-map-editor): raster layers (heights, paint,
 * vegetation) plus vector objects (roads, rivers, ponds, crossings, walls
 * and fences, placed objects, deployment). `compileMapDocument` turns it into
 * a `BattleMap`, purely and deterministically, so the simulation and the view
 * each compile the same numbers in their own thread.
 */

export const MAP_DOCUMENT_FORMAT = 'prestes-map';
export const MAP_DOCUMENT_VERSION = 9;

/** Heights the editor allows (m). */
export const MIN_HEIGHT = -12;
export const MAX_HEIGHT = 40;

export type RoadType = 'trail' | 'dirt-road' | 'cobbled-street' | 'paved-road';

export interface RoadTypeInfo {
  type: RoadType;
  nameKey: string;
  surface: TerrainSurface;
  material: GroundMaterialId;
  defaultWidth: number;
}

export const ROAD_TYPES: readonly RoadTypeInfo[] = [
  { type: 'trail', nameKey: 'editor.road.trail', surface: 'dirt-road', material: 'packed-earth', defaultWidth: 2 },
  { type: 'dirt-road', nameKey: 'editor.road.dirt-road', surface: 'dirt-road', material: 'packed-earth', defaultWidth: 5 },
  { type: 'cobbled-street', nameKey: 'editor.road.cobbled-street', surface: 'cobbles', material: 'cobbles', defaultWidth: 7 },
  { type: 'paved-road', nameKey: 'editor.road.paved-road', surface: 'road', material: 'gravel', defaultWidth: 6 },
];

export function roadType(type: RoadType): RoadTypeInfo {
  return ROAD_TYPES.find((info) => info.type === type) ?? ROAD_TYPES[1]!;
}

/** A drainage ditch (vala) beside a road: this wide and deep (m). */
export const DITCH_WIDTH = 1.5;
export const DITCH_DEPTH = 0.8;
/** A ditch's banks blend back into the ground over this many metres (the 2 m heightfield must see it). */
const DITCH_BANK = 1;
/** River banks slope over this many metres. */
const RIVER_BANK = 5;
/** Deep water's bed sits this far under the water surface. */
const DEEP_BED = 1.8;
/** author-game-maps: a river's bed eases between deep and ford over this many metres either side of the change. */
const FORD_TAPER = 6;

export interface DocRoad {
  id: number;
  type: RoadType;
  width: number;
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
  /** revise-buildings-and-stone 4.2: a dry stone wall's rock kind (`ROCK_KINDS`); unset is granite. */
  variant?: string;
}

/** refine-map-editor D6: a trench line, as `buildTrenchLine` takes it. */
export type DocTrenchLine = TrenchLineDef;

export interface DocObject {
  id: number;
  /** A catalog object id. */
  type: string;
  x: number;
  y: number;
  /** Radians, the simulation's convention (the view turns by -rotation). */
  rotation: number;
  scale?: number;
  /**
   * revise-buildings-and-stone: a building's look (`BUILDING_VARIANTS`, 3.5)
   * or a stone's rock kind (`ROCK_KINDS`, 4.1) or a camp object's side
   * (`CAMP_SIDES`, 5.2); unset is the model's own.
   */
  variant?: string;
}

/** author-game-maps: a skirmish map, a campaign mission's map, or the test map. */
export type MapUse = 'skirmish' | 'campaign' | 'test';
export type SettingLabel = BattleMap['setting']['label'];
export type MapPalette = BattleMap['palette'];

interface MapDocumentBody {
  id: string;
  size: MapSize;
  name: LocalizedText;
  description: LocalizedText;
  use: MapUse;
  /** author-game-maps D1: the campaign chapter this map is for (campaign maps). */
  mission?: string;
  /** author-game-maps D5: time of day and sun bearing; absent = midday from the north-east. */
  light?: MapLight;
  /**
   * add-map-compass: the bearing of true north on the grid, degrees clockwise
   * from the top edge; absent = 0 (the top is north).
   */
  north?: number;
  /**
   * author-game-maps: the legalist forces one is drawn from when the player
   * brings a roster (pre-battle-roster 2.3); absent = the default roster.
   */
  enemyForces?: Roster[];
  /** The column's fixed force on this map (a campaign mission's); absent = the player's roster. */
  columnForce?: Roster;
  /** add-map-objectives 1.3: regions to take and hold; absent = none. */
  objectives?: Objective[];
  /** add-battle-events 1.1: what happens during the battle; absent = nothing. */
  events?: BattleEvent[];
  /** add-battle-events 1.1: entry points and trigger areas the events name. */
  eventPlaces?: EventPlace[];
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
  trenches: DocTrenchLine[];
  objects: DocObject[];
  deployment: { column: DeploymentZone; legalist: DeploymentZone };
}

/**
 * author-game-maps D2: what the menus know of an authored map without
 * loading it (generated into authored/index.ts by tools/check-maps.ts).
 */
export interface AuthoredMapEntry {
  id: string;
  use: MapUse;
  mission?: string;
  size: MapSize;
  name: LocalizedText;
  description: LocalizedText;
  /** A preview image exists at maps/<id>.png. */
  preview: boolean;
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

/** author-game-maps D5: a document's light, defaulted and kept in range. */
export function mapLight(light: MapLight | undefined): MapLight {
  if (!light) return { ...DEFAULT_MAP_LIGHT };
  const time = Math.max(MAP_LIGHT_TIME.min, Math.min(MAP_LIGHT_TIME.max, light.time));
  const bearing = ((light.bearing % 360) + 360) % 360;
  return { time, bearing };
}

/** add-map-compass: a document's north, defaulted and kept in [0, 360). */
export function mapNorth(north: number | undefined): number {
  if (north === undefined || !Number.isFinite(north)) return 0;
  return ((north % 360) + 360) % 360;
}

/** A new flat map, deployment zones 190 m apart on its north-south axis. */
export function createEditableMap(options: {
  id: string;
  size: MapSize;
  name?: Partial<LocalizedText>;
  baseMaterial?: GroundMaterialId;
  palette?: MapPalette;
  use?: MapUse;
  mission?: string;
}): EditableMap {
  const side = mapSide(options.size);
  const nodes = heightNodes(options.size);
  const reach = Math.min(95, side / 2 - 20);
  const points = (y: number) => [-44, 0, 44].map((x) => ({ x, y }));
  const bounds = boundsForSize(options.size);
  const zone = (y: number, facingY: number): DeploymentZone => ({
    sections: points(y),
    facing: { x: 0, y: facingY },
    area: defaultDeploymentArea(bounds, points(y), points(-y)),
  });
  const base = options.baseMaterial ?? 'grass';
  return {
    id: options.id,
    size: options.size,
    name: { en: options.name?.en ?? '', 'pt-BR': options.name?.['pt-BR'] ?? '' },
    description: { en: '', 'pt-BR': '' },
    use: options.use ?? 'skirmish',
    ...(options.mission ? { mission: options.mission } : {}),
    light: { ...DEFAULT_MAP_LIGHT },
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
    trenches: [],
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

export function fromMapDocument(source: MapDocument): EditableMap {
  // A bundled or hand-loaded document may be older than this build: upgrade it first.
  const document = source.version < MAP_DOCUMENT_VERSION ? (migrate(source as unknown as Record<string, unknown>) as unknown as MapDocument) : source;
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
const isObjective = (value: unknown): value is Objective =>
  isObject(value) &&
  isNumber(value.id) &&
  isText(value.name) &&
  isPoints(value.area, 3) &&
  isPoint(value.flag) &&
  isNumber(value.value) &&
  (value.owner === 'neutral' || value.owner === 'column' || value.owner === 'legalist');
const isZone = (value: unknown): value is DeploymentZone => isObject(value) && isPoints(value.sections, 1) && isPoint(value.facing) && isPoints(value.area, 3);

/**
 * Older documents are upgraded here, one version at a time.
 *
 * 1 -> 2 (refine-map-editor): each `trench-line` object becomes a 12 m
 * straight fire trench at its place, its parapet on the side the object's
 * sandbags were (its local north); road cambers are dropped.
 *
 * 2 -> 3 (add-deployment-phase): each side gets the default deployment area
 * round its section points.
 *
 * 3 -> 4 (author-game-maps): `mission`, `light` and `enemyForces` are new
 * and optional; the document is only relabelled.
 *
 * 4 -> 5 (add-map-objectives): `objectives` is new and optional; a version 4
 * map opens with none.
 *
 * 5 -> 6 (faction-armies D5): a section id names its army, so no field is
 * new; the enemy presets' ids of the time before the armies go through the
 * successor table onto the Forças legalistas.
 *
 * 6 -> 7 (add-map-compass): `north` is new and optional; a version 6 map
 * keeps the top edge as north.
 *
 * 7 -> 8 (revise-buildings-and-stone 3.5, 4.2): an object's and a line's
 * `variant` are new and optional; a version 7 map's buildings keep their
 * default look and its stones and walls are granite.
 *
 * 8 -> 9 (add-battle-events 1.2): `events` and `eventPlaces` are new and
 * optional; a version 8 map opens with none.
 */
function migrate(document: Record<string, unknown>): Record<string, unknown> {
  let doc = document;
  if (doc.version === 1) doc = migrateV1(doc);
  if (doc.version === 2) doc = migrateV2(doc);
  if (doc.version === 3) doc = { ...doc, version: 4 };
  if (doc.version === 4) doc = { ...doc, version: 5 };
  if (doc.version === 5) doc = migrateV5(doc);
  if (doc.version === 6) doc = { ...doc, version: 7 };
  if (doc.version === 7) doc = { ...doc, version: 8 };
  if (doc.version === 8) doc = { ...doc, version: 9 };
  return doc;
}

function migrateV5(doc: Record<string, unknown>): Record<string, unknown> {
  if (!Array.isArray(doc.enemyForces)) return { ...doc, version: 6 };
  const enemyForces = doc.enemyForces.map((roster: unknown) =>
    isObject(roster) && Array.isArray(roster.sections) && roster.sections.every(isString) ? migrateEnemyPreset(roster.sections).roster : roster,
  );
  return { ...doc, version: 6, enemyForces };
}

function migrateV2(doc: Record<string, unknown>): Record<string, unknown> {
  if (!isObject(doc.deployment) || !MAP_SIZES.includes(doc.size as MapSize)) return { ...doc, version: 3 };
  const bounds = boundsForSize(doc.size as MapSize);
  const sides = doc.deployment;
  const sections = (zone: unknown): Vec2[] => (isObject(zone) && isPoints(zone.sections, 1) ? zone.sections : []);
  const withArea = (own: unknown, other: unknown) =>
    isObject(own) ? { ...own, area: isPoints(own.area, 3) ? own.area : defaultDeploymentArea(bounds, sections(own), sections(other)) } : own;
  return { ...doc, version: 3, deployment: { ...sides, column: withArea(sides.column, sides.legalist), legalist: withArea(sides.legalist, sides.column) } };
}

function migrateV1(doc: Record<string, unknown>): Record<string, unknown> {
  const objects = Array.isArray(doc.objects) ? (doc.objects as unknown[]) : [];
  const trenches: DocTrenchLine[] = [];
  let nextId = 1;
  const kept = objects.filter((object) => {
    if (!isObject(object) || object.type !== 'trench-line') return true;
    if (!isNumber(object.x) || !isNumber(object.y) || !isNumber(object.rotation)) return true;
    const cos = Math.cos(object.rotation);
    const sin = Math.sin(object.rotation);
    // Local x runs along the old object; its sandbags were at local -y, left of travel.
    trenches.push({
      id: nextId++,
      kind: 'fire',
      depth: 1.2,
      facing: 'left',
      bays: true,
      parapet: 'sandbag',
      points: [
        { x: object.x - 6 * cos, y: object.y - 6 * sin },
        { x: object.x + 6 * cos, y: object.y + 6 * sin },
      ],
    });
    return false;
  });
  const roads = Array.isArray(doc.roads)
    ? (doc.roads as unknown[]).map((road) => {
        if (!isObject(road)) return road;
        const copy = { ...road };
        delete copy.camber;
        return copy;
      })
    : doc.roads;
  return { ...doc, version: 2, objects: kept, roads, trenches };
}

const isTrenchLine = (line: unknown): boolean =>
  isObject(line) &&
  isNumber(line.id) &&
  (line.kind === 'fire' || line.kind === 'communication') &&
  (line.depth === 1.2 || line.depth === 0.8) &&
  (line.facing === 'left' || line.facing === 'right') &&
  typeof line.bays === 'boolean' &&
  (line.parapet === 'earth' || line.parapet === 'sandbag') &&
  isPoints(line.points, 2);

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
  if (doc.use !== 'skirmish' && doc.use !== 'campaign' && doc.use !== 'test') return fail('use');
  if (doc.mission !== undefined && !isString(doc.mission)) return fail('mission');
  if (doc.light !== undefined && !(isObject(doc.light) && isNumber(doc.light.time) && isNumber(doc.light.bearing))) return fail('light');
  if (doc.north !== undefined && !isNumber(doc.north)) return fail('north');
  if (doc.enemyForces !== undefined && !(Array.isArray(doc.enemyForces) && doc.enemyForces.every((roster) => isObject(roster) && Array.isArray(roster.sections) && roster.sections.every(isString)))) return fail('enemyForces');
  if (doc.columnForce !== undefined && !(isObject(doc.columnForce) && Array.isArray(doc.columnForce.sections) && doc.columnForce.sections.every(isString))) return fail('columnForce');
  if (doc.objectives !== undefined && !(Array.isArray(doc.objectives) && doc.objectives.every(isObjective))) return fail('objectives');
  if (doc.events !== undefined && !(Array.isArray(doc.events) && doc.events.every(isBattleEvent))) return fail('events');
  if (doc.eventPlaces !== undefined && !(Array.isArray(doc.eventPlaces) && doc.eventPlaces.every(isEventPlace))) return fail('eventPlaces');
  if (!isObject(doc.setting) || !isString(doc.setting.label) || !isString(doc.setting.sourceNote)) return fail('setting');
  if (!['training-ground', 'historical-setting-fictional-place', 'reconstructed-historical-place'].includes(doc.setting.label)) return fail('setting');
  if (!['temperate', 'cerrado', 'caatinga', 'urban'].includes(doc.palette as string)) return fail('palette');
  if (!isNumber(doc.waterLevel)) return fail('waterLevel');
  if (!GROUND_MATERIAL_IDS.includes(doc.baseMaterial as GroundMaterialId)) return fail('baseMaterial');
  if (!isObject(doc.layers) || !isRaster(doc.layers.height) || !isRaster(doc.layers.paint) || !isRaster(doc.layers.vegetation)) return fail('layers');
  for (const key of ['roads', 'rivers', 'ponds', 'bridges', 'ferries', 'lines', 'trenches', 'objects'] as const) {
    if (!Array.isArray(doc[key])) return fail(key);
  }
  const roads = doc.roads as unknown[];
  if (!roads.every((road) => isObject(road) && isNumber(road.id) && isNumber(road.width) && isPoints(road.points, 2) && isObject(road.ditches) && ROAD_TYPES.some((info) => info.type === road.type))) return fail('roads');
  if (!(doc.rivers as unknown[]).every((river) => isObject(river) && isNumber(river.id) && isNumber(river.width) && isPoints(river.points, 2) && Array.isArray(river.kinds))) return fail('rivers');
  if (!(doc.ponds as unknown[]).every((pond) => isObject(pond) && isNumber(pond.id) && (pond.kind === 'deep' || pond.kind === 'ford') && isPoints(pond.polygon, 3))) return fail('ponds');
  if (!(doc.bridges as unknown[]).every((bridge) => isObject(bridge) && ['id', 'x', 'y', 'rotation', 'halfWidth', 'halfDepth', 'deckHeight'].every((key) => isNumber(bridge[key])))) return fail('bridges');
  if (!(doc.ferries as unknown[]).every((ferry) => isObject(ferry) && isNumber(ferry.id) && isPoint(ferry.landingA) && isPoint(ferry.landingB))) return fail('ferries');
  if (!(doc.lines as unknown[]).every((line) => isObject(line) && isNumber(line.id) && isNumber(line.height) && isPoints(line.points, 2) && isString(line.kind) && (line.variant === undefined || isString(line.variant)))) return fail('lines');
  if (!(doc.trenches as unknown[]).every(isTrenchLine)) return fail('trenches');
  if (!(doc.objects as unknown[]).every((object) => isObject(object) && isNumber(object.id) && isString(object.type) && isNumber(object.x) && isNumber(object.y) && isNumber(object.rotation) && (object.variant === undefined || isString(object.variant)))) return fail('objects');
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

/** How far the ground under a bridge's span stays below its deck. */
const BRIDGE_CLEARANCE = 0.4;

/** Bilinear height of the compile field, as the runtime samples its grid. */
function fieldHeightAt(field: Field, x: number, y: number): number {
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
/** biome-trees-and-plants D4: what a foliage object stamps, by the bush's height class. */
const BUSH_VEGETATION: Readonly<Record<BushClass, number>> = {
  knee: VEGETATION_KINDS.indexOf('low-bush') + 1,
  waist: SCRUB,
  head: VEGETATION_KINDS.indexOf('thicket') + 1,
};

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

/** The id an authored map's locale keys hang off (it carries its own text). */
const textKey = (id: string, field: string): string => `map.${id}.${field}`;

/**
 * Compiles an editable map (or a decoded document) to a battle map. Pure and
 * deterministic: plain float math in a fixed order, heights rounded back to
 * whole centimetres, no RNG.
 */
/** author-game-maps 8.1: each side faces the other's area (centre to centre). */
function facingFromAreas(column: readonly Vec2[], legalist: readonly Vec2[]): { column: Vec2; legalist: Vec2 } {
  const centre = (points: readonly Vec2[]) => ({
    x: points.reduce((sum, p) => sum + p.x, 0) / Math.max(1, points.length),
    y: points.reduce((sum, p) => sum + p.y, 0) / Math.max(1, points.length),
  });
  const a = centre(column);
  const b = centre(legalist);
  const length = Math.hypot(b.x - a.x, b.y - a.y) || 1;
  const round = (value: number) => Math.round(value * 1000) / 1000 || 0;
  const toward = { x: round((b.x - a.x) / length), y: round((b.y - a.y) / length) };
  return { column: toward, legalist: { x: -toward.x || 0, y: -toward.y || 0 } };
}

export function compileMapDocument(source: EditableMap | MapDocument): BattleMap {
  const map = 'layers' in source ? fromMapDocument(source) : source;
  const facing = facingFromAreas(map.deployment.column.area, map.deployment.legalist.area);
  const bounds = boundsForSize(map.size);
  const side = mapSide(map.size);
  const nodes = heightNodes(map.size);
  const field: Field = { minX: bounds.minX, minY: bounds.minY, side, nodes, heights: new Float64Array(nodes * nodes) };
  for (let index = 0; index < field.heights.length; index += 1) field.heights[index] = map.heights[index]! / 100;

  // Water: carve river channels and pond beds under the water surface.
  const water: WaterArea[] = [];
  for (const river of [...map.rivers].sort((a, b) => a.id - b.id)) {
    // refine-map-editor D4: the centreline smoothed every 2 m; each piece keeps its source segment's kind.
    const smoothed = smoothCentreline(river.points);
    const box = pointsBox(smoothed.points, river.width / 2 + RIVER_BANK);
    // author-game-maps: distance along the centreline, and where the kind changes.
    const along: number[] = [0];
    for (let index = 1; index < smoothed.points.length; index += 1) {
      along.push(along[index - 1]! + Math.hypot(smoothed.points[index]!.x - smoothed.points[index - 1]!.x, smoothed.points[index]!.y - smoothed.points[index - 1]!.y));
    }
    const kindAt = (segment: number) => river.kinds[smoothed.source[segment] ?? 0] ?? 'deep';
    const changes: number[] = [];
    for (let segment = 1; segment + 1 < smoothed.points.length; segment += 1) if (kindAt(segment) !== kindAt(segment - 1)) changes.push(along[segment]!);
    forNodesIn(field, box, (index, x, y) => {
      const near = closestOnPolyline(x, y, smoothed.points);
      const kind = kindAt(near.segment);
      const start = smoothed.points[near.segment]!;
      const here = along[near.segment]! + Math.hypot(near.point.x - start.x, near.point.y - start.y);
      const gap = changes.reduce((least, at) => Math.min(least, Math.abs(here - at)), Number.POSITIVE_INFINITY);
      // Within FORD_TAPER of a change the depth eases from one kind to the other (half-way at the change).
      const deepness = gap >= FORD_TAPER ? (kind === 'deep' ? 1 : 0) : 0.5 + (kind === 'deep' ? 0.5 : -0.5) * smooth(gap / FORD_TAPER);
      const bed = map.waterLevel - (0.45 + (DEEP_BED - 0.45) * deepness);
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
      const first = smoothed.source.indexOf(segment);
      const last = smoothed.source.lastIndexOf(segment);
      const area: WaterArea = { kind, strip: { points: smoothed.points.slice(first, last + 2).map((p) => ({ ...p })), width: river.width } };
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
  // author-game-maps: the simulation reads the kind; the density goes to the view alone.
  const vegetation = new Uint8Array(map.vegetation.length);
  const vegetationDensity = new Uint8Array(map.vegetation.length);
  let anyDensity = false;
  for (let index = 0; index < vegetation.length; index += 1) {
    const cell = map.vegetation[index]!;
    vegetation[index] = vegetationKindOf(cell);
    vegetationDensity[index] = vegetationDensityOf(cell);
    if (vegetationDensity[index]) anyDensity = true;
  }
  const objectConcealed = new Uint8Array(vegetation.length);
  // Cells under a thorn patch (macambira): their surface becomes thorns, below the roads.
  const thorny = new Uint8Array(vegetation.length);
  // A placed plant's vegetation (1-based kind) goes over a cell's only if at
  // least as tall: a knee-high bush or a crown's shade never thins a thicket
  // or a cane field, whatever order the objects were placed in.
  const stampVegetation = (index: number, kind: number): void => {
    const current = vegetationKindOf(vegetation[index]!);
    if (!current) objectConcealed[index] = 1;
    else if (VEGETATION[VEGETATION_KINDS[current - 1]!].height > VEGETATION[VEGETATION_KINDS[kind - 1]!].height) return;
    vegetation[index] = kind;
  };
  const stampMaterial = (index: number, material: GroundMaterialId): void => {
    paint[index] = groundMaterialIndex(material);
  };

  // Roads, in id order. A road leaves the relief as the author shaped it
  // (refine-map-editor D1); only its ditches dig their channel.
  const covers: CoverPoint[] = [];
  /** refine-map-editor 6.1: the piece each cover came from, for the editor's cover preview. */
  const coverPieces = new Map<number, CoverPiece>();
  /** 4.2: the corrals' walls, compiled after the objects with the wall lines. */
  const enclosureWalls: { object: number; points: Vec2[]; height: number; variant?: string }[] = [];
  let coverId = 5000;
  const roadSurface = new Map<number, TerrainSurface>();
  for (const road of [...map.roads].sort((a, b) => a.id - b.id)) {
    const info = roadType(road.type);
    const half = road.width / 2;
    if (road.ditches.left || road.ditches.right) {
      const middle = half + DITCH_WIDTH / 2;
      const box = pointsBox(road.points, middle + DITCH_WIDTH / 2 + DITCH_BANK);
      forNodesIn(field, box, (index, x, y) => {
        const near = closestOnPolyline(x, y, road.points);
        if (!(near.side > 0 ? road.ditches.right : road.ditches.left)) return;
        const off = Math.abs(near.distance - middle) - DITCH_WIDTH / 2;
        const weight = off <= 0 ? 1 : 1 - smooth(off / DITCH_BANK);
        if (weight > 0) field.heights[index] = field.heights[index]! - DITCH_DEPTH * weight;
      });
    }
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
        coverPieces.set(coverId, { kind: 'ditch', id: road.id, side: sign > 0 ? 'right' : 'left' });
        covers.push({
          id: coverId++,
          kind: 'trench',
          x: piece.x,
          y: piece.y,
          rotation: piece.rotation,
          halfWidth: piece.halfLength,
          halfDepth: DITCH_WIDTH / 2,
          height: 0.2,
          // author-game-maps 3.1: the whole piece shelters (a 2 m radius left most of a 12 m piece bare).
          radius: Math.max(2, piece.halfLength + 1),
          quality: 0.3,
          blocksMovement: false,
          blocksSight: false,
          drawnBy: 'map',
          ditch: true,
        });
      }
    }
  }

  // Trench lines (refine-map-editor D6): cuts and parapets as height shapes
  // over the grid, the floor's surface, no plants in the cut.
  const heightShapes: HeightShape[] = [];
  const trenches = [...map.trenches].sort((a, b) => a.id - b.id);
  for (const [index, built] of buildTrenchLines(trenches, coverId).entries()) {
    covers.push(...built.covers);
    for (const cover of built.covers) coverPieces.set(cover.id, { kind: 'trench', id: trenches[index]!.id });
    coverId += built.covers.length;
    heightShapes.push(...built.shapes);
    const points = trenches[index]!.points;
    const clear = TRENCH.floor / 2 + TRENCH.wall + (built.parapet ? TRENCH.parapetWidth : 0);
    forCellsIn(side, bounds.minX, bounds.minY, pointsBox(points, clear), (cell, x, y) => {
      const distance = distanceToPolyline(x, y, points);
      if (distance <= TRENCH.floor / 2) roadSurface.set(cell, 'trench-floor');
      if (distance <= clear) vegetation[cell] = 0;
    });
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
        // 3.5: a look the building does not have is dropped, not an error.
        if (isBuildingVariant(building.model, object.variant)) building.variant = object.variant;
        buildings.push(building);
        covers.push(buildingCover(building));
        coverPieces.set(building.id, { kind: 'object', id: object.id });
        continue;
      }
      case 'decal':
        footprintCells((index) => stampMaterial(index, entry.footprint.kind === 'decal' ? entry.footprint.material : map.baseMaterial));
        // 4.2: stone steps are also drawn.
        if (!entry.drawn) continue;
        break;
      case 'enclosure':
        // 4.2: a corral is its walls, compiled with the wall lines below.
        for (const points of corralWalls(object.x, object.y, halfWidth, halfDepth, object.rotation)) {
          enclosureWalls.push({ object: object.id, points, height: entry.height * scale, variant: object.variant });
        }
        continue;
      case 'foliage': {
        const kind = BUSH_VEGETATION[entry.bushClass ?? 'waist'];
        footprintCells((index) => {
          stampVegetation(index, kind);
          if (entry.thorns) thorny[index] = 1;
        });
        break;
      }
      default: {
        // 5.1 (D9): a waterside object in water is drawing only: water already
        // stops or slows a man, and a boat afloat shelters no one.
        if (entry.group === 'water' && water.some((area) => inArea(area, object.x, object.y))) {
          props.push({ model: entry.model, x: object.x, y: object.y, rotation: object.rotation, scale, afloat: true });
          continue;
        }
        const cover = objectCover(entry, object, coverId);
        if (cover) {
          // Sandbags and barricades are drawn by the cover layer, like the hand-written maps'.
          if (entry.group === 'cover') delete cover.drawnBy;
          covers.push(cover);
          coverPieces.set(cover.id, { kind: 'object', id: object.id });
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
        if (Math.hypot(x - object.x, y - object.y) > radius) return;
        stampVegetation(index, SCRUB);
      });
    }
    const prop: PropPlacement = { model: entry.model, x: object.x, y: object.y, rotation: object.rotation, scale };
    // 4.1: a stone's rock kind is drawing only, like a building's look.
    if (isRockKind(object.type, object.variant)) prop.kind = object.variant;
    // 5.2 (D11): a camp object's side is drawing only.
    if (isCampSide(object.type, object.variant)) prop.side = object.variant;
    props.push(prop);
  }

  // Walls and fences.
  const lines: MapLine[] = [];
  const fences: Vec2[][] = [];
  const yardWalls: YardWall[] = [];
  // 4.2: the corrals' walls are dry stone wall lines of their objects, not yards.
  const wallLines = [
    ...[...map.lines].sort((a, b) => a.id - b.id).map((line) => ({ line, piece: { kind: 'line', id: line.id } as CoverPiece, yard: true })),
    ...enclosureWalls.map(({ object, points, height, variant }) => ({
      line: { id: -object, kind: 'stone-wall' as const, height, points, variant },
      piece: { kind: 'object', id: object } as CoverPiece,
      yard: false,
    })),
  ];
  for (const { line, piece: source, yard } of wallLines) {
    const info = lineKind(line.kind);
    const mapLine: MapLine = { kind: line.kind, points: line.points, height: line.height };
    // 4.2: a dry stone wall's rock kind is drawing only.
    if (isRockKind(line.kind, line.variant)) mapLine.rock = line.variant;
    lines.push(mapLine);
    if (line.kind === 'wire-fence') fences.push(line.points);
    const lineCoverIds: number[] = [];
    if (info.wall && yard) yardWalls.push({ id: line.id, points: line.points, height: line.height, coverIds: lineCoverIds });
    for (const piece of pieces(line.points, 12)) {
      lineCoverIds.push(coverId);
      coverPieces.set(coverId, source);
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
        blocksSight: (info.wall || info.opaque === true || line.kind === 'board-fence' || line.kind === 'hedgerow') && line.height >= 1.75,
        ...(line.kind === 'wire-fence' ? { wire: true } : {}),
        drawnBy: 'map',
      });
    }
    if (info.conceals) {
      forCellsIn(side, bounds.minX, bounds.minY, pointsBox(line.points, info.halfDepth + 1), (index, x, y) => {
        if (distanceToPolyline(x, y, line.points) <= info.halfDepth + 0.5) vegetation[index] = SCRUB;
      });
    }
  }

  const garrisonYards = detectWallYards(yardWalls);

  // Plants grow only on land (refine-map-editor D2): the mask clears water,
  // bridges, paved and cobbled roads, buildings and trench channels.
  const mask = growthMask(map);
  for (let index = 0; index < vegetation.length; index += 1) if (!mask[index]) vegetation[index] = 0;

  // Surfaces: painted material, then roads (water and bridges go over in the bake).
  const surfaces = new Uint8Array(side * side);
  for (let index = 0; index < surfaces.length; index += 1) {
    const surface = roadSurface.get(index) ?? (thorny[index] ? 'thorns' : groundMaterial(paint[index]!).surface);
    surfaces[index] = SURFACES.indexOf(surface);
  }

  // Bridges rest on their abutments (refine-map-editor D3): between the
  // ramps the ground stays at least BRIDGE_CLEARANCE below the deck.
  for (const bridge of [...map.bridges].sort((a, b) => a.id - b.id)) {
    const ends = bridgeLandings(bridge, (x, y) => fieldHeightAt(field, x, y));
    const ramp = Math.min(BRIDGE_RAMP, bridge.halfDepth / 2);
    const cos = Math.cos(bridge.rotation);
    const sin = Math.sin(bridge.rotation);
    const reach = bridge.halfWidth + HEIGHT_SPACING;
    forNodesIn(field, polygonBox(bridgePolygon({ ...bridge, halfWidth: reach })), (index, x, y) => {
      const across = (x - bridge.x) * cos + (y - bridge.y) * sin;
      const along = -(x - bridge.x) * sin + (y - bridge.y) * cos;
      if (Math.abs(across) > reach || Math.abs(along) > bridge.halfDepth - ramp) return;
      const floor = bridgeDeckHeight(bridge, map.waterLevel, ends, along) - BRIDGE_CLEARANCE;
      field.heights[index] = Math.min(field.heights[index]!, floor);
    });
  }

  const centimetres = new Int16Array(nodes * nodes);
  for (let index = 0; index < centimetres.length; index += 1) {
    const metres = Math.max(MIN_HEIGHT, Math.min(MAX_HEIGHT, field.heights[index]!));
    centimetres[index] = Math.round(metres * 100);
  }

  const compiled: BattleMap = {
    id: map.id,
    nameKey: textKey(map.id, 'name'),
    descriptionKey: textKey(map.id, 'description'),
    text: { name: { ...map.name }, description: { ...map.description } },
    codexKey: map.codexKey ?? '',
    setting: { ...map.setting },
    bounds,
    height: { kind: 'field', shapes: heightShapes, grid: { columns: nodes, rows: nodes, centimetres } },
    raster: { surfaces, vegetation, objectCover: objectConcealed, ...(anyDensity ? { vegetationDensity } : {}) },
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
      column: {
        // author-game-maps 8.1: the starts come from the area, not the document.
        sections: sectionStartsFromArea(map.deployment.column.area, facing.column),
        facing: facing.column,
        area: map.deployment.column.area.map((p) => ({ ...p })),
      },
      legalist: {
        // author-game-maps 8.1: the starts come from the area, not the document.
        sections: sectionStartsFromArea(map.deployment.legalist.area, facing.legalist),
        facing: facing.legalist,
        area: map.deployment.legalist.area.map((p) => ({ ...p })),
      },
    },
    props,
    fences,
    lines,
    // author-game-maps: walled yards found from the walls.
    ...(garrisonYards.length > 0 ? { garrisonYards } : {}),
    ...(trenches.length > 0 ? { trenches: trenches.map((line) => ({ ...line, points: line.points.map((p) => ({ ...p })) })) } : {}),
    palette: map.palette,
    light: mapLight(map.light),
    north: mapNorth(map.north),
    ...(map.enemyForces && map.enemyForces.length > 0 ? { enemyForces: map.enemyForces.map((roster) => ({ sections: [...roster.sections] })) } : {}),
    ...(map.columnForce && map.columnForce.sections.length > 0 ? { columnForce: { sections: [...map.columnForce.sections] } } : {}),
    ...(map.objectives && map.objectives.length > 0
      ? {
          objectives: map.objectives.map((objective) => ({
            id: objective.id,
            name: { ...objective.name },
            area: objective.area.map((point) => ({ x: point.x, y: point.y })),
            flag: { x: objective.flag.x, y: objective.flag.y },
            value: Math.max(1, Math.min(3, Math.round(objective.value))),
            owner: objective.owner,
          })),
        }
      : {}),
    ...compiledEvents(map),
  };
  noteCoverPieces(compiled, coverPieces);
  return compiled;
}

/** add-battle-events 1.1: a map's runnable events and their places; nothing for a map without events. */
function compiledEvents(map: MapDocumentBody): Pick<BattleMap, 'events' | 'eventPlaces'> {
  const events = compileEvents(map.events);
  if (events.length === 0) return {};
  return { events, eventPlaces: compileEventPlaces(map.eventPlaces) };
}

/** The name or description of a map in a language: an authored map's own text, else null (use its locale key). */
export function authoredMapText(map: BattleMap, field: 'name' | 'description', language: string): string | null {
  if (!map.text) return null;
  const text = map.text[field];
  return (language === 'pt-BR' ? text['pt-BR'] : text.en) || text.en || text['pt-BR'] || map.id;
}
