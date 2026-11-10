import { allCoverSlots, cachedCoverSlots, type CoverSlot, type SlotMarker } from '../cover-slots';
import type { CoverPoint, Vec2 } from '../protocol';
import { insideDeploymentArea } from './deployment-areas';
import { EYE_HEIGHTS } from '../world';
import type { BattleMap } from './types';

/**
 * refine-map-editor 6.1 (D9): the editor's cover preview. It reads the game's
 * own slots (`allCoverSlots` on the compiled map's covers), classes each by
 * the stances its cover protects, counts them per piece the author placed
 * (an object, a wall, a road ditch, a trench line) and inside each side's
 * deployment area.
 */

/** The piece of the document a compiled cover came from. */
export type CoverPiece =
  | { kind: 'object'; id: number }
  | { kind: 'line'; id: number }
  | { kind: 'trench'; id: number }
  | { kind: 'ditch'; id: number; side: 'left' | 'right' };

/** The highest stance a slot's cover hides: standing hides every stance. */
export type ProtectionClass = 'standing' | 'crouched' | 'prone';

export const PROTECTION_CLASSES: readonly ProtectionClass[] = ['standing', 'crouched', 'prone'];

/** add-deployment-phase D5: the battle's deployment preview shows the slots this close to the cursor (m). */
export const DEPLOYMENT_SLOT_RADIUS = 25;

const pieces = new WeakMap<BattleMap, ReadonlyMap<number, CoverPiece>>();

/** Called by the compiler: which piece each cover id came from. */
export function noteCoverPieces(map: BattleMap, sources: ReadonlyMap<number, CoverPiece>): void {
  pieces.set(map, sources);
}

/** The piece a compiled cover came from (null for hand-written maps). */
export function coverPieceOf(map: BattleMap, coverId: number): CoverPiece | null {
  return pieces.get(map)?.get(coverId) ?? null;
}

export function coverPieceKey(piece: CoverPiece): string {
  return piece.kind === 'ditch' ? `ditch:${piece.id}:${piece.side}` : `${piece.kind}:${piece.id}`;
}

/**
 * The cover height rules: a trench or ditch hides a crouched man (the game
 * crouches him on its floor); any other cover hides the stances whose eye
 * height it reaches.
 */
export function protectionClass(cover: Pick<CoverPoint, 'kind' | 'height'>): ProtectionClass {
  if (cover.kind === 'trench') return 'crouched';
  if (cover.height >= EYE_HEIGHTS.standing) return 'standing';
  if (cover.height >= EYE_HEIGHTS.crouched) return 'crouched';
  return 'prone';
}

export interface PreviewSlot extends CoverSlot {
  protects: ProtectionClass;
  /** The piece's key, or null for a cover with no document piece. */
  piece: string | null;
}

export interface PreviewPiece {
  key: string;
  piece: CoverPiece;
  /** Slots the game uses on this piece. */
  count: number;
  /** Where its badge stands: its slot nearest the slots' centre. */
  at: Vec2;
  /** Slot ids, for the hover detail. */
  slots: number[];
}

export interface ZoneTotal {
  total: number;
  byClass: Record<ProtectionClass, number>;
}

export interface CoverPreview {
  slots: PreviewSlot[];
  pieces: PreviewPiece[];
  zones: { column: ZoneTotal; legalist: ZoneTotal };
}

export function coverPreview(map: BattleMap): CoverPreview {
  const coverById = new Map(map.covers.map((cover) => [cover.id, cover]));
  const slots: PreviewSlot[] = allCoverSlots(map.covers).map((slot) => {
    const piece = coverPieceOf(map, slot.coverId);
    return { ...slot, protects: protectionClass(coverById.get(slot.coverId)!), piece: piece ? coverPieceKey(piece) : null };
  });

  const grouped = new Map<string, { piece: CoverPiece; slots: PreviewSlot[] }>();
  for (const slot of slots) {
    if (!slot.piece) continue;
    let group = grouped.get(slot.piece);
    if (!group) {
      group = { piece: coverPieceOf(map, slot.coverId)!, slots: [] };
      grouped.set(slot.piece, group);
    }
    group.slots.push(slot);
  }
  const previewPieces: PreviewPiece[] = [...grouped].map(([key, group]) => {
    const cx = group.slots.reduce((sum, slot) => sum + slot.x, 0) / group.slots.length;
    const cy = group.slots.reduce((sum, slot) => sum + slot.y, 0) / group.slots.length;
    let at = group.slots[0]!;
    for (const slot of group.slots) if ((slot.x - cx) ** 2 + (slot.y - cy) ** 2 < (at.x - cx) ** 2 + (at.y - cy) ** 2) at = slot;
    return { key, piece: group.piece, count: group.slots.length, at: { x: at.x, y: at.y }, slots: group.slots.map((slot) => slot.id) };
  });

  // add-deployment-phase: a side's zone is its deployment area.
  const zone = (area: readonly Vec2[]): ZoneTotal => {
    const byClass: Record<ProtectionClass, number> = { standing: 0, crouched: 0, prone: 0 };
    let total = 0;
    for (const slot of slots) {
      if (!insideDeploymentArea(area, slot.x, slot.y)) continue;
      total += 1;
      byClass[slot.protects] += 1;
    }
    return { total, byClass };
  };
  return {
    slots,
    pieces: previewPieces,
    zones: { column: zone(map.deployment.column.area), legalist: zone(map.deployment.legalist.area) },
  };
}

/** Badges at strategic span: the pieces' counts summed per cell of this size (m). */
export const BADGE_CLUSTER = 50;

export interface BadgeCluster {
  key: string;
  at: Vec2;
  count: number;
  pieces: number;
}

/** Sums piece counts per 50 m cell; each cluster stands at its pieces' mean badge position. */
export function clusterBadges(previewPieces: readonly PreviewPiece[], cell = BADGE_CLUSTER): BadgeCluster[] {
  const cells = new Map<string, { x: number; y: number; count: number; pieces: number }>();
  for (const piece of previewPieces) {
    const key = `${Math.floor(piece.at.x / cell)}:${Math.floor(piece.at.y / cell)}`;
    const entry = cells.get(key) ?? { x: 0, y: 0, count: 0, pieces: 0 };
    entry.x += piece.at.x;
    entry.y += piece.at.y;
    entry.count += piece.count;
    entry.pieces += 1;
    cells.set(key, entry);
  }
  return [...cells].map(([key, entry]) => ({ key, at: { x: entry.x / entry.pieces, y: entry.y / entry.pieces }, count: entry.count, pieces: entry.pieces }));
}

/** A slot of the deployment preview: the battle's slot marker with its protection class. */
export interface DeploymentSlotMarker extends SlotMarker {
  protects: ProtectionClass;
}

/** A piece's badge in the deployment preview: its free and total slots near the cursor. */
export interface DeploymentSlotPiece {
  key: string;
  at: Vec2;
  free: number;
  total: number;
}

export interface DeploymentSlotView {
  markers: DeploymentSlotMarker[];
  pieces: DeploymentSlotPiece[];
  free: number;
  total: number;
}

/**
 * add-deployment-phase D5: the cover slots within DEPLOYMENT_SLOT_RADIUS of
 * the cursor (the battle's own slots, classed as in the editor's preview),
 * free, held or planned by the pending order, with a count per piece. A
 * piece is the document piece on authored maps, else the cover itself.
 */
export function deploymentSlotView(
  map: BattleMap | null,
  covers: readonly CoverPoint[],
  units: readonly { slotId?: number | null; alive: boolean; incapacitated?: boolean }[],
  cursor: Vec2,
  planned: ReadonlySet<number>,
): DeploymentSlotView {
  const held = new Set<number>();
  for (const unit of units) if (unit.slotId != null && unit.alive && !unit.incapacitated) held.add(unit.slotId);
  const coverById = new Map(covers.map((cover) => [cover.id, cover]));
  const radius = DEPLOYMENT_SLOT_RADIUS * DEPLOYMENT_SLOT_RADIUS;
  const markers: DeploymentSlotMarker[] = [];
  const groups = new Map<string, { slots: DeploymentSlotMarker[] }>();
  for (const slot of cachedCoverSlots(covers)) {
    if ((slot.x - cursor.x) ** 2 + (slot.y - cursor.y) ** 2 > radius) continue;
    const cover = coverById.get(slot.coverId);
    if (!cover) continue;
    const state = planned.has(slot.id) ? 'planned' : held.has(slot.id) ? 'taken' : 'free';
    const marker: DeploymentSlotMarker = { slotId: slot.id, x: slot.x, y: slot.y, state, protects: protectionClass(cover) };
    markers.push(marker);
    const piece = map ? coverPieceOf(map, slot.coverId) : null;
    const key = piece ? coverPieceKey(piece) : `cover:${slot.coverId}`;
    const group = groups.get(key) ?? { slots: [] };
    group.slots.push(marker);
    groups.set(key, group);
  }
  const pieces = [...groups].map(([key, group]): DeploymentSlotPiece => {
    const cx = group.slots.reduce((sum, slot) => sum + slot.x, 0) / group.slots.length;
    const cy = group.slots.reduce((sum, slot) => sum + slot.y, 0) / group.slots.length;
    let at = group.slots[0]!;
    for (const slot of group.slots) if ((slot.x - cx) ** 2 + (slot.y - cy) ** 2 < (at.x - cx) ** 2 + (at.y - cy) ** 2) at = slot;
    return { key, at: { x: at.x, y: at.y }, free: group.slots.filter((slot) => slot.state !== 'taken').length, total: group.slots.length };
  });
  const free = markers.filter((marker) => marker.state !== 'taken').length;
  return { markers, pieces, free, total: markers.length };
}
