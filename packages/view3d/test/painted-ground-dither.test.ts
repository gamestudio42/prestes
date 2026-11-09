import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { BAYER_4X4, bayerAt, ditheredCell, PaintedGround } from '../src/painted-ground';

// refine-map-editor 4.3: the ground's cell lookup is offset by a Bayer pattern within half a cell.
const TEXELS = 16;

describe('painted ground dither', () => {
  it('the Bayer matrix holds every threshold once', () => {
    expect([...BAYER_4X4].sort((a, b) => a - b)).toEqual(Array.from({ length: 16 }, (_, index) => index));
    expect(bayerAt(0, 0)).toBeCloseTo(0.5 / 16);
    expect(bayerAt(4, 4)).toBe(bayerAt(0, 0));
    expect(bayerAt(-1, 0)).toBe(bayerAt(3, 0));
  });

  it('Bayer offset at a border cell: the neighbour shows within half a cell, in proportion, never farther', () => {
    // Cells from -10 m; the border between columns 9 and 10 runs at x = 0.
    const minX = -10;
    const minY = -10;
    // The share of texels showing the neighbour, per texel column left of the border.
    const share = (column: number): number => {
      let other = 0;
      for (let row = 0; row < 64; row += 1) {
        const x = -(column + 0.5) / TEXELS;
        const y = 0.3 + (row + 0.5) / TEXELS;
        if (ditheredCell(x, y, minX, minY)[0] === 10) other += 1;
      }
      return other / 64;
    };
    const shares = Array.from({ length: 12 }, (_, column) => share(column));
    expect(shares[0]).toBeGreaterThan(0.3);
    // Beyond half a cell (8 texels) the neighbour never shows.
    for (const value of shares.slice(8)) expect(value).toBe(0);
    // Across the half cell the neighbour covers a quarter: (0.5 - d) on average.
    const mean = shares.slice(0, 8).reduce((sum, value) => sum + value, 0) / 8;
    expect(mean).toBeGreaterThan(0.18);
    expect(mean).toBeLessThan(0.32);
  });

  it('pixel art: the pick is fixed within a texel', () => {
    for (let index = 0; index < 64; index += 1) {
      const texelX = -8 + (index % 8);
      const texelY = -4 + Math.floor(index / 8);
      const corner = ditheredCell(texelX / TEXELS + 0.001, texelY / TEXELS + 0.001, -10, -10);
      expect(ditheredCell((texelX + 0.999) / TEXELS, (texelY + 0.999) / TEXELS, -10, -10)).toEqual(corner);
    }
  });

  it('the shader uses the same matrix and offsets the lookup', () => {
    const ground = new PaintedGround({ minX: -20, minY: -20, maxX: 20, maxY: 20 }, new Uint8Array(1600), () => 0);
    let material: THREE.MeshToonMaterial | null = null;
    ground.group.traverse((object) => {
      if (object instanceof THREE.Mesh) material = object.material as THREE.MeshToonMaterial;
    });
    const shader = { uniforms: {}, vertexShader: '#include <begin_vertex>', fragmentShader: '#include <color_fragment>' };
    material!.onBeforeCompile(shader as never, undefined as never);
    expect(shader.fragmentShader).toContain(`float[16](${BAYER_4X4.map((value) => `${value}.0`).join(', ')})`);
    expect(shader.fragmentShader).toContain('groundMaterialAt(floor(centre + offset))');
  });
});
