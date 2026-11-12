import { allCoverSlots, distanceToPolyline, terrainHeightAt, terrainSurfaceAt, toMapDocument, trenchLength, vegetationAt, type MapDocument } from '@prestes/shared';
import type { EditorStore } from './store';
import type { EditorViewport } from './viewport';

/**
 * Dev-only `window.__prestesEditor` (add-map-editor): what the Playwright
 * suite reads from the editor. The canvas is driven with real pointer
 * events; this only turns ground points into page coordinates and reads the
 * compiled map back.
 */
export interface EditorBridge {
  state: () => {
    id: string;
    size: string;
    tool: string;
    overlay: string;
    bounds: { minX: number; minY: number; maxX: number; maxY: number };
    objects: { id: number; type: string; x: number; y: number }[];
    roads: number;
    lines: number;
    rivers: number;
    ponds: number;
    bridges: number;
    trenches: { id: number; kind: string; facing: string; length: number }[];
    sections: { column: { x: number; y: number }[]; legalist: { x: number; y: number }[] };
    areas: { column: { x: number; y: number }[]; legalist: { x: number; y: number }[] };
    selection: unknown[];
    problems: { code: string; severity: string }[] | null;
    /** author-game-maps: the compiled map's enemy presets, as section lists. */
    enemyForces: string[][];
    /** author-game-maps 4.3: the document's light, if set. */
    light: { time: number; bearing: number } | null;
    /** add-map-compass: the map's north as saved (null: the top edge). */
    north: number | null;
    canUndo: boolean;
    saveState: string;
    message: string | null;
  };
  toScreen: (x: number, y: number) => { x: number; y: number } | null;
  /** author-game-maps 4.3: the view's sun position. */
  sun: () => [number, number, number] | null;
  surfaceAt: (x: number, y: number) => string;
  heightAt: (x: number, y: number) => number;
  vegetationAt: (x: number, y: number) => string | null;
  coverKinds: () => Record<string, number>;
  /** The game's cover slots along a trench line: the compiled map's, as the battle uses them. */
  trenchSlots: (id: number) => { x: number; y: number; guard: { x: number; y: number } | null }[];
  /** refine-map-editor 6.1: the cover preview's zone totals and per-piece counts. */
  coverPreview: () => { zones: { column: number; legalist: number }; pieces: Record<string, number> };
  /** garrison-and-assault 4.6: the position a placed object or drawn trench makes, as the battle builds it. */
  position: (kind: 'object' | 'trench', id: number) => { capacity: number; entrances: number; ports: number } | null;
  /** Port ticks the cover overlay draws. */
  coverPorts: () => number;
  document: () => MapDocument;
  topDown: () => void;
  /** Points the camera at a ground point with this span (m). */
  look: (x: number, y: number, span: number) => void;
  /** The live viewport, for debugging from the console. */
  viewport: () => EditorViewport | null;
}

export function editorBridge(store: EditorStore, viewport: () => EditorViewport | null): EditorBridge {
  return {
    state: () => ({
      id: store.map.id,
      size: store.map.size,
      tool: store.tool,
      overlay: store.view.overlay,
      bounds: { ...store.compiled.bounds },
      objects: store.map.objects.map(({ id, type, x, y }) => ({ id, type, x, y })),
      roads: store.map.roads.length,
      lines: store.map.lines.length,
      rivers: store.map.rivers.length,
      ponds: store.map.ponds.length,
      bridges: store.map.bridges.length,
      trenches: store.map.trenches.map(({ id, kind, facing, points }) => ({ id, kind, facing, length: trenchLength(points) })),
      sections: {
        // author-game-maps 8.3: the compiled starts, derived from the areas.
        column: store.compiled.deployment.column.sections.map(({ x, y }) => ({ x, y })),
        legalist: store.compiled.deployment.legalist.sections.map(({ x, y }) => ({ x, y })),
      },
      areas: {
        column: store.map.deployment.column.area.map(({ x, y }) => ({ x, y })),
        legalist: store.map.deployment.legalist.area.map(({ x, y }) => ({ x, y })),
      },
      selection: store.selection,
      problems: store.problems?.map(({ code, severity }) => ({ code, severity })) ?? null,
      enemyForces: (store.compiled.enemyForces ?? []).map((roster) => [...roster.sections]),
      light: store.map.light ? { ...store.map.light } : null,
      canUndo: store.canUndo,
      saveState: store.saveState,
      message: store.message?.text ?? null,
    }),
      north: store.map.north ?? null,
    toScreen: (x, y) => viewport()?.screenPoint(x, y) ?? null,
    sun: () => viewport()?.view.sunPosition() ?? null,
    surfaceAt: (x, y) => terrainSurfaceAt(x, y),
    heightAt: (x, y) => terrainHeightAt(x, y),
    vegetationAt: (x, y) => vegetationAt(x, y),
    coverKinds: () => {
      const kinds: Record<string, number> = {};
      for (const cover of store.compiled.covers) kinds[cover.kind] = (kinds[cover.kind] ?? 0) + 1;
      return kinds;
    },
    trenchSlots: (id) => {
      const line = store.map.trenches.find((entry) => entry.id === id);
      if (!line) return [];
      const covers = store.compiled.covers.filter((cover) => cover.kind === 'trench' && distanceToPolyline(cover.x, cover.y, line.points) < 0.5);
      return allCoverSlots(covers).map(({ x, y, guard }) => ({ x, y, guard }));
    },
    coverPreview: () => {
      const preview = store.coverPreview();
      return {
        zones: { column: preview.zones.column.total, legalist: preview.zones.legalist.total },
        pieces: Object.fromEntries(preview.pieces.map((piece) => [piece.key, piece.count])),
      };
    },
    position: (kind, id) => {
      const position = store.positionOf(kind, id);
      return position ? { capacity: position.capacity, entrances: position.entrances.length, ports: position.ports.length } : null;
    },
    coverPorts: () => viewport()?.coverPortCount() ?? 0,
    document: () => toMapDocument(store.map),
    viewport,
    topDown: () => {
      store.updateView({ topDown: true });
      viewport()?.frameMap();
    },
    look: (x, y, span) => {
      const camera = viewport()?.view.camera;
      if (!camera) return;
      camera.focusX = x;
      camera.focusY = y;
      camera.targetSpan = span;
    },
  };
}
