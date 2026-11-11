import * as THREE from 'three';
import {
  activeMapGeneration,
  activeMapRuntime,
  terrainHeightAt,
  type ObjectiveSnapshot,
  type Vec2,
} from '@prestes/shared';
import { STRATEGIC_SPAN } from './camera-rig';
import { PALETTE } from './palette';

/**
 * add-map-objectives 3.1: every objective is drawn as a named low-poly
 * placeholder (`placeholder:flag`): a pole with a cloth in its owner's colour,
 * an outline of its area at tactical zoom and a ring at the base that fills
 * while it is being taken. Owners and capture are the simulation's; who is
 * inside follows fog of war and is not drawn here.
 */

type Owner = 'neutral' | 'column' | 'legalist';
type Side = 'column' | 'legalist';

/** Colours come from the palette: neutral off-white, column khaki, legalist blue. */
const OWNER_COLOR: Record<Owner, number> = {
  neutral: PALETTE.objectiveNeutral,
  column: PALETTE.factions.column,
  legalist: PALETTE.factions.legalist,
};

const POLE_HEIGHT = 7;
const CLOTH_WIDTH = 2.6;
const CLOTH_HEIGHT = 1.6;
const RING_INNER = 0.9;
const RING_OUTER = 1.3;
/** The progress ring is rebuilt only when it changes by this much (a 20th of a turn). */
const RING_STEP = 0.05;

function drapedLoop(polygon: readonly Vec2[], heightAt: (x: number, y: number) => number, step = 2): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  for (let index = 0; index < polygon.length; index += 1) {
    const a = polygon[index]!;
    const b = polygon[(index + 1) % polygon.length]!;
    const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / step));
    for (let s = 0; s < steps; s += 1) {
      const x = a.x + ((b.x - a.x) * s) / steps;
      const y = a.y + ((b.y - a.y) * s) / steps;
      points.push(new THREE.Vector3(x, heightAt(x, y) + 0.2, y));
    }
  }
  if (points[0]) points.push(points[0].clone());
  return points;
}

interface Flag {
  id: number;
  value: number;
  x: number;
  y: number;
  owner: Owner;
  /** The cloth and its red band (the band shows only on the column's flag). */
  cloth: THREE.Mesh;
  band: THREE.Mesh;
  outline: THREE.LineLoop;
  ring: THREE.Mesh;
  ringMaterial: THREE.MeshBasicMaterial;
  ringKey: string;
}

export interface ObjectiveMark {
  id: number;
  owner: Owner;
  value: number;
  /** The capturing side's progress, 0 to 1. */
  progress: number;
  side: Side | null;
  contested: boolean;
  x: number;
  y: number;
}

export class ObjectiveLayer {
  readonly group = new THREE.Group();
  private flags: Flag[] = [];
  private generation = -1;
  private readonly poleGeometry = new THREE.CylinderGeometry(0.08, 0.1, POLE_HEIGHT, 6);
  private readonly poleMaterial = new THREE.MeshBasicMaterial({ color: PALETTE.whitewash });
  private readonly clothGeometry = new THREE.PlaneGeometry(CLOTH_WIDTH, CLOTH_HEIGHT, 4, 2);
  private readonly bandGeometry = new THREE.PlaneGeometry(CLOTH_WIDTH, CLOTH_HEIGHT * 0.22);
  private readonly bandMaterial = new THREE.MeshBasicMaterial({ color: PALETTE.scarf, side: THREE.DoubleSide });
  /** Shown at the last update (dev checks and the screenshot review). */
  marks: ObjectiveMark[] = [];

  constructor() {
    this.group.name = 'objective-layer';
  }

  /** Rebuilds the flags when the active map changes. */
  private refresh(): void {
    const generation = activeMapGeneration();
    if (generation === this.generation) return;
    this.generation = generation;
    this.clear();
    const map = activeMapRuntime()?.map;
    for (const objective of map?.objectives ?? []) {
      this.addFlag(objective.id, objective.value, objective.flag.x, objective.flag.y, objective.area);
    }
  }

  private addFlag(id: number, value: number, x: number, y: number, area: readonly Vec2[]): void {
    const map = activeMapRuntime()?.map;
    const ground = terrainHeightAt(x, y);
    // A flag on a building (the church) stands on its roof, not inside it.
    let base = ground;
    for (const building of map?.buildings ?? []) {
      const dx = x - building.x;
      const dy = y - building.y;
      const cos = Math.cos(-building.rotation);
      const sin = Math.sin(-building.rotation);
      const lx = dx * cos - dy * sin;
      const ly = dx * sin + dy * cos;
      if (Math.abs(lx) <= building.halfWidth && Math.abs(ly) <= building.halfDepth) {
        base = Math.max(base, ground + building.height);
      }
    }
    const pole = new THREE.Mesh(this.poleGeometry, this.poleMaterial);
    pole.position.set(x, base + POLE_HEIGHT / 2, y);
    pole.name = 'placeholder:flag';
    this.group.add(pole);

    const clothMaterial = new THREE.MeshBasicMaterial({
      color: OWNER_COLOR.neutral,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.95,
    });
    const cloth = new THREE.Mesh(this.clothGeometry, clothMaterial);
    cloth.position.set(x + CLOTH_WIDTH / 2, base + POLE_HEIGHT - CLOTH_HEIGHT / 2, y);
    cloth.name = 'objective-cloth';
    this.group.add(cloth);

    const band = new THREE.Mesh(this.bandGeometry, this.bandMaterial);
    band.position.set(0, -CLOTH_HEIGHT * 0.22, 0.01);
    band.visible = false;
    cloth.add(band);

    const outlineGeometry = new THREE.BufferGeometry().setFromPoints(drapedLoop(area, terrainHeightAt));
    const outline = new THREE.LineLoop(
      outlineGeometry,
      new THREE.LineBasicMaterial({ color: OWNER_COLOR.neutral, transparent: true, opacity: 0.8, depthWrite: false }),
    );
    outline.name = 'objective-area';
    outline.renderOrder = 3;
    this.group.add(outline);

    const ringMaterial = new THREE.MeshBasicMaterial({
      color: OWNER_COLOR.neutral,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(new THREE.RingGeometry(RING_INNER, RING_OUTER, 24, 1), ringMaterial);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(x, base + 0.08, y);
    ring.name = 'objective-capture-ring';
    ring.renderOrder = 4;
    ring.visible = false;
    this.group.add(ring);

    this.flags.push({ id, value, x, y, owner: 'neutral', cloth, band, outline, ring, ringMaterial, ringKey: '' });
  }

  update(frame: { objectives?: readonly ObjectiveSnapshot[] }, span: number): void {
    this.refresh();
    const snapshots = new Map<number, ObjectiveSnapshot>((frame.objectives ?? []).map((objective) => [objective.id, objective]));
    const tactical = span <= STRATEGIC_SPAN;
    const marks: ObjectiveMark[] = [];
    for (const flag of this.flags) {
      const snapshot = snapshots.get(flag.id);
      const owner = snapshot?.owner ?? flag.owner;
      if (owner !== flag.owner) {
        flag.owner = owner;
        (flag.cloth.material as THREE.MeshBasicMaterial).color.setHex(OWNER_COLOR[owner]);
        (flag.outline.material as THREE.LineBasicMaterial).color.setHex(OWNER_COLOR[owner]);
        flag.band.visible = owner === 'column';
      }
      flag.outline.visible = tactical;
      const column = snapshot?.progress.column ?? 0;
      const legalist = snapshot?.progress.legalist ?? 0;
      const side: Side | null = column > 0 ? 'column' : legalist > 0 ? 'legalist' : null;
      const progress = side === 'column' ? column / 100 : side === 'legalist' ? legalist / 100 : 0;
      flag.ring.visible = side !== null;
      if (side !== null) {
        flag.ringMaterial.color.setHex(OWNER_COLOR[side]);
        const key = `${side}:${Math.round(progress / RING_STEP)}`;
        if (key !== flag.ringKey) {
          flag.ringKey = key;
          flag.ring.geometry.dispose();
          const arc = Math.max(RING_STEP, progress) * Math.PI * 2;
          flag.ring.geometry = new THREE.RingGeometry(RING_INNER, RING_OUTER, 24, 1, -Math.PI / 2, arc);
        }
      }
      marks.push({
        id: flag.id,
        owner,
        value: flag.value,
        progress,
        side,
        contested: snapshot?.contested ?? false,
        x: flag.x,
        y: flag.y,
      });
    }
    this.marks = marks;
  }

  /** The two-frame wave: the cloth steps between two angles, as a placeholder would. */
  tick(time: number): void {
    for (const flag of this.flags) {
      const step = Math.sin(time * 3 + flag.id) >= 0 ? 0.22 : -0.05;
      flag.cloth.rotation.y = step;
    }
  }

  private clear(): void {
    for (const flag of this.flags) {
      (flag.cloth.material as THREE.Material).dispose();
      flag.outline.geometry.dispose();
      (flag.outline.material as THREE.Material).dispose();
      flag.ring.geometry.dispose();
      flag.ringMaterial.dispose();
    }
    this.flags = [];
    this.group.clear();
    this.marks = [];
  }

  dispose(): void {
    this.clear();
    this.poleGeometry.dispose();
    this.poleMaterial.dispose();
    this.clothGeometry.dispose();
    this.bandGeometry.dispose();
    this.bandMaterial.dispose();
  }
}
