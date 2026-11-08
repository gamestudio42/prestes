import { terrainHeightAt, terrainSurfaceAt, toMapDocument, vegetationAt, type MapDocument } from '@prestes/shared';
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
    sections: { column: { x: number; y: number }[]; legalist: { x: number; y: number }[] };
    selection: unknown[];
    problems: { code: string; severity: string }[] | null;
    canUndo: boolean;
    saveState: string;
    message: string | null;
  };
  toScreen: (x: number, y: number) => { x: number; y: number } | null;
  surfaceAt: (x: number, y: number) => string;
  heightAt: (x: number, y: number) => number;
  vegetationAt: (x: number, y: number) => string | null;
  coverKinds: () => Record<string, number>;
  document: () => MapDocument;
  topDown: () => void;
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
      sections: {
        column: store.map.deployment.column.sections.map(({ x, y }) => ({ x, y })),
        legalist: store.map.deployment.legalist.sections.map(({ x, y }) => ({ x, y })),
      },
      selection: store.selection,
      problems: store.problems?.map(({ code, severity }) => ({ code, severity })) ?? null,
      canUndo: store.canUndo,
      saveState: store.saveState,
      message: store.message?.text ?? null,
    }),
    toScreen: (x, y) => viewport()?.screenPoint(x, y) ?? null,
    surfaceAt: (x, y) => terrainSurfaceAt(x, y),
    heightAt: (x, y) => terrainHeightAt(x, y),
    vegetationAt: (x, y) => vegetationAt(x, y),
    coverKinds: () => {
      const kinds: Record<string, number> = {};
      for (const cover of store.compiled.covers) kinds[cover.kind] = (kinds[cover.kind] ?? 0) + 1;
      return kinds;
    },
    document: () => toMapDocument(store.map),
    viewport,
    topDown: () => {
      store.updateView({ topDown: true });
      viewport()?.frameMap();
    },
  };
}
