import * as THREE from 'three';
import {
  SANDBOX_TERRAIN,
  TRAINING_TERRAIN,
  setActiveTerrain,
  terrainHeightAt,
  terrainSurfaceAt,
  type TerrainSurface,
  type Frame,
  type InterpolatedFrame,
  type Vec2,
  type PreviewPlan,
  type SlotMarker,
  type UnitSnapshot,
  troopFormationOffsets,
} from '@prestes/shared';
import { CameraRig, type CameraBand } from './camera-rig';
import { CharacterLayer } from './character-layer';
import { CoverLayer } from './cover-layer';
import { toon } from './materials';
import { PALETTE } from './palette';
import { PathLayer } from './path-layer';
import { PixelPost } from './post';
import { PreviewLayer } from './preview-layer';
import { TracerLayer } from './tracer-layer';
import { TrainingLayer, type TrainingMarker } from './training-layer';
import { WorldLayer } from './world-layer';


export interface OrderCallout {
  officerId: number | null;
  troopIds: readonly number[];
  officerText: string;
  troopText: string;
}

export type PlacementKind =
  | 'sandbag'
  | 'stone'
  | 'trench'
  | 'dummy'
  | 'enemy-troop'
  | 'command-troop';

export interface PlacementPreview {
  kind: PlacementKind;
  x: number;
  y: number;
  rotation: number;
  valid: boolean;
}

export interface SceneViewOptions {
  container: HTMLElement;
  onBandChange?: (band: CameraBand) => void;
  trainingField?: boolean;
  strategicField?: boolean;
  onCameraAction?: (kind: 'pan' | 'zoom' | 'rotate') => void;
}

const INTERNAL_HEIGHT = 300;

/** The commander's current order shown over the officer. */
export interface CommanderBalloon {
  officerId: number;
  text: string;
}

export class SceneView {
  private readonly container: HTMLElement;
  private readonly onBandChange?: (band: CameraBand) => void;
  private readonly onCameraAction?: (kind: 'pan' | 'zoom' | 'rotate') => void;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private readonly rig = new CameraRig(0, 4);
  private terrainMesh: THREE.Mesh | null = null;
  private readonly post = new PixelPost();
  private readonly covers = new CoverLayer();
  private readonly characters = new CharacterLayer();
  private readonly paths = new PathLayer();
  private readonly tracers = new TracerLayer();
  private readonly preview = new PreviewLayer();
  private readonly training = new TrainingLayer();
  private readonly world: WorldLayer;
  private selectedUnits: readonly number[] = [];
  private readonly placementRoot = new THREE.Group();
  private readonly targetRoot = new THREE.Group();
  private readonly calloutRoot: HTMLDivElement;
  private callout: {
    officer: HTMLDivElement | null;
    troop: HTMLDivElement;
    callout: OrderCallout;
    expiresAt: number;
  } | null = null;
  private balloon: { element: HTMLDivElement; officerId: number } | null = null;
  private readonly keys = new Set<string>();
  private readonly raycaster = new THREE.Raycaster();
  private readonly groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  private lastEventTick = -1;
  private lastFrame: Frame | InterpolatedFrame | null = null;
  private band: CameraBand = 'tactical';
  private frameHandle = 0;
  private lastTime = 0;

  constructor(options: SceneViewOptions) {
    this.container = options.container;
    this.onBandChange = options.onBandChange;
    this.onCameraAction = options.onCameraAction;

    this.renderer = new THREE.WebGLRenderer({ antialias: false, alpha: false });
    this.renderer.setPixelRatio(1);
    this.renderer.domElement.style.display = 'block';
    this.renderer.domElement.style.width = '100%';
    this.renderer.domElement.style.height = '100%';
    this.renderer.domElement.style.imageRendering = 'pixelated';
    this.renderer.domElement.setAttribute('aria-label', 'low-poly tactical scene');
    this.container.appendChild(this.renderer.domElement);
    this.calloutRoot = document.createElement('div');
    this.calloutRoot.className = 'scene-callouts';
    this.calloutRoot.style.position = 'absolute';
    this.calloutRoot.style.inset = '0';
    this.calloutRoot.style.pointerEvents = 'none';
    this.calloutRoot.style.zIndex = '2';
    this.container.appendChild(this.calloutRoot);

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(PALETTE.sky);
    this.scene.fog = new THREE.Fog(PALETTE.fog, 1000, 1500);

    const ambient = new THREE.AmbientLight(0xffffff, 0.45);
    this.scene.add(ambient);
    const hemisphere = new THREE.HemisphereLight(PALETTE.skyLight, PALETTE.groundLight, 1.8);
    this.scene.add(hemisphere);
    const sun = new THREE.DirectionalLight(PALETTE.sun, 1.7);
    sun.position.set(40, 70, 30);
    this.scene.add(sun);

    // The training ground has its own terrain and countryside.
    setActiveTerrain(options.trainingField ? TRAINING_TERRAIN : SANDBOX_TERRAIN);
    this.world = new WorldLayer(options.trainingField ? 'training' : 'sandbox');
    this.addWorld();
    if (options.trainingField) {
      this.scene.add(this.training.group);
    }
    this.scene.add(
      this.world.group,
      this.covers.group,
      this.characters.group,
      this.paths.group,
      this.tracers.group,
      this.preview.group,
      this.placementRoot,
      this.targetRoot,
    );

    if (options.trainingField) {
      this.rig.focusY = 0;
      this.rig.span = 180;
      this.rig.targetSpan = 180;
    }
    if (options.strategicField) {
      this.rig.span = 240;
      this.rig.targetSpan = 240;
    }
    this.resize();
    this.rig.update(0);
    window.addEventListener('resize', this.resize);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    this.renderer.domElement.addEventListener('wheel', this.onWheel, { passive: false });
    this.animate(0);
  }

  setPlacementPreview(preview: PlacementPreview | null): void {
    this.placementRoot.clear();
    if (!preview) {
      return;
    }
    const color = preview.valid ? 0x7fbf6a : 0xbf5f4a;
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
    });
    const outline = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0.9,
      depthWrite: false,
    });
    const addGhost = (x: number, z: number, radius: number, height: number): void => {
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, height, 6), material);
      mesh.position.set(x, terrainHeightAt(x, z) + height / 2, z);
      this.placementRoot.add(mesh);
    };
    const rotation = preview.rotation;
    if (preview.kind === 'enemy-troop' || preview.kind === 'command-troop') {
      const count = preview.kind === 'enemy-troop' ? 11 : 3;
      const columns = preview.kind === 'enemy-troop' ? 6 : 3;
      for (const offset of troopFormationOffsets(count, columns, 2.4, rotation)) {
        addGhost(preview.x + offset.x, preview.y + offset.y, 0.3, 1.6);
      }
      return;
    }
    const dimensions =
      preview.kind === 'stone'
        ? { width: 3.6, depth: 1.0, height: 1.8 }
        : preview.kind === 'trench'
          ? { width: 4.8, depth: 2.4, height: 0.3 }
          : preview.kind === 'dummy'
            ? { width: 0.8, depth: 0.8, height: 1.1 }
            : { width: 3.4, depth: 0.8, height: 0.9 };
    const mesh = new THREE.Mesh(
      new THREE.BoxGeometry(dimensions.width, dimensions.height, dimensions.depth),
      material,
    );
    mesh.position.set(
      preview.x,
      terrainHeightAt(preview.x, preview.y) + dimensions.height / 2,
      preview.y,
    );
    mesh.rotation.y = -rotation;
    this.placementRoot.add(mesh);
    const points = [
      new THREE.Vector3(-dimensions.width / 2, 0, -dimensions.depth / 2),
      new THREE.Vector3(dimensions.width / 2, 0, -dimensions.depth / 2),
      new THREE.Vector3(dimensions.width / 2, 0, dimensions.depth / 2),
      new THREE.Vector3(-dimensions.width / 2, 0, dimensions.depth / 2),
      new THREE.Vector3(-dimensions.width / 2, 0, -dimensions.depth / 2),
    ].map((point) => {
      const rotated = point.applyAxisAngle(new THREE.Vector3(0, 1, 0), -rotation);
      return rotated.setY(terrainHeightAt(preview.x, preview.y) + 0.05);
    });
    this.placementRoot.add(
      new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), outline).translateX(
        preview.x,
      ).translateZ(preview.y),
    );
  }
  setTargetUnits(unitIds: readonly number[]): void {
    this.targetRoot.clear();
    const frame = this.lastFrame;
    if (!frame || unitIds.length === 0) {
      return;
    }
    for (const unitId of unitIds) {
      const unit = frame.units.find((entry) => entry.id === unitId && entry.alive);
      if (!unit) {
        continue;
      }
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.72, 0.95, 18),
        new THREE.MeshBasicMaterial({
          color: PALETTE.scarf,
          transparent: true,
          opacity: 0.85,
          depthWrite: false,
          side: THREE.DoubleSide,
        }),
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.set(unit.x, terrainHeightAt(unit.x, unit.y) + 0.18, unit.y);
      this.targetRoot.add(ring);
    }
  }
  setSelectedUnits(unitIds: readonly number[]): void {
    this.selectedUnits = unitIds;
  }

  setTrainingMarkers(markers: readonly TrainingMarker[]): void {
    this.training.setMarkers(markers);
  }

  setPreview(plan: PreviewPlan | null): void {
    this.preview.setPlan(plan);
  }

  setSlotMarkers(markers: readonly SlotMarker[]): void {
    this.preview.setSlotMarkers(markers);
  }

  /** Centres the camera on a ground point (a new training station). */
  focusOn(x: number, y: number): void {
    this.rig.focusX = x;
    this.rig.focusY = y;
  }

  setBand(band: CameraBand): void {
    this.rig.targetSpan = band === 'strategic' ? 240 : band === 'tactical' ? 80 : 180;
  }

  /**
   * The commander's current order, in a speech balloon over the officer. It
   * stays while the order is current and hides while the officer is off
   * screen (the training panel still shows it).
   */
  setCommanderBalloon(balloon: CommanderBalloon | null): void {
    if (!balloon) {
      this.balloon?.element.remove();
      this.balloon = null;
      return;
    }
    let element = this.balloon?.element;
    if (!element) {
      element = document.createElement('div');
      element.className = 'commander-balloon';
      element.dataset.testid = 'commander-balloon';
      element.setAttribute('role', 'status');
      this.calloutRoot.append(element);
    }
    if (element.textContent !== balloon.text) {
      element.textContent = balloon.text;
      // Restart the entrance animation for a new order.
      element.classList.remove('commander-balloon-new');
      void element.offsetWidth;
      element.classList.add('commander-balloon-new');
    }
    this.balloon = { element, officerId: balloon.officerId };
    this.updateBalloon();
  }

  private updateBalloon(): void {
    const balloon = this.balloon;
    const frame = this.lastFrame;
    if (!balloon || !frame) {
      return;
    }
    const officer = frame.units.find((unit) => unit.id === balloon.officerId && unit.alive);
    if (!officer) {
      balloon.element.style.display = 'none';
      balloon.element.dataset.visible = 'false';
      return;
    }
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    const point = new THREE.Vector3(officer.x, terrainHeightAt(officer.x, officer.y) + 2.6, officer.y).project(
      this.rig.camera,
    );
    const screenX = ((point.x + 1) / 2) * width;
    const screenY = ((1 - point.y) / 2) * height;
    const onScreen = point.z <= 1 && screenX >= 0 && screenX <= width && screenY >= 0 && screenY <= height;
    balloon.element.style.display = onScreen ? '' : 'none';
    balloon.element.dataset.visible = onScreen ? 'true' : 'false';
    if (onScreen) {
      // Keep the balloon inside the view horizontally.
      const half = Math.min(150, balloon.element.offsetWidth / 2 || 120);
      balloon.element.style.left = `${Math.max(half + 4, Math.min(width - half - 4, screenX))}px`;
      balloon.element.style.top = `${screenY}px`;
    }
  }

  showOrderCallout(callout: OrderCallout): void {
    this.clearOrderCallout();
    const officer = document.createElement('div');
    officer.className = 'order-callout order-callout-officer';
    officer.dataset.testid = 'order-callout-officer';
    officer.textContent = callout.officerText;
    const troop = document.createElement('div');
    troop.className = 'order-callout order-callout-troop';
    troop.dataset.testid = 'order-callout-troop';
    troop.textContent = callout.troopText;
    this.calloutRoot.append(officer, troop);
    this.callout = {
      officer: callout.officerId === null ? null : officer,
      troop,
      callout,
      expiresAt: performance.now() + 3600,
    };
    if (callout.officerId === null) {
      officer.remove();
    }
    this.updateCallout(performance.now());
  }

  private clearOrderCallout(): void {
    for (const child of [...this.calloutRoot.children]) {
      if (child !== this.balloon?.element) {
        child.remove();
      }
    }
    this.callout = null;
  }

  private updateCallout(time: number): void {
    if (!this.callout) {
      return;
    }
    if (time >= this.callout.expiresAt) {
      this.clearOrderCallout();
      return;
    }
    const frame = this.lastFrame;
    if (!frame) {
      return;
    }
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    const place = (element: HTMLDivElement, x: number, y: number): void => {
      const point = new THREE.Vector3(x, terrainHeightAt(x, y) + 2.4, y).project(this.rig.camera);
      const screenX = ((point.x + 1) / 2) * width;
      const screenY = ((1 - point.y) / 2) * height;
      element.style.left = `${screenX}px`;
      element.style.top = `${screenY}px`;
    };
    const officerId = this.callout.callout.officerId;
    if (officerId !== null && this.callout.officer) {
      const officer = frame.units.find((unit) => unit.id === officerId && unit.alive);
      if (officer) {
        place(this.callout.officer, officer.x, officer.y);
      } else {
        this.callout.officer.style.display = 'none';
      }
    }
    const troops = frame.units.filter((unit) =>
      this.callout?.callout.troopIds.includes(unit.id),
    );
    if (troops.length > 0) {
      const x = troops.reduce((sum, unit) => sum + unit.x / troops.length, 0);
      const y = troops.reduce((sum, unit) => sum + unit.y / troops.length, 0);
      place(this.callout.troop, x, y);
    }
  }
  update(frame: Frame | InterpolatedFrame): void {
    this.lastFrame = frame;
    this.covers.update(frame.covers);
    this.characters.update(frame, this.rig.span);
    this.paths.update(frame.orders, this.rig.span);
    if (frame.tick !== this.lastEventTick) {
      this.lastEventTick = frame.tick;
      for (const event of frame.events) {
        if (event.type === 'shot') {
          this.tracers.spawn(event);
        }
      }
    }
  }

  /** Nearest unit to a screen point (within 28 px) that `accept` allows. */
  pickUnit(cssX: number, cssY: number, accept?: (unit: UnitSnapshot) => boolean): number | null {
    const frame = this.lastFrame;
    if (!frame) return null;
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    const point = new THREE.Vector3();
    let best: number | null = null;
    let bestDistance = 28 * 28;
    for (const unit of frame.units) {
      if (!unit.alive || unit.routed || (accept && !accept(unit))) continue;
      point.set(unit.x, terrainHeightAt(unit.x, unit.y) + 1, unit.y).project(this.rig.camera);
      const x = ((point.x + 1) / 2) * width;
      const y = ((1 - point.y) / 2) * height;
      const distance = (x - cssX) ** 2 + (y - cssY) ** 2;
      if (distance < bestDistance) {
        bestDistance = distance;
        best = unit.id;
      }
    }
    return best;
  }

  unitsInScreenRect(
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
  ): number[] {
    const frame = this.lastFrame;
    if (!frame) return [];
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    const point = new THREE.Vector3();
    const ids: number[] = [];
    for (const unit of frame.units) {
      if (!unit.alive || unit.routed) continue;
      point.set(unit.x, terrainHeightAt(unit.x, unit.y) + 1, unit.y).project(this.rig.camera);
      const x = ((point.x + 1) / 2) * width;
      const y = ((1 - point.y) / 2) * height;
      if (x >= minX && x <= maxX && y >= minY && y <= maxY) {
        ids.push(unit.id);
      }
    }
    return ids;
  }
  /** CSS pixel position of a ground point inside the container, or null when behind the camera. */
  groundToScreen(x: number, y: number): Vec2 | null {
    const point = new THREE.Vector3(x, terrainHeightAt(x, y), y).project(this.rig.camera);
    if (point.z > 1) {
      return null;
    }
    return {
      x: ((point.x + 1) / 2) * this.container.clientWidth,
      y: ((1 - point.y) / 2) * this.container.clientHeight,
    };
  }

  screenToGround(cssX: number, cssY: number): Vec2 | null {
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    this.raycaster.setFromCamera(
      new THREE.Vector2((cssX / width) * 2 - 1, -(cssY / height) * 2 + 1),
      this.rig.camera,
    );
    const hit = new THREE.Vector3();
    if (this.terrainMesh) {
      const intersections = this.raycaster.intersectObject(this.terrainMesh);
      const terrainHit = intersections[0];
      if (terrainHit) {
        return { x: terrainHit.point.x, y: terrainHit.point.z };
      }
    }
    return this.raycaster.ray.intersectPlane(this.groundPlane, hit)
      ? { x: hit.x, y: hit.z }
      : null;
  }

  setPostStrong(strong: boolean): void {
    this.post.setStrong(strong);
  }

  dispose(): void {
    cancelAnimationFrame(this.frameHandle);
    window.removeEventListener('resize', this.resize);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.renderer.domElement.removeEventListener('wheel', this.onWheel);
    this.covers.dispose();
    this.characters.dispose();
    this.paths.dispose();
    this.tracers.dispose();
    this.preview.dispose();
    this.post.dispose();
    disposeObject(this.scene);
    this.renderer.dispose();
    this.renderer.domElement.remove();
    this.calloutRoot.remove();
  }

  private addWorld(): void {
    const terrainGeometry = new THREE.PlaneGeometry(240, 240, 120, 120);
    terrainGeometry.rotateX(-Math.PI / 2);
    const terrainPositions = terrainGeometry.attributes.position;
    if (terrainPositions) {
      const colors = new Float32Array(terrainPositions.count * 3);
      const color = new THREE.Color();
      for (let index = 0; index < terrainPositions.count; index += 1) {
        const x = terrainPositions.getX(index);
        const z = terrainPositions.getZ(index);
        terrainPositions.setY(index, terrainHeightAt(x, z));
        color.setHex(surfaceColor(terrainSurfaceAt(x, z)));
        colors[index * 3] = color.r;
        colors[index * 3 + 1] = color.g;
        colors[index * 3 + 2] = color.b;
      }
      terrainPositions.needsUpdate = true;
      terrainGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      terrainGeometry.computeVertexNormals();
    }
    const ground = new THREE.Mesh(
      terrainGeometry,
      toon({ color: 0xffffff, vertexColors: true }),
    );
    ground.name = 'sandbox-terrain';
    this.terrainMesh = ground;
    this.scene.add(ground);
  }

  private animate = (time: number): void => {
    const delta = this.lastTime === 0 ? 0 : Math.min(0.05, (time - this.lastTime) / 1000);
    this.lastTime = time;
    this.applyPan(delta);
    this.rig.update(delta);

    if (this.rig.band !== this.band) {
      this.band = this.rig.band;
      this.onBandChange?.(this.band);
    }

    if (this.lastFrame) {
      this.characters.update(this.lastFrame, this.rig.span);
      this.paths.update(this.lastFrame.orders, this.rig.span);
    }
    this.tracers.update(delta);
    this.updateCallout(time);
    this.updateBalloon();

    this.post.render(this.renderer, this.scene, this.rig.camera);
    this.frameHandle = requestAnimationFrame(this.animate);
  };

  private applyPan(delta: number): void {
    const pan = this.rig.span * 0.7 * delta;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) {
      this.rig.pan(0, -pan);
    }
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) {
      this.rig.pan(0, pan);
    }
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) {
      this.rig.pan(-pan, 0);
    }
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) {
      this.rig.pan(pan, 0);
    }
  }

  private resize = (): void => {
    const cssWidth = Math.max(1, this.container.clientWidth || 640);
    const cssHeight = Math.max(1, this.container.clientHeight || 360);
    const scale = Math.max(1, Math.round(cssHeight / INTERNAL_HEIGHT));
    const width = Math.max(1, Math.floor(cssWidth / scale));
    const height = Math.max(1, Math.floor(cssHeight / scale));
    this.renderer.setSize(width, height, false);
    this.post.setSize(width, height);
    this.rig.setAspect(width / height);
    this.rig.pixelsHigh = height;
  };

  private onKeyDown = (event: KeyboardEvent): void => {
    this.keys.add(event.code);
    if (['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.code)) {
      this.onCameraAction?.('pan');
    }
    if (event.code === 'KeyQ') {
      this.rig.rotate(-1);
      this.onCameraAction?.('rotate');
    }
    if (event.code === 'KeyE') {
      this.rig.rotate(1);
      this.onCameraAction?.('rotate');
    }
  };

  private onKeyUp = (event: KeyboardEvent): void => {
    this.keys.delete(event.code);
  };

  private onWheel = (event: WheelEvent): void => {
    event.preventDefault();
    this.rig.zoom(Math.sign(event.deltaY));
    this.onCameraAction?.('zoom');
  };
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
















function surfaceColor(surface: TerrainSurface): number {
  if (surface === 'road') return PALETTE.terrainRoad;
  if (surface === 'ridge') return PALETTE.terrainAlt;
  if (surface === 'trench') return PALETTE.terrainTrench;
  if (surface === 'crater') return PALETTE.terrainCrater;
  return PALETTE.terrain;
}





















