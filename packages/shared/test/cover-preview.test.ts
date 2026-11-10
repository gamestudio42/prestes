import { afterEach, describe, expect, it } from 'vitest';
import {
  allCoverSlots,
  clusterBadges,
  compileMapDocument,
  coverPreview,
  createEditableMap,
  deploymentSlotView,
  DEPLOYMENT_SLOT_RADIUS,
  protectionClass,
  setActiveMap,
  VILA_MILITAR,
  type EditableMap,
} from '../src';

// refine-map-editor 6.1: the editor's cover preview counts the game's own slots.

afterEach(() => setActiveMap(VILA_MILITAR));

function field(): EditableMap {
  const map = createEditableMap({ id: 'cover', size: 'small', name: { en: 'C', 'pt-BR': 'C' } });
  map.deployment.column.sections = [{ x: -60, y: 0 }];
  map.deployment.legalist.sections = [{ x: 60, y: 0 }];
  // add-deployment-phase: each zone is its area, 30 m round its point.
  map.deployment.column.area = [{ x: -90, y: -30 }, { x: -30, y: -30 }, { x: -30, y: 30 }, { x: -90, y: 30 }];
  map.deployment.legalist.area = [{ x: 30, y: -30 }, { x: 90, y: -30 }, { x: 90, y: 30 }, { x: 30, y: 30 }];
  return map;
}

function preview(map: EditableMap) {
  const compiled = compileMapDocument(map);
  setActiveMap(compiled);
  return { compiled, preview: coverPreview(compiled) };
}

describe('cover preview', () => {
  it('a 30 m fire trench: its badge counts the slots the game uses on it, all crouched', () => {
    const map = field();
    map.trenches.push({ id: 7, kind: 'fire', depth: 1.2, facing: 'left', bays: true, parapet: 'earth', points: [{ x: -15, y: 30 }, { x: 15, y: 30 }] });
    const { compiled, preview: result } = preview(map);
    const trench = result.pieces.find((piece) => piece.key === 'trench:7')!;
    const game = allCoverSlots(compiled.covers).filter((slot) => compiled.covers.find((cover) => cover.id === slot.coverId)!.kind === 'trench');
    expect(trench.count).toBe(game.length);
    expect(trench.count).toBeGreaterThan(20);
    for (const slot of result.slots.filter((entry) => entry.piece === 'trench:7')) expect(slot.protects).toBe('crouched');
  });

  it('zone totals: a stone wall inside the column zone adds its slots there only', () => {
    const map = field();
    const before = preview(map).preview.zones;
    map.lines.push({ id: 3, kind: 'stone-wall', height: 1.2, points: [{ x: -70, y: 10 }, { x: -50, y: 10 }] });
    const after = preview(map).preview;
    const wall = after.pieces.find((piece) => piece.key === 'line:3')!;
    expect(wall.count).toBeGreaterThan(0);
    expect(after.zones.column.total).toBe(before.column.total + wall.count);
    expect(after.zones.column.byClass.crouched).toBe(before.column.byClass.crouched + wall.count);
    expect(after.zones.legalist.total).toBe(before.legalist.total);
  });

  it('classes by the cover height rules, and fences give no badge', () => {
    expect(protectionClass({ kind: 'building', height: 5 })).toBe('standing');
    expect(protectionClass({ kind: 'low-wall', height: 1.2 })).toBe('crouched');
    expect(protectionClass({ kind: 'sandbag', height: 0.9 })).toBe('prone');
    expect(protectionClass({ kind: 'trench', height: 0.2 })).toBe('crouched');
    const map = field();
    map.lines.push({ id: 4, kind: 'wire-fence', height: 1.2, points: [{ x: -10, y: -20 }, { x: 10, y: -20 }] });
    map.objects.push({ id: 9, type: 'farmhouse', x: 0, y: -60, rotation: 0 });
    const result = preview(map).preview;
    expect(result.pieces.some((piece) => piece.key === 'line:4')).toBe(false);
    const house = result.pieces.find((piece) => piece.key === 'object:9')!;
    expect(house.count).toBeGreaterThan(4);
    expect(result.slots.filter((slot) => slot.piece === 'object:9').every((slot) => slot.protects === 'standing')).toBe(true);
  });

  it('clusters badges per 50 m cell, keeping the total', () => {
    const map = field();
    map.lines.push({ id: 1, kind: 'stone-wall', height: 1.2, points: [{ x: 5, y: 5 }, { x: 15, y: 5 }] });
    map.lines.push({ id: 2, kind: 'stone-wall', height: 1.2, points: [{ x: 5, y: 20 }, { x: 15, y: 20 }] });
    map.lines.push({ id: 3, kind: 'stone-wall', height: 1.2, points: [{ x: -80, y: -80 }, { x: -70, y: -80 }] });
    const { pieces } = preview(map).preview;
    const clusters = clusterBadges(pieces);
    expect(clusters).toHaveLength(2);
    expect(clusters.reduce((sum, cluster) => sum + cluster.count, 0)).toBe(pieces.reduce((sum, piece) => sum + piece.count, 0));
  });

  it('deployment preview: the slots within 25 m of the cursor, classed, counted per piece, with the planned ones', () => {
    const map = field();
    map.lines.push({ id: 5, kind: 'stone-wall', height: 1.2, points: [{ x: -70, y: 10 }, { x: -50, y: 10 }] });
    map.lines.push({ id: 6, kind: 'stone-wall', height: 1.2, points: [{ x: 40, y: 10 }, { x: 60, y: 10 }] });
    const { compiled } = preview(map);
    const view = deploymentSlotView(compiled, compiled.covers, [], { x: -60, y: 10 }, new Set());
    const wall = view.pieces.find((piece) => piece.key === 'line:5')!;
    expect(wall.total).toBeGreaterThan(5);
    expect(wall.free).toBe(wall.total);
    expect(view.pieces.some((piece) => piece.key === 'line:6')).toBe(false);
    expect(view.markers.every((marker) => Math.hypot(marker.x + 60, marker.y - 10) <= DEPLOYMENT_SLOT_RADIUS)).toBe(true);
    expect(view.markers.filter((marker) => marker.protects === 'crouched').length).toBe(wall.total);
    const first = view.markers[0]!;
    const held = deploymentSlotView(compiled, compiled.covers, [{ slotId: first.slotId, alive: true }], { x: -60, y: 10 }, new Set([view.markers[1]!.slotId]));
    expect(held.free).toBe(view.free - 1);
    expect(held.markers.find((marker) => marker.slotId === first.slotId)!.state).toBe('taken');
    expect(held.markers.find((marker) => marker.slotId === view.markers[1]!.slotId)!.state).toBe('planned');
  });
});
