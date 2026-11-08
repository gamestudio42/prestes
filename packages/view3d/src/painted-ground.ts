import * as THREE from 'three';
import { GROUND_ATLAS } from '@prestes/shared';
import { groundAtlasPixels } from './ground-atlas';
import { toon } from './materials';

/**
 * The ground of a painted map (add-map-editor): 40 m chunks of the 2 m
 * heightfield, each cell drawn with its material's pixel-art tile, sampled
 * in world space with nearest filtering, and a 4 × 4 Bayer dither (in tile
 * texels) where two materials meet: a pixel dither, never a blur. The toon
 * ramp lights it like the kits. The editor also uses its overlays (slope,
 * contours, metre grid) and rebuilds only the chunks an edit touched.
 */

export const GROUND_CHUNK = 40;

/** Editor views of the ground: slope limits, contour lines, or the full relief (height tint, shading, contours). */
export type GroundOverlay = 'none' | 'slope' | 'contours' | 'relief';

const OVERLAY_CODE: Record<GroundOverlay, number> = { none: 0, slope: 1, contours: 2, relief: 3 };

let generatedAtlas: THREE.DataTexture | null = null;

function atlasTexture(): THREE.Texture {
  if (generatedAtlas) return generatedAtlas;
  const { width, height, data } = groundAtlasPixels();
  const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.wrapS = THREE.ClampToEdgeWrapping;
  texture.wrapT = THREE.ClampToEdgeWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  generatedAtlas = texture;
  return texture;
}

const VERTEX_HEAD = /* glsl */ `
varying vec3 vGroundWorld;
`;
const VERTEX_BODY = /* glsl */ `
vGroundWorld = (modelMatrix * vec4(transformed, 1.0)).xyz;
`;
const FRAGMENT_HEAD = /* glsl */ `
uniform sampler2D uPaint;
uniform sampler2D uAtlas;
uniform vec2 uMin;
uniform float uSide;
uniform vec2 uAtlasGrid;
uniform float uTileMetres;
uniform float uTexels;
uniform int uOverlay;
uniform float uGrid;
uniform vec2 uSlopeLimits;
uniform vec2 uHeightRange;
varying vec3 vGroundWorld;

/** Contour line strength (0..1) every step metres, width pixels wide. */
float groundContour(float h, float step, float width) {
  float v = h / step;
  float d = abs(fract(v + 0.5) - 0.5) / max(fwidth(v), 1e-4);
  return 1.0 - smoothstep(width * 0.5, width * 0.5 + 1.0, d);
}

/** Hypsometric ramp: low green, yellow, brown, pale top. */
vec3 groundHeightTint(float t) {
  vec3 low = vec3(0.30, 0.52, 0.34);
  vec3 mid = vec3(0.86, 0.80, 0.48);
  vec3 high = vec3(0.62, 0.42, 0.26);
  vec3 top = vec3(0.93, 0.91, 0.86);
  if (t < 0.4) return mix(low, mid, t / 0.4);
  if (t < 0.8) return mix(mid, high, (t - 0.4) / 0.4);
  return mix(high, top, (t - 0.8) / 0.2);
}

float groundMaterialAt(vec2 cell) {
  cell = clamp(cell, vec2(0.0), vec2(uSide - 1.0));
  return floor(texture2D(uPaint, (cell + 0.5) / uSide).r * 255.0 + 0.5);
}

float groundBayer(vec2 p) {
  int x = int(mod(p.x, 4.0));
  int y = int(mod(p.y, 4.0));
  int index = y * 4 + x;
  float m[16] = float[16](0.0, 8.0, 2.0, 10.0, 12.0, 4.0, 14.0, 6.0, 3.0, 11.0, 1.0, 9.0, 15.0, 7.0, 13.0, 5.0);
  return (m[index] + 0.5) / 16.0;
}
`;
const FRAGMENT_BODY = /* glsl */ `
{
  vec2 xz = vGroundWorld.xz;
  vec2 local = xz - uMin;
  vec2 cell = floor(local);
  vec2 f = local - cell;
  float own = groundMaterialAt(cell);
  float pick = own;
  // Snap the dither to the tile's texels so the edge stays pixel art.
  vec2 texel = floor(xz * uTexels / uTileMetres);
  float threshold = groundBayer(texel);
  vec2 toEdge = min(f, 1.0 - f);
  const float BAND = 0.4;
  if (toEdge.x < toEdge.y) {
    float other = groundMaterialAt(cell + vec2(f.x < 0.5 ? -1.0 : 1.0, 0.0));
    if (other != own && threshold < 0.5 * max(0.0, BAND - toEdge.x) / BAND) pick = other;
  } else {
    float other = groundMaterialAt(cell + vec2(0.0, f.y < 0.5 ? -1.0 : 1.0));
    if (other != own && threshold < 0.5 * max(0.0, BAND - toEdge.y) / BAND) pick = other;
  }
  // Clamped: on a tile seam fract() can round to 1.0 and read the next tile in the atlas.
  vec2 tileUV = (min(floor(fract(xz / uTileMetres) * uTexels), uTexels - 1.0) + 0.5) / uTexels;
  vec2 tile = vec2(mod(pick, uAtlasGrid.x), floor(pick / uAtlasGrid.x));
  vec3 ground = texture2D(uAtlas, (tile + tileUV) / uAtlasGrid).rgb;
  diffuseColor.rgb *= ground;
  if (uOverlay == 1) {
    vec3 n = normalize(cross(dFdx(vGroundWorld), dFdy(vGroundWorld)));
    float slope = sqrt(max(0.0, 1.0 - n.y * n.y)) / max(0.05, abs(n.y));
    if (slope > uSlopeLimits.y) diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.8, 0.1, 0.1), 0.6);
    else if (slope > uSlopeLimits.x) diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.9, 0.7, 0.1), 0.45);
  } else if (uOverlay == 2) {
    float h = vGroundWorld.y;
    diffuseColor.rgb *= 1.0 - 0.45 * groundContour(h, 1.0, 1.0);
    diffuseColor.rgb *= 1.0 - 0.6 * groundContour(h, 5.0, 2.0);
  } else if (uOverlay == 3) {
    float h = vGroundWorld.y;
    float span = uHeightRange.y - uHeightRange.x;
    float t = span > 0.05 ? clamp((h - uHeightRange.x) / span, 0.0, 1.0) : 0.5;
    vec3 n = normalize(cross(dFdx(vGroundWorld), dFdy(vGroundWorld)));
    if (n.y < 0.0) n = -n;
    float light = clamp(dot(n, normalize(vec3(-1.0, 1.6, -1.0))), 0.0, 1.0);
    vec3 relief = mix(diffuseColor.rgb, groundHeightTint(t), 0.75) * mix(0.55, 1.2, light);
    relief *= 1.0 - 0.35 * groundContour(h, 1.0, 1.0);
    relief *= 1.0 - 0.65 * groundContour(h, 5.0, 2.0);
    diffuseColor.rgb = relief;
  }
  if (uGrid > 0.0) {
    vec2 g = abs(fract(xz / uGrid + 0.5) - 0.5) * uGrid;
    vec2 gw = fwidth(xz);
    if (min(g.x / gw.x, g.y / gw.y) < 0.75) diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0), 0.25);
  }
}
`;

export interface GroundBounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export class PaintedGround {
  readonly group = new THREE.Group();
  readonly side: number;
  private readonly bounds: GroundBounds;
  private readonly paint: THREE.DataTexture;
  private readonly paintData: Uint8Array;
  private readonly material: THREE.MeshToonMaterial;
  private readonly uniforms: Record<string, THREE.IUniform>;
  private readonly chunks: THREE.Mesh[] = [];
  private readonly columns: number;

  constructor(bounds: GroundBounds, paint: Uint8Array, height: (x: number, z: number) => number, atlasUrl?: string) {
    this.bounds = bounds;
    this.side = Math.round(bounds.maxX - bounds.minX);
    this.paintData = new Uint8Array(this.side * this.side);
    this.paintData.set(paint.subarray(0, this.paintData.length));
    this.paint = new THREE.DataTexture(this.paintData, this.side, this.side, THREE.RedFormat, THREE.UnsignedByteType);
    this.paint.magFilter = THREE.NearestFilter;
    this.paint.minFilter = THREE.NearestFilter;
    this.paint.generateMipmaps = false;
    this.paint.unpackAlignment = 1;
    this.paint.needsUpdate = true;
    this.uniforms = {
      uPaint: { value: this.paint },
      uAtlas: { value: atlasTexture() },
      uMin: { value: new THREE.Vector2(bounds.minX, bounds.minY) },
      uSide: { value: this.side },
      uAtlasGrid: { value: new THREE.Vector2(GROUND_ATLAS.columns, GROUND_ATLAS.rows) },
      uTileMetres: { value: GROUND_ATLAS.metresPerTile },
      uTexels: { value: GROUND_ATLAS.tile },
      uOverlay: { value: 0 },
      uGrid: { value: 0 },
      uSlopeLimits: { value: new THREE.Vector2(0.35, 0.7) },
      uHeightRange: { value: new THREE.Vector2(0, 0) },
    };
    this.material = toon({ color: 0xffffff });
    this.material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, this.uniforms);
      shader.vertexShader = VERTEX_HEAD + shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>\n${VERTEX_BODY}`);
      shader.fragmentShader = FRAGMENT_HEAD + shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>\n${FRAGMENT_BODY}`);
    };
    this.material.customProgramCacheKey = () => 'painted-ground';
    this.columns = Math.ceil(this.side / GROUND_CHUNK);
    for (let row = 0; row < this.columns; row += 1) {
      for (let column = 0; column < this.columns; column += 1) {
        const size = GROUND_CHUNK;
        const geometry = new THREE.PlaneGeometry(size, size, size / 2, size / 2);
        geometry.rotateX(-Math.PI / 2);
        geometry.translate(bounds.minX + column * size + size / 2, 0, bounds.minY + row * size + size / 2);
        const mesh = new THREE.Mesh(geometry, this.material);
        mesh.name = `painted-ground:${column},${row}`;
        this.chunks.push(mesh);
        this.group.add(mesh);
      }
    }
    this.group.name = 'painted-ground';
    this.updateHeights(height);
    if (atlasUrl) {
      new THREE.TextureLoader()
        .loadAsync(atlasUrl)
        .then((texture) => {
          texture.magFilter = THREE.NearestFilter;
          texture.minFilter = THREE.NearestFilter;
          texture.generateMipmaps = false;
          texture.flipY = false;
          texture.colorSpace = THREE.SRGBColorSpace;
          this.uniforms.uAtlas!.value = texture;
        })
        .catch(() => {
          // The generated tiles stay.
        });
    }
  }

  /** Re-reads the heights of the chunks that touch `box` (all of them without one). */
  updateHeights(height: (x: number, z: number) => number, box?: GroundBounds): void {
    for (const mesh of this.chunks) {
      const geometry = mesh.geometry;
      geometry.computeBoundingBox();
      const chunkBox = geometry.boundingBox!;
      if (box && (chunkBox.max.x < box.minX || chunkBox.min.x > box.maxX || chunkBox.max.z < box.minY || chunkBox.min.z > box.maxY)) continue;
      const positions = geometry.attributes.position!;
      for (let index = 0; index < positions.count; index += 1) {
        positions.setY(index, height(positions.getX(index), positions.getZ(index)));
      }
      positions.needsUpdate = true;
      geometry.computeVertexNormals();
      geometry.computeBoundingBox();
      geometry.computeBoundingSphere();
    }
    this.updateHeightRange();
  }

  /** Lowest and highest ground (m), for the relief tint. */
  get heightRange(): { low: number; high: number } {
    const range = this.uniforms.uHeightRange!.value as THREE.Vector2;
    return { low: range.x, high: range.y };
  }

  private updateHeightRange(): void {
    let low = Infinity;
    let high = -Infinity;
    for (const mesh of this.chunks) {
      const box = mesh.geometry.boundingBox;
      if (!box) continue;
      low = Math.min(low, box.min.y);
      high = Math.max(high, box.max.y);
    }
    if (Number.isFinite(low)) (this.uniforms.uHeightRange!.value as THREE.Vector2).set(low, high);
  }

  /** Replaces the paint (GROUND_MATERIALS index per 1 m cell). */
  setPaint(paint: Uint8Array): void {
    this.paintData.set(paint.subarray(0, this.paintData.length));
    this.paint.needsUpdate = true;
  }

  setOverlay(overlay: GroundOverlay): void {
    this.uniforms.uOverlay!.value = OVERLAY_CODE[overlay];
  }

  /** A metre grid every `spacing` m; 0 hides it. */
  setGrid(spacing: number): void {
    this.uniforms.uGrid!.value = spacing;
  }

  /** Slope (rise over run) that slows men and the one that stops them, for the slope overlay. */
  setSlopeLimits(slow: number, impassable: number): void {
    (this.uniforms.uSlopeLimits!.value as THREE.Vector2).set(slow, impassable);
  }

  dispose(): void {
    for (const mesh of this.chunks) mesh.geometry.dispose();
    this.material.dispose();
    this.paint.dispose();
  }
}
