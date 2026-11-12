import * as THREE from 'three';
import { MARKER_SHOW_TICKS, terrainHeightAt, type AreaFireDisc, type FogMarker } from '@prestes/shared';
import { unitScaleForSpan } from './camera-rig';
import { PALETTE } from './palette';

/**
 * fog-of-war: a "?" where an unseen enemy fired from, roughly. Drawn as a
 * pixel sprite (a 16 x 16 glyph, nearest filtering), with a faint ring the
 * size of the marker's uncertainty; it fades out over MARKER_SHOW_TICKS.
 */

const GLYPH = [
  '................',
  '.....######.....',
  '....########....',
  '...###....###...',
  '...###....###...',
  '..........###...',
  '.........###....',
  '........###.....',
  '.......###......',
  '.......###......',
  '.......###......',
  '................',
  '.......###......',
  '.......###......',
  '................',
  '................',
];

function glyphTexture(): THREE.Texture {
  const canvas = document.createElement('canvas');
  canvas.width = 16;
  canvas.height = 16;
  const context = canvas.getContext('2d')!;
  // A dark outline under the gold glyph, like the effect sprites.
  const color = `#${PALETTE.orderMarker.toString(16).padStart(6, '0')}`;
  for (const [fill, offsets] of [
    ['#1a1610', [[-1, 0], [1, 0], [0, -1], [0, 1]]],
    [color, [[0, 0]]],
  ] as const) {
    context.fillStyle = fill;
    GLYPH.forEach((row, y) => {
      [...row].forEach((cell, x) => {
        if (cell !== '#') return;
        for (const [dx, dy] of offsets) context.fillRect(x + dx, y + dy, 1, 1);
      });
    });
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/** A flat ring of `dashes` arcs, half drawn and half gap, in the XY plane. */
export function dashedRing(inner: number, outer: number, dashes: number): THREE.BufferGeometry {
  const positions: number[] = [];
  const indices: number[] = [];
  const steps = 4;
  for (let dash = 0; dash < dashes; dash += 1) {
    const start = (dash / dashes) * Math.PI * 2;
    const length = (Math.PI * 2) / dashes / 2;
    const base = positions.length / 3;
    for (let step = 0; step <= steps; step += 1) {
      const angle = start + (length * step) / steps;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      positions.push(cos * inner, sin * inner, 0, cos * outer, sin * outer, 0);
    }
    for (let step = 0; step < steps; step += 1) {
      const a = base + step * 2;
      indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setIndex(indices);
  return geometry;
}

export class MarkerLayer {
  readonly group = new THREE.Group();
  private texture: THREE.Texture | null = null;
  private readonly sprites: THREE.Sprite[] = [];
  private readonly rings: THREE.Mesh[] = [];
  private readonly ringGeometry = new THREE.RingGeometry(0.94, 1, 32);
  private readonly areaRings: THREE.Mesh[] = [];
  private readonly areaGeometry = dashedRing(0.9, 1, 20);
  /** Markers drawn at the last update (dev checks). */
  count = 0;
  /** scrub-concealment-and-area-fire: area-fire discs drawn at the last update (dev checks). */
  areaCount = 0;

  /**
   * scrub-concealment-and-area-fire: a dashed ring on the ground round each
   * disc the player's men fire into (the fog view strips the enemy's).
   */
  updateAreaFire(units: readonly { areaFire?: AreaFireDisc }[]): void {
    const discs = new Map<string, AreaFireDisc>();
    for (const unit of units) {
      if (unit.areaFire) discs.set(`${unit.areaFire.x}:${unit.areaFire.y}:${unit.areaFire.radius}`, unit.areaFire);
    }
    let index = 0;
    for (const disc of discs.values()) {
      const ring = this.areaRings[index] ?? this.addAreaRing();
      ring.visible = true;
      ring.position.set(disc.x, terrainHeightAt(disc.x, disc.y) + 0.07, disc.y);
      ring.scale.set(disc.radius, disc.radius, 1);
      index += 1;
    }
    for (let rest = index; rest < this.areaRings.length; rest += 1) this.areaRings[rest]!.visible = false;
    this.areaCount = index;
  }

  private addAreaRing(): THREE.Mesh {
    const ring = new THREE.Mesh(
      this.areaGeometry,
      new THREE.MeshBasicMaterial({ color: PALETTE.orderMarker, transparent: true, opacity: 0.6, depthWrite: false, side: THREE.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    this.areaRings.push(ring);
    this.group.add(ring);
    return ring;
  }

  update(markers: readonly FogMarker[], tick: number, span: number): void {
    if (!this.texture && markers.length > 0 && typeof document !== 'undefined') this.texture = glyphTexture();
    const scale = unitScaleForSpan(span) * 2.2;
    markers.forEach((marker, index) => {
      const sprite = this.sprites[index] ?? this.addSprite();
      const ring = this.rings[index] ?? this.addRing();
      const fade = Math.max(0, 1 - (tick - marker.tick) / MARKER_SHOW_TICKS);
      const ground = terrainHeightAt(marker.x, marker.y);
      sprite.visible = true;
      sprite.position.set(marker.x, ground + 2.4 * scale * 0.5 + 1, marker.y);
      sprite.scale.set(scale, scale, 1);
      (sprite.material as THREE.SpriteMaterial).opacity = fade;
      ring.visible = true;
      ring.position.set(marker.x, ground + 0.06, marker.y);
      ring.scale.set(marker.radius, marker.radius, 1);
      (ring.material as THREE.MeshBasicMaterial).opacity = 0.35 * fade;
    });
    for (let index = markers.length; index < this.sprites.length; index += 1) {
      this.sprites[index]!.visible = false;
      this.rings[index]!.visible = false;
    }
    this.count = markers.length;
  }

  private addSprite(): THREE.Sprite {
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: this.texture, transparent: true, depthWrite: false, depthTest: false }),
    );
    sprite.renderOrder = 5;
    this.sprites.push(sprite);
    this.group.add(sprite);
    return sprite;
  }

  private addRing(): THREE.Mesh {
    const ring = new THREE.Mesh(
      this.ringGeometry,
      new THREE.MeshBasicMaterial({ color: PALETTE.orderMarker, transparent: true, depthWrite: false }),
    );
    ring.rotation.x = -Math.PI / 2;
    this.rings.push(ring);
    this.group.add(ring);
    return ring;
  }

  dispose(): void {
    for (const sprite of this.sprites) (sprite.material as THREE.Material).dispose();
    for (const ring of this.rings) (ring.material as THREE.Material).dispose();
    for (const ring of this.areaRings) (ring.material as THREE.Material).dispose();
    this.ringGeometry.dispose();
    this.areaGeometry.dispose();
    this.texture?.dispose();
    this.group.clear();
  }
}
