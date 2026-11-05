import * as THREE from 'three';
import { MARKER_SHOW_TICKS, terrainHeightAt, type FogMarker } from '@prestes/shared';
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

export class MarkerLayer {
  readonly group = new THREE.Group();
  private texture: THREE.Texture | null = null;
  private readonly sprites: THREE.Sprite[] = [];
  private readonly rings: THREE.Mesh[] = [];
  private readonly ringGeometry = new THREE.RingGeometry(0.94, 1, 32);
  /** Markers drawn at the last update (dev checks). */
  count = 0;

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
    this.ringGeometry.dispose();
    this.texture?.dispose();
    this.group.clear();
  }
}
