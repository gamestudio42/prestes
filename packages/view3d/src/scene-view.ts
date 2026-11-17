import * as THREE from 'three';
import {
  GUNS,
  SANDBOX_TERRAIN,
  TRAINING_TERRAIN,
  setActiveTerrain,
  setActiveMap,
  setActiveMapRuntime,
  battleMap,
  type BattleMap,
  type BattleMapId,
  groundHeightAt,
  terrainHeightAt,
  terrainSurfaceAt,
  type TerrainSurface,
  type Frame,
  type InterpolatedFrame,
  type Vec2,
  type PreviewPlan,
  type SlotMarker,
  type ProtectionClass,
  type UnitSnapshot,
  type FogExtras,
  type MapLight } from '@prestes/shared';
import { CameraRig, STRATEGIC_TILT, TACTICAL_SPAN, shakeStrength, type CameraBand } from './camera-rig';
import { CharacterLayer } from './character-layer';
import { CoverLayer } from './cover-layer';
import { CoverMapLayer } from './cover-map-layer';
import { EffectsLayer } from './effects-layer';
import { MarkerLayer } from './marker-layer';
import { GarrisonLayer, type AssaultBarsState, type GarrisonBannerState } from './garrison-layer';
import { ObjectiveLayer, type ObjectiveMark } from './objective-layer';
import { loadEnvironmentAsset, type EnvironmentAsset } from './environment-models';
import { GROUND_ATLAS_URL } from './battle-assets';
import { PaintedGround, type GroundOverlay } from './painted-ground';
import { terrainGradient, toon, toonGradient } from './materials';
import { PALETTE } from './palette';
import { sunForMap } from './map-light';
import { PathLayer, selectedOrders } from './path-layer';
import { PixelPost } from './post';
import { PreviewLayer } from './preview-layer';
import { TracerLayer, tracerKind } from './tracer-layer';
import { TrainingLayer, type TrainingMarker } from './training-layer';
import { WorldLayer } from './world-layer';
import { BattleMapLayer, STRATEGIC_PLANT_SPAN } from './battle-map-layer';
import { DeploymentAreasLayer, DeploymentLayer, type DeploymentLabels } from './deployment-layer';
import { ExitLayer } from './exit-layer';


export interface OrderCallout {
  officerId: number | null;
  troopIds: readonly number[];
  officerText: string;
  troopText: string;
}

/** add-deployment-phase D5: a piece's slot count over the ground. */
export interface SlotBadge {
  x: number;
  y: number;
  text: string;
}


export interface SceneViewOptions {
  container: HTMLElement;
  onBandChange?: (band: CameraBand) => void;
  trainingField?: boolean;
  strategicField?: boolean;
  /** How far out the view may zoom, as a share of the map's extent (the editor sees whole hills from further out). */
  maxSpanFactor?: number;
  /** add-battle-maps: the 3v3's map; the Vila Militar field when absent. The editor passes the map itself. */
  battleMap?: BattleMapId | BattleMap;
  onCameraAction?: (kind: 'pan' | 'zoom' | 'rotate') => void;
  /** refine-map-editor D4: smooth edges (MSAA), fixed for the view's life. */
  antialias?: boolean;
}

/** Samples of the scene's target when edges are smoothed. */
const MSAA_SAMPLES = 4;

const INTERNAL_HEIGHT = 300;

/** The commander's current order shown over the officer. */
export interface CommanderBalloon {
  officerId: number;
  text: string;
}

/** A battle map's fences the world layer draws as posts and wire; board fences are the map layer's. */
function wireFences(map: BattleMap): BattleMap['fences'] {
  return map.fenceStyle === 'boards' ? [] : map.fences;
}

export class SceneView {
  private readonly container: HTMLElement;
  private readonly maxSpanFactor: number;
  private readonly onBandChange?: (band: CameraBand) => void;
  private readonly onCameraAction?: (kind: 'pan' | 'zoom' | 'rotate') => void;
  private readonly renderer: THREE.WebGLRenderer;
  private readonly scene: THREE.Scene;
  private readonly rig = new CameraRig(0, 4);
  private lastShakeTick = -1;
  private terrainMesh: THREE.Object3D | null = null;
  private sun: THREE.DirectionalLight | null = null;
  /** add-map-editor: the painted ground of an authored map. */
  private paintedGround: PaintedGround | null = null;
  private readonly post: PixelPost;
  private readonly covers = new CoverLayer();
  private readonly characters = new CharacterLayer();
  private readonly paths = new PathLayer();
  private readonly tracers = new TracerLayer();
  private readonly viewDirection = new THREE.Vector3();
  private readonly effects = new EffectsLayer();
  private readonly markers = new MarkerLayer();
  private readonly garrisonLayer = new GarrisonLayer();
  private readonly objectiveLayer = new ObjectiveLayer();
  private readonly preview = new PreviewLayer();
  private battleMap: BattleMap | null;
  private mapLayer: BattleMapLayer | null = null;
  /** redo-battle-hud D6: the strategic cover layer, built the first time it is shown. */
  private coverMap: CoverMapLayer | null = null;
  private coverMapOn = false;
  /** refine-battle-maps 6.2: the opening deployment marks (a battle only, never the editor). */
  private deployment: DeploymentLayer | null = null;
  private slotMarkerCount = 0;
  private slotBadgeLabels: { badge: SlotBadge; element: HTMLDivElement }[] = [];
  /** add-deployment-phase 3.1: the deployment areas, while the phase lasts. */
  private deploymentAreas: DeploymentAreasLayer | null = null;
  /** add-withdrawal-exits 7.1: the column's exits (maps with a withdrawal). */
  private exitLayer: ExitLayer | null = null;
  /** The battle's map for the deployment areas: any battle map, the Vila Militar field included. */
  private areasMap: BattleMap | null = null;
  private environment: EnvironmentAsset | null = null;
  private readonly training = new TrainingLayer();
  private world: WorldLayer;
  private disposed = false;
  private selectedUnits: readonly number[] = [];
  /** garrison-and-assault 4.1: the ring Sair's point must fall in. */
  private readonly rangeRoot = new THREE.Group();
  private rangeRing: { x: number; y: number; radius: number } | null = null;
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

  /** Whether edges are smoothed: the context's antialias flag and the scene target's samples. */
  smoothEdges(): { antialias: boolean; samples: number } {
    return { antialias: this.renderer.getContextAttributes()?.antialias === true, samples: this.post.target.samples };
  }

  constructor(options: SceneViewOptions) {
    this.maxSpanFactor = options.maxSpanFactor ?? 1.1;
    this.container = options.container;
    this.onBandChange = options.onBandChange;
    this.onCameraAction = options.onCameraAction;

    const antialias = options.antialias ?? false;
    this.renderer = new THREE.WebGLRenderer({ antialias, alpha: false });
    this.post = new PixelPost(antialias ? MSAA_SAMPLES : 0);
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
    this.sun = sun;

    // The training ground has its own terrain and countryside; a battle map
    // (add-battle-maps) its heightfield, water, crops and buildings.
    const map =
      options.battleMap && !options.trainingField
        ? typeof options.battleMap === 'object'
          ? options.battleMap
          : battleMap(options.battleMap)
        : null;
    this.battleMap = map && map.height.kind === 'field' ? map : null;
    this.areasMap = map;
    if (this.battleMap) {
      setActiveMap(this.battleMap);
      this.mapLayer = new BattleMapLayer(this.battleMap);
    } else {
      setActiveTerrain(options.trainingField ? TRAINING_TERRAIN : SANDBOX_TERRAIN);
      setActiveMapRuntime(null);
    }
    this.world = new WorldLayer(
      options.trainingField ? 'training' : this.battleMap ? 'battle' : 'sandbox',
      this.battleMap ? wireFences(this.battleMap) : [],
    );
    this.characters.loadModels();
    this.loadEnvironment();
    this.effects.load();
    this.addWorld();
    if (options.trainingField) {
      this.scene.add(this.training.group);
    }
    if (this.mapLayer) {
      this.scene.add(this.mapLayer.group);
    }
    this.scene.add(
      this.world.group,
      this.covers.group,
      this.characters.group,
      this.paths.group,
      this.tracers.group,
      this.effects.group,
      this.markers.group,
      this.garrisonLayer.group,
      this.objectiveLayer.group,
      this.preview.group,
      this.rangeRoot,
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
    if (this.battleMap) {
      // refine-battle-maps 6.1: open at tactical span on the first section;
      // Home frames the whole map.
      const first = this.battleMap.deployment.column.sections[0];
      if (first) {
        this.rig.focusX = first.x;
        this.rig.focusY = first.y;
      }
      this.rig.span = TACTICAL_SPAN;
      this.rig.targetSpan = TACTICAL_SPAN;
    }
    this.resize();
    this.rig.update(0);
    window.addEventListener('resize', this.resize);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
    this.renderer.domElement.addEventListener('wheel', this.onWheel, { passive: false });
    this.animate(0);
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

  setSlotMarkers(markers: readonly (SlotMarker & { protects?: ProtectionClass })[]): void {
    this.preview.setSlotMarkers(markers);
    this.slotMarkerCount = markers.length;
  }

  /**
   * add-deployment-phase D5: a count badge per cover piece near the cursor
   * (its free slots of all), placed over the ground each frame.
   */
  setSlotBadges(badges: readonly SlotBadge[]): void {
    for (const label of this.slotBadgeLabels) label.element.remove();
    this.slotBadgeLabels = badges.map((badge) => {
      const element = document.createElement('div');
      element.className = 'slot-badge';
      element.dataset.testid = 'slot-badge';
      element.textContent = badge.text;
      element.style.position = 'absolute';
      element.style.display = 'none';
      this.calloutRoot.append(element);
      return { badge, element };
    });
  }

  /** What the deployment preview shows (the test bridge). */
  /** garrison-and-assault 4.1: a ring on the ground (Sair's 30 m around the position), or none. */
  setRangeRing(ring: { x: number; y: number; radius: number } | null): void {
    if (ring?.x === this.rangeRing?.x && ring?.y === this.rangeRing?.y && ring?.radius === this.rangeRing?.radius) return;
    this.rangeRing = ring;
    for (const child of this.rangeRoot.children) {
      if (child instanceof THREE.Line) {
        child.geometry.dispose();
        (child.material as THREE.Material).dispose();
      }
    }
    this.rangeRoot.clear();
    if (!ring) return;
    const points: THREE.Vector3[] = [];
    const segments = 64;
    for (let index = 0; index <= segments; index += 1) {
      const angle = (index / segments) * Math.PI * 2;
      const x = ring.x + Math.cos(angle) * ring.radius;
      const z = ring.y + Math.sin(angle) * ring.radius;
      points.push(new THREE.Vector3(x, terrainHeightAt(x, z) + 0.15, z));
    }
    const line = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(points),
      new THREE.LineBasicMaterial({ color: 0xe0b85a, transparent: true, opacity: 0.85, depthWrite: false }),
    );
    line.name = 'range-ring';
    this.rangeRoot.add(line);
  }

  rangeRingState(): { x: number; y: number; radius: number } | null {
    return this.rangeRing ? { ...this.rangeRing } : null;
  }

  slotPreviewState(): { markers: number; badges: string[] } {
    return { markers: this.slotMarkerCount, badges: this.slotBadgeLabels.map((label) => label.badge.text) };
  }

  private placeSlotBadges(): void {
    for (const { badge, element } of this.slotBadgeLabels) {
      const screen = this.groundToScreen(badge.x, badge.y);
      element.style.display = screen ? '' : 'none';
      if (screen) {
        element.style.left = `${screen.x}px`;
        element.style.top = `${screen.y}px`;
      }
    }
  }

  /** Shows or hides the movement routes of orders (the player's choice). */
  setRoutesVisible(visible: boolean): void {
    this.paths.group.visible = visible;
  }

  /** A soldier's animation state (dev checks). */
  clipState(unitId: number) {
    return this.characters.clipState(unitId);
  }

  weaponState(unitId: number) {
    return this.characters.weaponState(unitId);
  }

  /** fog-of-war: the units the view is drawing, by id (dev checks). */
  shownUnitIds(): number[] {
    return this.lastFrame?.units.map((unit) => unit.id) ?? [];
  }

  /** Live effect particles and whether the sheet is loaded (dev checks). */
  effectsState(): { count: number; ready: boolean; tracers: number; markers: number } {
    return { count: this.effects.count, ready: this.effects.ready, tracers: this.tracers.count, markers: this.markers.count };
  }

  /**
   * The ground point the camera looks at, the metres across the view, and
   * the screen's rightward direction on the ground (a unit vector), which
   * the sound pans by (ambient-sound-and-voices 1.2).
   */
  view(): { x: number; y: number; span: number; right: Vec2 } {
    const m = this.rig.camera.matrixWorld.elements;
    const length = Math.hypot(m[0]!, m[2]!) || 1;
    return { x: this.rig.focusX, y: this.rig.focusY, span: this.rig.span, right: { x: m[0]! / length, y: m[2]! / length } };
  }

  /** add-historical-commander 3.2: the pennant over the map's historical figure is drawn (dev checks). */
  figurePennantShown(): boolean {
    return this.characters.figurePennantShown();
  }

  /** garrison-and-assault 1.4: barrels out of windows and markers over raised floors drawn now (dev checks). */
  garrisonMarks(): { barrels: number; elevated: number; banners: GarrisonBannerState[]; arrows: number; assaults: AssaultBarsState[] } {
    return {
      barrels: this.characters.barrelCount(),
      elevated: this.characters.elevatedMarkerCount(),
      banners: this.garrisonLayer.shown.map((banner) => ({ ...banner })),
      arrows: this.garrisonLayer.arrowCount,
      assaults: this.garrisonLayer.assaultBars.map((bars) => ({ ...bars })),
    };
  }

  /** add-map-objectives 3.1: the flags, owners and capture drawn now (dev checks and screenshots). */
  objectiveMarks(): ObjectiveMark[] {
    return this.objectiveLayer.marks.map((mark) => ({ ...mark }));
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
    this.mapLayer?.update(frame.ferries);
    this.covers.update(frame.covers);
    this.characters.update(frame, this.rig.span, { x: this.rig.focusX, y: this.rig.focusY });
    // fog-of-war: the fogged frame carries the ghosts and the "?" markers.
    const fogged = frame as (Frame | InterpolatedFrame) & FogExtras;
    this.characters.updateGhosts(fogged.ghosts ?? [], this.rig.span);
    this.markers.update(fogged.markers ?? [], frame.tick, this.rig.span);
    // scrub-concealment-and-area-fire: the discs the player's men fire into.
    this.markers.updateAreaFire(frame.units);
    this.garrisonLayer.update((frame as Frame).garrisons ?? [], frame.units, this.selectedUnits, this.rig.span, (frame as Frame).assaults ?? []);
    this.objectiveLayer.update(frame, this.rig.span);
    this.paths.update(selectedOrders(frame.orders, this.selectedUnits), this.rig.span);
    if (frame.tick !== this.lastEventTick) {
      this.lastEventTick = frame.tick;
      // machine-gun-fire-feedback 5.1: every round draws its tracer, styled by the shooter's weapon.
      const weapons = new Map(frame.units.map((unit) => [unit.id, unit.weaponId]));
      // garrison-and-assault 4.7: a shot from an upper window leaves from that floor.
      const raised = new Map(frame.units.filter((unit) => unit.elevation).map((unit) => [unit.id, unit.elevation!]));
      for (const event of frame.events) {
        if (event.type === 'shot') {
          this.tracers.spawn(
            event,
            tracerKind(weapons.get(event.source), event),
            raised.get(event.source) ?? 0,
            raised.get(event.target) ?? 0,
            this.characters.windowMuzzleHeight(event.source),
            this.characters.windowMuzzleHeight(event.target),
          );
        }
      }
    }
    this.effects.onFrame(frame, (unitId) => this.characters.windowMuzzleHeight(unitId));
    // add-artillery-bombardment 3.3: a burst near the view's focus shakes it.
    if (frame.tick !== this.lastShakeTick) {
      this.lastShakeTick = frame.tick;
      for (const event of frame.events) {
        if (event.type !== 'shell_impact') continue;
        const distance = Math.hypot(event.x - this.rig.focusX, event.y - this.rig.focusY);
        this.rig.kick(shakeStrength(distance, GUNS[event.gun].burstScale));
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
      const intersections = this.raycaster.intersectObject(this.terrainMesh, true);
      const terrainHit = intersections[0];
      if (terrainHit) {
        return { x: terrainHit.point.x, y: terrainHit.point.z };
      }
    }
    return this.raycaster.ray.intersectPlane(this.groundPlane, hit)
      ? { x: hit.x, y: hit.z }
      : null;
  }

  /**
   * hud-icons-and-cursors: the building under a screen point, its walls or
   * roof, nearest the camera; null over open ground. The ray is sampled up
   * the building's height (the roof counted as a box), so a click on a roof
   * means that building, not the ground behind it.
   */
  pickBuilding(
    cssX: number,
    cssY: number,
    buildings: readonly { id: number; x: number; y: number; rotation: number; halfWidth: number; halfDepth: number; height: number }[],
  ): { id: number; point: Vec2 } | null {
    if (buildings.length === 0) return null;
    const width = Math.max(1, this.container.clientWidth);
    const height = Math.max(1, this.container.clientHeight);
    this.raycaster.setFromCamera(new THREE.Vector2((cssX / width) * 2 - 1, -(cssY / height) * 2 + 1), this.rig.camera);
    const { origin, direction } = this.raycaster.ray;
    if (Math.abs(direction.y) < 1e-4) return null;
    let best: { id: number; point: Vec2 } | null = null;
    let bestT = Number.POSITIVE_INFINITY;
    for (const building of buildings) {
      const base = terrainHeightAt(building.x, building.y);
      // Height is the eaves' or the ridge's by model; a box a little taller covers the roof.
      const top = building.height * 1.15;
      const cos = Math.cos(building.rotation);
      const sin = Math.sin(building.rotation);
      for (let rise = top; rise >= 0; rise -= 0.25) {
        const t = (base + rise - origin.y) / direction.y;
        if (t <= 0 || t >= bestT) continue;
        const dx = origin.x + direction.x * t - building.x;
        const dy = origin.z + direction.z * t - building.y;
        const localX = dx * cos + dy * sin;
        const localY = -dx * sin + dy * cos;
        if (Math.abs(localX) <= building.halfWidth && Math.abs(localY) <= building.halfDepth) {
          bestT = t;
          best = { id: building.id, point: { x: building.x, y: building.y } };
          break;
        }
      }
    }
    return best;
  }

  setPostStrong(strong: boolean): void {
    this.post.setStrong(strong);
  }

  /**
   * Places the Blender environment when it arrives. If it fails, the field
   * keeps its terrain and the sandbox's procedural pieces, without covers,
   * buildings, trees or props.
   */
  private loadEnvironment(): void {
    loadEnvironmentAsset()
      .then((asset) => {
        if (this.disposed) return;
        this.environment = asset;
        this.world.useModels(asset);
        this.useMapModels();
        this.covers.useModels(asset);
        this.training.useModels(asset);
      })
      .catch((error: unknown) => {
        console.error('environment models unavailable, the field is drawn without them', error);
      });
  }

  /**
   * biome-trees-and-plants 4.1: places the battle map's models once the
   * biome tree files its species need are in (each fetched once); a map that
   * holds only caatinga plants never asks for the other biomes' files.
   */
  private useMapModels(): void {
    const asset = this.environment;
    const layer = this.mapLayer;
    if (!asset || !layer) return;
    const files = layer.modelFiles();
    if (asset.has(files)) {
      layer.useModels(asset);
      return;
    }
    asset
      .include(files)
      .catch((error: unknown) => console.error('biome tree models unavailable, those trees are not drawn', error))
      .finally(() => {
        if (!this.disposed && this.mapLayer === layer) layer.useModels(asset);
      });
  }

  /**
   * biome-trees-and-plants 4.1b (D5d): the crowns over the player's men fade
   * and a man still hidden keeps his outline. Only the column's men count
   * (the player's side, as the fog view's): the fogged frame never holds an
   * enemy the player cannot see, and his crowns stay solid anyway.
   */
  private updateCanopy(delta: number): void {
    const layer = this.mapLayer;
    if (!layer || !this.lastFrame || this.rig.span > STRATEGIC_PLANT_SPAN) {
      this.characters.updateCanopyOutlines([], this.rig.span);
      return;
    }
    // Scratch arrays reused every frame: no allocation in the render loop.
    const men = this.canopyMen;
    const chests = this.canopyChests;
    men.length = 0;
    chests.length = 0;
    for (const unit of this.lastFrame.units) {
      if (unit.faction !== 'column' || !unit.alive || unit.routed) continue;
      const index = men.push(unit) - 1;
      const chest = (this.canopyChestPool[index] ??= new THREE.Vector3());
      chests.push(chest.set(unit.x, terrainHeightAt(unit.x, unit.y) + 1.2, unit.y));
    }
    const hidden = layer.canopy.update(this.rig.camera.getWorldDirection(this.canopyView), chests, delta);
    const outlined = this.canopyOutlined;
    outlined.length = 0;
    for (const index of hidden) outlined.push(men[index]!);
    this.characters.updateCanopyOutlines(outlined, this.rig.span);
  }

  private readonly canopyView = new THREE.Vector3();
  private readonly canopyChestPool: THREE.Vector3[] = [];
  private readonly canopyChests: THREE.Vector3[] = [];
  private readonly canopyMen: { x: number; y: number }[] = [];
  private readonly canopyOutlined: { x: number; y: number }[] = [];

  /** biome-trees-and-plants 4.1b: crowns faded over the player's men, and outlines drawn (dev checks). */
  canopyState(): { faded: number; outlines: number } {
    const faded = this.mapLayer?.canopy.fades().filter((crown) => crown.fade > 0.5).length ?? 0;
    return { faded, outlines: this.characters.canopyOutlineCount() };
  }

  // --- add-map-editor: what the editor drives -------------------------------

  /** The 3D scene, for the editor's own layer (cursor, gizmos, labels). */
  get editorScene(): THREE.Scene {
    return this.scene;
  }

  get camera(): CameraRig {
    return this.rig;
  }

  /**
   * Replaces the battle map: its ground, countryside and fences. The camera
   * stays where it is. The map must be the active one (setActiveMap).
   */
  replaceBattleMap(map: BattleMap): void {
    if (this.mapLayer) {
      this.scene.remove(this.mapLayer.group);
      disposeObject(this.mapLayer.group);
    }
    this.battleMap = map;
    this.areasMap = map;
    if (this.coverMap) {
      this.scene.remove(this.coverMap.group);
      this.coverMap.dispose();
      this.coverMap = null;
      if (this.coverMapOn) this.setCoverMap(true);
    }
    this.mapLayer = new BattleMapLayer(map);
    this.useMapModels();
    this.scene.add(this.mapLayer.group);
    this.scene.remove(this.world.group);
    disposeObject(this.world.group);
    this.world = new WorldLayer('battle', wireFences(map));
    if (this.environment) this.world.useModels(this.environment);
    this.scene.add(this.world.group);
    if (this.paintedGround && map.paint && this.paintedGround.side === Math.round(map.bounds.maxX - map.bounds.minX)) {
      this.paintedGround.setPaint(map.paint);
      this.paintedGround.updateHeights(groundHeightAt);
      // author-game-maps 4.3: a light change (or its undo) re-aims the sun.
      this.aimSun(map);
    } else {
      if (this.terrainMesh) {
        this.scene.remove(this.terrainMesh);
        disposeObject(this.terrainMesh);
      }
      this.paintedGround?.dispose();
      this.paintedGround = null;
      this.terrainMesh = null;
      this.addWorld();
    }
  }

  /** Re-reads ground heights in `box` from `height` (the editor's live stroke). */
  updateGroundHeights(height: (x: number, z: number) => number, box?: { minX: number; minY: number; maxX: number; maxY: number }): void {
    this.paintedGround?.updateHeights(height, box);
  }

  setGroundPaint(paint: Uint8Array): void {
    this.paintedGround?.setPaint(paint);
  }

  setGroundOverlay(overlay: GroundOverlay): void {
    this.paintedGround?.setOverlay(overlay);
  }

  /**
   * redo-battle-hud D6: the cover layer (slots by what they protect, the
   * vegetation hatch), drawn from the map alone. A battle map only.
   */
  setCoverMap(on: boolean): void {
    this.coverMapOn = on;
    if (on && !this.coverMap && this.battleMap) {
      this.coverMap = new CoverMapLayer(this.battleMap);
      this.scene.add(this.coverMap.group);
    }
    this.coverMap?.setVisible(on);
  }

  /** redo-battle-hud: what the strategic layers show, for the e2e checks. */
  mapLayersState(): { contours: boolean; cover: boolean; coverSlots: number } {
    return {
      contours: this.paintedGround?.overlay() === 'contours',
      cover: this.coverMapOn && this.coverMap !== null,
      coverSlots: this.coverMapOn ? (this.coverMap?.slots() ?? 0) : 0,
    };
  }

  setGroundGrid(spacing: number): void {
    this.paintedGround?.setGrid(spacing);
  }

  /** refine-battle-maps 6.3: the camera square to the map's edges (no 45 degree turn), for a preview. */
  squareOn(): void {
    this.rig.yaw = 0;
    this.rig.targetYaw = 0;
  }

  /** The editor's top-down mode: the camera looks straight down at every zoom. */
  setTopDown(topDown: boolean): void {
    this.rig.tiltOverride = topDown ? STRATEGIC_TILT : null;
  }

  /**
   * refine-battle-maps 6.2: marks the two deployment zones for the first 10 s,
   * with these (localized) labels; a later call only renames them.
   */
  setDeploymentLabels(labels: DeploymentLabels): void {
    if (!this.battleMap) return;
    if (!this.deployment) {
      this.deployment = new DeploymentLayer(this.battleMap, this.calloutRoot, terrainHeightAt);
      this.scene.add(this.deployment.group);
    }
    this.deployment.setLabels(labels);
  }

  /** add-withdrawal-exits 7.1: the battle map's withdrawal, if any. */
  mapWithdrawal(): BattleMap['withdrawal'] {
    return this.battleMap?.withdrawal;
  }

  /** add-withdrawal-exits 7.1: draws the map's exits (once) and names them in the player's language. */
  setExitNames(names: ReadonlyMap<number, string>): void {
    const exits = this.battleMap?.withdrawal?.exits;
    if (!this.battleMap || !exits || exits.length === 0) return;
    if (!this.exitLayer) {
      this.exitLayer = new ExitLayer(exits, this.battleMap.bounds, this.calloutRoot, terrainHeightAt);
      this.scene.add(this.exitLayer.group);
    }
    this.exitLayer.setNames(names);
  }

  /** add-deployment-phase 3.1: shows the two deployment areas (the phase) or takes them away. */
  setDeploymentAreas(shown: boolean): void {
    if (shown && !this.deploymentAreas && this.areasMap) {
      this.deploymentAreas = new DeploymentAreasLayer(this.areasMap, terrainHeightAt);
      this.scene.add(this.deploymentAreas.group);
    } else if (!shown && this.deploymentAreas) {
      this.scene.remove(this.deploymentAreas.group);
      this.deploymentAreas.dispose();
      this.deploymentAreas = null;
    }
  }

  /** Whether the deployment areas are drawn. */
  deploymentAreasShown(): boolean {
    return this.deploymentAreas !== null;
  }

  /** Whether the opening deployment marks are up. */
  deploymentMarksShown(): boolean {
    return this.deployment?.shown ?? false;
  }

  /** Frames the whole battle map. */
  frameMap(): void {
    if (!this.battleMap) return;
    const { minX, minY, maxX, maxY } = this.battleMap.bounds;
    this.rig.focusX = (minX + maxX) / 2;
    this.rig.focusY = (minY + maxY) / 2;
    this.rig.maxSpan = Math.max(this.rig.maxSpan, (maxY - minY) * this.maxSpanFactor);
    this.rig.targetSpan = Math.min(this.rig.maxSpan, (maxY - minY) * 1.05);
  }

  /** Centres the camera on a point (the editor's problem list). */
  centreOn(x: number, y: number): void {
    this.rig.focusX = x;
    this.rig.focusY = y;
  }

  dispose(): void {
    this.disposed = true;
    this.paintedGround?.dispose();
    cancelAnimationFrame(this.frameHandle);
    window.removeEventListener('resize', this.resize);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
    this.renderer.domElement.removeEventListener('wheel', this.onWheel);
    this.deployment?.dispose();
    this.exitLayer?.dispose();
    this.deploymentAreas?.dispose();
    this.coverMap?.dispose();
    for (const label of this.slotBadgeLabels) label.element.remove();
    this.covers.dispose();
    this.characters.dispose();
    this.paths.dispose();
    this.tracers.dispose();
    this.effects.dispose();
    this.markers.dispose();
    this.garrisonLayer.dispose();
    this.objectiveLayer.dispose();
    this.preview.dispose();
    this.post.dispose();
    disposeObject(this.scene);
    this.renderer.dispose();
    this.renderer.domElement.remove();
    this.calloutRoot.remove();
  }

  private addWorld(): void {
    const bounds = this.battleMap?.bounds;
    if (this.battleMap?.paint && bounds) {
      // add-map-editor: an authored map's painted ground.
      this.paintedGround = new PaintedGround(bounds, this.battleMap.paint, groundHeightAt, GROUND_ATLAS_URL);
      this.terrainMesh = this.paintedGround.group;
      this.scene.add(this.paintedGround.group);
      this.aimSun(this.battleMap);
      return;
    }
    const width = bounds ? bounds.maxX - bounds.minX : 240;
    const depth = bounds ? bounds.maxY - bounds.minY : 240;
    // A battle map's ground follows its 2 m heightfield.
    const terrainGeometry = new THREE.PlaneGeometry(width, depth, width / 2, depth / 2);
    terrainGeometry.rotateX(-Math.PI / 2);
    if (bounds) terrainGeometry.translate((bounds.minX + bounds.maxX) / 2, 0, (bounds.minY + bounds.maxY) / 2);
    const palette = this.battleMap?.palette;
    const terrainPositions = terrainGeometry.attributes.position;
    if (terrainPositions) {
      const colors = new Float32Array(terrainPositions.count * 3);
      const color = new THREE.Color();
      for (let index = 0; index < terrainPositions.count; index += 1) {
        const x = terrainPositions.getX(index);
        const z = terrainPositions.getZ(index);
        terrainPositions.setY(index, groundHeightAt(x, z));
        color.setHex(surfaceColor(terrainSurfaceAt(x, z), palette));
        colors[index * 3] = color.r;
        colors[index * 3 + 1] = color.g;
        colors[index * 3 + 2] = color.b;
      }
      terrainPositions.needsUpdate = true;
      terrainGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      terrainGeometry.computeVertexNormals();
      if (bounds && this.battleMap) hillshade(terrainGeometry, sunForMap(this.battleMap, SUN_BY_PALETTE, PALETTE.sun).position);
    }
    const ground = new THREE.Mesh(
      terrainGeometry,
      // refine-battle-maps 5.9: smooth normals (shared vertices) under a soft, six-step ramp.
      toon({ color: 0xffffff, vertexColors: true, gradientMap: bounds ? terrainGradient() : toonGradient() }),
    );
    if (bounds && this.battleMap) this.aimSun(this.battleMap);
    ground.name = 'sandbox-terrain';
    this.terrainMesh = ground;
    this.scene.add(ground);
  }

  /**
   * author-game-maps 4.3: the editor's live preview of a light (null: back to
   * the map's own). add-map-compass: `north` previews the map's north too.
   */
  previewLight(light: MapLight | null, north?: number): void {
    if (!this.battleMap) return;
    const map = light ? { ...this.battleMap, light } : this.battleMap;
    this.aimSun(north === undefined ? map : { ...map, north });
  }

  /** add-map-compass: the shown map's true north, degrees clockwise from the grid's top edge. */
  mapNorth(): number {
    return this.battleMap?.north ?? 0;
  }

  /** author-game-maps 4.3: where the sun stands now (tests read it through the editor bridge). */
  sunPosition(): [number, number, number] | null {
    return this.sun ? [this.sun.position.x, this.sun.position.y, this.sun.position.z] : null;
  }

  /** refine-battle-maps 5.9, author-game-maps 5.1: the sun from the map's light, else its palette's. */
  private aimSun(map: BattleMap): void {
    if (!this.sun) return;
    const look = sunForMap(map, SUN_BY_PALETTE, PALETTE.sun);
    this.sun.position.set(...look.position);
    this.sun.intensity = look.intensity;
    this.sun.color.setHex(look.color);
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
      this.paths.update(selectedOrders(this.lastFrame.orders, this.selectedUnits), this.rig.span);
    }
    const camera = this.rig.camera;
    const metresHigh = (camera.top - camera.bottom) / camera.zoom;
    this.tracers.setView(camera.getWorldDirection(this.viewDirection), metresHigh / Math.max(1, this.post.target.height));
    this.tracers.update(delta);
    this.mapLayer?.tick(time / 1000, this.rig.span);
    this.updateCanopy(delta);
    this.objectiveLayer.tick(time / 1000);
    // The marks' 10 s run from the battle's first frame.
    if (this.deployment && this.deploymentAreas) this.deployment.hold();
    if (this.deployment && this.lastFrame) this.deployment.update(time, (x, y) => this.groundToScreen(x, y));
    this.exitLayer?.update((x, y) => this.groundToScreen(x, y));
    if (this.slotBadgeLabels.length > 0) this.placeSlotBadges();
    this.effects.update(this.lastFrame, delta, this.post.target.height / Math.max(1, metresHigh));
    this.updateCallout(time);
    this.updateBalloon();

    this.post.render(this.renderer, this.scene, this.rig.camera);
    this.frameHandle = requestAnimationFrame(this.animate);
  };

  /**
   * author-game-maps: the view as the player framed it, as a square PNG data
   * URL of `size` pixels (the centre of the view, cropped). Renders a frame
   * first so the drawing buffer holds it when it is read. `decorate` draws
   * on the picture before it is encoded, told the metres per picture pixel.
   */
  snapshot(size = 256, decorate?: (context: CanvasRenderingContext2D, metresPerPixel: number) => void): string {
    this.post.render(this.renderer, this.scene, this.rig.camera);
    const source = this.renderer.domElement;
    const side = Math.min(source.width, source.height);
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext('2d')!;
    context.imageSmoothingEnabled = false;
    context.drawImage(source, (source.width - side) / 2, (source.height - side) / 2, side, side, 0, 0, size, size);
    // The orthographic view spans `span` metres over the canvas height; across the
    // screen that holds at any tilt, so a horizontal scale bar is exact.
    decorate?.(context, ((this.rig.span / source.height) * side) / size);
    return canvas.toDataURL('image/png');
  }

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
    if (event.code === 'Home' && this.battleMap) {
      this.frameMap();
      this.onCameraAction?.('zoom');
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

/** Disposes an object's own geometries and materials; the shared, cached ones (`userData.shared`) are reused by the next map. */
function disposeObject(object: THREE.Object3D): void {
  const own = (resource: { userData: Record<string, unknown>; dispose: () => void }) => {
    if (!resource.userData.shared) resource.dispose();
  };
  object.traverse((child) => {
    const mesh = child as THREE.Mesh;
    if (mesh.geometry) own(mesh.geometry);
    const material = mesh.material;
    if (Array.isArray(material)) material.forEach(own);
    else if (material) own(material);
  });
}
















/**
 * refine-battle-maps 5.9: the sun per map palette (direction from the
 * ground, intensity). The cerrado's sun is strong and low enough from the
 * east that its hill masses read; the town's is low from the west so the
 * streets fall in shade; the farmland's is in between.
 */
export const SUN_BY_PALETTE: Readonly<Record<BattleMap['palette'], { position: [number, number, number]; intensity: number }>> = {
  temperate: { position: [50, 62, 34], intensity: 1.6 },
  cerrado: { position: [60, 58, 34], intensity: 1.8 },
  caatinga: { position: [52, 66, 30], intensity: 1.9 },
  urban: { position: [-60, 52, 26], intensity: 1.5 },
};

/**
 * refine-battle-maps 5.9: a hillshade baked into the ground's colours. The
 * scene's ambient and sky light are strong, so on a 10 to 15 degree slope the
 * sun alone barely changes the toon step and a hill mass reads flat. Each
 * vertex is lightened toward the sun and darkened away from it, against
 * level ground, in soft steps of 6 %.
 */
export function hillshade(geometry: THREE.BufferGeometry, sun: readonly [number, number, number]): void {
  const normals = geometry.attributes.normal;
  const colors = geometry.attributes.color;
  if (!normals || !colors) return;
  const light = new THREE.Vector3(...sun).normalize();
  const level = light.y;
  for (let index = 0; index < normals.count; index += 1) {
    const facing = normals.getX(index) * light.x + normals.getY(index) * light.y + normals.getZ(index) * light.z;
    const raw = Math.min(1.16, Math.max(0.7, 1 + 2.4 * (facing - level)));
    const shade = Math.round(raw / 0.06) * 0.06;
    colors.setXYZ(index, colors.getX(index) * shade, colors.getY(index) * shade, colors.getZ(index) * shade);
  }
  colors.needsUpdate = true;
}

function surfaceColor(surface: TerrainSurface, palette?: BattleMap['palette']): number {
  if (surface === 'road') return PALETTE.terrainRoad;
  if (surface === 'pasture') return palette === 'cerrado' ? PALETTE.cerrado : PALETTE.pasture;
  if (surface === 'grass') return palette === 'cerrado' ? PALETTE.pastureDry : PALETTE.terrain;
  if (surface === 'dirt-road') return PALETTE.dirtRoad;
  if (surface === 'cobbles') return PALETTE.cobbles;
  if (surface === 'floor') return PALETTE.floor;
  if (surface === 'mud') return PALETTE.mud;
  if (surface === 'crop') return PALETTE.fieldSoil;
  if (surface === 'tall-grass') return PALETTE.capim;
  if (surface === 'scrub' || surface === 'thorns') return PALETTE.cerrado;
  if (surface === 'ford' || surface === 'water') return PALETTE.riverbed;
  if (surface === 'trench-floor') return PALETTE.terrainTrench;
  if (surface === 'bridge') return PALETTE.riverbed;
  if (surface === 'ridge') return PALETTE.terrainAlt;
  if (surface === 'trench') return PALETTE.terrainTrench;
  if (surface === 'crater') return PALETTE.terrainCrater;
  return PALETTE.terrain;
}

