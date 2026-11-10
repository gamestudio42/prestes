import * as THREE from 'three';
import {
  activeMapGeneration,
  activeMapRuntime,
  positionsFor,
  terrainHeightAt,
  type AssaultSnapshot,
  type GarrisonSnapshot,
  type PositionDef,
  type UnitSnapshot,
} from '@prestes/shared';
import { unitScaleForSpan } from './camera-rig';
import { PALETTE } from './palette';

/**
 * garrison-and-assault 4.2: over each held building the player knows of, a
 * small pixel banner in the side's colour with the men inside ("?" while
 * their strength is unknown) and a bar of how many of them are still fit;
 * and, while a selected section is walking in, small arrows at the
 * position's doors. Trench lines and the yard draw their men and get no
 * banner (spec). 4.3: over a position under close assault, two bars for
 * the fight's length, attackers left and defenders right, each its side's
 * fit fighters over those it started with.
 */

/** 3 x 5 pixel digits and "?". */
const DIGITS: Record<string, string[]> = {
  '0': ['###', '#.#', '#.#', '#.#', '###'],
  '1': ['.#.', '##.', '.#.', '.#.', '###'],
  '2': ['###', '..#', '###', '#..', '###'],
  '3': ['###', '..#', '.##', '..#', '###'],
  '4': ['#.#', '#.#', '###', '..#', '..#'],
  '5': ['###', '#..', '###', '..#', '###'],
  '6': ['###', '#..', '###', '#.#', '###'],
  '7': ['###', '..#', '.#.', '.#.', '.#.'],
  '8': ['###', '#.#', '###', '#.#', '###'],
  '9': ['###', '#.#', '###', '..#', '###'],
  '?': ['###', '..#', '.##', '...', '.#.'],
};

const WIDTH = 16;
const HEIGHT = 12;
const OUTLINE = '#1a1610';
const hex = (color: number) => `#${color.toString(16).padStart(6, '0')}`;

/** The banner's picture: the side's colour, the count or "?", the fit share as a bar. */
function bannerCanvas(side: 'column' | 'legalist', text: string, fit: number | null): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const context = canvas.getContext('2d')!;
  context.fillStyle = OUTLINE;
  context.fillRect(0, 0, WIDTH, 9);
  context.fillStyle = hex(PALETTE.factions[side]);
  context.fillRect(1, 1, WIDTH - 2, 7);
  // A little pennant tail under the banner.
  context.fillStyle = OUTLINE;
  context.fillRect(6, 9, 4, 1);
  context.fillRect(7, 10, 2, 1);
  const glyphs = [...text].map((char) => DIGITS[char] ?? DIGITS['?']!);
  let x = Math.floor((WIDTH - (glyphs.length * 4 - 1)) / 2);
  context.fillStyle = side === 'column' ? OUTLINE : '#f2ead8';
  for (const glyph of glyphs) {
    glyph.forEach((row, y) => {
      [...row].forEach((cell, dx) => {
        if (cell === '#') context.fillRect(x + dx, 2 + y, 1, 1);
      });
    });
    x += 4;
  }
  if (fit !== null) {
    context.fillStyle = OUTLINE;
    context.fillRect(1, HEIGHT - 1, WIDTH - 2, 1);
    context.fillStyle = hex(fit > 0.5 ? PALETTE.orderMarker : 0xc04a32);
    context.fillRect(1, HEIGHT - 1, Math.max(1, Math.round((WIDTH - 2) * fit)), 1);
  }
  return canvas;
}

const BARS_WIDTH = 25;
const BARS_HEIGHT = 5;

/** The assault's two bars: attackers left, defenders right, in their sides' colours. */
function barsCanvas(attackerSide: 'column' | 'legalist', attackers: number, defenders: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = BARS_WIDTH;
  canvas.height = BARS_HEIGHT;
  const context = canvas.getContext('2d')!;
  const half = (BARS_WIDTH - 3) / 2;
  const defenderSide = attackerSide === 'column' ? 'legalist' : 'column';
  context.fillStyle = OUTLINE;
  context.fillRect(0, 0, BARS_WIDTH, BARS_HEIGHT);
  context.fillStyle = '#4a4236';
  context.fillRect(1, 1, half, BARS_HEIGHT - 2);
  context.fillRect(2 + half, 1, half, BARS_HEIGHT - 2);
  // The attackers' bar empties toward the middle, the defenders' toward the right.
  const left = Math.round(half * attackers);
  context.fillStyle = hex(PALETTE.factions[attackerSide]);
  context.fillRect(1 + half - left, 1, left, BARS_HEIGHT - 2);
  context.fillStyle = hex(PALETTE.factions[defenderSide]);
  context.fillRect(2 + half, 1, Math.round(half * defenders), BARS_HEIGHT - 2);
  return canvas;
}

function pixelTexture(canvas: HTMLCanvasElement): THREE.CanvasTexture {
  const texture = new THREE.CanvasTexture(canvas);
  texture.magFilter = THREE.NearestFilter;
  texture.minFilter = THREE.NearestFilter;
  texture.generateMipmaps = false;
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

interface Banner {
  sprite: THREE.Sprite;
  key: string;
}

/** Draws a fresh picture on a sprite, freeing the old one. */
function setTexture(entry: Banner, key: string, canvas: HTMLCanvasElement): void {
  const material = entry.sprite.material as THREE.SpriteMaterial;
  material.map?.dispose();
  material.map = pixelTexture(canvas);
  material.needsUpdate = true;
  entry.key = key;
}

export interface AssaultBarsState {
  positionId: number;
  attackers: number;
  defenders: number;
}

export interface GarrisonBannerState {
  positionId: number;
  side: 'column' | 'legalist';
  text: string;
}

export class GarrisonLayer {
  readonly group = new THREE.Group();
  private readonly banners: Banner[] = [];
  private readonly bars: Banner[] = [];
  /** Assault bars shown at the last update (dev checks). */
  assaultBars: AssaultBarsState[] = [];
  private readonly arrows: THREE.InstancedMesh;
  private positions = new Map<number, PositionDef>();
  private heights = new Map<number, number>();
  private positionsGeneration = -1;
  /** Shown at the last update (dev checks). */
  shown: GarrisonBannerState[] = [];
  arrowCount = 0;

  constructor() {
    // A flat arrowhead on the ground, pointing in.
    const shape = new THREE.Shape();
    shape.moveTo(0, 0.9);
    shape.lineTo(0.6, -0.3);
    shape.lineTo(0.2, -0.3);
    shape.lineTo(0.2, -0.9);
    shape.lineTo(-0.2, -0.9);
    shape.lineTo(-0.2, -0.3);
    shape.lineTo(-0.6, -0.3);
    shape.closePath();
    const geometry = new THREE.ShapeGeometry(shape);
    geometry.rotateX(-Math.PI / 2);
    this.arrows = new THREE.InstancedMesh(
      geometry,
      new THREE.MeshBasicMaterial({ color: PALETTE.orderMarker, transparent: true, opacity: 0.9, depthWrite: false, side: THREE.DoubleSide }),
      32,
    );
    this.arrows.name = 'garrison-entrance-arrows';
    this.arrows.count = 0;
    this.arrows.frustumCulled = false;
    this.arrows.renderOrder = 4;
    this.group.add(this.arrows);
  }

  private refreshPositions(): void {
    const generation = activeMapGeneration();
    if (generation === this.positionsGeneration) return;
    this.positionsGeneration = generation;
    const map = activeMapRuntime()?.map;
    this.positions = new Map((map ? positionsFor(map) : []).map((position) => [position.id, position]));
    this.heights = new Map((map?.buildings ?? []).map((building) => [building.id, building.height]));
  }

  update(
    garrisons: readonly GarrisonSnapshot[],
    units: readonly UnitSnapshot[],
    selected: readonly number[],
    span: number,
    assaults: readonly AssaultSnapshot[] = [],
  ): void {
    this.refreshPositions();
    const byId = new Map(units.map((unit) => [unit.id, unit]));
    const scale = unitScaleForSpan(span) * 2.4;
    const shown: GarrisonBannerState[] = [];
    let index = 0;
    for (const garrison of garrisons) {
      const position = this.positions.get(garrison.positionId);
      if (!position || position.kind !== 'building') continue;
      const fitCount = garrison.unitIds.filter((id) => {
        const unit = byId.get(id);
        return !unit || (unit.alive && !unit.incapacitated);
      }).length;
      const unknown = garrison.strengthUnknown === true;
      const text = unknown ? '?' : String(Math.min(99, fitCount));
      const fit = unknown || garrison.unitIds.length === 0 ? null : fitCount / garrison.unitIds.length;
      const key = `${garrison.side}:${text}:${fit === null ? '-' : Math.round(fit * (WIDTH - 2))}`;
      const banner = this.banners[index] ?? this.addBanner();
      if (banner.key !== key && typeof document !== 'undefined') {
        setTexture(banner, key, bannerCanvas(garrison.side, text, fit));
      }
      const top = this.heights.get(position.id) ?? 4;
      banner.sprite.visible = true;
      banner.sprite.position.set(position.x, terrainHeightAt(position.x, position.y) + top + 3.2 + scale * 0.5, position.y);
      banner.sprite.scale.set(scale * (WIDTH / HEIGHT), scale, 1);
      shown.push({ positionId: position.id, side: garrison.side, text });
      index += 1;
    }
    for (let rest = index; rest < this.banners.length; rest += 1) this.banners[rest]!.sprite.visible = false;
    this.shown = shown;
    this.updateArrows(byId, selected, span);
    this.updateBars(assaults, scale);
  }

  /** 4.3: the bars over each position under close assault, above its banner. */
  private updateBars(assaults: readonly AssaultSnapshot[], scale: number): void {
    const shown: AssaultBarsState[] = [];
    const half = (BARS_WIDTH - 3) / 2;
    let index = 0;
    for (const assault of assaults) {
      const position = this.positions.get(assault.positionId);
      if (!position) continue;
      const attackers = assault.attackersStart > 0 ? Math.max(0, Math.min(1, assault.attackers / assault.attackersStart)) : 0;
      const defenders = assault.defendersStart > 0 ? Math.max(0, Math.min(1, assault.defenders / assault.defendersStart)) : 0;
      const key = `${assault.attackerSide}:${Math.round(attackers * half)}:${Math.round(defenders * half)}`;
      const bars = this.bars[index] ?? this.addSprite(this.bars, 'garrison-assault-bars');
      if (bars.key !== key && typeof document !== 'undefined') setTexture(bars, key, barsCanvas(assault.attackerSide, attackers, defenders));
      const top = this.heights.get(position.id) ?? 2;
      const width = scale * 1.6;
      bars.sprite.visible = true;
      bars.sprite.position.set(position.x, terrainHeightAt(position.x, position.y) + top + 3.2 + scale * 1.4, position.y);
      bars.sprite.scale.set(width, width * (BARS_HEIGHT / BARS_WIDTH), 1);
      shown.push({ positionId: assault.positionId, attackers, defenders });
      index += 1;
    }
    for (let rest = index; rest < this.bars.length; rest += 1) this.bars[rest]!.sprite.visible = false;
    this.assaultBars = shown;
  }

  /** The doors of the positions the selected men are walking into. */
  private updateArrows(byId: ReadonlyMap<number, UnitSnapshot>, selected: readonly number[], span: number): void {
    const targets = new Set<number>();
    for (const id of selected) {
      const entering = byId.get(id)?.entering;
      if (entering !== undefined) targets.add(entering);
    }
    const matrix = new THREE.Matrix4();
    const quaternion = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    const size = Math.min(2, unitScaleForSpan(span));
    let count = 0;
    for (const positionId of [...targets].sort((a, b) => a - b)) {
      const position = this.positions.get(positionId);
      if (!position) continue;
      for (const entrance of position.entrances) {
        if (count >= 32) break;
        // From the door toward the position's middle (the shape points along -z before turning).
        quaternion.setFromAxisAngle(up, Math.atan2(-(position.x - entrance.x), -(position.y - entrance.y)));
        matrix.compose(new THREE.Vector3(entrance.x, terrainHeightAt(entrance.x, entrance.y) + 0.08, entrance.y), quaternion, new THREE.Vector3(size, 1, size));
        this.arrows.setMatrixAt(count, matrix);
        count += 1;
      }
    }
    this.arrows.count = count;
    this.arrows.instanceMatrix.needsUpdate = true;
    this.arrowCount = count;
  }

  private addBanner(): Banner {
    return this.addSprite(this.banners, 'garrison-banner');
  }

  private addSprite(list: Banner[], name: string): Banner {
    const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, depthWrite: false, depthTest: false }));
    sprite.renderOrder = 6;
    sprite.name = name;
    this.group.add(sprite);
    const entry = { sprite, key: '' };
    list.push(entry);
    return entry;
  }

  dispose(): void {
    for (const banner of [...this.banners, ...this.bars]) {
      const material = banner.sprite.material as THREE.SpriteMaterial;
      material.map?.dispose();
      material.dispose();
    }
    this.arrows.geometry.dispose();
    (this.arrows.material as THREE.Material).dispose();
    this.group.clear();
  }
}
