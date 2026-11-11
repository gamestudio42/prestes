import { beforeEach, describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { setActiveMap, type BattleMap, type ObjectiveSnapshot } from '@prestes/shared';
import { TEST_MAP } from '../../shared/test/fixtures/test-map';
import { ObjectiveLayer } from '../src/objective-layer';
import { PALETTE } from '../src/palette';

// add-map-objectives 3.1: the objective layer's flags, area outline and
// capture ring, drawn from the map's objectives and the frame's owners.
const SQUARE = [
  { x: -8, y: -8 },
  { x: 8, y: -8 },
  { x: 8, y: 8 },
  { x: -8, y: 8 },
];

const MAP: BattleMap = {
  ...TEST_MAP,
  objectives: [
    { id: 1, name: { en: 'Bridge', 'pt-BR': 'Ponte' }, area: SQUARE, flag: { x: 0, y: 0 }, value: 2, owner: 'neutral' },
    { id: 2, name: { en: 'Church', 'pt-BR': 'Igreja' }, area: SQUARE, flag: { x: 40, y: 40 }, value: 3, owner: 'legalist' },
  ],
};

function snapshot(entries: ObjectiveSnapshot[]): { objectives: ObjectiveSnapshot[] } {
  return { objectives: entries };
}

function named(layer: ObjectiveLayer, name: string): THREE.Mesh[] {
  const found: THREE.Mesh[] = [];
  layer.group.traverse((object) => {
    if (object.name === name && object instanceof THREE.Mesh) found.push(object);
  });
  return found;
}

function color(mesh: THREE.Mesh): number {
  return (mesh.material as THREE.MeshBasicMaterial).color.getHex();
}

describe('objective layer', () => {
  beforeEach(() => {
    setActiveMap(MAP);
  });

  it('draws one placeholder flag per objective', () => {
    const layer = new ObjectiveLayer();
    layer.update(snapshot([]), 80);
    expect(named(layer, 'placeholder:flag')).toHaveLength(2);
    expect(named(layer, 'objective-cloth')).toHaveLength(2);
    expect(layer.marks.map((mark) => mark.id)).toEqual([1, 2]);
    layer.dispose();
  });

  it("shows each cloth in its owner's colour, with the column's red band", () => {
    const layer = new ObjectiveLayer();
    layer.update(
      snapshot([
        { id: 1, owner: 'column', progress: { column: 0, legalist: 0 }, contested: false, value: 2, name: { en: 'Objective', 'pt-BR': 'Objetivo' } },
        { id: 2, owner: 'legalist', progress: { column: 0, legalist: 0 }, contested: false, value: 2, name: { en: 'Objective', 'pt-BR': 'Objetivo' } },
      ]),
      80,
    );
    expect(color(named(layer, 'objective-cloth')[0]!)).toBe(PALETTE.factions.column);
    expect(color(named(layer, 'objective-cloth')[1]!)).toBe(PALETTE.factions.legalist);
    // The band is the column's; the legalist flag does not show it.
    const band = named(layer, 'objective-cloth')[0]!.children.find((child) => child instanceof THREE.Mesh);
    expect(band?.visible).toBe(true);
    const enemyBand = named(layer, 'objective-cloth')[1]!.children.find((child) => child instanceof THREE.Mesh);
    expect(enemyBand?.visible).toBe(false);
    layer.dispose();
  });

  it('draws the area outline at tactical zoom only', () => {
    const layer = new ObjectiveLayer();
    layer.update(snapshot([]), 80);
    expect(named(layer, 'objective-area').every((outline) => outline.visible)).toBe(true);
    layer.update(snapshot([]), 240);
    expect(named(layer, 'objective-area').every((outline) => !outline.visible)).toBe(true);
    layer.dispose();
  });

  it('fills the capture ring of the side taking the objective', () => {
    const layer = new ObjectiveLayer();
    layer.update(snapshot([{ id: 1, owner: 'neutral', progress: { column: 40, legalist: 0 }, contested: false, value: 2, name: { en: 'Objective', 'pt-BR': 'Objetivo' } }]), 80);
    const ring = named(layer, 'objective-capture-ring')[0]!;
    expect(ring.visible).toBe(true);
    expect(color(ring)).toBe(PALETTE.factions.column);
    expect((ring.geometry as THREE.RingGeometry).parameters.thetaLength).toBeCloseTo(Math.PI * 2 * 0.4, 2);
    expect(layer.marks[0]).toMatchObject({ owner: 'neutral', side: 'column', progress: 0.4 });

    // Empty again: the ring goes away.
    layer.update(snapshot([{ id: 1, owner: 'neutral', progress: { column: 0, legalist: 0 }, contested: false, value: 2, name: { en: 'Objective', 'pt-BR': 'Objetivo' } }]), 80);
    expect(named(layer, 'objective-capture-ring')[0]!.visible).toBe(false);
    layer.dispose();
  });

  it('keeps the flags when the map is unchanged and rebuilds when it changes', () => {
    const layer = new ObjectiveLayer();
    layer.update(snapshot([]), 80);
    const first = named(layer, 'placeholder:flag')[0]!;
    layer.update(snapshot([]), 80);
    expect(named(layer, 'placeholder:flag')[0]).toBe(first);
    setActiveMap({ ...MAP, objectives: [] });
    layer.update(snapshot([]), 80);
    expect(named(layer, 'placeholder:flag')).toHaveLength(0);
    layer.dispose();
  });
});
