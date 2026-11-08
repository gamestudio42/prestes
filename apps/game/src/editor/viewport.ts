import * as THREE from 'three';
import {
  bridgePolygon,
  catalogObject,
  groundMaterialIndex,
  mapSide,
  rectangle,
  terrainHeightAt,
  type DocBridge,
  type EditableMap,
  type Vec2,
} from '@prestes/shared';
import { SceneView } from '@prestes/view3d';
import { fill, layerOf, sampleHeight, Stroke } from './brush';
import { rasterCommand, type EditorStore, type SelectionItem } from './store';

/**
 * The editor's view (add-map-editor): the game's own SceneView showing the
 * compiled map, an overlay for the brush, drafts, gizmos and the deployment
 * points, and the pointer logic of every tool.
 */

const POLYLINE_TOOLS = new Set(['road', 'river', 'pond', 'line', 'bridge', 'ferry']);
const BRUSH_TOOLS = new Set(['paint', 'erase', 'vegetation', 'raise', 'lower', 'smooth', 'flatten', 'setHeight', 'noise']);

const COLORS = {
  cursor: 0xffffff,
  draft: 0xffe08a,
  road: 0xd9b26a,
  river: 0x5aa7d6,
  pond: 0x5aa7d6,
  line: 0xcfcfcf,
  selection: 0xffd23f,
  column: 0xd65a4a,
  legalist: 0x4a7fd6,
};

type Drag =
  | { kind: 'stroke'; stroke: Stroke; last: Vec2; time: number }
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
  private readonly labels: HTMLDivElement;
  private readonly sectionLabels: HTMLDivElement[] = [];
  private cursor: Vec2 | null = null;
  private draft: Vec2[] = [];
  private draftTool: string;
  private drag: Drag | null = null;
  private frame = 0;
  private disposed = false;
  private readonly unsubscribe: () => void;
  onCursor: ((cursor: CursorInfo | null) => void) | null = null;

  constructor(
    private readonly container: HTMLElement,
    private readonly store: EditorStore,
    private readonly sectionText: (side: 'column' | 'legalist', index: number) => string,
  ) {
    this.draftTool = store.tool;
    this.view = new SceneView({ container, battleMap: store.compiled, strategicField: true });
    this.view.frameMap();
    this.overlay.name = 'editor-overlay';
    this.view.editorScene.add(this.overlay);
    this.labels = document.createElement('div');
    this.labels.className = 'editor-labels';
    container.appendChild(this.labels);
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
  }

  /** Centres on a point (a problem in the list). */
  centreOn(point: Vec2): void {
    this.view.centreOn(point.x, point.y);
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
    this.rebuildOverlay();
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
    if (tool === 'place') {
      const snapped = this.snap(point);
      const { objectType, rotation, scale } = this.store.settings;
      if (!catalogObject(objectType)) return;
      this.store.editVector((draft) => {
        draft.objects.push({ id: this.store.nextId(draft.objects), type: objectType, x: snapped.x, y: snapped.y, rotation: (rotation * Math.PI) / 180, ...(scale !== 1 ? { scale } : {}) });
      });
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
    if (!ground) return;
    const point = this.clampToMap(ground);
    const drag = this.drag;
    if (drag?.kind === 'stroke') {
      const now = performance.now();
      drag.stroke.applyAlong(drag.last, point, Math.min(0.1, (now - drag.time) / 1000));
      drag.last = point;
      drag.time = now;
      this.showStroke(drag.stroke);
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
    if (!ground || !item || !['road', 'river', 'line', 'pond'].includes(item.kind)) return;
    const point = this.snap(ground);
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

  private finishDraft(): void {
    const tool = this.store.tool;
    const points = this.draft;
    this.draft = [];
    const settings = this.store.settings;
    const minimum = tool === 'pond' ? 3 : 2;
    if (points.length < minimum) {
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
            camber: settings.camber,
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
          draft.lines.push({ id: this.store.nextId(draft.lines), kind: settings.lineKind, height: settings.lineHeight, points });
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
          case 'section': {
            const point = draft.deployment[item.side].sections[item.index];
            if (point) {
              point.x = round(point.x + dx);
              point.y = round(point.y + dy);
            }
            faceEachOther(draft);
            break;
          }
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
    const items = this.store.selection;
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
          default: {
            const target = polylineOf(draft, item);
            const minimum = item.kind === 'pond' ? 3 : 2;
            if (target && item.point !== undefined && target.points.length > minimum) {
              target.points.splice(item.point, 1);
              if (item.kind === 'river') draft.rivers.find((entry) => entry.id === item.id)!.kinds.splice(Math.max(0, item.point - 1), 1);
            } else {
              const key = (item.kind + 's') as 'roads' | 'rivers' | 'ponds' | 'lines';
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

  private hitTest(point: Vec2, sectionsOnly: boolean): SelectionItem | null {
    const map = this.store.map;
    const pick = this.pick;
    for (const side of ['column', 'legalist'] as const) {
      const index = map.deployment[side].sections.findIndex((section) => Math.hypot(section.x - point.x, section.y - point.y) <= Math.max(pick, 3));
      if (index >= 0) return { kind: 'section', side, index };
    }
    if (sectionsOnly) return null;
    // Points of the selected polylines first, then any polyline point.
    for (const kind of ['road', 'river', 'line', 'pond'] as const) {
      const list = kind === 'road' ? map.roads : kind === 'river' ? map.rivers : kind === 'line' ? map.lines : map.ponds;
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
    for (const kind of ['road', 'river', 'line'] as const) {
      const list = kind === 'road' ? map.roads : kind === 'river' ? map.rivers : map.lines;
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
    this.frame = requestAnimationFrame(this.tick);
  };

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
    // Deployment: section points and facing.
    for (const side of ['column', 'legalist'] as const) {
      const zone = map.deployment[side];
      zone.sections.forEach((section, index) => {
        const isSelected = selected({ kind: 'section', side, index });
        this.overlay.add(this.ring(section, 3, isSelected ? COLORS.selection : COLORS[side]));
        this.overlay.add(this.line([section, { x: section.x + zone.facing.x * 8, y: section.y + zone.facing.y * 8 }], COLORS[side]));
        // The section's two ranks of six.
        this.overlay.add(this.line(rectangle(section.x, section.y + 1.4, 7, 1.4), COLORS[side], true, 0.2));
      });
    }
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
    if (drag?.kind === 'box') {
      const { start, current } = drag;
      this.overlay.add(this.line([start, { x: current.x, y: start.y }, current, { x: start.x, y: current.y }], COLORS.selection, true));
    }
    if (this.draft.length > 0) {
      const color = tool === 'river' || tool === 'pond' ? COLORS.river : COLORS.draft;
      const preview = this.cursor ? [...this.draft, this.snap(this.cursor)] : this.draft;
      this.overlay.add(this.line(preview, color, tool === 'pond'));
      this.draft.forEach((point) => this.overlay.add(this.marker(point, color, pick * 0.6)));
    }
    const cursor = this.cursor;
    if (cursor) {
      if (BRUSH_TOOLS.has(tool)) {
        this.overlay.add(this.ring(cursor, Math.max(0.5, settings.size / 2), COLORS.cursor, settings.shape === 'square'));
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
    case 'pond': {
      const pond = map.ponds.find((entry) => entry.id === item.id);
      return pond ? { points: pond.polygon } : null;
    }
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
function faceEachOther(map: EditableMap): void {
  const centre = (points: readonly Vec2[]) => ({
    x: points.reduce((sum, p) => sum + p.x, 0) / Math.max(1, points.length),
    y: points.reduce((sum, p) => sum + p.y, 0) / Math.max(1, points.length),
  });
  const column = centre(map.deployment.column.sections);
  const legalist = centre(map.deployment.legalist.sections);
  const dx = legalist.x - column.x;
  const dy = legalist.y - column.y;
  const length = Math.hypot(dx, dy) || 1;
  map.deployment.column.facing = { x: Math.round((dx / length) * 1000) / 1000, y: Math.round((dy / length) * 1000) / 1000 };
  map.deployment.legalist.facing = { x: -map.deployment.column.facing.x, y: -map.deployment.column.facing.y };
}

export { layerOf };
