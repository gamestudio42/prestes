import * as THREE from 'three';
import { getWeapon, terrainHeightAt, type SimEvent, type WeaponId } from '@prestes/shared';

type ShotEvent = Extract<SimEvent, { type: 'shot' }>;

/** machine-gun-fire-feedback 5.1: how a kind of fire draws its tracer. */
export type TracerKind = 'rifle' | 'automatic' | 'machine-gun';

export interface TracerStyle {
  /** Shown speed, metres per second: slowed from a real bullet so the eye catches it. */
  speed: number;
  /** Length of the glowing streak, metres. */
  streak: number;
  /** Width on the ground, metres, and the least width on screen, in render pixels. */
  width: number;
  minPixels: number;
  head: number;
  tail: number;
  /** How much the tail darkens (0 keeps it as bright as its colour). */
  fade: number;
}

// User, 2026-11-09 (second pass): every tracer thinner, longer and faster.
// One render pixel is the thinnest line that does not break up, so all draw
// at one pixel and their heads stay under the post's bloom threshold (0.85,
// linear), whose halo was what made them look thick. The gun is told apart by
// colour (red-orange against the rifle's pale straw), length and its stream
// of rounds, not by width.
export const TRACER_STYLES: Readonly<Record<TracerKind, TracerStyle>> = {
  rifle: { speed: 150, streak: 8, width: 0.02, minPixels: 1, head: 0xe6d49c, tail: 0x8c5a32, fade: 0.55 },
  automatic: { speed: 165, streak: 10, width: 0.02, minPixels: 1, head: 0xeab060, tail: 0xa04a20, fade: 0.45 },
  'machine-gun': { speed: 180, streak: 13, width: 0.02, minPixels: 1, head: 0xf06a30, tail: 0xb01e0c, fade: 0.2 },
};

/** The rifle's speed and streak (kept for callers that time a rifle tracer). */
export const TRACER_SPEED = TRACER_STYLES.rifle.speed;
export const TRACER_STREAK = TRACER_STYLES.rifle.streak;

/** Tracers in flight at once: a gun's bursts and a volley on the same tick. */
export const MAX_TRACERS = 160;
/** Segments per streak: a bright head fading to a dim red tail. */
const SEGMENTS = 3;
const VERTICES_PER_TRACER = SEGMENTS * 6;

interface Tracer {
  kind: TracerKind;
  x0: number;
  y0: number;
  h0: number;
  x1: number;
  y1: number;
  h1: number;
  length: number;
  travelled: number;
}

/** The tracer a shooter's weapon draws; without his weapon, a burst round is automatic fire. */
export function tracerKind(weaponId: WeaponId | undefined, event: { burstStart?: boolean }): TracerKind {
  const weapon = weaponId ? getWeapon(weaponId) : null;
  if (weapon) return weapon.fire === 'belt' ? 'machine-gun' : weapon.fire === 'burst' ? 'automatic' : 'rifle';
  return event.burstStart !== undefined ? 'automatic' : 'rifle';
}

/**
 * Shots as tracer rounds: a short glowing ribbon, bright at the head and
 * fading to red at the tail, flying from the muzzle to the target. Every
 * round of automatic fire draws one; the machine gun's are brighter and
 * longer. Ribbons face the camera and keep a least width in render pixels,
 * so they read in the strategic band too.
 */
export class TracerLayer {
  readonly group = new THREE.Group();
  private readonly geometry = new THREE.BufferGeometry();
  private readonly positions = new THREE.BufferAttribute(new Float32Array(MAX_TRACERS * VERTICES_PER_TRACER * 3), 3);
  private readonly colors = new THREE.BufferAttribute(new Float32Array(MAX_TRACERS * VERTICES_PER_TRACER * 3), 3);
  private readonly material = new THREE.MeshBasicMaterial({ vertexColors: true, depthWrite: false, side: THREE.DoubleSide });
  private readonly tracers: Tracer[] = [];
  private readonly color = new THREE.Color();
  private readonly heads = Object.fromEntries(
    Object.entries(TRACER_STYLES).map(([kind, style]) => [kind, { head: new THREE.Color(style.head), tail: new THREE.Color(style.tail) }]),
  ) as Record<TracerKind, { head: THREE.Color; tail: THREE.Color }>;
  private readonly view = new THREE.Vector3(0, -1, 0);
  private readonly along = new THREE.Vector3();
  private readonly side = new THREE.Vector3();
  private metresPerPixel = 0.1;

  constructor() {
    this.positions.setUsage(THREE.DynamicDrawUsage);
    this.colors.setUsage(THREE.DynamicDrawUsage);
    this.geometry.setAttribute('position', this.positions);
    this.geometry.setAttribute('color', this.colors);
    this.geometry.setDrawRange(0, 0);
    const ribbons = new THREE.Mesh(this.geometry, this.material);
    ribbons.frustumCulled = false;
    ribbons.renderOrder = 5;
    this.group.add(ribbons);
  }

  get count(): number {
    return this.tracers.length;
  }

  /** Tracers in flight of one kind. */
  countOf(kind: TracerKind): number {
    return this.tracers.filter((tracer) => tracer.kind === kind).length;
  }

  /** Where the camera looks and how many metres one render pixel covers. */
  setView(direction: THREE.Vector3, metresPerPixel: number): void {
    if (direction.lengthSq() > 1e-6) this.view.copy(direction).normalize();
    if (metresPerPixel > 0) this.metresPerPixel = metresPerPixel;
  }

  /** The width a tracer of this kind is drawn at now, in metres. */
  widthOf(kind: TracerKind): number {
    const style = TRACER_STYLES[kind];
    return Math.max(style.width, style.minPixels * this.metresPerPixel);
  }

  spawn(event: ShotEvent, kind: TracerKind = 'rifle', rise0 = 0, rise1 = 0): void {
    if (this.tracers.length >= MAX_TRACERS) {
      this.tracers.shift();
    }
    const length = Math.sqrt((event.x2 - event.x) ** 2 + (event.y2 - event.y) ** 2);
    this.tracers.push({
      kind,
      x0: event.x,
      y0: event.y,
      h0: terrainHeightAt(event.x, event.y) + 1.3 + rise0,
      x1: event.x2,
      y1: event.y2,
      h1: terrainHeightAt(event.x2, event.y2) + 1.0 + rise1,
      length: Math.max(0.5, length),
      travelled: 0,
    });
  }

  update(dt: number): void {
    for (const tracer of this.tracers) {
      tracer.travelled += TRACER_STYLES[tracer.kind].speed * dt;
    }
    // A streak is gone once its tail has reached the target.
    for (let index = this.tracers.length - 1; index >= 0; index -= 1) {
      const tracer = this.tracers[index]!;
      if (tracer.travelled - TRACER_STYLES[tracer.kind].streak >= tracer.length) this.tracers.splice(index, 1);
    }
    let vertex = 0;
    for (const tracer of this.tracers) {
      const style = TRACER_STYLES[tracer.kind];
      const shades = this.heads[tracer.kind];
      const head = Math.min(tracer.travelled, tracer.length) / tracer.length;
      const tail = Math.max(0, tracer.travelled - style.streak) / tracer.length;
      // The ribbon's half-width, across the flight as the camera sees it.
      this.along.set(tracer.x1 - tracer.x0, tracer.h1 - tracer.h0, tracer.y1 - tracer.y0);
      this.side.crossVectors(this.along, this.view);
      if (this.side.lengthSq() < 1e-8) this.side.set(1, 0, 0);
      this.side.normalize().multiplyScalar(this.widthOf(tracer.kind) / 2);
      for (let segment = 0; segment < SEGMENTS; segment += 1) {
        // Segment 0 is at the head.
        const from = head - ((head - tail) * segment) / SEGMENTS;
        const to = head - ((head - tail) * (segment + 1)) / SEGMENTS;
        const corners: Array<readonly [number, number, number]> = [
          [from, 1, segment / SEGMENTS],
          [from, -1, segment / SEGMENTS],
          [to, 1, (segment + 1) / SEGMENTS],
          [to, 1, (segment + 1) / SEGMENTS],
          [from, -1, segment / SEGMENTS],
          [to, -1, (segment + 1) / SEGMENTS],
        ];
        for (const [t, offset, shade] of corners) {
          this.positions.setXYZ(
            vertex,
            tracer.x0 + (tracer.x1 - tracer.x0) * t + this.side.x * offset,
            tracer.h0 + (tracer.h1 - tracer.h0) * t + this.side.y * offset,
            tracer.y0 + (tracer.y1 - tracer.y0) * t + this.side.z * offset,
          );
          this.color.copy(shades.head).lerp(shades.tail, shade).multiplyScalar(1 - shade * style.fade);
          this.colors.setXYZ(vertex, this.color.r, this.color.g, this.color.b);
          vertex += 1;
        }
      }
    }
    this.positions.needsUpdate = true;
    this.colors.needsUpdate = true;
    this.geometry.setDrawRange(0, vertex);
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.tracers.length = 0;
  }
}
