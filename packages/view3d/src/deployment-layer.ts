import * as THREE from 'three';
import type { BattleMap, Vec2 } from '@prestes/shared';
import { PALETTE } from './palette';

/** How long the marks stay (s of view time from the first frame), and the fade at the end. */
export const DEPLOYMENT_MARK_SECONDS = 10;
const FADE_SECONDS = 2;
/** Each section's mark: a ring this wide round its deployment point (m). */
const MARK_RADIUS = 12;

export interface DeploymentLabels {
  own: string;
  enemy: string;
}

interface Side {
  key: 'own' | 'enemy';
  centre: Vec2;
  materials: THREE.MeshBasicMaterial[];
  label: HTMLDivElement;
}

function centroid(points: readonly Vec2[]): Vec2 {
  return {
    x: points.reduce((sum, point) => sum + point.x, 0) / Math.max(1, points.length),
    y: points.reduce((sum, point) => sum + point.y, 0) / Math.max(1, points.length),
  };
}

/**
 * refine-battle-maps 6.2: for the first 10 s of a battle, the player's
 * deployment ("Sua tropa") and the enemy's side ("Inimigo") are marked on the
 * ground in the side colours, with a label over each; they fade over the
 * last 2 s and are gone. View only; the labels come localized from the game.
 */
export class DeploymentLayer {
  readonly group = new THREE.Group();
  private readonly sides: Side[] = [];
  private startedAt: number | null = null;
  private done = false;

  constructor(
    map: BattleMap,
    private readonly root: HTMLElement,
    heightAt: (x: number, y: number) => number,
  ) {
    this.group.name = 'deployment-marks';
    const ring = new THREE.RingGeometry(MARK_RADIUS - 1.2, MARK_RADIUS, 40).rotateX(-Math.PI / 2);
    const disc = new THREE.CircleGeometry(MARK_RADIUS - 1.2, 40).rotateX(-Math.PI / 2);
    const zones = [
      { key: 'own' as const, zone: map.deployment.column, color: PALETTE.factions.column },
      { key: 'enemy' as const, zone: map.deployment.legalist, color: PALETTE.factions.legalist },
    ];
    for (const { key, zone, color } of zones) {
      const materials: THREE.MeshBasicMaterial[] = [];
      for (const point of zone.sections) {
        for (const [geometry, opacity] of [
          [ring, 0.9],
          [disc, 0.22],
        ] as const) {
          // Drawn over the ground and anything on it, so a slope never hides the mark.
          const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthTest: false, depthWrite: false });
          material.userData.full = opacity;
          materials.push(material);
          const mesh = new THREE.Mesh(geometry, material);
          mesh.position.set(point.x, heightAt(point.x, point.y) + 0.3, point.y);
          mesh.renderOrder = 10;
          this.group.add(mesh);
        }
      }
      const label = document.createElement('div');
      label.className = `deployment-label deployment-label-${key}`;
      label.dataset.testid = `deployment-label-${key}`;
      label.style.position = 'absolute';
      label.style.display = 'none';
      root.append(label);
      // The player's label stands over the first section, where the camera opens; the enemy's over the middle of his side.
      const anchor = key === 'own' && zone.sections[0] ? zone.sections[0] : centroid(zone.sections);
      this.sides.push({ key, centre: anchor, materials, label });
    }
  }

  setLabels(labels: DeploymentLabels): void {
    for (const side of this.sides) side.label.textContent = labels[side.key];
  }

  /** Whether the marks are still up. */
  get shown(): boolean {
    return !this.done;
  }

  /** Places the labels and fades everything out; `now` in ms of view time. */
  update(now: number, toScreen: (x: number, y: number) => Vec2 | null): void {
    if (this.done) return;
    this.startedAt ??= now;
    const seconds = (now - this.startedAt) / 1000;
    if (seconds >= DEPLOYMENT_MARK_SECONDS) {
      this.clear();
      return;
    }
    const fade = Math.min(1, (DEPLOYMENT_MARK_SECONDS - seconds) / FADE_SECONDS);
    for (const side of this.sides) {
      for (const material of side.materials) material.opacity = (material.userData.full as number) * fade;
      const screen = toScreen(side.centre.x, side.centre.y);
      side.label.style.display = screen && side.label.textContent ? '' : 'none';
      if (screen) {
        side.label.style.left = `${screen.x}px`;
        side.label.style.top = `${screen.y}px`;
      }
      side.label.style.opacity = String(fade);
    }
  }

  private clear(): void {
    this.done = true;
    this.group.visible = false;
    for (const side of this.sides) side.label.remove();
  }

  dispose(): void {
    this.clear();
    this.group.traverse((object) => {
      if (object instanceof THREE.Mesh) (object.material as THREE.Material).dispose();
    });
  }
}
