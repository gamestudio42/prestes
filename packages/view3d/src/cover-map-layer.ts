import * as THREE from 'three';
import { coverPreview, terrainHeightAt, vegetationAt, type BattleMap, type ProtectionClass } from '@prestes/shared';

/**
 * redo-battle-hud D6: the strategic band's cover layer. It draws what the map
 * offers, never who holds it: the game's cover slots as dots coloured by what
 * they protect, and concealing vegetation hatched. It reads the map alone, so
 * an unseen enemy in a trench leaves no mark (fog of war).
 *
 * The colours and the hatch match the map editor's cover preview
 * (refine-map-editor 6.1); the editor keeps its own copy for now.
 */
export const COVER_MAP_COLORS: Record<ProtectionClass, number> = {
  standing: 0x4fd36b,
  crouched: 0xf2c14e,
  prone: 0xe8743b,
};

const HATCH_COLOR = 0xa6d96a;

export class CoverMapLayer {
  readonly group = new THREE.Group();
  private slotCount = 0;

  constructor(map: BattleMap) {
    this.group.name = 'cover-map';
    this.group.visible = false;
    this.buildHatch(map);
    this.buildSlots(map);
  }

  /** Slots drawn (whether or not the layer is shown). */
  slots(): number {
    return this.slotCount;
  }

  setVisible(on: boolean): void {
    this.group.visible = on;
  }

  dispose(): void {
    for (const child of [...this.group.children]) {
      this.group.remove(child);
      const mesh = child as THREE.Mesh;
      mesh.geometry?.dispose();
      (mesh.material as THREE.Material | undefined)?.dispose();
    }
  }

  /** Concealing vegetation: diagonals through every third cell. */
  private buildHatch(map: BattleMap): void {
    const raster = map.raster?.vegetation;
    if (!raster) return;
    const { minX, minY } = map.bounds;
    const side = Math.round(map.bounds.maxX - minX);
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
    if (vertices.length === 0) return;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    const hatch = new THREE.LineSegments(
      geometry,
      new THREE.LineBasicMaterial({ color: HATCH_COLOR, depthTest: false, transparent: true, opacity: 0.55 }),
    );
    hatch.name = 'cover-map-hatch';
    hatch.renderOrder = 9;
    hatch.frustumCulled = false;
    this.group.add(hatch);
  }

  /** One dot per cover slot, coloured by the stance it protects. */
  private buildSlots(map: BattleMap): void {
    const { slots } = coverPreview(map);
    this.slotCount = slots.length;
    if (slots.length === 0) return;
    const disc = new THREE.CircleGeometry(0.5, 10);
    disc.rotateX(-Math.PI / 2);
    const dots = new THREE.InstancedMesh(
      disc,
      new THREE.MeshBasicMaterial({ depthTest: false, transparent: true, opacity: 0.95 }),
      slots.length,
    );
    const matrix = new THREE.Matrix4();
    const color = new THREE.Color();
    slots.forEach((slot, index) => {
      matrix.makeTranslation(slot.x, terrainHeightAt(slot.x, slot.y) + 0.35, slot.y);
      dots.setMatrixAt(index, matrix);
      dots.setColorAt(index, color.setHex(COVER_MAP_COLORS[slot.protects]));
    });
    dots.instanceMatrix.needsUpdate = true;
    if (dots.instanceColor) dots.instanceColor.needsUpdate = true;
    dots.name = 'cover-map-slots';
    dots.renderOrder = 12;
    dots.frustumCulled = false;
    this.group.add(dots);
  }
}
