import * as THREE from 'three';
import {
  coverAtPoint,
  terrainHeightAt,
  terrainSurfaceAt,
  type CoverPoint,
  type Frame,
  type SimEvent,
  type UnitSnapshot,
} from '@prestes/shared';
import type { InterpolatedFrame } from '@prestes/shared';

type ShotEvent = Extract<SimEvent, { type: 'shot' }>;

/** Frames of `effects.png` (8 x 8 px each, left to right). */
export const EFFECT_FRAMES = {
  muzzle: [0, 1],
  smoke: [2, 3],
  dust: [4, 5],
  splinter: [6, 6],
  spurt: [7, 7],
} as const;

export type EffectKind = keyof typeof EFFECT_FRAMES;

const CAPACITY = 512;
/** Metres a walking soldier covers between two dust puffs. */
const STEP_DUST_DISTANCE = 1.1;

/** Tints multiply the sprite colours. */
const TINT = {
  none: [1, 1, 1],
  blood: [0.85, 0.22, 0.18],
  stone: [0.85, 0.85, 0.82],
  wood: [0.95, 0.75, 0.55],
  sand: [1.1, 1.05, 0.95],
  grass: [0.9, 0.82, 0.68],
} as const;

type Tint = keyof typeof TINT;

interface Particle {
  kind: EffectKind;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  age: number;
  life: number;
  size: number;
  grow: number;
  tint: Tint;
}

/** Muzzle height above the ground by stance, metres. */
export function muzzleHeight(stance: UnitSnapshot['stance']): number {
  return stance === 'prone' ? 0.3 : stance === 'crouched' ? 0.95 : 1.4;
}

/** A repeatable pseudo-random number in [0, 1) for a shot (view only). */
export function shotNoise(tick: number, source: number, salt: number): number {
  let value = (tick * 73856093) ^ (source * 19349663) ^ (salt * 83492791);
  value = (value ^ (value >>> 13)) * 1274126177;
  value ^= value >>> 16;
  return (value >>> 0) / 4294967296;
}

/**
 * Where a missed shot strikes: past the target, a little to one side, so the
 * spurts land around and behind whoever is being shot at.
 */
export function missPoint(event: ShotEvent): { x: number; y: number } {
  const dx = event.x2 - event.x;
  const dy = event.y2 - event.y;
  const length = Math.sqrt(dx * dx + dy * dy) || 1;
  const along = 0.6 + shotNoise(event.tick, event.source, 1) * 2.4;
  const across = (shotNoise(event.tick, event.source, 2) - 0.5) * 3;
  return {
    x: event.x2 + (dx / length) * along - (dy / length) * across,
    y: event.y2 + (dy / length) * along + (dx / length) * across,
  };
}

/** The impact a missed shot makes where it lands. */
export function impactAt(
  point: { x: number; y: number },
  covers: readonly CoverPoint[],
): { kind: EffectKind; tint: Tint } {
  const cover = coverAtPoint(point, covers);
  if (cover) {
    if (cover.kind === 'stone' || cover.kind === 'low-wall') return { kind: 'splinter', tint: 'stone' };
    if (cover.kind === 'barrel') return { kind: 'splinter', tint: 'wood' };
    return { kind: 'dust', tint: 'sand' };
  }
  return terrainSurfaceAt(point.x, point.y) === 'road'
    ? { kind: 'dust', tint: 'none' }
    : { kind: 'spurt', tint: 'none' };
}

const vertexShader = /* glsl */ `
  attribute float size;
  attribute float frame;
  attribute float fade;
  attribute vec3 tint;
  uniform float pixelsPerMetre;
  varying float vFrame;
  varying float vFade;
  varying vec3 vTint;
  void main() {
    vFrame = frame;
    vFade = fade;
    vTint = tint;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    // Never below the sprite's own 8 px, so every pixel of the art shows.
    gl_PointSize = max(8.0, floor(size * pixelsPerMetre));
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D atlas;
  varying float vFrame;
  varying float vFade;
  varying vec3 vTint;
  // Ordered 4 x 4 dither: particles fade by losing pixels, not by blending.
  float bayer(vec2 p) {
    int x = int(mod(p.x, 4.0));
    int y = int(mod(p.y, 4.0));
    int index = x + y * 4;
    float table[16] = float[16](0.0, 8.0, 2.0, 10.0, 12.0, 4.0, 14.0, 6.0, 3.0, 11.0, 1.0, 9.0, 15.0, 7.0, 13.0, 5.0);
    return (table[index] + 0.5) / 16.0;
  }
  void main() {
    vec2 cell = floor(gl_PointCoord * 8.0);
    vec2 uv = vec2((vFrame * 8.0 + cell.x + 0.5) / 64.0, 1.0 - (cell.y + 0.5) / 16.0);
    vec4 texel = texture2D(atlas, uv);
    if (texel.a < 0.5 || vFade < bayer(gl_FragCoord.xy)) discard;
    gl_FragColor = vec4(texel.rgb * vTint, 1.0);
    #include <colorspace_fragment>
  }
`;

/**
 * Fire and movement feedback as pixel sprites: muzzle flash and smoke at the
 * shooter, impacts where shots land (dirt, sand, stone chips, blood), and dust
 * under marching feet. One pooled point cloud, one draw call.
 */
export class EffectsLayer {
  readonly group = new THREE.Group();
  private readonly particles: Particle[] = [];
  private readonly geometry = new THREE.BufferGeometry();
  private readonly positions = new THREE.BufferAttribute(new Float32Array(CAPACITY * 3), 3);
  private readonly sizes = new THREE.BufferAttribute(new Float32Array(CAPACITY), 1);
  private readonly frames = new THREE.BufferAttribute(new Float32Array(CAPACITY), 1);
  private readonly fades = new THREE.BufferAttribute(new Float32Array(CAPACITY), 1);
  private readonly tints = new THREE.BufferAttribute(new Float32Array(CAPACITY * 3), 3);
  private readonly material: THREE.ShaderMaterial;
  private readonly points: THREE.Points;
  private disposed = false;
  private readonly walked = new Map<number, { x: number; y: number; distance: number }>();
  private lastTick = -1;
  private seed = 1;

  constructor() {
    for (const attribute of [this.positions, this.sizes, this.frames, this.fades, this.tints]) {
      attribute.setUsage(THREE.DynamicDrawUsage);
    }
    this.geometry.setAttribute('position', this.positions);
    this.geometry.setAttribute('size', this.sizes);
    this.geometry.setAttribute('frame', this.frames);
    this.geometry.setAttribute('fade', this.fades);
    this.geometry.setAttribute('tint', this.tints);
    this.geometry.setDrawRange(0, 0);
    this.material = new THREE.ShaderMaterial({
      uniforms: { atlas: { value: null }, pixelsPerMetre: { value: 8 } },
      vertexShader,
      fragmentShader,
      depthWrite: false,
    });
    this.points = new THREE.Points(this.geometry, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = 4;
    this.points.visible = false;
    this.points.name = 'effects';
    this.group.add(this.points);
  }

  /** The effects sheet; nothing is drawn until it arrives. */
  load(base = './models/'): void {
    new THREE.TextureLoader()
      .loadAsync(`${base}textures/effects.png`)
      .then((texture) => {
        if (this.disposed) {
          texture.dispose();
          return;
        }
        texture.magFilter = THREE.NearestFilter;
        texture.minFilter = THREE.NearestFilter;
        texture.generateMipmaps = false;
        texture.colorSpace = THREE.SRGBColorSpace;
        this.material.uniforms.atlas!.value = texture;
        this.points.visible = true;
      })
      .catch((error: unknown) => {
        console.warn('effects sheet unavailable, no fire effects', error);
      });
  }

  get ready(): boolean {
    return this.points.visible;
  }

  get count(): number {
    return this.particles.length;
  }

  /** New shots of a tick, once per tick. */
  onFrame(frame: Frame | InterpolatedFrame): void {
    if (frame.tick === this.lastTick) return;
    this.lastTick = frame.tick;
    const units = new Map(frame.units.map((unit) => [unit.id, unit]));
    for (const event of frame.events) {
      if (event.type === 'shot') this.shot(event, units, frame.covers);
    }
  }

  private shot(event: ShotEvent, units: ReadonlyMap<number, UnitSnapshot>, covers: readonly CoverPoint[]): void {
    const source = units.get(event.source);
    const target = units.get(event.target);
    const dx = event.x2 - event.x;
    const dy = event.y2 - event.y;
    const length = Math.sqrt(dx * dx + dy * dy) || 1;
    const ux = dx / length;
    const uy = dy / length;
    // Flash and smoke at the muzzle, about 0.8 m in front of the shooter.
    const mx = event.x + ux * 0.8;
    const my = event.y + uy * 0.8;
    const mh = terrainHeightAt(mx, my) + muzzleHeight(source?.stance ?? 'standing') + (source?.elevation ?? 0);
    this.spawn({ kind: 'muzzle', x: mx, y: mh, z: my, vx: 0, vy: 0, vz: 0, life: 0.16, size: 1.1, grow: 0, tint: 'none' });
    // machine-gun-fire-feedback 5.2: a flash for every round, smoke once per burst.
    if (event.burstStart !== false) {
      this.spawn({
        kind: 'smoke',
        x: mx,
        y: mh,
        z: my,
        vx: ux * 0.3,
        vy: 0.35,
        vz: uy * 0.3,
        life: 2,
        size: 0.8,
        grow: 1,
        tint: 'none',
      });
    }
    if (event.hit) {
      const h = terrainHeightAt(event.x2, event.y2) + muzzleHeight(target?.stance ?? 'standing') * 0.85 + (target?.elevation ?? 0);
      this.spawn({ kind: 'spurt', x: event.x2, y: h, z: event.y2, vx: ux * 0.6, vy: 0.4, vz: uy * 0.6, life: 0.6, size: 0.8, grow: 0.4, tint: 'blood' });
      return;
    }
    const point = missPoint(event);
    const impact = impactAt(point, covers);
    const ground = terrainHeightAt(point.x, point.y);
    this.spawn({ kind: impact.kind, x: point.x, y: ground + 0.3, z: point.y, vx: 0, vy: 1.1, vz: 0, life: 0.8, size: 1, grow: 0.3, tint: impact.tint });
    if (impact.kind !== 'dust') {
      this.spawn({ kind: 'dust', x: point.x, y: ground + 0.15, z: point.y, vx: 0, vy: 0.25, vz: 0, life: 1.2, size: 0.8, grow: 0.6, tint: impact.tint === 'stone' ? 'stone' : 'none' });
    }
  }

  /**
   * Advances the particles and lays dust under walking soldiers. Called every
   * rendered frame; `pixelsPerMetre` sizes the sprites on screen.
   */
  update(frame: Frame | InterpolatedFrame | null, dt: number, pixelsPerMetre: number): void {
    if (frame) this.footsteps(frame);
    for (const particle of this.particles) {
      particle.age += dt;
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.z += particle.vz * dt;
      particle.vy *= 1 - Math.min(1, dt * 1.5);
    }
    for (let index = this.particles.length - 1; index >= 0; index -= 1) {
      if (this.particles[index]!.age >= this.particles[index]!.life) this.particles.splice(index, 1);
    }
    this.particles.forEach((particle, index) => {
      const t = particle.age / particle.life;
      const frames = EFFECT_FRAMES[particle.kind];
      this.positions.setXYZ(index, particle.x, particle.y, particle.z);
      this.sizes.setX(index, particle.size * (1 + particle.grow * t));
      this.frames.setX(index, t < 0.5 ? frames[0] : frames[1]);
      this.fades.setX(index, 1 - t * t);
      const tint = TINT[particle.tint];
      this.tints.setXYZ(index, tint[0], tint[1], tint[2]);
    });
    for (const attribute of [this.positions, this.sizes, this.frames, this.fades, this.tints]) {
      attribute.needsUpdate = true;
    }
    this.geometry.setDrawRange(0, this.particles.length);
    this.material.uniforms.pixelsPerMetre!.value = pixelsPerMetre;
  }

  private footsteps(frame: Frame | InterpolatedFrame): void {
    const seen = new Set<number>();
    for (const unit of frame.units) {
      if (!unit.alive || unit.incapacitated || unit.dummy) continue;
      seen.add(unit.id);
      const last = this.walked.get(unit.id);
      if (!last) {
        this.walked.set(unit.id, { x: unit.x, y: unit.y, distance: 0 });
        continue;
      }
      const step = Math.sqrt((unit.x - last.x) ** 2 + (unit.y - last.y) ** 2);
      last.x = unit.x;
      last.y = unit.y;
      if (step > 3) continue; // a jump (respawn, new station), not a walk
      last.distance += step;
      if (last.distance < STEP_DUST_DISTANCE) continue;
      last.distance = 0;
      const road = terrainSurfaceAt(unit.x, unit.y) === 'road';
      this.seed = (this.seed * 1103515245 + 12345) >>> 0;
      const jitter = (this.seed / 4294967296 - 0.5) * 0.4;
      this.spawn({
        kind: 'dust',
        x: unit.x + jitter,
        y: terrainHeightAt(unit.x, unit.y) + 0.1,
        z: unit.y - jitter,
        vx: 0,
        vy: 0.15,
        vz: 0,
        life: road ? 1.1 : 0.8,
        size: unit.stance === 'prone' ? 0.8 : road ? 0.8 : 0.6,
        grow: 0.5,
        tint: road ? 'sand' : 'grass',
      });
    }
    for (const id of this.walked.keys()) {
      if (!seen.has(id)) this.walked.delete(id);
    }
  }

  private spawn(particle: Omit<Particle, 'age'>): void {
    if (this.particles.length >= CAPACITY) this.particles.shift();
    this.particles.push({ ...particle, age: 0 });
  }

  dispose(): void {
    this.disposed = true;
    this.geometry.dispose();
    (this.material.uniforms.atlas!.value as THREE.Texture | null)?.dispose();
    this.material.dispose();
    this.particles.length = 0;
    this.group.clear();
  }
}
