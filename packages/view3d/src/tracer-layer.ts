import * as THREE from 'three';
import { terrainHeightAt, type SimEvent } from '@prestes/shared';
import { PALETTE } from './palette';

type ShotEvent = Extract<SimEvent, { type: 'shot' }>;

interface Tracer {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  life: number;
}

const MAX_TRACERS = 64;
const TRACER_LIFE = 0.09;

export class TracerLayer {
  readonly group = new THREE.Group();
  private readonly geometry = new THREE.BufferGeometry();
  private readonly positions = new THREE.BufferAttribute(new Float32Array(MAX_TRACERS * 6), 3);
  private readonly material = new THREE.LineBasicMaterial({
    color: PALETTE.muzzle,
    transparent: true,
    opacity: 0.9,
    depthWrite: false,
  });
  private readonly tracers: Tracer[] = [];

  constructor() {
    this.geometry.setAttribute('position', this.positions);
    const lines = new THREE.LineSegments(this.geometry, this.material);
    lines.frustumCulled = false;
    this.group.add(lines);
  }

  spawn(event: ShotEvent): void {
    if (this.tracers.length >= MAX_TRACERS) {
      this.tracers.shift();
    }
    this.tracers.push({
      x0: event.x,
      y0: event.y,
      x1: event.x2,
      y1: event.y2,
      life: TRACER_LIFE,
    });
  }

  update(dt: number): void {
    for (const tracer of this.tracers) {
      tracer.life -= dt;
    }
    while (this.tracers.length > 0 && (this.tracers[0]?.life ?? 0) <= 0) {
      this.tracers.shift();
    }
    let index = 0;
    for (const tracer of this.tracers) {
      this.positions.setXYZ(index, tracer.x0, terrainHeightAt(tracer.x0, tracer.y0) + 1.3, tracer.y0);
      this.positions.setXYZ(index + 1, tracer.x1, terrainHeightAt(tracer.x1, tracer.y1) + 1.0, tracer.y1);
      index += 2;
    }
    this.positions.needsUpdate = true;
    this.geometry.setDrawRange(0, index);
  }

  dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.tracers.length = 0;
  }
}

