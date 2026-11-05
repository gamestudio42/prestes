import * as THREE from 'three';
import {
  atTheReady,
  CLIP_SPEED,
  isMoving,
  holdReady,
  soldierClip,
  soldierOutfit,
  steadyClip,
  turnToward,
  walkTimeScale,
  type SoldierClip,
} from './soldier-clips';
import { SoldierInstance, loadSoldierAsset, type SoldierAsset } from './soldier-models';
import {
  terrainHeightAt,
  type Faction,
  type Frame,
  type Stance,
  type UnitKind,
} from '@prestes/shared';
import type { InterpolatedFrame } from '@prestes/shared';
import { TACTICAL_SPAN, unitScaleForSpan } from './camera-rig';
import { toon } from './materials';
import { PALETTE } from './palette';

/** A unit's ground marks and, for a target dummy, its board. */
interface UnitMarks {
  root: THREE.Group;
  /** The dummy's standing board and its fallen board (soldiers are the model). */
  board: THREE.Group | null;
  fallen: THREE.Group | null;
  ring: THREE.Mesh;
  shadow: THREE.Mesh;
}

/** After a shot the soldier keeps his rifle up this long (ms). */
const ENGAGED_MS = 4000;

interface CharacterView {
  marks: UnitMarks;
  /** The Blender-built soldier, once the model has loaded. */
  soldier?: SoldierInstance;
  /** Until when (performance.now ms) the soldier shows its firing pose. */
  fireUntil: number;
  /** Until when the soldier staggers from a hit (also just before falling). */
  hitUntil: number;
  /** He was down (dead or incapacitated) at the last update. */
  down: boolean;
  /** Until when he keeps the rifle up after firing. */
  engagedUntil: number;
  lastX: number;
  lastY: number;
  facingAngle: number;
  /** Ground speed (m/s), smoothed over a few frames. */
  speed: number;
  /** Walking by the start/stop hysteresis. */
  moving: boolean;
  /** When his speed last fell below the stop speed (null while above). */
  stillSince: number | null;
  /** Until when he keeps the rifle at the ready. */
  readyUntil: number;
  /** The clip playing and since when (ms). */
  clip: SoldierClip | null;
  clipSince: number;
}

function factionColor(faction: Faction): number {
  return PALETTE.factions[faction];
}

function part(
  geometry: THREE.BufferGeometry,
  color: number,
  x: number,
  y: number,
  z: number,
): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, toon({ color }));
  mesh.position.set(x, y, z);
  return mesh;
}

export function shortestAngleDelta(from: number, to: number): number {
  let delta = (to - from + Math.PI) % (Math.PI * 2);
  if (delta < 0) {
    delta += Math.PI * 2;
  }
  return delta - Math.PI;
}

function createRing(): THREE.Mesh {
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.55, 0.8, 12),
    new THREE.MeshBasicMaterial({
      color: PALETTE.selection,
      transparent: true,
      opacity: 0.65,
      depthWrite: false,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.03;
  // The front mark: a small arrowhead on the ring's edge where he faces
  // (ring +Y is the soldier's front once the ring lies flat). It shares the
  // ring's material, so it takes the faction or selection colour.
  const mark = new THREE.BufferGeometry();
  mark.setAttribute(
    'position',
    new THREE.Float32BufferAttribute([0, 1.08, 0, -0.24, 0.78, 0, 0.24, 0.78, 0], 3),
  );
  const front = new THREE.Mesh(mark, ring.material);
  front.name = 'front-mark';
  ring.add(front);
  return ring;
}

function createShadow(): THREE.Mesh {
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.36, 8),
    new THREE.MeshBasicMaterial({
      color: 0x11130c,
      transparent: true,
      opacity: 0.35,
      depthWrite: false,
    }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.02;
  return shadow;
}

function mutedColor(color: number, factor: number): number {
  return new THREE.Color(color).multiplyScalar(factor).getHex();
}

/** A target dummy's board on its post, and the board knocked flat. */
function dummyBoards(): { board: THREE.Group; fallen: THREE.Group } {
  const board = new THREE.Group();
  board.add(part(new THREE.BoxGeometry(1.2, 1.6, 0.12), PALETTE.sandbag, 0, 1.2, 0));
  board.add(part(new THREE.CylinderGeometry(0.06, 0.08, 1.2, 5), PALETTE.wood, 0, 0.6, 0));
  board.add(part(new THREE.CylinderGeometry(0.22, 0.22, 0.04, 8), PALETTE.scarf, 0, 1.35, 0.08));
  const fallen = new THREE.Group();
  const flat = part(new THREE.BoxGeometry(1.1, 0.1, 1.6), PALETTE.sandbag, 0, 0.08, 0.25);
  flat.rotation.x = -0.42;
  fallen.add(flat);
  fallen.visible = false;
  return { board, fallen };
}

/** Ground marks for a unit; a dummy also gets its boards. */
function createMarks(kind: UnitKind): UnitMarks {
  const root = new THREE.Group();
  const ring = createRing();
  const shadow = createShadow();
  root.add(ring, shadow);
  if (kind !== 'dummy') {
    return { root, board: null, fallen: null, ring, shadow };
  }
  const { board, fallen } = dummyBoards();
  root.add(board, fallen);
  return { root, board, fallen, ring, shadow };
}

export function ringColorFor(unit: {
  incapacitated: boolean;
  stance: Stance;
}): number {
  if (unit.incapacitated) {
    return PALETTE.scarf;
  }
  if (unit.stance === 'prone' || unit.stance === 'crouched') {
    return PALETTE.orderMarker;
  }
  return PALETTE.selection;
}

export class CharacterLayer {
  readonly group = new THREE.Group();
  private readonly views = new Map<number, CharacterView>();
  private readonly proxyBody: THREE.InstancedMesh;
  private readonly proxyHead: THREE.InstancedMesh;
  private readonly proxyRing: THREE.InstancedMesh;
  private readonly proxyCorpse: THREE.InstancedMesh;
  private readonly proxyMatrix = new THREE.Matrix4();
  private readonly proxyQuaternion = new THREE.Quaternion();
  private readonly proxyPosition = new THREE.Vector3();
  private readonly proxyScale = new THREE.Vector3();
  private asset: SoldierAsset | null = null;
  private lastUpdate = performance.now();
  private lastEventTick = -1;
  private readonly flatQuaternion = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(-Math.PI / 2, 0, 0),
  );

  constructor() {
    const bodyGeometry = new THREE.CylinderGeometry(0.28, 0.34, 1.15, 5);
    const headGeometry = new THREE.SphereGeometry(0.2, 6, 5);
    const ringGeometry = new THREE.RingGeometry(0.55, 0.8, 12);
    this.proxyBody = new THREE.InstancedMesh(bodyGeometry, toon({ color: 0xffffff }), 256);
    this.proxyHead = new THREE.InstancedMesh(
      headGeometry,
      toon({ color: PALETTE.skin }),
      256,
    );
    this.proxyRing = new THREE.InstancedMesh(
      ringGeometry,
      new THREE.MeshBasicMaterial({
        color: 0xffffff,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
      256,
    );
    this.proxyCorpse = new THREE.InstancedMesh(
      new THREE.BoxGeometry(0.9, 0.18, 0.42),
      toon({ color: 0xffffff }),
      256,
    );
    for (const mesh of [this.proxyBody, this.proxyHead, this.proxyRing, this.proxyCorpse]) {
      mesh.count = 0;
      mesh.frustumCulled = false;
      this.group.add(mesh);
    }
  }

  /** The modelled soldier's clip and the actions weighing on it (dev checks). */
  clipState(unitId: number): { playing: string | null; active: Array<{ clip: string; weight: number }> } | null {
    const soldier = this.views.get(unitId)?.soldier;
    return soldier ? { playing: soldier.playing, active: soldier.activeClips() } : null;
  }

  /**
   * Loads the modelled soldier. Until it arrives, or if it fails, soldiers
   * are drawn as the strategic proxy at every distance.
   */
  loadModels(base = './models/'): void {
    loadSoldierAsset(base)
      .then((asset) => {
        this.asset = asset;
      })
      .catch((error: unknown) => {
        console.error('soldier model unavailable, drawing the strategic proxy', error);
      });
  }

  update(frame: Frame | InterpolatedFrame, span: number): void {
    const now = performance.now();
    const seconds = Math.min(0.1, Math.max(0, (now - this.lastUpdate) / 1000));
    this.lastUpdate = now;
    // A tick's events act once, however often the frame is drawn.
    const fresh = frame.tick !== this.lastEventTick;
    this.lastEventTick = frame.tick;
    const shooters = new Set<number>();
    const struck = new Set<number>();
    for (const event of fresh ? frame.events : []) {
      if (event.type === 'shot') shooters.add(event.source);
      if (event.type === 'unit_hit') struck.add(event.unitId);
    }
    const scale = unitScaleForSpan(span) * 1.25;
    const seen = new Set<number>();
    let proxyIndex = 0;
    let corpseIndex = 0;
    const farBand = span > TACTICAL_SPAN;
    for (const unit of frame.units) {
      seen.add(unit.id);
      let view = this.views.get(unit.id);
      if (!view) {
        const marks = createMarks(unit.kind);
        marks.root.name = `unit-${unit.id}`;
        this.group.add(marks.root);
        view = {
          marks,
          lastX: unit.x,
          lastY: unit.y,
          facingAngle: Math.atan2(-unit.facingX, -unit.facingY),
          speed: 0,
          moving: false,
          stillSince: null,
          readyUntil: 0,
          clip: null,
          clipSince: 0,
          fireUntil: 0,
          hitUntil: 0,
          engagedUntil: 0,
          down: !unit.alive || unit.incapacitated,
        };
        this.views.set(unit.id, view);
      }

      const dx = unit.x - view.lastX;
      const dy = unit.y - view.lastY;
      const moved = Math.sqrt(dx * dx + dy * dy);
      if (seconds > 0) {
        // Smoothed over about a fifth of a second: frame positions jitter.
        view.speed += (moved / seconds - view.speed) * Math.min(1, seconds * 6);
      }
      view.lastX = unit.x;
      view.lastY = unit.y;

      const down = !unit.alive || unit.incapacitated;
      if (struck.has(unit.id) || (down && !view.down)) {
        view.hitUntil = now + (down ? 260 : 320);
      }
      view.down = down;

      if (shooters.has(unit.id)) {
        view.fireUntil = now + 450;
        view.engagedUntil = now + ENGAGED_MS;
        view.soldier?.retrigger(
          soldierClip(unit, { moving: false, firing: true }),
        );
      }

      // A soldier without the model (still loading, or failed) is a proxy too.
      const useProxy = farBand || (!this.asset && unit.kind !== 'dummy');
      const marks = view.marks;
      marks.root.visible = !useProxy && !unit.routed;
      marks.root.position.set(unit.x, terrainHeightAt(unit.x, unit.y), unit.y);
      marks.root.scale.setScalar(scale);
      const desiredAngle = Math.atan2(-unit.facingX, -unit.facingY);
      // The body turns at a man's pace, not in a snap (order-tempo-and-facing).
      view.facingAngle = turnToward(view.facingAngle, desiredAngle, seconds);
      marks.root.rotation.y = view.facingAngle;
      if (useProxy) {
        if (!unit.alive) {
          this.proxyQuaternion.setFromAxisAngle(
            new THREE.Vector3(0, 1, 0),
            view.facingAngle,
          );
          this.proxyPosition.set(
            unit.x,
            terrainHeightAt(unit.x, unit.y) + 0.1 * scale,
            unit.y,
          );
          this.proxyScale.set(scale, scale, scale);
          this.proxyMatrix.compose(
            this.proxyPosition,
            this.proxyQuaternion,
            this.proxyScale,
          );
          this.proxyCorpse.setMatrixAt(corpseIndex, this.proxyMatrix);
          this.proxyCorpse.setColorAt(
            corpseIndex,
            new THREE.Color(
              mutedColor(
                unit.kind === 'officer' ? PALETTE.officer : factionColor(unit.faction),
                0.45,
              ),
            ),
          );
          corpseIndex += 1;
          continue;
        }
        const stanceScale =
          unit.stance === 'prone' ? 0.35 : unit.stance === 'crouched' ? 0.7 : 1;
        this.proxyQuaternion.setFromAxisAngle(
          new THREE.Vector3(0, 1, 0),
          view.facingAngle,
        );
        this.proxyPosition.set(unit.x, terrainHeightAt(unit.x, unit.y) + 0.72 * stanceScale, unit.y);
        this.proxyScale.set(scale, scale * stanceScale, scale);
        this.proxyMatrix.compose(this.proxyPosition, this.proxyQuaternion, this.proxyScale);
        this.proxyBody.setMatrixAt(proxyIndex, this.proxyMatrix);
        this.proxyBody.setColorAt(
          proxyIndex,
          new THREE.Color(unit.kind === 'officer' ? PALETTE.officer : factionColor(unit.faction)),
        );
        this.proxyPosition.set(
          unit.x,
          terrainHeightAt(unit.x, unit.y) + 0.72 * stanceScale + 0.52,
          unit.y,
        );
        this.proxyMatrix.compose(this.proxyPosition, this.proxyQuaternion, this.proxyScale);
        this.proxyHead.setMatrixAt(proxyIndex, this.proxyMatrix);
        this.proxyPosition.set(
          unit.x,
          terrainHeightAt(unit.x, unit.y) + 0.03,
          unit.y,
        );
        this.proxyScale.set(scale, scale, scale);
        this.proxyMatrix.compose(
          this.proxyPosition,
          this.flatQuaternion,
          this.proxyScale,
        );
        this.proxyRing.setMatrixAt(proxyIndex, this.proxyMatrix);
        this.proxyRing.setColorAt(proxyIndex, new THREE.Color(ringColorFor(unit)));
        proxyIndex += 1;
        continue;
      }

      if (this.asset && !view.soldier && unit.kind !== 'dummy') {
        view.soldier = new SoldierInstance(this.asset, soldierOutfit(unit));
        marks.root.add(view.soldier.root);
      }
      if (view.soldier) {
        const motion = isMoving(view.speed, view.moving, now, view.stillSince);
        view.moving = motion.moving;
        view.stillSince = motion.stillSince;
        view.readyUntil = holdReady(
          view.readyUntil,
          now,
          atTheReady(unit) || unit.targetId !== null || now < view.engagedUntil || unit.gait === 'run',
          view.moving,
        );
        const wanted = soldierClip(unit, {
          moving: view.moving,
          ready: now < view.readyUntil,
          speed: view.speed,
          gait: unit.gait,
          firing: now < view.fireUntil,
          hit: now < view.hitUntil,
          engaged: now < view.engagedUntil,
        });
        // Hold a clip a moment so the pose does not flick back and forth.
        const clip = steadyClip(view.clip, view.clipSince, wanted, now);
        if (clip !== view.clip) {
          view.clip = clip;
          view.clipSince = now;
        }
        const authored = CLIP_SPEED[clip];
        view.soldier.play(clip, authored ? walkTimeScale(view.speed, authored) : 1);
        view.soldier.update(seconds);
        marks.ring.visible = unit.alive && !unit.routed && !unit.incapacitated;
        marks.shadow.rotation.set(-Math.PI / 2, 0, 0);
        if (marks.ring.visible) {
          (marks.ring.material as THREE.MeshBasicMaterial).color.setHex(ringColorFor(unit));
          marks.ring.rotation.set(-Math.PI / 2, 0, 0);
        }
        continue;
      }

      // A target dummy: its board stands until it is knocked down.
      marks.board!.visible = unit.alive;
      marks.fallen!.visible = !unit.alive;
      marks.ring.visible = unit.alive && !unit.routed;
      marks.shadow.rotation.set(-Math.PI / 2, 0, 0);
      if (marks.ring.visible) {
        (marks.ring.material as THREE.MeshBasicMaterial).color.setHex(ringColorFor(unit));
        marks.ring.rotation.set(-Math.PI / 2, 0, 0);
      }
    }

    this.proxyBody.count = proxyIndex;
    this.proxyHead.count = proxyIndex;
    this.proxyRing.count = proxyIndex;
    this.proxyCorpse.count = corpseIndex;
    this.proxyBody.instanceMatrix.needsUpdate = true;
    this.proxyHead.instanceMatrix.needsUpdate = true;
    this.proxyRing.instanceMatrix.needsUpdate = true;
    this.proxyCorpse.instanceMatrix.needsUpdate = true;
    if (this.proxyBody.instanceColor) this.proxyBody.instanceColor.needsUpdate = true;
    if (this.proxyRing.instanceColor) this.proxyRing.instanceColor.needsUpdate = true;
    if (this.proxyCorpse.instanceColor) this.proxyCorpse.instanceColor.needsUpdate = true;

    for (const [id, view] of this.views) {
      if (!seen.has(id)) {
        view.soldier?.dispose();
        this.group.remove(view.marks.root);
        disposeObject(view.marks.root);
        this.views.delete(id);
      }
    }
  }

  dispose(): void {
    for (const view of this.views.values()) {
      view.soldier?.dispose();
      disposeObject(view.marks.root);
    }
    this.views.clear();
  }
}

function disposeObject(object: THREE.Object3D): void {
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.geometry) {
      mesh.geometry.dispose();
    }
    const material = mesh.material;
    if (Array.isArray(material)) {
      for (const entry of material) {
        entry.dispose();
      }
    } else if (material) {
      material.dispose();
    }
  });
}

