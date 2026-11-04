import * as THREE from 'three';
import { terrainHeightAt, type SimEvent } from '@prestes/shared';

type ShotEvent = Extract<SimEvent, { type: 'shot' }>;

interface Tracer {
  x0: number;
  y0: number;
  h0: number;
  x1: number;
  y1: number;
  h1: number;
  length: number;
  travelled: number;
}

const MAX_TRACERS = 64;
/** Shown speed, metres per second: slowed from a real bullet so the eye catches it. */
export const TRACER_SPEED = 90;
/** Length of the glowing streak, metres. */
export const TRACER_STREAK = 5;
/** Segments per streak: a bright head fading to a dim red tail. */
const SEGMENTS = 3;
const HEAD = new THREE.Color(0xfff1b0);
const TAIL = new THREE.Color(0xb23a1c);

/**
 * Rifle shots as tracer rounds: a short glowing streak, bright gold at the
 * head and fading to red at the tail, flying from the muzzle to the target.
 */
export class TracerLayer {
  readonly group = new THREE.Group();
  private readonly geometry = new THREE.BufferGeometry();
  private readonly positions = new THREE.BufferAttribute(new Float32Array(MAX_TRACERS * SEGMENTS * 6), 3);
  private readonly colors = new THREE.BufferAttribute(new Float32Array(MAX_TRACERS * SEGMENTS * 6), 3);
  private readonly material = new THREE.LineBasicMaterial({ vertexColors: true, depthWrite: false });
  private readonly tracers: Tracer[] = [];
  private readonly color = new THREE.Color();

  constructor() {
    this.positions.setUsage(THREE.DynamicDrawUsage);
    this.colors.setUsage(THREE.DynamicDrawUsage);
    this.geometry.setAttribute('position', this.positions);
    this.geometry.setAttribute('color', this.colors);
    this.geometry.setDrawRange(0, 0);
    const lines = new THREE.LineSegments(this.geometry, this.material);
    lines.frustumCulled = false;
    lines.renderOrder = 5;
    this.group.add(lines);
  }

  get count(): number {
    return this.tracers.length;
  }

  spawn(event: ShotEvent): void {
    if (this.tracers.length >= MAX_TRACERS) {
      this.tracers.shift();
    }
    const length = Math.sqrt((event.x2 - event.x) ** 2 + (event.y2 - event.y) ** 2);
    this.tracers.push({
      x0: event.x,
      y0: event.y,
      h0: terrainHeightAt(event.x, event.y) + 1.3,
      x1: event.x2,
      y1: event.y2,
      h1: terrainHeightAt(event.x2, event.y2) + 1.0,
      length: Math.max(0.5, length),
      travelled: 0,
    });
  }

  update(dt: number): void {
    for (const tracer of this.tracers) {
      tracer.travelled += TRACER_SPEED * dt;
    }
    // A streak is gone once its tail has reached the target.
    for (let index = this.tracers.length - 1; index >= 0; index -= 1) {
      const tracer = this.tracers[index]!;
      if (tracer.travelled - TRACER_STREAK >= tracer.length) this.tracers.splice(index, 1);
    }
    let vertex = 0;
    for (const tracer of this.tracers) {
      const head = Math.min(tracer.travelled, tracer.length) / tracer.length;
      const tail = Math.max(0, tracer.travelled - TRACER_STREAK) / tracer.length;
      for (let segment = 0; segment < SEGMENTS; segment += 1) {
        // Segment 0 is at the head.
        const from = head - ((head - tail) * segment) / SEGMENTS;
        const to = head - ((head - tail) * (segment + 1)) / SEGMENTS;
        for (const [t, shade] of [
          [from, segment / SEGMENTS],
          [to, (segment + 1) / SEGMENTS],
        ] as const) {
          this.positions.setXYZ(
            vertex,
            tracer.x0 + (tracer.x1 - tracer.x0) * t,
            tracer.h0 + (tracer.h1 - tracer.h0) * t,
            tracer.y0 + (tracer.y1 - tracer.y0) * t,
          );
          this.color.copy(HEAD).lerp(TAIL, shade).multiplyScalar(1 - shade * 0.55);
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
