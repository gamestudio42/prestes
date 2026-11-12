import * as THREE from 'three';
import {
  atTheReady,
  CLIP_SPEED,
  isMoving,
  holdReady,
  soldierClip,
  aimTransition,
  corpsePose,
  deathClip,
  deathVariant,
  shotSide,
  soldierOutfit,
  uniformVariant,
  woundSide,
  type WoundSide,
  steadyClip,
  turnToward,
  walkTimeScale,
  type SoldierClip,
} from './soldier-clips';
import { SoldierInstance, loadSoldierAsset, type SoldierAsset } from './soldier-models';
import { WeaponProps } from './weapon-placeholders';
import {
  activeMapGeneration,
  activeMapRuntime,
  buildingOpenings,
  windowMiddleHeight,
  buildingTower,
  TOWER_EYE,
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

/** garrison-and-assault 4.7 and 1.4: a building's window heights, and its tower's middle and face (world). */
interface BuildingWindows {
  ground: number;
  upper: number;
  /** The roof's ridge (m): an upper floor's marker floats over it. */
  ridge: number;
  tower?: { x: number; y: number; half: number; height: number; frontX: number; frontY: number };
}

interface CharacterView {
  marks: UnitMarks;
  /** The Blender-built soldier, once the model has loaded. */
  soldier?: SoldierInstance;
  /** pre-battle-roster 5.4: the weapon placeholders on that soldier. */
  weapons?: WeaponProps;
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
  /** Alive at the last update (a death seen happening gets a death clip). */
  alive: boolean;
  /** Where the last shot that hit him came from (simulation metres). */
  shotFrom: { x: number; y: number } | null;
  /** soldier-animation 2.1: the death clip chosen when he fell. */
  death?: SoldierClip;
  /** 3.4: the side of his wound, fixed when he is first seen wounded. */
  woundSide?: WoundSide | null;
}

/** How far the rescuer kneels to the side of the man he treats (model metres). */
const TREAT_OFFSET = 0.6;
/** Halted and aiming, a body still this far from its target angle is turning (radians). */
const TURNING_ANGLE = 0.15;

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
  concealed?: boolean;
  revealed?: boolean;
}): number {
  if (unit.incapacitated) {
    return PALETTE.scarf;
  }
  // refine-battle-maps 5.14: "Revelado", given away by his own shot.
  if (unit.revealed) {
    return PALETTE.revealed;
  }
  // add-battle-maps: hidden in the crops or the grass.
  if (unit.concealed) {
    return PALETTE.concealed;
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
  /** fog-of-war: faded silhouettes where enemies were last seen. */
  private readonly ghosts: THREE.InstancedMesh;
  /** biome-trees-and-plants 4.1b: the player's men still hidden behind a crown, drawn over it. */
  private readonly canopyOutlines: THREE.InstancedMesh;
  private readonly proxyMatrix = new THREE.Matrix4();
  private readonly proxyQuaternion = new THREE.Quaternion();
  private readonly proxyPosition = new THREE.Vector3();
  private readonly proxyScale = new THREE.Vector3();
  /**
   * garrison-and-assault 4.7: men inside a building are not drawn, only
   * their rifle barrels out of the windows.
   */
  private readonly barrels: THREE.InstancedMesh;
  /**
   * garrison-and-assault 1.4: a diamond in the side's colour over each
   * occupied tower and upper floor (the men there are not drawn).
   */
  private readonly elevatedMarkers: THREE.InstancedMesh;
  /** The active map's buildings by id: each floor's window height, and the tower's (world) when it has one. */
  private windowHeights = new Map<number, BuildingWindows>();
  private windowHeightsFor = -1;
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
    this.ghosts = new THREE.InstancedMesh(
      bodyGeometry,
      new THREE.MeshBasicMaterial({ color: PALETTE.factions.legalist, transparent: true, opacity: 0.35, depthWrite: false }),
      128,
    );
    // Over the crowns (no depth test), in the column's colour: a man hidden by foliage keeps his outline.
    this.canopyOutlines = new THREE.InstancedMesh(
      bodyGeometry,
      new THREE.MeshBasicMaterial({ color: PALETTE.factions.column, transparent: true, opacity: 0.45, depthTest: false, depthWrite: false }),
      128,
    );
    this.canopyOutlines.name = 'canopy-outlines';
    this.canopyOutlines.renderOrder = 10;
    this.barrels = new THREE.InstancedMesh(new THREE.BoxGeometry(0.1, 0.1, 1), toon({ color: PALETTE.barrel }), 256);
    this.barrels.name = 'garrison-barrels';
    this.elevatedMarkers = new THREE.InstancedMesh(
      new THREE.OctahedronGeometry(0.9, 0),
      new THREE.MeshBasicMaterial({ color: 0xffffff }),
      64,
    );
    this.elevatedMarkers.name = 'garrison-elevated-markers';
    for (const mesh of [this.proxyBody, this.proxyHead, this.proxyRing, this.proxyCorpse, this.ghosts, this.canopyOutlines, this.barrels, this.elevatedMarkers]) {
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

  /** pre-battle-roster 5.4: the weapon a soldier model shows and its visible placeholders (dev checks). */
  weaponState(unitId: number): { look: string; shown: string[] } | null {
    return this.views.get(unitId)?.weapons?.state() ?? null;
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
    const hitFrom = new Map<number, { x: number; y: number }>();
    const diedOn = new Map<number, number>();
    for (const event of fresh ? frame.events : []) {
      if (event.type === 'unit_died') diedOn.set(event.unitId, event.tick);
      if (event.type === 'shot') shooters.add(event.source);
      if (event.type === 'shot' && event.hit && event.target >= 0) hitFrom.set(event.target, { x: event.x, y: event.y });
      if (event.type === 'unit_hit') struck.add(event.unitId);
    }
    // 2.1: who carries whom, and who is being treated.
    const states = new Map(frame.units.map((unit) => [unit.id, unit.soldierState]));
    const carrierOf = new Map<number, number>();
    const treated = new Set<number>();
    for (const unit of frame.units) {
      if (unit.rescueTargetId === null) continue;
      if (states.get(unit.rescueTargetId) === 'being-carried') carrierOf.set(unit.rescueTargetId, unit.id);
      if (unit.soldierState === 'treating') treated.add(unit.rescueTargetId);
    }
    const carrying = new Set(carrierOf.values());
    const scale = unitScaleForSpan(span) * 1.25;
    const seen = new Set<number>();
    let proxyIndex = 0;
    let corpseIndex = 0;
    const farBand = span > TACTICAL_SPAN;
    const windows = this.buildingWindows();
    let barrelIndex = 0;
    // Occupied raised floors: building id and floor ('upper' | 'tower') -> where its marker floats.
    const raised = new Map<string, { x: number; y: number; z: number; count: number; faction: string }>();
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
          alive: unit.alive,
          shotFrom: null,
          // 2.2: a man first seen dead lies in a pose of his id.
          ...(!unit.alive && !unit.routed ? { death: corpsePose(unit.id, unit.stance) } : {}),
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

      const from = hitFrom.get(unit.id);
      if (from) view.shotFrom = from;
      if (view.alive && !unit.alive && !unit.routed) {
        // Seen to die: the clip of his stance and the side the shot came from.
        const side = view.shotFrom ? shotSide(unit.facingX, unit.facingY, view.shotFrom.x - unit.x, view.shotFrom.y - unit.y) : 'front';
        view.death = deathClip(unit.stance, side, deathVariant(unit.id, diedOn.get(unit.id) ?? frame.tick));
      }
      view.alive = unit.alive;
      // 3.4: the side of his wound, from the shot that gave it.
      const wounded = unit.wound !== 'none' || unit.incapacitated;
      if (wounded && !view.woundSide) {
        view.woundSide = woundSide(unit.id, unit.facingX, unit.facingY, view.shotFrom ? view.shotFrom.x - unit.x : undefined, view.shotFrom ? view.shotFrom.y - unit.y : undefined);
      } else if (!wounded) view.woundSide = null;
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

      const inside = unit.garrison !== undefined ? windows.get(unit.garrison) : undefined;
      if (inside) {
        // Inside a building: only his barrel shows, out of his window, where he faces.
        view.marks.root.visible = false;
        view.facingAngle = turnToward(view.facingAngle, Math.atan2(-unit.facingX, -unit.facingY), seconds);
        // A man up in a church is in its tower; his barrel shows at the tower's face he looks out of.
        const tower = unit.elevation ? inside.tower : undefined;
        if (unit.elevation && !down) {
          const key = `${unit.garrison}:${tower ? 'tower' : 'upper'}`;
          const ground = terrainHeightAt(unit.x, unit.y);
          const at = tower
            ? { x: tower.x + tower.frontX * (tower.half + 0.6), y: tower.y + tower.frontY * (tower.half + 0.6), z: ground + tower.height + 2 }
            : { x: unit.x, y: unit.y, z: ground + inside.ridge + 1.4 };
          const entry = raised.get(key);
          if (entry) {
            entry.x += at.x;
            entry.y += at.y;
            entry.z = Math.max(entry.z, at.z);
            entry.count += 1;
          } else raised.set(key, { ...at, count: 1, faction: unit.faction });
        }
        if (!down && barrelIndex < 256) {
          const fx = -Math.sin(view.facingAngle);
          const fy = -Math.cos(view.facingAngle);
          const height = tower ? tower.height : unit.elevation ? inside.upper : inside.ground;
          const from = tower ? { x: tower.x, y: tower.y, out: tower.half + 0.45 } : { x: unit.x, y: unit.y, out: 0.45 };
          this.proxyQuaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), view.facingAngle);
          this.proxyPosition.set(from.x + fx * from.out, terrainHeightAt(unit.x, unit.y) + height, from.y + fy * from.out);
          this.proxyScale.set(1, 1, 1.1);
          this.proxyMatrix.compose(this.proxyPosition, this.proxyQuaternion, this.proxyScale);
          this.barrels.setMatrixAt(barrelIndex, this.proxyMatrix);
          barrelIndex += 1;
        }
        continue;
      }

      // A soldier without the model (still loading, or failed) is a proxy too.
      const useProxy = farBand || (!this.asset && unit.kind !== 'dummy');
      const marks = view.marks;
      marks.root.visible = !useProxy && !unit.routed;
      marks.root.position.set(unit.x, terrainHeightAt(unit.x, unit.y), unit.y);
      marks.root.scale.setScalar(scale);
      // A carried man faces the way his carrier does: he lies over his shoulder.
      const carrier = carrierOf.has(unit.id) ? this.views.get(carrierOf.get(unit.id)!) : undefined;
      const desiredAngle = carrier ? carrier.facingAngle : Math.atan2(-unit.facingX, -unit.facingY);
      // The body turns at a man's pace, not in a snap (order-tempo-and-facing).
      view.facingAngle = carrier ? desiredAngle : turnToward(view.facingAngle, desiredAngle, seconds);
      let behind = desiredAngle - view.facingAngle;
      behind = Math.atan2(Math.sin(behind), Math.cos(behind));
      const turning = Math.abs(behind) > TURNING_ANGLE;
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
        view.soldier = new SoldierInstance(this.asset, soldierOutfit(unit), uniformVariant(unit.id));
        view.weapons = new WeaponProps(view.soldier.root);
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
          carrying: carrying.has(unit.id),
          treated: treated.has(unit.id),
          turning: !view.moving && turning,
          ...(view.death ? { death: view.death } : {}),
        });
        // Hold a clip a moment so the pose does not flick back and forth; the
        // rifle is raised into the aim and lowered out of it (1.3).
        const clip = aimTransition(view.clip, view.clipSince, steadyClip(view.clip, view.clipSince, wanted, now), now);
        if (clip !== view.clip) {
          view.clip = clip;
          view.clipSince = now;
        }
        const authored = CLIP_SPEED[clip];
        view.soldier.play(clip, authored ? walkTimeScale(view.speed, authored) : 1);
        // The rescuer kneels beside the man he treats, not on him.
        view.soldier.root.position.x = clip === 'kneel-treat' ? TREAT_OFFSET : 0;
        view.soldier.setWound(view.woundSide ?? null);
        view.soldier.update(seconds);
        view.weapons?.apply(unit.weaponId, unit.gunSet === true, unit.alive && !unit.incapacitated && !unit.routed);
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
    this.barrels.count = barrelIndex;
    this.barrels.instanceMatrix.needsUpdate = true;
    let markerIndex = 0;
    const markerColor = new THREE.Color();
    for (const entry of raised.values()) {
      if (markerIndex >= 64) break;
      this.proxyQuaternion.identity();
      this.proxyPosition.set(entry.x / entry.count, entry.z, entry.y / entry.count);
      this.proxyScale.set(1, 1.4, 1);
      this.proxyMatrix.compose(this.proxyPosition, this.proxyQuaternion, this.proxyScale);
      this.elevatedMarkers.setMatrixAt(markerIndex, this.proxyMatrix);
      markerColor.setHex(entry.faction === 'legalist' ? PALETTE.factions.legalist : PALETTE.factions.column);
      this.elevatedMarkers.setColorAt(markerIndex, markerColor);
      markerIndex += 1;
    }
    this.elevatedMarkers.count = markerIndex;
    this.elevatedMarkers.instanceMatrix.needsUpdate = true;
    if (this.elevatedMarkers.instanceColor) this.elevatedMarkers.instanceColor.needsUpdate = true;
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

  /** The active map's enterable buildings: each floor's window height, by building id. */
  private buildingWindows(): Map<number, BuildingWindows> {
    const generation = activeMapGeneration();
    if (generation === this.windowHeightsFor) return this.windowHeights;
    this.windowHeightsFor = generation;
    this.windowHeights = new Map();
    for (const building of activeMapRuntime()?.map.buildings ?? []) {
      const openings = buildingOpenings(building);
      const upper = openings.windows.find((window) => window.level > 0) ?? { elevation: openings.storey, level: 1 };
      const tower = buildingTower(building);
      const cos = Math.cos(building.rotation);
      const sin = Math.sin(building.rotation);
      const front = building.front ?? 1;
      this.windowHeights.set(building.id, {
        ground: windowMiddleHeight(openings, { elevation: 0, level: 0 }, building.model),
        upper: windowMiddleHeight(openings, upper, building.model),
        ridge: building.height,
        ...(tower
          ? {
              tower: {
                x: building.x + tower.x * cos - tower.y * sin,
                y: building.y + tower.x * sin + tower.y * cos,
                half: tower.side / 2,
                height: TOWER_EYE - 0.2,
                frontX: -sin * front,
                frontY: cos * front,
              },
            }
          : {}),
      });
    }
    return this.windowHeights;
  }

  /** garrison-and-assault 4.7: the barrels out of the windows (dev checks). */
  barrelCount(): number {
    return this.barrels.count;
  }

  /** garrison-and-assault 1.4: the markers over occupied towers and upper floors (dev checks). */
  elevatedMarkerCount(): number {
    return this.elevatedMarkers.count;
  }

  /** fog-of-war: the faded silhouettes of enemies last seen there. */
  updateGhosts(ghosts: readonly { x: number; y: number; facingX: number; facingY: number }[], span: number): void {
    const scale = unitScaleForSpan(span) * 1.25;
    let index = 0;
    for (const ghost of ghosts.slice(0, 128)) {
      this.proxyQuaternion.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.atan2(-ghost.facingX, -ghost.facingY));
      this.proxyPosition.set(ghost.x, terrainHeightAt(ghost.x, ghost.y) + 0.72, ghost.y);
      this.proxyScale.set(scale, scale, scale);
      this.proxyMatrix.compose(this.proxyPosition, this.proxyQuaternion, this.proxyScale);
      this.ghosts.setMatrixAt(index, this.proxyMatrix);
      index += 1;
    }
    this.ghosts.count = index;
    this.ghosts.instanceMatrix.needsUpdate = true;
  }

  /** biome-trees-and-plants 4.1b: outlines over the crowns for these men (ground points). */
  updateCanopyOutlines(men: readonly { x: number; y: number }[], span: number): void {
    const scale = unitScaleForSpan(span) * 1.1;
    let index = 0;
    for (const man of men.slice(0, 128)) {
      this.proxyPosition.set(man.x, terrainHeightAt(man.x, man.y) + 0.72, man.y);
      this.proxyScale.set(scale, scale, scale);
      this.proxyMatrix.compose(this.proxyPosition, this.proxyQuaternion.identity(), this.proxyScale);
      this.canopyOutlines.setMatrixAt(index, this.proxyMatrix);
      index += 1;
    }
    this.canopyOutlines.count = index;
    this.canopyOutlines.instanceMatrix.needsUpdate = true;
  }

  /** How many outlines are drawn over the crowns (dev checks). */
  canopyOutlineCount(): number {
    return this.canopyOutlines.count;
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

