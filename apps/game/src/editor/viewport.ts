import type { MapLight } from '@prestes/shared';
import * as THREE from 'three';
import {
  TRENCH,
  trenchLength,
  bridgePolygon,
  catalogObject,
  isRockKind,
  clusterBadges,
  insideDeploymentArea,
  vegetationAt,
  type BattleMap,
  type ProtectionClass,
  groundMaterialIndex,
  mapSide,
  rectangle,
  terrainHeightAt,
  TreeScatter,
  treeStrokeSeed,
  treesUnder,
  type ScatteredTree,
  type DocBridge,
  type EditableMap,
  type Vec2,
} from '@prestes/shared';
import { SceneView } from '@prestes/view3d';
import { loadGraphicsSettings } from '../storage';
import { fill, layerOf, sampleHeight, Stroke } from './brush';
import { chooseScaleBar, drawScaleBar, EDITOR_SCALE_STYLE, scaleBarBox, THUMBNAIL_SCALE_STYLE, type ScaleBar, type ScaleBarText } from './scale-bar';
import { OBJECTIVE_RADIUS, objectiveCircle, rasterCommand, type EditorStore, type SelectionItem } from './store';
import { addEntryPoint, addTriggerArea, deletePlace, movePlace, placeUsers } from './events';

/**
 * The editor's view (add-map-editor): the game's own SceneView showing the
 * compiled map, an overlay for the brush, drafts, gizmos and the deployment
 * points, and the pointer logic of every tool.
 */

const POLYLINE_TOOLS = new Set(['road', 'river', 'pond', 'line', 'trench', 'bridge', 'ferry']);
const BRUSH_TOOLS = new Set(['paint', 'erase', 'vegetation', 'raise', 'lower', 'smooth', 'flatten', 'setHeight', 'noise']);

const COLORS = {
  cursor: 0xffffff,
  draft: 0xffe08a,
  road: 0xd9b26a,
  river: 0x5aa7d6,
  pond: 0x5aa7d6,
  line: 0xcfcfcf,
  selection: 0xffd23f,
  tree: 0x6fbf4a,
  erase: 0xd65a4a,
  column: 0xd65a4a,
  legalist: 0x4a7fd6,
  hatch: 0xa6d96a,
  port: 0xf4ead2,
  objective: 0xf4ead2,
  /** add-battle-events 4.2: event places, and what the selected event uses. */
  eventPlace: 0xd98cf2,
  eventHighlight: 0xffd54a,
};

/** refine-map-editor 6.1: slot dots by what they protect (the panel's legend uses the same). */
export const PROTECTION_COLORS: Record<ProtectionClass, number> = {
  standing: 0x4fd36b,
  crouched: 0xf2c14e,
  prone: 0xe8743b,
};

/** The scale bar's widest length on screen (CSS px) and in the 256 px thumbnail. */
const SCALE_BAR_MAX_PX = 240;
const THUMBNAIL_SIZE = 256;
const THUMBNAIL_SCALE_BAR_MAX_PX = 100;

/** Above this camera span the cover badges cluster per 50 m cell (strategic span). */
const BADGE_CLUSTER_SPAN = 160;

type Drag =
  | { kind: 'stroke'; stroke: Stroke; last: Vec2; time: number }
  | { kind: 'scatter'; scatter: TreeScatter; last: Vec2 }
  | { kind: 'erase-trees'; ids: Set<number>; last: Vec2 }
  | { kind: 'move'; start: Vec2; current: Vec2; items: SelectionItem[] }
  | { kind: 'box'; start: Vec2; current: Vec2 }
  | { kind: 'pan'; x: number; y: number };

export interface CursorInfo {
  x: number;
  y: number;
  height: number;
}

export class EditorViewport {
  readonly view: SceneView;
  private readonly overlay = new THREE.Group();
  private readonly coverLayer = new THREE.Group();
  private coverFor: BattleMap | null = null;
  private readonly labels: HTMLDivElement;
  private readonly scaleCanvas: HTMLCanvasElement;
  private scaleKey = '';
  /** The scale bar now on screen (for the test bridge). */
  scaleBar: (ScaleBar & { metresPerPixel: number }) | null = null;
  private readonly sectionLabels: HTMLDivElement[] = [];
  private readonly badgeLabels: HTMLDivElement[] = [];
  /** add-battle-events 4.2: the event places' names. */
  private readonly placeLabels_: HTMLDivElement[] = [];
  private cursor: Vec2 | null = null;
  private draft: Vec2[] = [];
  private draftTool: string;
  private drag: Drag | null = null;
  private frame = 0;
  private disposed = false;
  private readonly unsubscribe: () => void;
  onCursor: ((cursor: CursorInfo | null) => void) | null = null;
  /** add-battle-events 4.1: a new place's default name, in the editor's language. */
  placeName: ((kind: 'entry' | 'area', id: number) => string) | null = null;
  /** add-battle-events 4.1: asks before deleting a place events use (their labels); true deletes. */
  confirmPlaceDelete: ((users: string[]) => boolean) | null = null;

  constructor(
    private readonly container: HTMLElement,
    private readonly store: EditorStore,
    private readonly sectionText: (side: 'column' | 'legalist', index: number) => string,
    /** The scale bar's words, in the editor's language. */
    private readonly scaleText: () => ScaleBarText,
  ) {
    this.draftTool = store.tool;
    this.view = new SceneView({ container, battleMap: store.compiled, strategicField: true, maxSpanFactor: 2.5, antialias: loadGraphicsSettings().smoothEdges });
    this.view.frameMap();
    this.overlay.name = 'editor-overlay';
    this.view.editorScene.add(this.overlay);
    this.coverLayer.name = 'editor-cover';
    this.view.editorScene.add(this.coverLayer);
    this.labels = document.createElement('div');
    this.labels.className = 'editor-labels';
    container.appendChild(this.labels);
    this.scaleCanvas = document.createElement('canvas');
    this.scaleCanvas.className = 'editor-scale-bar';
    this.scaleCanvas.dataset.testid = 'editor-scale-bar';
    container.appendChild(this.scaleCanvas);
    // Drawn before the pixel font loads, the bar is drawn again once it has.
    void document.fonts?.ready.then(() => {
      this.scaleKey = '';
    });
    const canvas = container.querySelector('canvas')!;
    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('pointerleave', this.onPointerLeave);
    canvas.addEventListener('dblclick', this.onDoubleClick);
    canvas.addEventListener('contextmenu', (event) => event.preventDefault());
    window.addEventListener('keydown', this.onKeyDown);
    store.onMapChanged = (change) => this.onMapChanged(change);
    this.unsubscribe = store.subscribe(() => {
      // A draft belongs to the tool that started it.
      if (store.tool !== this.draftTool) {
        this.draft = [];
        this.draftTool = store.tool;
      }
      this.applyViewSettings();
    });
    this.applyViewSettings();
    this.rebuildOverlay();
    this.tick();
  }

  dispose(): void {
    this.disposed = true;
    cancelAnimationFrame(this.frame);
    window.removeEventListener('keydown', this.onKeyDown);
    this.unsubscribe();
    this.store.onMapChanged = null;
    this.view.dispose();
    this.labels.remove();
    this.scaleCanvas.remove();
  }

  /** Centres on a point (a problem in the list). */
  centreOn(point: Vec2): void {
    this.view.centreOn(point.x, point.y);
  }

  /** author-game-maps 4.3: lights the view with `light` while the properties dialog is open (null: the map's own). */
  previewLight(light: MapLight | null): void {
    this.view.previewLight(light);
  }

  /** author-game-maps: the current view as the map's thumbnail (a square PNG data URL). */
  snapshot(): string {
    this.overlay.visible = false;
    this.coverLayer.visible = false;
    this.labels.style.visibility = 'hidden';
    try {
      // The thumbnail carries its own scale bar, sized for the picture, in its bottom-left corner.
      return this.view.snapshot(THUMBNAIL_SIZE, (context, metresPerPixel) => {
        const bar = chooseScaleBar(metresPerPixel, THUMBNAIL_SCALE_BAR_MAX_PX);
        const box = scaleBarBox(bar, THUMBNAIL_SCALE_STYLE);
        drawScaleBar(context, bar, 4, THUMBNAIL_SIZE - box.height - 4, THUMBNAIL_SCALE_STYLE, this.scaleText());
      });
    } finally {
      this.overlay.visible = true;
      this.coverLayer.visible = true;
      this.labels.style.visibility = '';
    }
  }

  frameMap(): void {
    this.view.frameMap();
  }

  /** Page (client) coordinates of a ground point, for the test bridge. */
  screenPoint(x: number, y: number): { x: number; y: number } | null {
    const point = this.view.groundToScreen(x, y);
    if (!point) return null;
    const rect = this.container.getBoundingClientRect();
    return { x: rect.left + point.x, y: rect.top + point.y };
  }

  private applyViewSettings(): void {
    const { view } = this.store;
    this.view.setGroundOverlay(view.overlay);
    this.view.setGroundGrid(view.grid ? (this.view.camera.span > 160 ? 10 : 1) : 0);
    this.view.setTopDown(view.topDown);
    this.syncCoverLayer();
    this.rebuildOverlay();
  }

  private onMapChanged(change: { rasterOnly: boolean; box: unknown; recompiled: boolean }): void {
    const compiled = this.store.compiled;
    const side = Math.round(compiled.bounds.maxX - compiled.bounds.minX);
    const sameSize = side === mapSide(this.store.map.size);
    if (change.rasterOnly && sameSize && this.lastRasterLayer === 'paint') {
      this.view.setGroundPaint(compiled.paint!);
    } else {
      this.view.replaceBattleMap(compiled);
    }
    this.lastRasterLayer = null;
    this.syncCoverLayer();
    this.rebuildOverlay();
  }

  // --- cover overlay (refine-map-editor 6.1, D9) -----------------------------

  /** The slot dots and the concealment hatch, rebuilt when the map recompiles. */
  private syncCoverLayer(): void {
    const on = this.store.view.cover;
    const compiled = this.store.compiled;
    if (on ? this.coverFor === compiled : this.coverFor === null) return;
    for (const child of [...this.coverLayer.children]) {
      this.coverLayer.remove(child);
      const mesh = child as THREE.Mesh;
      mesh.geometry?.dispose();
      (mesh.material as THREE.Material | undefined)?.dispose();
    }
    this.coverFor = on ? compiled : null;
    if (!on) {
      this.store.setCoverHover(null);
      return;
    }
    // Concealing vegetation, hatched: diagonals through every third cell.
    const raster = compiled.raster?.vegetation;
    if (raster) {
      const { minX, minY } = compiled.bounds;
      const side = Math.round(compiled.bounds.maxX - minX);
      const vertices: number[] = [];
      for (let row = 0; row < side; row += 1) {
        for (let col = row % 3; col < side; col += 3) {
          if (!raster[row * side + col]) continue;
          const x = minX + col;
          const y = minY + row;
          if (!vegetationAt(x + 0.5, y + 0.5)) continue;
          vertices.push(x, terrainHeightAt(x, y) + 0.3, y, x + 1, terrainHeightAt(x + 1, y + 1) + 0.3, y + 1);
        }
      }
      if (vertices.length > 0) {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        const hatch = new THREE.LineSegments(geometry, new THREE.LineBasicMaterial({ color: COLORS.hatch, depthTest: false, transparent: true, opacity: 0.55 }));
        hatch.name = 'cover-hatch';
        hatch.renderOrder = 9;
        this.coverLayer.add(hatch);
      }
    }
    // The game's slots, one instanced dot each, coloured by what they protect.
    const { slots } = this.store.coverPreview();
    if (slots.length > 0) {
      const disc = new THREE.CircleGeometry(0.4, 10);
      disc.rotateX(-Math.PI / 2);
      const dots = new THREE.InstancedMesh(disc, new THREE.MeshBasicMaterial({ depthTest: false, transparent: true, opacity: 0.95 }), slots.length);
      const matrix = new THREE.Matrix4();
      const color = new THREE.Color();
      slots.forEach((slot, index) => {
        matrix.makeTranslation(slot.x, terrainHeightAt(slot.x, slot.y) + 0.35, slot.y);
        dots.setMatrixAt(index, matrix);
        dots.setColorAt(index, color.setHex(PROTECTION_COLORS[slot.protects]));
      });
      dots.instanceMatrix.needsUpdate = true;
      if (dots.instanceColor) dots.instanceColor.needsUpdate = true;
      dots.name = 'cover-slots';
      dots.renderOrder = 12;
      dots.frustumCulled = false;
      this.coverLayer.add(dots);
    }
    // garrison-and-assault 4.6: every position's firing posts, a short tick from the post facing out
    // (raised at upper floors and the tower by the post's height).
    const ports = this.store.positions().flatMap((position) => position.ports);
    if (ports.length > 0) {
      const tick = new THREE.PlaneGeometry(1, 0.16);
      tick.rotateX(-Math.PI / 2);
      tick.translate(0.5, 0, 0);
      const ticks = new THREE.InstancedMesh(tick, new THREE.MeshBasicMaterial({ color: COLORS.port, depthTest: false, transparent: true, opacity: 0.95, side: THREE.DoubleSide }), ports.length);
      const matrix = new THREE.Matrix4();
      const turn = new THREE.Matrix4();
      ports.forEach((port, index) => {
        turn.makeRotationY(-Math.atan2(port.facing.y, port.facing.x));
        matrix.makeTranslation(port.x, terrainHeightAt(port.x, port.y) + 0.4 + (port.elevation ?? 0), port.y).multiply(turn);
        ticks.setMatrixAt(index, matrix);
      });
      ticks.instanceMatrix.needsUpdate = true;
      ticks.name = 'cover-ports';
      ticks.renderOrder = 13;
      ticks.frustumCulled = false;
      this.coverLayer.add(ticks);
    }
  }

  /** garrison-and-assault 4.6: port ticks drawn by the cover overlay (0 while it is off). */
  coverPortCount(): number {
    const ticks = this.coverLayer.getObjectByName('cover-ports') as THREE.InstancedMesh | undefined;
    return ticks?.count ?? 0;
  }

  /** The piece whose slot is nearest the pointer, within the pick radius. */
  private coverPieceAt(point: Vec2): string | null {
    let best: string | null = null;
    let bestDistance = Math.max(1.5, this.pick) ** 2;
    for (const slot of this.store.coverPreview().slots) {
      if (!slot.piece) continue;
      const distance = (slot.x - point.x) ** 2 + (slot.y - point.y) ** 2;
      if (distance < bestDistance) {
        bestDistance = distance;
        best = slot.piece;
      }
    }
    return best;
  }

  /** Hover detail: the piece's slots ringed, each with its guard arc. */
  private drawCoverHover(): void {
    const key = this.store.coverHover;
    if (!this.store.view.cover || !key) return;
    for (const slot of this.store.coverPreview().slots) {
      if (slot.piece !== key) continue;
      const color = PROTECTION_COLORS[slot.protects];
      this.overlay.add(this.ring(slot, 0.6, color));
      if (!slot.guard) continue;
      const angle = Math.atan2(slot.guard.y, slot.guard.x);
      const arc: Vec2[] = [slot];
      for (let step = -3; step <= 3; step += 1) {
        const a = angle + (step / 3) * (Math.PI / 4);
        arc.push({ x: slot.x + Math.cos(a) * 2.5, y: slot.y + Math.sin(a) * 2.5 });
      }
      arc.push(slot);
      this.overlay.add(this.line(arc, color, false, 0.4));
    }
  }

  /** Slot-count badges per piece, clustered per 50 m cell at strategic span. */
  private placeBadges(): void {
    let index = 0;
    if (this.store.view.cover) {
      const { pieces } = this.store.coverPreview();
      const clustered = this.view.camera.span > BADGE_CLUSTER_SPAN;
      const badges = clustered
        ? clusterBadges(pieces).map((cluster) => ({ key: cluster.key, at: cluster.at, count: cluster.count, cluster: true }))
        : pieces.map((piece) => ({ key: piece.key, at: piece.at, count: piece.count, cluster: false }));
      const width = this.container.clientWidth;
      const height = this.container.clientHeight;
      for (const badge of badges) {
        const screen = this.view.groundToScreen(badge.at.x, badge.at.y);
        if (!screen || screen.x < -40 || screen.y < -40 || screen.x > width + 40 || screen.y > height + 40) continue;
        let label = this.badgeLabels[index];
        if (!label) {
          label = document.createElement('div');
          label.className = 'editor-badge';
          this.labels.appendChild(label);
          this.badgeLabels[index] = label;
        }
        label.style.display = 'block';
        label.style.transform = `translate(${Math.round(screen.x)}px, ${Math.round(screen.y) - 18}px) translateX(-50%)`;
        const text = String(badge.count);
        if (label.textContent !== text) label.textContent = text;
        if (badge.cluster) {
          delete label.dataset.piece;
          label.dataset.cluster = badge.key;
        } else {
          delete label.dataset.cluster;
          label.dataset.piece = badge.key;
        }
        label.dataset.hover = String(!badge.cluster && badge.key === this.store.coverHover);
        index += 1;
      }
    }
    for (; index < this.badgeLabels.length; index += 1) this.badgeLabels[index]!.style.display = 'none';
  }

  private lastRasterLayer: string | null = null;

  // --- pointer -------------------------------------------------------------

  private groundAt(event: PointerEvent | MouseEvent): Vec2 | null {
    const rect = this.container.getBoundingClientRect();
    return this.view.screenToGround(event.clientX - rect.left, event.clientY - rect.top);
  }

  private snap(point: Vec2): Vec2 {
    const step = this.store.settings.snap;
    if (!step) return { x: Math.round(point.x * 100) / 100, y: Math.round(point.y * 100) / 100 };
    return { x: Math.round(point.x / step) * step, y: Math.round(point.y / step) * step };
  }

  private clampToMap(point: Vec2): Vec2 {
    const half = mapSide(this.store.map.size) / 2;
    return { x: Math.max(-half, Math.min(half, point.x)), y: Math.max(-half, Math.min(half, point.y)) };
  }

  /** Hit radius in metres for the current zoom. */
  private get pick(): number {
    return Math.max(1.2, this.view.camera.span / 60);
  }

  private onPointerDown = (event: PointerEvent): void => {
    // A click on the map takes the keys back from the panels (Enter, Esc, Del act on the map).
    const focused = document.activeElement;
    if (focused instanceof HTMLElement && focused !== document.body) focused.blur();
    if (event.button === 1 || event.button === 2) {
      this.drag = { kind: 'pan', x: event.clientX, y: event.clientY };
      (event.target as Element).setPointerCapture(event.pointerId);
      return;
    }
    if (event.button !== 0) return;
    const ground = this.groundAt(event);
    if (!ground) return;
    const point = this.clampToMap(ground);
    const tool = this.store.tool;
    const map = this.store.map;
    (event.target as Element).setPointerCapture(event.pointerId);

    if (BRUSH_TOOLS.has(tool)) {
      const stroke = new Stroke(map, tool, this.store.settings, point, event.shiftKey);
      stroke.apply(point.x, point.y, 1 / 30);
      this.drag = { kind: 'stroke', stroke, last: point, time: performance.now() };
      this.showStroke(stroke);
      return;
    }
    if (tool === 'fill') {
      const changes = fill(map, point.x, point.y, groundMaterialIndex(this.store.settings.material));
      if (changes.size > 0) {
        this.lastRasterLayer = 'paint';
        this.store.record(rasterCommand('paint', changes, map, null));
      }
      return;
    }
    if (POLYLINE_TOOLS.has(tool)) {
      const snapped = this.snap(point);
      const last = this.draft[this.draft.length - 1];
      if (!last || Math.hypot(last.x - snapped.x, last.y - snapped.y) > 0.4) this.draft.push(snapped);
      if ((tool === 'bridge' || tool === 'ferry') && this.draft.length === 2) this.finishDraft();
      this.rebuildOverlay();
      return;
    }
    if (tool === 'trees') {
      const settings = this.store.settings;
      const radius = Math.max(0.5, settings.size / 2);
      if (settings.treeMode === 'single') {
        const snapped = this.snap(point);
        if (!catalogObject(settings.treeSpecies)) return;
        this.store.editVector((draft) => {
          draft.objects.push({ id: this.store.nextId(draft.objects), type: settings.treeSpecies, x: snapped.x, y: snapped.y, rotation: (settings.rotation * Math.PI) / 180 });
        });
      } else if (settings.treeMode === 'erase') {
        this.drag = { kind: 'erase-trees', ids: new Set(treesUnder(map, point.x, point.y, radius)), last: point };
      } else {
        this.store.treeStrokes += 1;
        const scatter = new TreeScatter(map, { radius, biome: settings.treeBiome, species: settings.treeMix, density: settings.treeDensity, seed: treeStrokeSeed(map.id, this.store.treeStrokes) });
        scatter.dab(point.x, point.y);
        this.drag = { kind: 'scatter', scatter, last: point };
      }
      this.rebuildOverlay();
      return;
    }
    if (tool === 'place') {
      const snapped = this.snap(point);
      const { objectType, rotation, scale, rockKind } = this.store.settings;
      if (!catalogObject(objectType)) return;
      this.store.editVector((draft) => {
        draft.objects.push({ id: this.store.nextId(draft.objects), type: objectType, x: snapped.x, y: snapped.y, rotation: (rotation * Math.PI) / 180, ...(scale !== 1 ? { scale } : {}), ...(isRockKind(objectType, rockKind) ? { variant: rockKind } : {}) });
      });
      return;
    }
    if (tool === 'objective') {
      // add-map-objectives 1.3: a click on an objective takes it (drag moves it); elsewhere places a new one.
      const hit = this.objectiveAt(point);
      if (hit) {
        this.store.setSelection([hit]);
        this.drag = { kind: 'move', start: point, current: point, items: [hit] };
        return;
      }
      const snapped = this.snap(point);
      let id = 0;
      this.store.editVector((draft) => {
        const objectives = [...(draft.objectives ?? [])];
        id = this.store.nextId(objectives);
        objectives.push({
          id,
          name: { en: `Objective ${id}`, 'pt-BR': `Objetivo ${id}` },
          area: objectiveCircle(snapped, OBJECTIVE_RADIUS),
          flag: { x: snapped.x, y: snapped.y },
          value: 1,
          owner: 'neutral',
        });
        draft.objectives = objectives;
      });
      this.store.setSelection([{ kind: 'objective', id }]);
      return;
    }
    if (tool === 'entry-point' || tool === 'event-area') {
      // add-battle-events 4.1: a click on a place of the tool's kind takes it (drag moves it); elsewhere adds one.
      const kind = tool === 'entry-point' ? 'entry' : 'area';
      const hit = this.eventPlaceAt(point, kind);
      if (hit) {
        this.store.setSelection([hit]);
        this.drag = { kind: 'move', start: point, current: point, items: [hit] };
        return;
      }
      let id = 0;
      // Places are numbered per kind in their names ("Entry 2", "Area 1"); ids are shared.
      const number = (this.store.map.eventPlaces ?? []).filter((place) => place.kind === kind).length + 1;
      const name = () => this.placeName?.(kind, number) ?? `${kind} ${number}`;
      this.store.editVector((draft) => {
        id = kind === 'entry' ? addEntryPoint(draft, point, name) : addTriggerArea(draft, this.snap(point), name);
      });
      this.store.setSelection([{ kind: 'event-place', id }]);
      return;
    }
    if (tool === 'deployment' || tool === 'select') {
      const hit = this.hitTest(point, tool === 'deployment');
      if (hit) {
        const already = this.store.selection.some((item) => sameItem(item, hit));
        const selection = event.shiftKey ? (already ? this.store.selection : [...this.store.selection, hit]) : already ? this.store.selection : [hit];
        this.store.setSelection(selection);
        this.drag = { kind: 'move', start: point, current: point, items: selection };
      } else if (tool === 'select') {
        if (!event.shiftKey) this.store.setSelection([]);
        this.drag = { kind: 'box', start: point, current: point };
      }
    }
  };

  private onPointerMove = (event: PointerEvent): void => {
    if (this.drag?.kind === 'pan') {
      const span = this.view.camera.span;
      const metresPerPixel = span / Math.max(1, this.container.clientHeight);
      this.view.camera.pan(-(event.clientX - this.drag.x) * metresPerPixel, -(event.clientY - this.drag.y) * metresPerPixel);
      this.drag = { kind: 'pan', x: event.clientX, y: event.clientY };
      return;
    }
    const ground = this.groundAt(event);
    this.cursor = ground ? this.clampToMap(ground) : null;
    if (ground) this.onCursor?.({ x: ground.x, y: ground.y, height: terrainHeightAt(ground.x, ground.y) });
    else this.onCursor?.(null);
    if (this.store.view.cover && !this.drag) this.store.setCoverHover(ground ? this.coverPieceAt(ground) : null);
    if (!ground) return;
    const point = this.clampToMap(ground);
    const drag = this.drag;
    if (drag?.kind === 'stroke') {
      const now = performance.now();
      drag.stroke.applyAlong(drag.last, point, Math.min(0.1, (now - drag.time) / 1000));
      drag.last = point;
      drag.time = now;
      this.showStroke(drag.stroke);
    } else if (drag?.kind === 'scatter' || drag?.kind === 'erase-trees') {
      // Dabs every half radius along the drag, so a fast stroke leaves no gaps.
      const radius = Math.max(0.5, this.store.settings.size / 2);
      const length = Math.hypot(point.x - drag.last.x, point.y - drag.last.y);
      const steps = Math.floor(length / (radius / 2));
      for (let step = 1; step <= steps; step += 1) {
        const at = { x: drag.last.x + ((point.x - drag.last.x) * step) / steps, y: drag.last.y + ((point.y - drag.last.y) * step) / steps };
        if (drag.kind === 'scatter') drag.scatter.dab(at.x, at.y);
        else for (const id of treesUnder(this.store.map, at.x, at.y, radius)) drag.ids.add(id);
      }
      if (steps > 0) drag.last = point;
    } else if (drag?.kind === 'move' || drag?.kind === 'box') {
      drag.current = point;
    }
    this.rebuildOverlay();
  };

  private onPointerUp = (event: PointerEvent): void => {
    const drag = this.drag;
    this.drag = null;
    if (!drag) return;
    (event.target as Element).releasePointerCapture?.(event.pointerId);
    if (drag.kind === 'stroke') {
      if (drag.stroke.changes.size > 0) {
        this.lastRasterLayer = drag.stroke.layer;
        this.store.record(rasterCommand(drag.stroke.layer, drag.stroke.changes, this.store.map, drag.stroke.dirtyBox()));
      }
    } else if (drag.kind === 'scatter') {
      // One stroke is one undo step.
      const trees: ScatteredTree[] = drag.scatter.trees;
      if (trees.length > 0) {
        this.store.editVector((draft) => {
          let id = this.store.nextId(draft.objects);
          for (const tree of trees) draft.objects.push({ id: id++, ...tree });
        });
      }
    } else if (drag.kind === 'erase-trees') {
      if (drag.ids.size > 0) {
        this.store.editVector((draft) => {
          draft.objects = draft.objects.filter((object) => !drag.ids.has(object.id));
        });
        this.store.setSelection(this.store.selection.filter((item) => !(item.kind === 'object' && drag.ids.has(item.id))));
      }
    } else if (drag.kind === 'move') {
      const dx = drag.current.x - drag.start.x;
      const dy = drag.current.y - drag.start.y;
      if (Math.hypot(dx, dy) > 0.05) this.moveItems(drag.items, dx, dy);
    } else if (drag.kind === 'box') {
      const minX = Math.min(drag.start.x, drag.current.x);
      const maxX = Math.max(drag.start.x, drag.current.x);
      const minY = Math.min(drag.start.y, drag.current.y);
      const maxY = Math.max(drag.start.y, drag.current.y);
      if (maxX - minX > 0.5 || maxY - minY > 0.5) {
        const inside = this.store.map.objects
          .filter((object) => object.x >= minX && object.x <= maxX && object.y >= minY && object.y <= maxY)
          .map((object): SelectionItem => ({ kind: 'object', id: object.id }));
        this.store.setSelection(event.shiftKey ? [...this.store.selection, ...inside] : inside);
      }
    }
    this.rebuildOverlay();
  };

  private onPointerLeave = (): void => {
    this.cursor = null;
    this.onCursor?.(null);
    this.store.setCoverHover(null);
    this.rebuildOverlay();
  };

  private onDoubleClick = (event: MouseEvent): void => {
    if (POLYLINE_TOOLS.has(this.store.tool)) {
      this.finishDraft();
      return;
    }
    // Insert a point on the selected polyline's nearest segment.
    const ground = this.groundAt(event);
    const item = this.store.selection[0];
    if (ground && item?.kind === 'event-place') {
      const point = this.snap(ground);
      this.store.editVector((draft) => {
        const place = (draft.eventPlaces ?? []).find((entry) => entry.id === item.id);
        if (place?.kind !== 'area') return;
        const polygon = place.polygon.map((corner) => ({ ...corner }));
        if (polygon.length >= 16) return;
        let best = 0;
        let bestDistance = Infinity;
        for (let index = 0; index < polygon.length; index += 1) {
          const distance = segmentDistance(point, polygon[index]!, polygon[(index + 1) % polygon.length]!);
          if (distance < bestDistance) {
            bestDistance = distance;
            best = index + 1;
          }
        }
        polygon.splice(best, 0, point);
        draft.eventPlaces = (draft.eventPlaces ?? []).map((entry) => (entry.id === item.id ? { ...place, polygon } : entry));
      });
      this.store.setSelection([{ kind: 'event-place', id: item.id }]);
      return;
    }
    if (!ground || !item || !['road', 'river', 'line', 'trench', 'pond', 'area'].includes(item.kind)) return;
    const point = this.snap(ground);
    if (item.kind === 'area') {
      // A corner on the area's nearest edge, the closing edge included.
      this.store.editVector((draft) => {
        // The draft is a copy (editVector): its area may be changed in place.
        const area = draft.deployment[item.side].area as Vec2[];
        let best = 0;
        let bestDistance = Infinity;
        for (let index = 0; index < area.length; index += 1) {
          const distance = segmentDistance(point, area[index]!, area[(index + 1) % area.length]!);
          if (distance < bestDistance) {
            bestDistance = distance;
            best = index + 1;
          }
        }
        area.splice(best, 0, point);
      });
      this.store.setSelection([{ kind: 'area', side: item.side }]);
      return;
    }
    this.store.editVector((draft) => {
      const target = polylineOf(draft, item);
      if (!target) return;
      let best = 0;
      let bestDistance = Infinity;
      for (let index = 1; index < target.points.length; index += 1) {
        const distance = segmentDistance(point, target.points[index - 1]!, target.points[index]!);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = index;
        }
      }
      target.points.splice(best, 0, point);
      if (item.kind === 'river') {
        const river = draft.rivers.find((entry) => entry.id === item.id)!;
        river.kinds.splice(best - 1, 0, river.kinds[best - 1] ?? 'deep');
      }
    });
  };

  private onKeyDown = (event: KeyboardEvent): void => {
    const target = event.target as HTMLElement | null;
    if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
    const store = this.store;
    if (event.ctrlKey && event.code === 'KeyZ') {
      event.preventDefault();
      if (event.shiftKey) store.redo();
      else store.undo();
      return;
    }
    if (event.ctrlKey && event.code === 'KeyY') {
      event.preventDefault();
      store.redo();
      return;
    }
    if (event.code === 'Escape') {
      this.draft = [];
      this.rebuildOverlay();
      return;
    }
    if (event.code === 'Enter' && this.draft.length > 0) {
      this.finishDraft();
      return;
    }
    if (event.code === 'Backspace' && this.draft.length > 0) {
      this.draft.pop();
      this.rebuildOverlay();
      return;
    }
    // refine-map-editor 2.5: X flips the selected trench lines, or the next one drawn.
    if (event.code === 'KeyX') {
      const trenches = store.selection.filter((item) => item.kind === 'trench');
      if (trenches.length > 0) this.flipTrenches(trenches.map((item) => ('id' in item ? item.id : -1)));
      else if (store.tool === 'trench') store.updateSettings({ trenchFacing: store.settings.trenchFacing === 'left' ? 'right' : 'left' });
      this.rebuildOverlay();
      return;
    }
    if (event.code === 'KeyR' && store.tool === 'place') {
      const step = store.settings.rotateStep ? 15 : 5;
      store.updateSettings({ rotation: (store.settings.rotation + (event.shiftKey ? -step : step) + 360) % 360 });
      this.rebuildOverlay();
      return;
    }
    if ((event.code === 'Delete' || (event.code === 'Backspace' && this.draft.length === 0)) && store.selection.length > 0) {
      this.deleteSelection();
      return;
    }
    if (event.ctrlKey && event.code === 'KeyD' && store.selection.length > 0) {
      event.preventDefault();
      this.duplicateSelection();
      return;
    }
    if (event.code === 'Home') this.view.frameMap();
  };

  // --- edits -----------------------------------------------------------------

  /** Turns the parapet (and the slots) of these trench lines to the other side. */
  flipTrenches(ids: readonly number[]): void {
    this.store.editVector((draft) => {
      for (const line of draft.trenches) if (ids.includes(line.id)) line.facing = line.facing === 'left' ? 'right' : 'left';
    });
  }

  private finishDraft(): void {
    const tool = this.store.tool;
    const points = this.draft;
    this.draft = [];
    const settings = this.store.settings;
    const minimum = tool === 'pond' ? 3 : 2;
    if (points.length < minimum || (tool === 'trench' && trenchLength(points) < TRENCH.minLength)) {
      this.rebuildOverlay();
      return;
    }
    this.store.editVector((draft) => {
      switch (tool) {
        case 'road':
          draft.roads.push({
            id: this.store.nextId(draft.roads),
            type: settings.roadType,
            width: settings.roadWidth,
            ditches: { left: settings.ditchLeft, right: settings.ditchRight },
            points,
          });
          break;
        case 'river':
          draft.rivers.push({ id: this.store.nextId(draft.rivers), width: settings.riverWidth, points, kinds: points.slice(1).map(() => settings.waterKind) });
          break;
        case 'pond':
          draft.ponds.push({ id: this.store.nextId(draft.ponds), kind: settings.waterKind, polygon: points });
          break;
        case 'line':
          draft.lines.push({
            id: this.store.nextId(draft.lines),
            kind: settings.lineKind,
            height: settings.lineHeight,
            points,
            ...(isRockKind(settings.lineKind, settings.rockKind) ? { variant: settings.rockKind } : {}),
          });
          break;
        case 'trench':
          draft.trenches.push({
            id: this.store.nextId(draft.trenches),
            kind: settings.trenchKind,
            depth: settings.trenchDepth,
            facing: settings.trenchFacing,
            bays: settings.trenchKind === 'fire' && settings.trenchBays,
            parapet: settings.trenchParapet,
            points,
          });
          break;
        case 'bridge': {
          const [a, b] = points as [Vec2, Vec2];
          const dx = b.x - a.x;
          const dy = b.y - a.y;
          draft.bridges.push({
            id: this.store.nextId(draft.bridges),
            x: (a.x + b.x) / 2,
            y: (a.y + b.y) / 2,
            rotation: Math.atan2(-dx, dy),
            halfWidth: Math.max(1.5, settings.roadWidth / 2),
            halfDepth: Math.hypot(dx, dy) / 2,
            deckHeight: 1.6,
          });
          break;
        }
        case 'ferry':
          draft.ferries.push({ id: this.store.nextId(draft.ferries), landingA: points[0]!, landingB: points[1]! });
          break;
        default:
          break;
      }
    });
  }

  private moveItems(items: SelectionItem[], dx: number, dy: number): void {
    const step = this.store.settings.snap;
    const round = (value: number) => (step ? Math.round(value / step) * step : Math.round(value * 100) / 100);
    this.store.editVector((draft) => {
      for (const item of items) {
        switch (item.kind) {
          case 'object': {
            const object = draft.objects.find((entry) => entry.id === item.id);
            if (object) {
              object.x = round(object.x + dx);
              object.y = round(object.y + dy);
            }
            break;
          }
          case 'section':
            // author-game-maps 8.3: section starts follow the area; nothing to move.
            break;
          case 'bridge': {
            const bridge = draft.bridges.find((entry) => entry.id === item.id);
            if (bridge) {
              bridge.x = round(bridge.x + dx);
              bridge.y = round(bridge.y + dy);
            }
            break;
          }
          case 'ferry': {
            const ferry = draft.ferries.find((entry) => entry.id === item.id);
            if (ferry) {
              for (const key of item.end === undefined ? (['landingA', 'landingB'] as const) : item.end === 0 ? (['landingA'] as const) : (['landingB'] as const)) {
                ferry[key] = { x: round(ferry[key].x + dx), y: round(ferry[key].y + dy) };
              }
            }
            break;
          }
          case 'event-place':
            movePlace(draft, item.id, dx, dy, item.point, round);
            break;
          case 'event':
            break;
          case 'objective': {
            draft.objectives = (draft.objectives ?? []).map((objective) =>
              objective.id === item.id
                ? {
                    ...objective,
                    area: objective.area.map((corner) => ({ x: round(corner.x + dx), y: round(corner.y + dy) })),
                    flag: { x: round(objective.flag.x + dx), y: round(objective.flag.y + dy) },
                  }
                : objective,
            );
            break;
          }
          default: {
            const target = polylineOf(draft, item);
            if (!target) break;
            const indices = item.point === undefined ? target.points.map((_, index) => index) : [item.point];
            for (const index of indices) {
              const point = target.points[index];
              if (point) target.points[index] = { x: round(point.x + dx), y: round(point.y + dy) };
            }
          }
        }
      }
    });
  }

  deleteSelection(): void {
    const items = this.store.selection.filter((item) => item.kind !== 'event');
    if (items.length === 0) return;
    // add-battle-events 4.1: deleting a place that events use asks first, naming them.
    const doomed = items.filter((item): item is Extract<SelectionItem, { kind: 'event-place' }> => item.kind === 'event-place' && item.point === undefined);
    const users = doomed.flatMap((item) => placeUsers(this.store.map.events ?? [], item.id).map((event) => event.label || String(event.id)));
    if (users.length > 0 && this.confirmPlaceDelete && !this.confirmPlaceDelete([...new Set(users)])) return;
    this.store.editVector((draft) => {
      for (const item of items) {
        switch (item.kind) {
          case 'object':
            draft.objects = draft.objects.filter((entry) => entry.id !== item.id);
            break;
          case 'bridge':
            draft.bridges = draft.bridges.filter((entry) => entry.id !== item.id);
            break;
          case 'ferry':
            draft.ferries = draft.ferries.filter((entry) => entry.id !== item.id);
            break;
          case 'section':
            break;
          case 'objective':
            draft.objectives = (draft.objectives ?? []).filter((objective) => objective.id !== item.id);
            break;
          case 'event-place': {
            const place = (draft.eventPlaces ?? []).find((entry) => entry.id === item.id);
            if (item.point !== undefined && place?.kind === 'area') {
              // A corner goes while three remain.
              if (place.polygon.length > 3) {
                draft.eventPlaces = (draft.eventPlaces ?? []).map((entry) => (entry.id === item.id ? { ...place, polygon: place.polygon.filter((_, index) => index !== item.point) } : entry));
              }
            } else deletePlace(draft, item.id);
            break;
          }
          case 'area': {
            // A corner goes while three remain; the area itself cannot be deleted.
            const area = draft.deployment[item.side].area as Vec2[];
            if (item.point !== undefined && area.length > 3) area.splice(item.point, 1);
            break;
          }
          default: {
            const target = polylineOf(draft, item);
            const minimum = item.kind === 'pond' ? 3 : 2;
            if (target && item.point !== undefined && target.points.length > minimum) {
              target.points.splice(item.point, 1);
              if (item.kind === 'river') draft.rivers.find((entry) => entry.id === item.id)!.kinds.splice(Math.max(0, item.point - 1), 1);
            } else {
              const key = (item.kind + (item.kind === 'trench' ? 'es' : 's')) as 'roads' | 'rivers' | 'ponds' | 'lines' | 'trenches';
              (draft[key] as { id: number }[]) = (draft[key] as { id: number }[]).filter((entry) => entry.id !== item.id);
            }
          }
        }
      }
    });
    this.store.setSelection([]);
  }

  duplicateSelection(): void {
    const copies: SelectionItem[] = [];
    this.store.editVector((draft) => {
      for (const item of this.store.selection) {
        if (item.kind !== 'object') continue;
        const source = draft.objects.find((entry) => entry.id === item.id);
        if (!source) continue;
        const id = this.store.nextId(draft.objects);
        draft.objects.push({ ...source, id, x: source.x + 2, y: source.y + 2 });
        copies.push({ kind: 'object', id });
      }
    });
    this.store.setSelection(copies);
  }

  // --- hit tests -------------------------------------------------------------

  /** add-map-objectives 1.3: the objective whose flag is under the pointer, else the one whose area holds it. */
  private objectiveAt(point: Vec2): SelectionItem | null {
    const objectives = this.store.map.objectives ?? [];
    const flag = objectives.find((objective) => Math.hypot(objective.flag.x - point.x, objective.flag.y - point.y) <= this.pick);
    if (flag) return { kind: 'objective', id: flag.id };
    const inside = objectives.find((objective) => insideDeploymentArea(objective.area as Vec2[], point.x, point.y));
    return inside ? { kind: 'objective', id: inside.id } : null;
  }

  /** add-battle-events 4.1: an entry point under the pointer, or a trigger area's corner, edge or inside. */
  private eventPlaceAt(point: Vec2, kind: 'entry' | 'area'): SelectionItem | null {
    const pick = this.pick;
    const places = (this.store.map.eventPlaces ?? []).filter((place) => place.kind === kind);
    for (const place of places) {
      if (place.kind === 'entry' && Math.hypot(place.point.x - point.x, place.point.y - point.y) <= pick * 1.5) return { kind: 'event-place', id: place.id };
      if (place.kind === 'area') {
        const corner = place.polygon.findIndex((p) => Math.hypot(p.x - point.x, p.y - point.y) <= pick);
        if (corner >= 0) return { kind: 'event-place', id: place.id, point: corner };
      }
    }
    for (const place of places) {
      if (place.kind !== 'area') continue;
      const nearEdge = place.polygon.some((corner, index) => segmentDistance(point, corner, place.polygon[(index + 1) % place.polygon.length]!) <= pick);
      if (nearEdge || insideDeploymentArea(place.polygon, point.x, point.y)) return { kind: 'event-place', id: place.id };
    }
    return null;
  }

  private hitTest(point: Vec2, sectionsOnly: boolean): SelectionItem | null {
    const map = this.store.map;
    const pick = this.pick;
    if (sectionsOnly) {
      // add-deployment-phase 1.2: the deployment tool also takes the areas' corners, then their edges and insides.
      for (const side of ['column', 'legalist'] as const) {
        const index = map.deployment[side].area.findIndex((corner) => Math.hypot(corner.x - point.x, corner.y - point.y) <= pick);
        if (index >= 0) return { kind: 'area', side, point: index };
      }
      for (const side of ['column', 'legalist'] as const) {
        const area = map.deployment[side].area;
        const nearEdge = area.some((corner, index) => segmentDistance(point, corner, area[(index + 1) % area.length]!) <= pick);
        if (nearEdge || insideDeploymentArea(area, point.x, point.y)) return { kind: 'area', side };
      }
      return null;
    }
    // Points of the selected polylines first, then any polyline point.
    for (const kind of ['road', 'river', 'line', 'trench', 'pond'] as const) {
      const list = kind === 'road' ? map.roads : kind === 'river' ? map.rivers : kind === 'line' ? map.lines : kind === 'trench' ? map.trenches : map.ponds;
      for (const entry of list) {
        const points = 'polygon' in entry ? entry.polygon : entry.points;
        const index = points.findIndex((p) => Math.hypot(p.x - point.x, p.y - point.y) <= pick);
        if (index >= 0) return { kind, id: entry.id, point: index };
      }
    }
    for (const ferry of map.ferries) {
      if (Math.hypot(ferry.landingA.x - point.x, ferry.landingA.y - point.y) <= pick) return { kind: 'ferry', id: ferry.id, end: 0 };
      if (Math.hypot(ferry.landingB.x - point.x, ferry.landingB.y - point.y) <= pick) return { kind: 'ferry', id: ferry.id, end: 1 };
    }
    // Objects: the smallest footprint under the pointer.
    let best: { id: number; area: number } | null = null;
    for (const object of map.objects) {
      const entry = catalogObject(object.type);
      if (!entry) continue;
      const scale = object.scale ?? 1;
      const halfWidth = Math.max(entry.halfWidth * scale, pick / 2);
      const halfDepth = Math.max(entry.halfDepth * scale, pick / 2);
      const cos = Math.cos(object.rotation);
      const sin = Math.sin(object.rotation);
      const dx = point.x - object.x;
      const dy = point.y - object.y;
      if (Math.abs(dx * cos + dy * sin) <= halfWidth && Math.abs(-dx * sin + dy * cos) <= halfDepth) {
        const area = halfWidth * halfDepth;
        if (!best || area < best.area) best = { id: object.id, area };
      }
    }
    if (best) return { kind: 'object', id: best.id };
    for (const bridge of map.bridges) {
      if (insideBridge(bridge, point)) return { kind: 'bridge', id: bridge.id };
    }
    for (const kind of ['road', 'river', 'line', 'trench'] as const) {
      const list = kind === 'road' ? map.roads : kind === 'river' ? map.rivers : kind === 'line' ? map.lines : map.trenches;
      for (const entry of list) {
        const width = 'width' in entry ? entry.width / 2 : 1;
        for (let index = 1; index < entry.points.length; index += 1) {
          if (segmentDistance(point, entry.points[index - 1]!, entry.points[index]!) <= Math.max(width, pick)) return { kind, id: entry.id };
        }
      }
    }
    return null;
  }

  // --- drawing -----------------------------------------------------------------

  private showStroke(stroke: Stroke): void {
    const map = this.store.map;
    if (stroke.layer === 'paint') {
      this.view.setGroundPaint(map.paint);
    } else if (stroke.layer === 'heights') {
      this.view.updateGroundHeights((x, z) => sampleHeight(map, x, z), stroke.box ?? undefined);
    }
  }

  private tick = (): void => {
    if (this.disposed) return;
    // Height brushes keep working while held still.
    const drag = this.drag;
    if (drag?.kind === 'stroke' && drag.stroke.layer === 'heights') {
      const now = performance.now();
      const dt = Math.min(0.1, (now - drag.time) / 1000);
      if (dt > 0.03) {
        drag.stroke.apply(drag.last.x, drag.last.y, dt);
        drag.time = now;
        this.showStroke(drag.stroke);
      }
    }
    this.placeLabels();
    this.placeEventLabels();
    this.placeBadges();
    this.drawScaleBar();
    this.frame = requestAnimationFrame(this.tick);
  };

  /** Redraws the on-screen scale bar when the zoom, the view's height or the language changes. */
  private drawScaleBar(): void {
    const height = this.container.clientHeight;
    if (height <= 0) return;
    const metresPerPixel = this.view.camera.span / height;
    const bar = chooseScaleBar(metresPerPixel, SCALE_BAR_MAX_PX);
    const text = this.scaleText();
    const ratio = Math.max(1, Math.round(window.devicePixelRatio || 1));
    const key = `${bar.length}|${bar.pixels.toFixed(1)}|${ratio}|${text.heading(bar.length)}`;
    if (key === this.scaleKey) return;
    this.scaleKey = key;
    this.scaleBar = { ...bar, metresPerPixel };
    const style = { ...EDITOR_SCALE_STYLE, unit: ratio };
    const scaled = { ...bar, pixels: bar.pixels * ratio };
    const box = scaleBarBox(scaled, style);
    const canvas = this.scaleCanvas;
    canvas.width = box.width;
    canvas.height = box.height;
    canvas.style.width = `${box.width / ratio}px`;
    canvas.style.height = `${box.height / ratio}px`;
    canvas.dataset.length = String(bar.length);
    canvas.dataset.pixels = bar.pixels.toFixed(2);
    canvas.dataset.metresPerPixel = metresPerPixel.toFixed(4);
    const context = canvas.getContext('2d');
    if (!context) return;
    context.clearRect(0, 0, box.width, box.height);
    drawScaleBar(context, scaled, 0, 0, style, text);
  }

  /** add-battle-events 4.2: whether event places are shown (the Events panel or a place tool). */
  private eventPlacesShown(): boolean {
    return this.store.view.events || this.store.tool === 'entry-point' || this.store.tool === 'event-area';
  }

  /** What the selected event uses: its places, objectives and move points. */
  private eventUses(): { places: Set<number>; objectives: Set<number>; points: Vec2[] } {
    const uses = { places: new Set<number>(), objectives: new Set<number>(), points: [] as Vec2[] };
    const selectedEvents = new Set(this.store.selection.filter((item) => item.kind === 'event').map((item) => ('id' in item ? item.id : -1)));
    for (const event of this.store.map.events ?? []) {
      if (!selectedEvents.has(event.id)) continue;
      const trigger = event.trigger;
      if (trigger?.kind === 'area') uses.places.add(trigger.area);
      if (trigger?.kind === 'objective') uses.objectives.add(trigger.objective);
      for (const action of event.actions) {
        if (action.kind === 'troops') {
          uses.places.add(action.entry);
          if (action.order.kind === 'objective') uses.objectives.add(action.order.objective);
          if (action.order.kind === 'move') uses.points.push(action.order.to);
        } else if (action.kind === 'posture' && action.area !== undefined) uses.places.add(action.area);
      }
    }
    return uses;
  }

  private drawEventPlaces(selected: (item: SelectionItem) => boolean): void {
    if (!this.eventPlacesShown()) return;
    const pick = this.pick;
    const uses = this.eventUses();
    for (const place of this.store.map.eventPlaces ?? []) {
      const isSelected = selected({ kind: 'event-place', id: place.id });
      const colour = isSelected ? COLORS.selection : uses.places.has(place.id) ? COLORS.eventHighlight : COLORS.eventPlace;
      if (place.kind === 'entry') {
        this.overlay.add(this.marker(place.point, colour, pick * 1.1));
        const tip = { x: place.point.x + place.facing.x * 8, y: place.point.y + place.facing.y * 8 };
        this.overlay.add(this.line([place.point, tip], colour));
      } else {
        this.overlay.add(this.line(place.polygon, colour, true));
        if (isSelected || this.store.tool === 'event-area') {
          place.polygon.forEach((corner, point) => this.overlay.add(this.marker(corner, isSelected || selected({ kind: 'event-place', id: place.id, point }) ? COLORS.selection : colour, pick * 0.6)));
        }
      }
    }
    for (const objective of this.store.map.objectives ?? []) {
      if (uses.objectives.has(objective.id)) this.overlay.add(this.line(objective.area as Vec2[], COLORS.eventHighlight, true, 0.6));
    }
    for (const point of uses.points) this.overlay.add(this.ring(point, 3, COLORS.eventHighlight));
  }

  /** add-battle-events 4.2: each event place's name over it while places are shown. */
  private placeEventLabels(): void {
    let index = 0;
    if (this.eventPlacesShown()) {
      for (const place of this.store.map.eventPlaces ?? []) {
        const at = place.kind === 'entry' ? place.point : {
          x: place.polygon.reduce((sum, p) => sum + p.x, 0) / place.polygon.length,
          y: place.polygon.reduce((sum, p) => sum + p.y, 0) / place.polygon.length,
        };
        const screen = this.view.groundToScreen(at.x, at.y);
        if (!screen) continue;
        let label = this.placeLabels_[index];
        if (!label) {
          label = document.createElement('div');
          label.className = 'editor-label editor-place-label';
          this.labels.appendChild(label);
          this.placeLabels_[index] = label;
        }
        label.style.display = 'block';
        label.style.transform = `translate(${Math.round(screen.x)}px, ${Math.round(screen.y) - 24}px) translateX(-50%)`;
        if (label.textContent !== place.name) label.textContent = place.name;
        label.dataset.place = String(place.id);
        index += 1;
      }
    }
    for (; index < this.placeLabels_.length; index += 1) this.placeLabels_[index]!.style.display = 'none';
  }

  private placeLabels(): void {
    const map = this.store.map;
    let index = 0;
    for (const side of ['column', 'legalist'] as const) {
      map.deployment[side].sections.forEach((section, sectionIndex) => {
        let label = this.sectionLabels[index];
        if (!label) {
          label = document.createElement('div');
          label.className = 'editor-label';
          this.labels.appendChild(label);
          this.sectionLabels[index] = label;
        }
        const screen = this.view.groundToScreen(section.x, section.y);
        label.style.display = screen ? 'block' : 'none';
        if (screen) {
          label.style.transform = `translate(${Math.round(screen.x)}px, ${Math.round(screen.y) - 28}px) translateX(-50%)`;
          const text = this.sectionText(side, sectionIndex);
          if (label.textContent !== text) label.textContent = text;
          label.dataset.side = side;
        }
        index += 1;
      });
    }
    for (; index < this.sectionLabels.length; index += 1) this.sectionLabels[index]!.style.display = 'none';
  }

  private line(points: readonly Vec2[], color: number, closed = false, lift = 0.35): THREE.Line {
    const vertices: THREE.Vector3[] = [];
    const all = closed && points.length > 2 ? [...points, points[0]!] : points;
    for (let index = 0; index < all.length; index += 1) {
      const a = all[index]!;
      const b = all[index + 1];
      vertices.push(new THREE.Vector3(a.x, terrainHeightAt(a.x, a.y) + lift, a.y));
      if (b) {
        // Follow the ground between points.
        const length = Math.hypot(b.x - a.x, b.y - a.y);
        const steps = Math.min(64, Math.floor(length / 4));
        for (let step = 1; step < steps; step += 1) {
          const t = step / steps;
          const x = a.x + (b.x - a.x) * t;
          const y = a.y + (b.y - a.y) * t;
          vertices.push(new THREE.Vector3(x, terrainHeightAt(x, y) + lift, y));
        }
      }
    }
    const geometry = new THREE.BufferGeometry().setFromPoints(vertices);
    const material = new THREE.LineBasicMaterial({ color, depthTest: false, transparent: true });
    const line = new THREE.Line(geometry, material);
    line.renderOrder = 10;
    return line;
  }

  private marker(point: Vec2, color: number, size: number): THREE.Mesh {
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(size, size, size),
      new THREE.MeshBasicMaterial({ color, depthTest: false, transparent: true, opacity: 0.9 }),
    );
    mesh.position.set(point.x, terrainHeightAt(point.x, point.y) + size / 2 + 0.2, point.y);
    mesh.renderOrder = 11;
    return mesh;
  }

  private ring(center: Vec2, radius: number, color: number, square = false): THREE.Line {
    const points: Vec2[] = [];
    if (square) {
      points.push(
        { x: center.x - radius, y: center.y - radius },
        { x: center.x + radius, y: center.y - radius },
        { x: center.x + radius, y: center.y + radius },
        { x: center.x - radius, y: center.y + radius },
      );
    } else {
      const segments = Math.max(16, Math.min(64, Math.round(radius * 6)));
      for (let index = 0; index < segments; index += 1) {
        const angle = (index / segments) * Math.PI * 2;
        points.push({ x: center.x + Math.cos(angle) * radius, y: center.y + Math.sin(angle) * radius });
      }
    }
    return this.line(points, color, true, 0.25);
  }

  rebuildOverlay(): void {
    for (const child of [...this.overlay.children]) {
      this.overlay.remove(child);
      const mesh = child as THREE.Mesh;
      mesh.geometry?.dispose();
      (mesh.material as THREE.Material | undefined)?.dispose();
    }
    const store = this.store;
    const map = store.map;
    const tool = store.tool;
    const settings = store.settings;
    const pick = this.pick;
    const selected = (item: SelectionItem) => store.selection.some((entry) => sameItem(entry, item) || (entry.kind === item.kind && 'id' in entry && 'id' in item && entry.id === item.id));

    // Vector layers: always faint, selected ones bright with their points.
    const showVectors = !BRUSH_TOOLS.has(tool) || tool === 'raise' || tool === 'lower';
    if (showVectors) {
      for (const road of map.roads) {
        const isSelected = selected({ kind: 'road', id: road.id });
        this.overlay.add(this.line(road.points, isSelected ? COLORS.selection : COLORS.road));
        if (isSelected || tool === 'select') road.points.forEach((point) => this.overlay.add(this.marker(point, isSelected ? COLORS.selection : COLORS.road, pick * 0.6)));
      }
      for (const river of map.rivers) {
        const isSelected = selected({ kind: 'river', id: river.id });
        this.overlay.add(this.line(river.points, isSelected ? COLORS.selection : COLORS.river));
        if (isSelected || tool === 'select') river.points.forEach((point) => this.overlay.add(this.marker(point, isSelected ? COLORS.selection : COLORS.river, pick * 0.6)));
      }
      for (const pond of map.ponds) {
        const isSelected = selected({ kind: 'pond', id: pond.id });
        this.overlay.add(this.line(pond.polygon, isSelected ? COLORS.selection : COLORS.pond, true));
        if (isSelected || tool === 'select') pond.polygon.forEach((point) => this.overlay.add(this.marker(point, isSelected ? COLORS.selection : COLORS.pond, pick * 0.6)));
      }
      for (const trench of map.trenches) {
        const isSelected = selected({ kind: 'trench', id: trench.id });
        const color = isSelected ? COLORS.selection : COLORS.line;
        this.overlay.add(this.line(trench.points, color));
        // Ticks on the parapet side, every 4 m: which way the trench faces.
        if (trench.kind === 'fire') this.overlay.add(this.line(facingTicks(trench.points, trench.facing), color));
        if (isSelected || tool === 'select' || tool === 'trench') trench.points.forEach((point) => this.overlay.add(this.marker(point, color, pick * 0.5)));
      }
      for (const line of map.lines) {
        const isSelected = selected({ kind: 'line', id: line.id });
        if (isSelected || tool === 'select' || tool === 'line') {
          this.overlay.add(this.line(line.points, isSelected ? COLORS.selection : COLORS.line));
          line.points.forEach((point) => this.overlay.add(this.marker(point, isSelected ? COLORS.selection : COLORS.line, pick * 0.5)));
        }
      }
      for (const bridge of map.bridges) {
        if (selected({ kind: 'bridge', id: bridge.id })) this.overlay.add(this.line(bridgePolygon(bridge), COLORS.selection, true));
      }
      for (const ferry of map.ferries) {
        const isSelected = selected({ kind: 'ferry', id: ferry.id });
        this.overlay.add(this.marker(ferry.landingA, isSelected ? COLORS.selection : COLORS.river, pick * 0.7));
        this.overlay.add(this.marker(ferry.landingB, isSelected ? COLORS.selection : COLORS.river, pick * 0.7));
      }
    }
    // Selected objects: their footprint.
    for (const item of store.selection) {
      if (item.kind !== 'object') continue;
      const object = map.objects.find((entry) => entry.id === item.id);
      const entry = object && catalogObject(object.type);
      if (!object || !entry) continue;
      const scale = object.scale ?? 1;
      this.overlay.add(this.line(rectangle(object.x, object.y, Math.max(0.4, entry.halfWidth * scale), Math.max(0.4, entry.halfDepth * scale), object.rotation), COLORS.selection, true));
    }
    // Deployment: each side's area (corners shown with the deployment tool); the section starts follow it (author-game-maps 8.3).
    for (const side of ['column', 'legalist'] as const) {
      const zone = map.deployment[side];
      const areaSelected = selected({ kind: 'area', side });
      this.overlay.add(this.line(zone.area, areaSelected ? COLORS.selection : COLORS[side], true));
      if (tool === 'deployment') {
        zone.area.forEach((corner, point) => {
          this.overlay.add(this.marker(corner, areaSelected || selected({ kind: 'area', side, point }) ? COLORS.selection : COLORS[side], pick * 0.6));
        });
      }
    }
    // add-map-objectives 1.3: each objective's area in its owner's colour, and its flag.
    for (const objective of map.objectives ?? []) {
      const colour = selected({ kind: 'objective', id: objective.id }) ? COLORS.selection : objective.owner === 'neutral' ? COLORS.objective : COLORS[objective.owner];
      this.overlay.add(this.line(objective.area as Vec2[], colour, true));
      this.overlay.add(this.marker(objective.flag, colour, pick * (tool === 'objective' ? 0.9 : 0.6)));
    }
    this.drawEventPlaces(selected);
    this.drawCoverHover();
    // Drafts and the cursor.
    const drag = this.drag;
    if (drag?.kind === 'move') {
      const dx = drag.current.x - drag.start.x;
      const dy = drag.current.y - drag.start.y;
      for (const item of drag.items) {
        const at = itemPoint(map, item);
        if (at) this.overlay.add(this.marker({ x: at.x + dx, y: at.y + dy }, COLORS.selection, pick * 0.7));
      }
    }
    if (drag?.kind === 'scatter') {
      for (const tree of drag.scatter.trees) this.overlay.add(this.marker(tree, COLORS.tree, pick * 0.6));
    }
    if (drag?.kind === 'erase-trees') {
      for (const object of map.objects) if (drag.ids.has(object.id)) this.overlay.add(this.marker(object, COLORS.erase, pick * 0.7));
    }
    if (drag?.kind === 'box') {
      const { start, current } = drag;
      this.overlay.add(this.line([start, { x: current.x, y: start.y }, current, { x: start.x, y: current.y }], COLORS.selection, true));
    }
    if (this.draft.length > 0) {
      const color = tool === 'river' || tool === 'pond' ? COLORS.river : COLORS.draft;
      const preview = this.cursor ? [...this.draft, this.snap(this.cursor)] : this.draft;
      this.overlay.add(this.line(preview, color, tool === 'pond'));
      if (tool === 'trench' && settings.trenchKind === 'fire' && preview.length > 1) this.overlay.add(this.line(facingTicks(preview, settings.trenchFacing), color));
      this.draft.forEach((point) => this.overlay.add(this.marker(point, color, pick * 0.6)));
    }
    const cursor = this.cursor;
    if (cursor) {
      if (BRUSH_TOOLS.has(tool)) {
        this.overlay.add(this.ring(cursor, Math.max(0.5, settings.size / 2), COLORS.cursor, settings.shape === 'square'));
      } else if (tool === 'trees') {
        if (settings.treeMode === 'single') this.overlay.add(this.marker(this.snap(cursor), COLORS.tree, pick * 0.5));
        else this.overlay.add(this.ring(cursor, Math.max(0.5, settings.size / 2), settings.treeMode === 'erase' ? COLORS.erase : COLORS.tree));
      } else if (tool === 'place') {
        const entry = catalogObject(settings.objectType);
        if (entry) {
          const at = this.snap(cursor);
          this.overlay.add(this.line(rectangle(at.x, at.y, Math.max(0.4, entry.halfWidth * settings.scale), Math.max(0.4, entry.halfDepth * settings.scale), (settings.rotation * Math.PI) / 180), COLORS.draft, true));
        }
      } else if (POLYLINE_TOOLS.has(tool) || tool === 'fill') {
        this.overlay.add(this.marker(this.snap(cursor), COLORS.cursor, pick * 0.4));
      }
    }
  }
}

/**
 * Short ticks off a trench line toward its parapet, every 4 m, drawn as one
 * zig-zag polyline (out and back) so the overlay's line helper draws them.
 */
function facingTicks(points: readonly Vec2[], facing: 'left' | 'right'): Vec2[] {
  const out: Vec2[] = [];
  const side = facing === 'right' ? 1 : -1;
  for (let index = 1; index < points.length; index += 1) {
    const a = points[index - 1]!;
    const b = points[index]!;
    const length = Math.hypot(b.x - a.x, b.y - a.y);
    if (length < 0.01) continue;
    const nx = (-(b.y - a.y) / length) * side;
    const ny = ((b.x - a.x) / length) * side;
    for (let along = 2; along < length; along += 4) {
      const x = a.x + ((b.x - a.x) * along) / length;
      const y = a.y + ((b.y - a.y) * along) / length;
      out.push({ x, y }, { x: x + nx * 1.5, y: y + ny * 1.5 }, { x, y });
    }
  }
  return out;
}

function sameItem(a: SelectionItem, b: SelectionItem): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

function polylineOf(map: EditableMap, item: SelectionItem): { points: Vec2[] } | null {
  switch (item.kind) {
    case 'road':
      return map.roads.find((entry) => entry.id === item.id) ?? null;
    case 'river':
      return map.rivers.find((entry) => entry.id === item.id) ?? null;
    case 'line':
      return map.lines.find((entry) => entry.id === item.id) ?? null;
    case 'trench':
      return map.trenches.find((entry) => entry.id === item.id) ?? null;
    case 'pond': {
      const pond = map.ponds.find((entry) => entry.id === item.id);
      return pond ? { points: pond.polygon } : null;
    }
    case 'area':
      return { points: map.deployment[item.side].area as Vec2[] };
    default:
      return null;
  }
}

function itemPoint(map: EditableMap, item: SelectionItem): Vec2 | null {
  switch (item.kind) {
    case 'object': {
      const object = map.objects.find((entry) => entry.id === item.id);
      return object ? { x: object.x, y: object.y } : null;
    }
    case 'section':
      return map.deployment[item.side].sections[item.index] ?? null;
    case 'bridge': {
      const bridge = map.bridges.find((entry) => entry.id === item.id);
      return bridge ? { x: bridge.x, y: bridge.y } : null;
    }
    case 'ferry': {
      const ferry = map.ferries.find((entry) => entry.id === item.id);
      return ferry ? (item.end === 1 ? ferry.landingB : ferry.landingA) : null;
    }
    case 'objective':
      return (map.objectives ?? []).find((entry) => entry.id === item.id)?.flag ?? null;
    case 'event':
      return null;
    case 'event-place': {
      const place = (map.eventPlaces ?? []).find((entry) => entry.id === item.id);
      if (!place) return null;
      return place.kind === 'entry' ? place.point : (place.polygon[item.point ?? 0] ?? null);
    }
    default: {
      const target = polylineOf(map, item);
      if (!target) return null;
      return item.point !== undefined ? (target.points[item.point] ?? null) : (target.points[0] ?? null);
    }
  }
}

function segmentDistance(p: Vec2, a: Vec2, b: Vec2): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = dx * dx + dy * dy;
  const t = length === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / length));
  return Math.hypot(p.x - (a.x + dx * t), p.y - (a.y + dy * t));
}

function insideBridge(bridge: DocBridge, point: Vec2): boolean {
  const cos = Math.cos(bridge.rotation);
  const sin = Math.sin(bridge.rotation);
  const dx = point.x - bridge.x;
  const dy = point.y - bridge.y;
  return Math.abs(dx * cos + dy * sin) <= bridge.halfWidth && Math.abs(-dx * sin + dy * cos) <= bridge.halfDepth;
}

/** Each side faces the other's centre. */
export { layerOf };
