import * as THREE from 'three';
import {
  terrainHeightAt,
  type Faction,
  type Frame,
  type Stance,
  type UnitKind,
} from '@prestes/shared';
import type { InterpolatedFrame } from '@prestes/shared';
import { unitScaleForSpan } from './camera-rig';
import { toon } from './materials';
import { PALETTE } from './palette';

interface CharacterRig {
  root: THREE.Group;
  body: THREE.Group;
  corpse: THREE.Group;
  chest: THREE.Group;
  head: THREE.Group;
  weapon: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  leftKnee: THREE.Group;
  rightKnee: THREE.Group;
  ring: THREE.Mesh;
  shadow: THREE.Mesh;
}

interface CharacterView {
  rig: CharacterRig;
  phase: number;
  lastX: number;
  lastY: number;
  crouch: number;
  prone: number;
  facingAngle: number;
  idle: number;
  lean: number;
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

function createCorpse(kind: UnitKind, faction: Faction): THREE.Group {
  const group = new THREE.Group();
  if (kind === 'dummy') {
    const board = part(new THREE.BoxGeometry(1.1, 0.1, 1.6), PALETTE.sandbag, 0, 0.08, 0.25);
    board.rotation.x = -0.42;
    group.add(board);
    return group;
  }
  const uniform = mutedColor(
    kind === 'officer' ? PALETTE.officer : factionColor(faction),
    0.52,
  );
  const trousers = mutedColor(PALETTE.trousers, 0.56);
  const skin = mutedColor(PALETTE.skin, 0.72);
  const leather = mutedColor(PALETTE.leather, 0.55);

  const torso = part(new THREE.BoxGeometry(0.52, 0.28, 0.88), uniform, 0, 0.16, 0.02);
  torso.rotation.z = 0.12;
  group.add(torso);
  group.add(part(new THREE.CylinderGeometry(0.07, 0.08, 0.16, 5), skin, 0.04, 0.17, -0.42));
  const head = part(new THREE.SphereGeometry(0.16, 6, 4), skin, 0.11, 0.19, -0.55);
  head.scale.set(0.95, 0.82, 1.04);
  head.rotation.z = -0.25;
  group.add(head);

  const leftArm = part(
    new THREE.CylinderGeometry(0.06, 0.075, 0.5, 5),
    uniform,
    -0.36,
    0.13,
    -0.12,
  );
  leftArm.rotation.z = Math.PI / 2;
  leftArm.rotation.y = 0.42;
  group.add(leftArm);
  group.add(part(new THREE.SphereGeometry(0.055, 5, 4), skin, -0.58, 0.12, -0.18));
  const rightArm = part(
    new THREE.CylinderGeometry(0.06, 0.075, 0.5, 5),
    uniform,
    0.37,
    0.12,
    0.08,
  );
  rightArm.rotation.z = Math.PI / 2;
  rightArm.rotation.y = -0.5;
  group.add(rightArm);
  group.add(part(new THREE.SphereGeometry(0.055, 5, 4), skin, 0.59, 0.11, 0.15));

  const leftLeg = part(
    new THREE.CylinderGeometry(0.08, 0.1, 0.56, 5),
    trousers,
    -0.14,
    0.12,
    0.66,
  );
  leftLeg.rotation.x = Math.PI / 2;
  leftLeg.rotation.z = 0.18;
  group.add(leftLeg);
  const rightLeg = part(
    new THREE.CylinderGeometry(0.08, 0.1, 0.54, 5),
    trousers,
    0.18,
    0.12,
    0.58,
  );
  rightLeg.rotation.x = Math.PI / 2;
  rightLeg.rotation.z = -0.28;
  group.add(rightLeg);
  group.add(part(new THREE.BoxGeometry(0.16, 0.1, 0.26), PALETTE.boots, -0.08, 0.08, 0.94));
  group.add(part(new THREE.BoxGeometry(0.16, 0.1, 0.25), PALETTE.boots, 0.16, 0.08, 0.86));
  group.add(part(new THREE.BoxGeometry(0.2, 0.05, 0.08), leather, 0.02, 0.18, 0.08));

  if (kind === 'officer') {
    const cap = part(new THREE.CylinderGeometry(0.19, 0.2, 0.06, 6), PALETTE.leather, 0.4, 0.05, -0.74);
    cap.rotation.x = Math.PI / 2;
    group.add(cap);
  } else {
    const hat = part(new THREE.CylinderGeometry(0.28, 0.28, 0.04, 8), PALETTE.hat, 0.44, 0.04, -0.78);
    hat.rotation.z = 0.35;
    group.add(hat);
  }

  const blood = new THREE.Mesh(
    new THREE.CircleGeometry(0.78, 10),
    new THREE.MeshBasicMaterial({
      color: PALETTE.blood,
      transparent: true,
      opacity: 0.5,
      depthWrite: false,
    }),
  );
  blood.rotation.x = -Math.PI / 2;
  blood.position.set(0.06, 0.018, 0.18);
  group.add(blood);
  return group;
}

function createDummyRig(): CharacterRig {
  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);
  body.add(part(new THREE.BoxGeometry(1.2, 1.6, 0.12), PALETTE.sandbag, 0, 1.2, 0));
  body.add(part(new THREE.CylinderGeometry(0.06, 0.08, 1.2, 5), PALETTE.wood, 0, 0.6, 0));
  body.add(part(new THREE.CylinderGeometry(0.22, 0.22, 0.04, 8), PALETTE.scarf, 0, 1.35, 0.08));
  const ring = createRing();
  root.add(ring);
  const shadow = createShadow();
  root.add(shadow);
  const corpse = createCorpse('dummy', 'target');
  corpse.visible = false;
  root.add(corpse);
  return {
    root,
    body,
    corpse,
    chest: new THREE.Group(),
    head: new THREE.Group(),
    weapon: new THREE.Group(),
    leftLeg: new THREE.Group(),
    rightLeg: new THREE.Group(),
    leftKnee: new THREE.Group(),
    rightKnee: new THREE.Group(),
    ring,
    shadow,
  };
}

function createRig(kind: UnitKind, faction: Faction): CharacterRig {
  if (kind === 'dummy') {
    return createDummyRig();
  }

  const root = new THREE.Group();
  const body = new THREE.Group();
  root.add(body);

  const uniform = kind === 'officer' ? PALETTE.officer : factionColor(faction);
  const trousers = kind === 'officer' ? PALETTE.officerDark : PALETTE.trousers;

  const chest = new THREE.Group();
  chest.position.y = 0.72;
  body.add(chest);

  const tunic = part(new THREE.CylinderGeometry(0.29, 0.35, 0.7, 6), uniform, 0, 0.35, 0);
  chest.add(tunic);
  chest.add(part(new THREE.CylinderGeometry(0.35, 0.35, 0.07, 6), PALETTE.leather, 0, 0.03, 0));
  chest.add(part(new THREE.CylinderGeometry(0.24, 0.27, 0.09, 6), PALETTE.bandolier, 0, 0.68, 0));
  chest.add(part(new THREE.BoxGeometry(0.2, 0.045, 0.1), PALETTE.scarf, 0, 0.65, 0.14));
  chest.add(part(new THREE.BoxGeometry(0.055, 0.05, 0.02), PALETTE.brass, 0, 0.035, 0.36));
  chest.add(part(new THREE.SphereGeometry(0.1, 6, 4), uniform, -0.29, 0.59, 0));
  chest.add(part(new THREE.SphereGeometry(0.1, 6, 4), uniform, 0.29, 0.59, 0));

  const bandolier = part(new THREE.BoxGeometry(0.055, 0.48, 0.035), PALETTE.bandolier, -0.13, 0.36, 0.19);
  bandolier.rotation.z = 0.48;
  chest.add(bandolier);
  chest.add(part(new THREE.BoxGeometry(0.16, 0.2, 0.14), PALETTE.gear, 0.24, 0.08, 0.02));
  chest.add(part(new THREE.BoxGeometry(0.18, 0.16, 0.07), PALETTE.leather, -0.24, 0.07, 0.18));
  chest.add(part(new THREE.BoxGeometry(0.32, 0.28, 0.16), PALETTE.gear, 0, 0.4, -0.23));

  const bedroll = part(
    new THREE.CylinderGeometry(0.08, 0.08, 0.48, 6),
    PALETTE.bandolier,
    0,
    0.54,
    -0.27,
  );
  bedroll.rotation.z = Math.PI / 2;
  chest.add(bedroll);

  const canteen = part(
    new THREE.CylinderGeometry(0.09, 0.1, 0.16, 6),
    PALETTE.leather,
    -0.29,
    0.1,
    -0.03,
  );
  canteen.rotation.z = 0.08;
  chest.add(canteen);

  if (kind === 'officer') {
    const sash = part(new THREE.BoxGeometry(0.08, 0.62, 0.03), PALETTE.scarf, 0, 0.35, 0.19);
    sash.rotation.z = -0.54;
    chest.add(sash);
    chest.add(part(new THREE.BoxGeometry(0.19, 0.25, 0.07), PALETTE.leather, 0.27, 0.12, -0.04));
  }

  const head = new THREE.Group();
  head.position.y = 0.83;
  chest.add(head);
  head.add(part(new THREE.CylinderGeometry(0.075, 0.09, 0.12, 6), PALETTE.skin, 0, -0.03, 0));
  const skull = part(new THREE.SphereGeometry(0.17, 6, 4), PALETTE.skin, 0, 0.1, 0.01);
  skull.scale.set(0.92, 1.02, 0.9);
  head.add(skull);
  head.add(part(new THREE.BoxGeometry(0.05, 0.05, 0.04), PALETTE.skin, 0, 0.095, 0.17));
  head.add(part(new THREE.BoxGeometry(0.022, 0.022, 0.012), PALETTE.hair, -0.055, 0.115, 0.165));
  head.add(part(new THREE.BoxGeometry(0.022, 0.022, 0.012), PALETTE.hair, 0.055, 0.115, 0.165));
  head.add(part(new THREE.BoxGeometry(0.075, 0.018, 0.014), PALETTE.hair, 0, 0.075, 0.168));
  head.add(part(new THREE.BoxGeometry(0.23, 0.06, 0.19), PALETTE.hair, 0, 0.15, -0.02));

  if (kind === 'officer') {
    head.add(part(new THREE.CylinderGeometry(0.2, 0.2, 0.035, 6), PALETTE.leather, 0, 0.2, 0));
    head.add(part(new THREE.CylinderGeometry(0.19, 0.2, 0.17, 6), PALETTE.boots, 0, 0.29, 0));
    head.add(part(new THREE.CylinderGeometry(0.2, 0.2, 0.035, 6), PALETTE.officer, 0, 0.22, 0));
    head.add(part(new THREE.BoxGeometry(0.26, 0.04, 0.13), PALETTE.boots, 0, 0.2, 0.18));
    head.add(part(new THREE.BoxGeometry(0.045, 0.05, 0.025), PALETTE.brass, 0, 0.25, 0.19));
  } else {
    head.add(part(new THREE.CylinderGeometry(0.29, 0.29, 0.035, 8), PALETTE.hat, 0, 0.2, 0));
    head.add(part(new THREE.CylinderGeometry(0.17, 0.19, 0.17, 7), PALETTE.hat, 0, 0.29, 0));
    head.add(part(new THREE.CylinderGeometry(0.185, 0.185, 0.04, 7), PALETTE.leather, 0, 0.23, 0));
    head.add(part(new THREE.BoxGeometry(0.05, 0.08, 0.02), PALETTE.scarf, 0, 0.28, 0.19));
  }

  const leftLeg = new THREE.Group();
  leftLeg.position.set(-0.15, 0.72, 0);
  leftLeg.add(part(new THREE.CylinderGeometry(0.1, 0.12, 0.36, 6), trousers, 0, -0.18, 0));
  body.add(leftLeg);
  const rightLeg = new THREE.Group();
  rightLeg.position.set(0.15, 0.72, 0);
  rightLeg.add(part(new THREE.CylinderGeometry(0.1, 0.12, 0.36, 6), trousers, 0, -0.18, 0));
  body.add(rightLeg);

  const leftKnee = new THREE.Group();
  leftKnee.position.y = -0.36;
  leftLeg.add(leftKnee);
  leftKnee.add(part(new THREE.CylinderGeometry(0.085, 0.1, 0.3, 6), PALETTE.boots, 0, -0.15, 0));
  leftKnee.add(part(new THREE.BoxGeometry(0.14, 0.1, 0.25), PALETTE.boots, 0, -0.31, -0.035));
  const rightKnee = new THREE.Group();
  rightKnee.position.y = -0.36;
  rightLeg.add(rightKnee);
  rightKnee.add(part(new THREE.CylinderGeometry(0.085, 0.1, 0.3, 6), PALETTE.boots, 0, -0.15, 0));
  rightKnee.add(part(new THREE.BoxGeometry(0.14, 0.1, 0.25), PALETTE.boots, 0, -0.31, -0.035));

  const weapon = new THREE.Group();
  weapon.position.set(0, 0.62, 0.05);
  chest.add(weapon);

  const leftArm = part(new THREE.CylinderGeometry(0.065, 0.075, 0.5, 6), uniform, -0.2, 0.02, -0.24);
  leftArm.rotation.x = Math.PI / 2;
  weapon.add(leftArm);
  const rightArm = part(new THREE.CylinderGeometry(0.065, 0.075, 0.5, 6), uniform, 0.2, 0.02, -0.24);
  rightArm.rotation.x = Math.PI / 2;
  weapon.add(rightArm);
  weapon.add(part(new THREE.SphereGeometry(0.06, 5, 4), PALETTE.skin, -0.2, 0.02, -0.47));
  weapon.add(part(new THREE.SphereGeometry(0.06, 5, 4), PALETTE.skin, 0.2, 0.02, -0.47));

  const rifle = part(new THREE.BoxGeometry(0.07, 0.08, 0.92), PALETTE.weapon, 0.12, 0, -0.55);
  weapon.add(rifle);
  weapon.add(part(new THREE.BoxGeometry(0.09, 0.13, 0.27), PALETTE.wood, 0.12, -0.015, -0.03));
  weapon.add(part(new THREE.CylinderGeometry(0.024, 0.026, 0.48, 6), PALETTE.steel, 0.12, 0, -1.17));
  weapon.add(part(new THREE.BoxGeometry(0.022, 0.02, 0.27), PALETTE.steel, 0.12, 0.045, -1.27));
  weapon.add(part(new THREE.BoxGeometry(0.025, 0.16, 0.025), PALETTE.leather, -0.02, 0.02, -0.4));

  const ring = createRing();
  root.add(ring);
  const shadow = createShadow();
  root.add(shadow);
  const corpse = createCorpse(kind, faction);
  corpse.visible = false;
  root.add(corpse);

  return {
    root,
    body,
    corpse,
    chest,
    head,
    weapon,
    leftLeg,
    rightLeg,
    leftKnee,
    rightKnee,
    ring,
    shadow,
  };
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

  update(frame: Frame | InterpolatedFrame, span: number): void {
    const scale = unitScaleForSpan(span) * 1.25;
    const seen = new Set<number>();
    let proxyIndex = 0;
    let corpseIndex = 0;
    const useProxy = span > 60;
    for (const unit of frame.units) {
      seen.add(unit.id);
      let view = this.views.get(unit.id);
      if (!view) {
        const rig = createRig(unit.kind, unit.faction);
        rig.root.name = `unit-${unit.id}`;
        this.group.add(rig.root);
        view = {
          rig,
          phase: 0,
          lastX: unit.x,
          lastY: unit.y,
          crouch: 0,
          prone: 0,
          facingAngle: Math.atan2(-unit.facingX, -unit.facingY),
          idle: unit.id * 0.7,
          lean: 0,
        };
        this.views.set(unit.id, view);
      }

      const dx = unit.x - view.lastX;
      const dy = unit.y - view.lastY;
      const moved = Math.sqrt(dx * dx + dy * dy);
      view.lastX = unit.x;
      view.lastY = unit.y;

      const targetCrouch = unit.alive && !unit.routed && unit.stance === 'crouched' ? 1 : 0;
      const targetProne =
        unit.routed || unit.incapacitated || unit.stance === 'prone' ? 1 : 0;
      view.crouch += (targetCrouch - view.crouch) * 0.08;
      view.prone += (targetProne - view.prone) * 0.08;
      view.idle += 1 / 60;

      const rig = view.rig;
      rig.root.visible = !useProxy && !unit.routed;
      rig.root.position.set(unit.x, terrainHeightAt(unit.x, unit.y), unit.y);
      rig.root.scale.setScalar(scale);
      const desiredAngle = Math.atan2(-unit.facingX, -unit.facingY);
      view.facingAngle += shortestAngleDelta(view.facingAngle, desiredAngle) * 0.24;
      rig.root.rotation.y = view.facingAngle;
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

      rig.body.visible = unit.alive;
      rig.corpse.visible = !unit.alive;
      rig.ring.visible = unit.alive && !unit.routed;
      rig.shadow.rotation.set(-Math.PI / 2, 0, 0);
      if (!unit.alive) {
        continue;
      }

      const moving = moved > 0.0005;
      if (moving) {
        view.phase += (moved / 0.42) * Math.PI;
      }
      const swing = moving ? Math.sin(view.phase) * 0.62 : 0;
      const settle = moving ? 0.3 : 0.14;
      const legReduction = (1 - 0.68 * view.crouch) * (1 - 0.85 * view.prone);
      const legBend = 0.85 * view.crouch + 0.35 * view.prone;
      const bob = moving ? Math.abs(Math.sin(view.phase)) * 0.035 : 0;
      const breath = moving ? 0 : Math.sin(view.idle * 1.8 + unit.id) * 0.008;
      const leanTarget = moving ? 0.085 : 0;
      view.lean += (leanTarget - view.lean) * 0.08;

      rig.body.position.y = -0.32 * view.crouch + 0.25 * view.prone + bob;
      rig.body.rotation.x = 0.2 * view.crouch - (Math.PI / 2) * view.prone;
      rig.chest.position.y = 0.72 + breath;
      rig.chest.rotation.x = view.lean + 0.1 * view.crouch;
      rig.chest.rotation.z = moving ? Math.sin(view.phase) * 0.025 * legReduction : 0;
      rig.head.rotation.x = -0.45 * rig.chest.rotation.x;
      rig.head.rotation.z = -0.5 * rig.chest.rotation.z;

      rig.leftLeg.rotation.x +=
        (swing * legReduction + legBend - rig.leftLeg.rotation.x) * settle;
      rig.rightLeg.rotation.x +=
        (-swing * legReduction + legBend - rig.rightLeg.rotation.x) * settle;
      rig.leftKnee.rotation.x +=
        (Math.max(0, swing) * 0.9 * legReduction + legBend * 1.15 - rig.leftKnee.rotation.x) *
        settle;
      rig.rightKnee.rotation.x +=
        (Math.max(0, -swing) * 0.9 * legReduction + legBend * 1.15 - rig.rightKnee.rotation.x) *
        settle;

      rig.weapon.position.set(0, 0.62 + breath * 0.4, 0.05 + 0.18 * view.prone);
      rig.weapon.rotation.x =
        (Math.PI / 2) * view.prone - (moving ? 0.025 : 0) + 0.04 * view.crouch;
      rig.weapon.rotation.z = -rig.chest.rotation.z * 0.7;
      rig.weapon.rotation.y = rig.chest.rotation.z * 0.35;

      const ringColor = ringColorFor(unit);
      rig.ring.visible = unit.alive && !unit.routed;
      (rig.ring.material as THREE.MeshBasicMaterial).color.setHex(ringColor);
      rig.ring.rotation.set(-Math.PI / 2, 0, 0);
      rig.shadow.rotation.set(-Math.PI / 2, 0, 0);
    }

    this.proxyBody.count = useProxy ? proxyIndex : 0;
    this.proxyHead.count = useProxy ? proxyIndex : 0;
    this.proxyRing.count = useProxy ? proxyIndex : 0;
    this.proxyCorpse.count = useProxy ? corpseIndex : 0;
    this.proxyBody.instanceMatrix.needsUpdate = true;
    this.proxyHead.instanceMatrix.needsUpdate = true;
    this.proxyRing.instanceMatrix.needsUpdate = true;
    this.proxyCorpse.instanceMatrix.needsUpdate = true;
    if (this.proxyBody.instanceColor) this.proxyBody.instanceColor.needsUpdate = true;
    if (this.proxyRing.instanceColor) this.proxyRing.instanceColor.needsUpdate = true;
    if (this.proxyCorpse.instanceColor) this.proxyCorpse.instanceColor.needsUpdate = true;

    for (const [id, view] of this.views) {
      if (!seen.has(id)) {
        this.group.remove(view.rig.root);
        disposeObject(view.rig.root);
        this.views.delete(id);
      }
    }
  }

  dispose(): void {
    for (const view of this.views.values()) {
      disposeObject(view.rig.root);
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

