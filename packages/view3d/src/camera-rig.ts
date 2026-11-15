import * as THREE from 'three';

export type CameraBand = 'tactical' | 'transition' | 'strategic';

export const TACTICAL_SPAN = 80;
export const STRATEGIC_SPAN = 110;
export const MIN_SPAN = 25;
export const MAX_SPAN = 300;
export const TACTICAL_TILT = (40 * Math.PI) / 180;
export const STRATEGIC_TILT = Math.PI / 2 - 0.0001;
const DISTANCE = 1200;

function clamp(value: number, low: number, high: number): number {
  return Math.max(low, Math.min(high, value));
}

export function unitScaleForSpan(span: number): number {
  return Math.max(1, span / 60);
}

/**
 * Continuous orthographic camera over a mission map. Presentation only: it
 * never reads or writes simulation state.
 */
export class CameraRig {
  readonly camera: THREE.OrthographicCamera;
  focusX = 0;
  focusY = 0;
  span = 48;
  targetSpan = 48;
  yaw = Math.PI / 4;
  targetYaw = Math.PI / 4;
  pixelsHigh = 300;
  /** The widest zoom (the editor widens it to frame a large map). */
  maxSpan = MAX_SPAN;
  /** A fixed tilt instead of the zoom's (the editor's top-down mode). */
  tiltOverride: number | null = null;

  private aspect = 16 / 9;
  private readonly right = new THREE.Vector3();
  private readonly up = new THREE.Vector3();

  constructor(focusX = 0, focusY = 0) {
    this.focusX = focusX;
    this.focusY = focusY;
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 5000);
  }

  get band(): CameraBand {
    if (this.span <= TACTICAL_SPAN) {
      return 'tactical';
    }
    if (this.span >= STRATEGIC_SPAN) {
      return 'strategic';
    }
    return 'transition';
  }

  get strategicBlend(): number {
    return clamp(
      (this.span - TACTICAL_SPAN) / (STRATEGIC_SPAN - TACTICAL_SPAN),
      0,
      1,
    );
  }

  /**
   * The view keeps its 40° tilt at every zoom (the owner, 2026-11-14: zooming
   * out no longer swings the camera to straight down, in the game or the
   * editor). Only the editor's explicit top-down mode overrides it.
   */
  get tilt(): number {
    if (this.tiltOverride !== null) return this.tiltOverride;
    return TACTICAL_TILT;
  }

  setAspect(aspect: number): void {
    this.aspect = Math.max(0.1, aspect);
  }

  zoom(notches: number): void {
    const factor = notches > 0 ? Math.pow(1.18, notches) : Math.pow(0.85, -notches);
    this.targetSpan = clamp(this.targetSpan * factor, MIN_SPAN, this.maxSpan);
  }

  rotate(steps: number): void {
    this.targetYaw += (steps * Math.PI) / 4;
  }

  /**
   * add-map-compass: turn the view the shortest way until true north (the
   * given bearing, clockwise from the grid's top edge) points up the screen.
   */
  faceNorth(north: number): void {
    const goal = (-north * Math.PI) / 180;
    const turn = 2 * Math.PI;
    const delta = ((((goal - this.targetYaw) % turn) + turn + Math.PI) % turn) - Math.PI;
    this.targetYaw += delta;
  }

  pan(dxMetres: number, dyMetres: number): void {
    const c = Math.cos(this.yaw);
    const s = Math.sin(this.yaw);
    this.focusX += dxMetres * c + dyMetres * s;
    this.focusY += -dxMetres * s + dyMetres * c;
  }

  private shakeAge = Number.POSITIVE_INFINITY;
  private shakeStrength = 0;

  /**
   * add-artillery-bombardment 3.3: a burst shakes the view for a moment.
   * `strength` 0 to 1; the shake moves the rendered camera only, never the
   * focus, so panning and saved views are untouched.
   */
  kick(strength: number): void {
    if (!(strength > 0)) return;
    const left = shakeOffset(this.shakeAge, this.shakeStrength).amplitude;
    this.shakeStrength = Math.min(1, Math.max(strength, left));
    this.shakeAge = 0;
  }

  update(dt: number): void {
    const k = 1 - Math.exp(-dt / 0.15);
    this.span += (this.targetSpan - this.span) * k;
    // Land on the target: the ease alone stops a hair above it, so the Tactical
    // control (target 80) never reached the tactical band (span <= 80).
    if (Math.abs(this.targetSpan - this.span) < 0.01) this.span = this.targetSpan;
    this.yaw += (this.targetYaw - this.yaw) * k;

    const halfH = this.span / 2;
    const halfW = halfH * this.aspect;
    const cam = this.camera;
    cam.left = -halfW;
    cam.right = halfW;
    cam.top = halfH;
    cam.bottom = -halfH;

    const tilt = this.tilt;
    const back = Math.cos(tilt) * DISTANCE;
    const up = Math.sin(tilt) * DISTANCE;
    const bx = Math.sin(this.yaw) * back;
    const by = Math.cos(this.yaw) * back;
    cam.position.set(this.focusX + bx, up, this.focusY + by);
    cam.up.set(-Math.sin(this.yaw), 0, -Math.cos(this.yaw));
    cam.lookAt(this.focusX, 0, this.focusY);

    // Snap to whole internal texels while not rotating. Without this the
    // low-resolution image crawls during a pan.
    if (Math.abs(this.targetYaw - this.yaw) < 0.001) {
      const texel = this.span / this.pixelsHigh;
      cam.updateMatrixWorld();
      const elements = cam.matrixWorld.elements;
      this.right.set(elements[0] ?? 0, elements[1] ?? 0, elements[2] ?? 0);
      this.up.set(elements[4] ?? 0, elements[5] ?? 0, elements[6] ?? 0);
      const r = cam.position.dot(this.right);
      const u = cam.position.dot(this.up);
      cam.position
        .addScaledVector(this.right, Math.round(r / texel) * texel - r)
        .addScaledVector(this.up, Math.round(u / texel) * texel - u);
    }

    if (this.shakeAge < SHAKE_SECONDS) {
      this.shakeAge += dt;
      const shake = shakeOffset(this.shakeAge, this.shakeStrength);
      if (shake.amplitude > 0) {
        cam.updateMatrixWorld();
        const elements = cam.matrixWorld.elements;
        this.right.set(elements[0] ?? 0, elements[1] ?? 0, elements[2] ?? 0);
        this.up.set(elements[4] ?? 0, elements[5] ?? 0, elements[6] ?? 0);
        const metres = (this.span / TACTICAL_SPAN) * SHAKE_METRES;
        cam.position.addScaledVector(this.right, shake.x * metres).addScaledVector(this.up, shake.y * metres);
      }
    }

    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
  }
}

/** add-artillery-bombardment 3.3: how long a shake lasts (s), and how far it throws the view at full strength (m, at the tactical span). */
export const SHAKE_SECONDS = 0.35;
const SHAKE_METRES = 0.6;

/** The shake's offset (in units of SHAKE_METRES) `age` seconds after a kick: a damped wobble, nothing once it is over. */
export function shakeOffset(age: number, strength: number): { x: number; y: number; amplitude: number } {
  if (!(age < SHAKE_SECONDS) || strength <= 0) return { x: 0, y: 0, amplitude: 0 };
  const amplitude = strength * (1 - age / SHAKE_SECONDS) ** 2;
  return { x: amplitude * Math.sin(age * 71), y: amplitude * 0.7 * Math.cos(age * 53), amplitude };
}

/** add-artillery-bombardment 3.3: a burst's shake by its distance from the view's focus: full within 20 m, none past 120 m. */
export function shakeStrength(distance: number, burstScale: number): number {
  return Math.max(0, Math.min(1, (1 - (distance - 20) / 100) * burstScale * 0.8));
}



