import * as THREE from 'three';
import type { BattleMap, MapExit, Vec2 } from '@prestes/shared';

/**
 * add-withdrawal-exits 7.1: the column's exits on the ground, during the
 * deployment phase and the battle, each labelled with its localized name.
 * Placeholder look: a draped outline and a faint translucent fill with
 * chevrons pointing to the nearest map edge (final art not made yet).
 */
const EXIT_COLOR = 0x7fe0a0;
const CHEVRON_SIZE = 3;

function centre(points: readonly Vec2[]): Vec2 {
  const n = Math.max(1, points.length);
  return { x: points.reduce((sum, p) => sum + p.x, 0) / n, y: points.reduce((sum, p) => sum + p.y, 0) / n };
}

/** The unit direction from a point to the nearest edge of the map. */
function towardEdge(point: Vec2, bounds: BattleMap['bounds']): Vec2 {
  const options = [
    { d: point.x - bounds.minX, v: { x: -1, y: 0 } },
    { d: bounds.maxX - point.x, v: { x: 1, y: 0 } },
    { d: point.y - bounds.minY, v: { x: 0, y: -1 } },
    { d: bounds.maxY - point.y, v: { x: 0, y: 1 } },
  ];
  return options.sort((a, b) => a.d - b.d)[0]!.v;
}

function drapedLoop(polygon: readonly Vec2[], heightAt: (x: number, y: number) => number, step = 2): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  for (let index = 0; index < polygon.length; index += 1) {
    const a = polygon[index]!;
    const b = polygon[(index + 1) % polygon.length]!;
    const steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / step));
    for (let s = 0; s < steps; s += 1) {
      const x = a.x + ((b.x - a.x) * s) / steps;
      const y = a.y + ((b.y - a.y) * s) / steps;
      points.push(new THREE.Vector3(x, heightAt(x, y) + 0.35, y));
    }
  }
  if (points[0]) points.push(points[0].clone());
  return points;
}

export class ExitLayer {
  readonly group = new THREE.Group();
  private readonly labels = new Map<number, { element: HTMLDivElement; at: Vec2 }>();

  constructor(
    private readonly exits: readonly MapExit[],
    bounds: BattleMap['bounds'],
    root: HTMLElement,
    heightAt: (x: number, y: number) => number,
  ) {
    this.group.name = 'exits';
    for (const exit of exits) {
      if (exit.polygon.length < 3) continue;
      const outline = new THREE.Line(
        new THREE.BufferGeometry().setFromPoints(drapedLoop(exit.polygon, heightAt)),
        new THREE.LineBasicMaterial({ color: EXIT_COLOR, transparent: true, opacity: 0.95, depthTest: false, depthWrite: false }),
      );
      outline.renderOrder = 11;
      outline.name = `exit-${exit.id}`;
      this.group.add(outline);
      const shape = new THREE.Shape(exit.polygon.map((p) => new THREE.Vector2(p.x, -p.y)));
      const fill = new THREE.Mesh(
        new THREE.ShapeGeometry(shape).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: EXIT_COLOR, transparent: true, opacity: 0.12, depthTest: false, depthWrite: false, side: THREE.DoubleSide }),
      );
      const middle = centre(exit.polygon);
      fill.position.y = heightAt(middle.x, middle.y) + 0.3;
      fill.renderOrder = 10;
      this.group.add(fill);
      // Three chevrons in a row, pointing out of the field.
      const out = towardEdge(middle, bounds);
      const side = { x: -out.y, y: out.x };
      for (let index = -1; index <= 1; index += 1) {
        const tip = { x: middle.x + out.x * (index * CHEVRON_SIZE * 1.6 + CHEVRON_SIZE), y: middle.y + out.y * (index * CHEVRON_SIZE * 1.6 + CHEVRON_SIZE) };
        const back = { x: tip.x - out.x * CHEVRON_SIZE, y: tip.y - out.y * CHEVRON_SIZE };
        const points = [
          { x: back.x + side.x * CHEVRON_SIZE, y: back.y + side.y * CHEVRON_SIZE },
          tip,
          { x: back.x - side.x * CHEVRON_SIZE, y: back.y - side.y * CHEVRON_SIZE },
        ].map((p) => new THREE.Vector3(p.x, heightAt(p.x, p.y) + 0.4, p.y));
        const chevron = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(points),
          new THREE.LineBasicMaterial({ color: EXIT_COLOR, transparent: true, opacity: 0.9, depthTest: false, depthWrite: false }),
        );
        chevron.renderOrder = 11;
        this.group.add(chevron);
      }
      const element = document.createElement('div');
      element.className = 'exit-label';
      element.dataset.testid = `exit-label-${exit.id}`;
      element.style.position = 'absolute';
      element.style.display = 'none';
      root.append(element);
      this.labels.set(exit.id, { element, at: middle });
    }
  }

  /** The exits' names in the player's language. */
  setNames(names: ReadonlyMap<number, string>): void {
    for (const [id, label] of this.labels) label.element.textContent = names.get(id) ?? '';
  }

  update(toScreen: (x: number, y: number) => Vec2 | null): void {
    for (const { element, at } of this.labels.values()) {
      const screen = toScreen(at.x, at.y);
      element.style.display = screen && element.textContent ? '' : 'none';
      if (screen) {
        element.style.left = `${screen.x}px`;
        element.style.top = `${screen.y}px`;
      }
    }
  }

  dispose(): void {
    for (const { element } of this.labels.values()) element.remove();
    this.group.traverse((object) => {
      if (object instanceof THREE.Line || object instanceof THREE.Mesh) {
        object.geometry.dispose();
        (object.material as THREE.Material).dispose();
      }
    });
  }

  get count(): number {
    return this.exits.length;
  }
}
