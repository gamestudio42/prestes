import {
  compileMapDocument,
  coverPieceOf,
  coverPreview,
  positionsFor,
  createEditableMap,
  setActiveMap,
  type BattleMap,
  type CoverPreview,
  type EditableMap,
  type GroundMaterialId,
  type LineKind,
  type MapProblem,
  type PositionDef,
  type RoadType,
  type TrenchDepth,
  type TrenchFacing,
  type TrenchKind,
  type TrenchParapet,
  type TreeBiome,
  type TreeDensity,
  type Vec2,
} from '@prestes/shared';

/**
 * The editor's state (add-map-editor): the open map, its compiled battle
 * map, the undo history, the tool and its settings, the selection. Kept out
 * of React; panels subscribe and re-render on `version`.
 */

export type ToolId =
  | 'select'
  | 'paint'
  | 'fill'
  | 'erase'
  | 'raise'
  | 'lower'
  | 'smooth'
  | 'flatten'
  | 'setHeight'
  | 'noise'
  | 'road'
  | 'river'
  | 'pond'
  | 'bridge'
  | 'ferry'
  | 'line'
  | 'trench'
  | 'place'
  | 'trees'
  | 'vegetation'
  | 'deployment'
  | 'objective';

export interface ToolSettings {
  size: number;
  strength: number;
  shape: 'round' | 'square';
  material: GroundMaterialId;
  /** 0 clears, else VEGETATION_KINDS index + 1. */
  vegetation: number;
  /** author-game-maps: how thick the painted plants are drawn (0 normal, 1 sparse, 2 dense); the look only. */
  vegetationDensity: number;
  heightValue: number;
  seed: number;
  roadType: RoadType;
  roadWidth: number;
  ditchLeft: boolean;
  ditchRight: boolean;
  riverWidth: number;
  waterKind: 'deep' | 'ford';
  lineKind: LineKind;
  lineHeight: number;
  /** refine-map-editor 2.5: the next trench line drawn. */
  trenchKind: TrenchKind;
  trenchDepth: TrenchDepth;
  trenchFacing: TrenchFacing;
  trenchBays: boolean;
  trenchParapet: TrenchParapet;
  /** refine-map-editor 5.1: the trees tool. */
  treeMode: 'scatter' | 'single' | 'erase';
  treeBiome: TreeBiome;
  treeDensity: TreeDensity;
  treeSpecies: string;
  /** author-game-maps: the species the scatter brush plants; the biome only fills this list when chosen. */
  treeMix: string[];
  objectType: string;
  rotation: number;
  scale: number;
  snap: 0 | 0.5 | 1;
  rotateStep: boolean;
}

export interface ViewSettings {
  overlay: 'none' | 'slope' | 'contours' | 'relief';
  grid: boolean;
  topDown: boolean;
  /** refine-map-editor 6.1: the cover overlay (slots, badges, concealment, zone totals). */
  cover: boolean;
}

/** What a selection points at. */
export type SelectionItem =
  | { kind: 'object'; id: number }
  | { kind: 'road' | 'river' | 'pond' | 'line' | 'trench'; id: number; point?: number }
  | { kind: 'bridge' | 'ferry'; id: number; end?: 0 | 1 }
  | { kind: 'section'; side: 'column' | 'legalist'; index: number }
  /** add-deployment-phase 1.2: a side's deployment area, or one of its corners. */
  | { kind: 'area'; side: 'column' | 'legalist'; point?: number }
  /** add-map-objectives 1.3: an objective (area and flag move together). */
  | { kind: 'objective'; id: number };

/** add-map-objectives 1.3: a new objective's area is this circle (m), as a 16-gon. */
export const OBJECTIVE_RADIUS = 16;

/** A circle as a polygon, every 22.5 degrees, rounded to 0.1 m. */
export function objectiveCircle(centre: Vec2, radius: number): Vec2[] {
  return Array.from({ length: 16 }, (_, index) => {
    const angle = (index / 16) * Math.PI * 2;
    return { x: Math.round((centre.x + Math.cos(angle) * radius) * 10) / 10, y: Math.round((centre.y + Math.sin(angle) * radius) * 10) / 10 };
  });
}

/** A dirty region of the map after an edit (metres); null is the whole map. */
export type DirtyBox = { minX: number; minY: number; maxX: number; maxY: number } | null;

export interface Command {
  apply(map: EditableMap): void;
  revert(map: EditableMap): void;
  /** Rasters only changed: the view can update in place. */
  rasterOnly?: boolean;
  box?: DirtyBox;
}

type VectorBody = Omit<EditableMap, 'heights' | 'paint' | 'vegetation'>;

function vectorSnapshot(map: EditableMap): VectorBody {
  const { heights: _h, paint: _p, vegetation: _v, ...body } = map;
  void _h;
  void _p;
  void _v;
  return JSON.parse(JSON.stringify(body)) as VectorBody;
}

/** An edit of the vector part (objects, roads, deployment, properties): before and after snapshots. */
export function vectorCommand(before: EditableMap, after: VectorBody): Command {
  const old = vectorSnapshot(before);
  const next = JSON.parse(JSON.stringify(after)) as VectorBody;
  return {
    apply: (map) => Object.assign(map, JSON.parse(JSON.stringify(next)) as VectorBody),
    revert: (map) => Object.assign(map, JSON.parse(JSON.stringify(old)) as VectorBody),
  };
}

/** Replaces the whole map (resize, import). */
export function replaceCommand(before: EditableMap, after: EditableMap): Command {
  const old = cloneMap(before);
  const next = cloneMap(after);
  return {
    apply: (map) => replaceInto(map, cloneMap(next)),
    revert: (map) => replaceInto(map, cloneMap(old)),
  };
}

/** Makes `map` the same as `source`, optional fields the source lacks (mission, enemyForces) included. */
function replaceInto(map: EditableMap, source: EditableMap): void {
  const target = map as unknown as Record<string, unknown>;
  for (const key of Object.keys(target)) if (!(key in source)) delete target[key];
  Object.assign(map, source);
}

export function cloneMap(map: EditableMap): EditableMap {
  return { ...vectorSnapshot(map), heights: map.heights.slice(), paint: map.paint.slice(), vegetation: map.vegetation.slice() } as EditableMap;
}

export type RasterLayer = 'heights' | 'paint' | 'vegetation';

/** Changed cells of one raster: their indices, old and new values. */
export function rasterCommand(layer: RasterLayer, changes: Map<number, number>, map: EditableMap, box: DirtyBox): Command {
  const indices = Int32Array.from(changes.keys());
  const before = Int32Array.from(changes.values());
  const after = Int32Array.from(indices, (index) => map[layer][index]!);
  return {
    rasterOnly: true,
    box,
    apply: (target) => {
      const data = target[layer];
      for (let n = 0; n < indices.length; n += 1) data[indices[n]!] = after[n]!;
    },
    revert: (target) => {
      const data = target[layer];
      for (let n = 0; n < indices.length; n += 1) data[indices[n]!] = before[n]!;
    },
  };
}

export const HISTORY_DEPTH = 200;

export const HEIGHT_TOOLS: ReadonlySet<ToolId> = new Set(['raise', 'lower', 'smooth', 'flatten', 'setHeight', 'noise']);

export type SaveState = 'saved' | 'autosaved' | 'unsaved';

export class EditorStore {
  map: EditableMap;
  compiled: BattleMap;
  tool: ToolId = 'paint';
  settings: ToolSettings = {
    size: 4,
    strength: 1,
    shape: 'round',
    material: 'dry-grass',
    vegetation: 2,
    vegetationDensity: 0,
    heightValue: 2,
    seed: 1924,
    roadType: 'dirt-road',
    roadWidth: 5,
    ditchLeft: false,
    ditchRight: true,
    riverWidth: 14,
    waterKind: 'deep',
    lineKind: 'stone-wall',
    lineHeight: 1.2,
    trenchKind: 'fire',
    trenchDepth: 1.2,
    trenchFacing: 'left',
    trenchBays: true,
    trenchParapet: 'earth',
    treeMode: 'scatter',
    treeBiome: 'cerrado',
    treeDensity: 'medium',
    treeSpecies: 'cerrado-tree',
    treeMix: ['cerrado-tree', 'buriti', 'bush'],
    objectType: 'boulder',
    rotation: 0,
    scale: 1,
    snap: 1,
    rotateStep: true,
  };
  view: ViewSettings = { overlay: 'none', grid: false, topDown: false, cover: false };
  /** The cover piece under the pointer while the cover overlay is on (its preview key). */
  coverHover: string | null = null;
  private preview: { map: BattleMap; preview: CoverPreview } | null = null;
  private positionCache: { map: BattleMap; positions: readonly PositionDef[] } | null = null;
  selection: SelectionItem[] = [];
  problems: MapProblem[] | null = null;
  saveState: SaveState = 'saved';
  message: { text: string; error: boolean } | null = null;
  version = 0;
  /** Scatter strokes since the map was opened: with the map id, a stroke's seed (D7). */
  treeStrokes = 0;
  private readonly undoStack: Command[] = [];
  private readonly redoStack: Command[] = [];
  private readonly listeners = new Set<() => void>();
  /** Called after a change that the view must show (whole or in place). */
  onMapChanged: ((change: { rasterOnly: boolean; box: DirtyBox; recompiled: boolean }) => void) | null = null;
  onEdited: (() => void) | null = null;

  constructor(map?: EditableMap) {
    this.map = map ?? createEditableMap({ id: 'novo-mapa', size: 'medium' });
    this.compiled = this.compile();
  }

  compile(): BattleMap {
    this.compiled = compileMapDocument(this.map);
    setActiveMap(this.compiled);
    return this.compiled;
  }

  /** The game's cover slots on the open map, counted per piece and per deployment zone (D9). */
  coverPreview(): CoverPreview {
    if (this.preview?.map !== this.compiled) this.preview = { map: this.compiled, preview: coverPreview(this.compiled) };
    return this.preview.preview;
  }

  /** garrison-and-assault 4.6: the enterable positions of the open map, as the battle builds them. */
  positions(): readonly PositionDef[] {
    if (this.positionCache?.map !== this.compiled) this.positionCache = { map: this.compiled, positions: positionsFor(this.compiled) };
    return this.positionCache.positions;
  }

  /** The position a placed object or a drawn trench makes (null if it makes none). */
  positionOf(kind: 'object' | 'trench', id: number): PositionDef | null {
    return (
      this.positions().find((position) =>
        position.coverIds.some((coverId) => {
          const piece = coverPieceOf(this.compiled, coverId);
          return piece?.kind === kind && piece.id === id;
        }),
      ) ?? null
    );
  }

  setCoverHover(key: string | null): void {
    if (this.coverHover === key) return;
    this.coverHover = key;
    this.emit();
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  emit(): void {
    this.version += 1;
    for (const listener of this.listeners) listener();
  }

  /** Replaces the open map without history (load, new map). */
  load(map: EditableMap): void {
    this.map = map;
    this.treeStrokes = 0;
    this.undoStack.length = 0;
    this.redoStack.length = 0;
    this.selection = [];
    this.problems = null;
    this.compile();
    this.onMapChanged?.({ rasterOnly: false, box: null, recompiled: true });
    this.emit();
  }

  /** Records a command whose change is already applied to the map (a stroke). */
  record(command: Command): void {
    this.undoStack.push(command);
    if (this.undoStack.length > HISTORY_DEPTH) this.undoStack.shift();
    this.redoStack.length = 0;
    this.afterChange(command);
  }

  /** Applies and records a command. */
  execute(command: Command): void {
    command.apply(this.map);
    this.record(command);
  }

  undo(): void {
    const command = this.undoStack.pop();
    if (!command) return;
    command.revert(this.map);
    this.redoStack.push(command);
    this.afterChange(command);
  }

  redo(): void {
    const command = this.redoStack.pop();
    if (!command) return;
    command.apply(this.map);
    this.undoStack.push(command);
    this.afterChange(command);
  }

  get canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  get canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  get historyLength(): number {
    return this.undoStack.length;
  }

  private afterChange(command: Command): void {
    this.compile();
    this.problems = null;
    this.saveState = 'unsaved';
    this.selection = this.selection.filter((item) => this.exists(item));
    this.onMapChanged?.({ rasterOnly: command.rasterOnly ?? false, box: command.box ?? null, recompiled: true });
    this.onEdited?.();
    this.emit();
  }

  exists(item: SelectionItem): boolean {
    switch (item.kind) {
      case 'object':
        return this.map.objects.some((object) => object.id === item.id);
      case 'road':
        return this.map.roads.some((road) => road.id === item.id);
      case 'river':
        return this.map.rivers.some((river) => river.id === item.id);
      case 'pond':
        return this.map.ponds.some((pond) => pond.id === item.id);
      case 'line':
        return this.map.lines.some((line) => line.id === item.id);
      case 'trench':
        return this.map.trenches.some((line) => line.id === item.id);
      case 'bridge':
        return this.map.bridges.some((bridge) => bridge.id === item.id);
      case 'ferry':
        return this.map.ferries.some((ferry) => ferry.id === item.id);
      case 'section':
        return item.index < this.map.deployment[item.side].sections.length;
      case 'area':
        return item.point === undefined || item.point < this.map.deployment[item.side].area.length;
      case 'objective':
        return (this.map.objectives ?? []).some((objective) => objective.id === item.id);
    }
  }

  setTool(tool: ToolId): void {
    // Shaping the ground without seeing it is guesswork: the terrain tools
    // turn the relief view on (once; the user can turn it off again).
    if (HEIGHT_TOOLS.has(tool) && !HEIGHT_TOOLS.has(this.tool) && this.view.overlay === 'none') this.view.overlay = 'relief';
    this.tool = tool;
    this.emit();
  }

  updateSettings(patch: Partial<ToolSettings>): void {
    Object.assign(this.settings, patch);
    this.emit();
  }

  updateView(patch: Partial<ViewSettings>): void {
    Object.assign(this.view, patch);
    this.emit();
  }

  setSelection(selection: SelectionItem[]): void {
    this.selection = selection;
    this.emit();
  }

  setMessage(text: string | null, error = false): void {
    this.message = text === null ? null : { text, error };
    this.emit();
  }

  /** Applies a vector edit made on a draft copy of the map. */
  editVector(edit: (draft: EditableMap) => void): void {
    const draft = { ...vectorSnapshot(this.map) } as EditableMap;
    edit(draft);
    this.execute(vectorCommand(this.map, draft));
  }

  nextId(list: readonly { id: number }[]): number {
    return list.reduce((max, item) => Math.max(max, item.id), 0) + 1;
  }
}
