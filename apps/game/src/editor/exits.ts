import { EXIT_CORNERS, MAX_EXITS, type BattleEvent, type EditableMap, type MapExit, type Vec2, type WithdrawalRequirement } from '@prestes/shared';

/**
 * add-withdrawal-exits 6.1: the editor's edits of the column's exits and the
 * withdrawal requirement. Pure functions on an editor draft (one undo step each).
 */

/** A new exit is a square this wide (m). */
export const NEW_EXIT_SIZE = 20;

const nextId = (exits: readonly MapExit[]) => exits.reduce((max, exit) => Math.max(max, exit.id), 0) + 1;

/** Adds an exit centred on `at`; the first exit creates the requirement (1 section, no command section). Returns its id, or 0 at the limit. */
export function addExit(draft: EditableMap, at: Vec2, name: (id: number) => string): number {
  const exits = [...(draft.withdrawal?.exits ?? [])];
  if (exits.length >= MAX_EXITS) return 0;
  const id = nextId(exits);
  const h = NEW_EXIT_SIZE / 2;
  const x = Math.round(at.x);
  const y = Math.round(at.y);
  const label = name(id);
  exits.push({ id, name: { 'pt-BR': label, en: label }, polygon: [{ x: x - h, y: y - h }, { x: x + h, y: y - h }, { x: x + h, y: y + h }, { x: x - h, y: y + h }] });
  draft.withdrawal = { exits, requirement: draft.withdrawal?.requirement ?? { sections: 1, command: false } };
  return id;
}

/** The events whose trigger is "exited": they lose meaning with the last exit. */
export function exitedUsers(events: readonly BattleEvent[]): BattleEvent[] {
  return events.filter((event) => event.trigger?.kind === 'exited');
}

/** Deletes an exit; with the last one the requirement goes and "exited" triggers are left empty. */
export function deleteExit(draft: EditableMap, id: number): void {
  const exits = (draft.withdrawal?.exits ?? []).filter((exit) => exit.id !== id);
  if (exits.length > 0) {
    draft.withdrawal = { exits, requirement: draft.withdrawal!.requirement };
    return;
  }
  delete draft.withdrawal;
  if (draft.events) draft.events = draft.events.map((event) => (event.trigger?.kind === 'exited' ? { ...event, trigger: null } : event));
}

/** Moves an exit (or one of its corners) by dx, dy. */
export function moveExit(draft: EditableMap, id: number, dx: number, dy: number, corner?: number, round: (value: number) => number = Math.round): void {
  if (!draft.withdrawal) return;
  draft.withdrawal = {
    ...draft.withdrawal,
    exits: draft.withdrawal.exits.map((exit) =>
      exit.id !== id ? exit : { ...exit, polygon: exit.polygon.map((point, index) => (corner === undefined || corner === index ? { x: round(point.x + dx), y: round(point.y + dy) } : point)) },
    ),
  };
}

function segmentDistance(p: Vec2, a: Vec2, b: Vec2): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = dx * dx + dy * dy;
  const t = length === 0 ? 0 : Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / length));
  return Math.hypot(a.x + dx * t - p.x, a.y + dy * t - p.y);
}

/** Inserts a corner on the exit's nearest edge (the closing edge included), up to the corner limit. */
export function insertExitCorner(draft: EditableMap, id: number, point: Vec2): void {
  if (!draft.withdrawal) return;
  draft.withdrawal = {
    ...draft.withdrawal,
    exits: draft.withdrawal.exits.map((exit) => {
      if (exit.id !== id || exit.polygon.length >= EXIT_CORNERS.max) return exit;
      let best = 0;
      let bestDistance = Infinity;
      exit.polygon.forEach((corner, index) => {
        const distance = segmentDistance(point, corner, exit.polygon[(index + 1) % exit.polygon.length]!);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = index + 1;
        }
      });
      const polygon = exit.polygon.map((corner) => ({ ...corner }));
      polygon.splice(best, 0, { x: point.x, y: point.y });
      return { ...exit, polygon };
    }),
  };
}

/** Deletes one corner while three remain. */
export function deleteExitCorner(draft: EditableMap, id: number, corner: number): void {
  if (!draft.withdrawal) return;
  draft.withdrawal = {
    ...draft.withdrawal,
    exits: draft.withdrawal.exits.map((exit) => (exit.id === id && exit.polygon.length > EXIT_CORNERS.min ? { ...exit, polygon: exit.polygon.filter((_, index) => index !== corner) } : exit)),
  };
}

export function renameExit(draft: EditableMap, id: number, language: 'pt-BR' | 'en', name: string): void {
  if (!draft.withdrawal) return;
  draft.withdrawal = { ...draft.withdrawal, exits: draft.withdrawal.exits.map((exit) => (exit.id === id ? { ...exit, name: { ...exit.name, [language]: name } } : exit)) };
}

/** Sets the requirement; nothing without exits (the requirement lives only with them). */
export function setRequirement(draft: EditableMap, requirement: WithdrawalRequirement): void {
  if (!draft.withdrawal) return;
  draft.withdrawal = { ...draft.withdrawal, requirement: { sections: Math.max(1, Math.round(requirement.sections)), command: requirement.command } };
}

/** An exit's corner, edge or inside under a point (within `pick` m). */
export function exitAt(map: EditableMap, point: Vec2, pick: number): { id: number; point?: number } | null {
  const exits = map.withdrawal?.exits ?? [];
  for (const exit of exits) {
    const corner = exit.polygon.findIndex((p) => Math.hypot(p.x - point.x, p.y - point.y) <= pick);
    if (corner >= 0) return { id: exit.id, point: corner };
  }
  for (const exit of exits) {
    const nearEdge = exit.polygon.some((corner, index) => segmentDistance(point, corner, exit.polygon[(index + 1) % exit.polygon.length]!) <= pick);
    if (nearEdge || inside(point, exit.polygon)) return { id: exit.id };
  }
  return null;
}

function inside(point: Vec2, polygon: readonly Vec2[]): boolean {
  let result = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const a = polygon[i]!;
    const b = polygon[j]!;
    if (a.y > point.y !== b.y > point.y && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x) result = !result;
  }
  return result;
}
