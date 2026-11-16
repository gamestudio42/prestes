import { SECTION_TYPES, exitAt, type SimEvent, type Withdrawal, type WithdrawalSnapshot } from '@prestes/shared';
import type { SimContext } from './context';
import type { MutableUnit } from './model';

/**
 * add-withdrawal-exits D2: the column's men leaving the field by the map's
 * exits. A man who leaves is taken out of `ctx.units` (so no system sees,
 * shoots, counts or draws him again) and kept here, saved.
 */
export interface WithdrawalState {
  readonly withdrawal: Withdrawal;
  /** The men who left, in the order they left. */
  readonly exited: MutableUnit[];
  /** The column sections that got out: squad id -> the tick and the exit. */
  readonly out: Map<number, { tick: number; exitId: number }>;
  /** The column's command sections (the command limit group), by squad id. */
  readonly commandSquads: Set<number>;
  /** The column sections at the battle's start (set on the first battle tick). */
  sections: number | null;
}

export function createWithdrawalState(withdrawal: Withdrawal | undefined): WithdrawalState | undefined {
  if (!withdrawal || withdrawal.exits.length === 0) return undefined;
  return { withdrawal, exited: [], out: new Map(), commandSquads: new Set(), sections: null };
}

const fit = (unit: MutableUnit): boolean => unit.alive && !unit.incapacitated && !unit.routed && !unit.dummy;
const columnMan = (unit: MutableUnit): boolean => unit.faction === 'column' && !unit.dummy && unit.role === undefined;

function noteSections(ctx: SimContext, state: WithdrawalState): void {
  if (state.sections !== null) return;
  const squads = new Set<number>();
  for (const unit of ctx.units) {
    if (!columnMan(unit)) continue;
    squads.add(unit.squadId);
    if (unit.sectionType && SECTION_TYPES[unit.sectionType]?.limitGroup === 'command') state.commandSquads.add(unit.squadId);
  }
  state.sections = squads.size;
}

/** Each fit column man inside an exit leaves; a section whose last fit man left has got out. */
export function updateWithdrawal(ctx: SimContext, tick: number, events: SimEvent[]): void {
  const state = ctx.withdrawal;
  if (!state) return;
  noteSections(ctx, state);
  const leaving: { unit: MutableUnit; exitId: number }[] = [];
  for (const unit of ctx.units) {
    if (!columnMan(unit) || !fit(unit)) continue;
    const exit = exitAt(state.withdrawal, unit.x, unit.y);
    if (exit) leaving.push({ unit, exitId: exit.id });
  }
  if (leaving.length === 0) return;
  const gone = new Set<number>();
  const lastExit = new Map<number, number>();
  for (const { unit, exitId } of leaving) {
    gone.add(unit.id);
    lastExit.set(unit.squadId, exitId);
    unit.path = [];
    unit.pathIndex = 0;
    unit.targetId = null;
    unit.currentOrder = null;
    state.exited.push(unit);
    events.push({ type: 'unit_exited', tick, unitId: unit.id, exitId });
  }
  for (let index = ctx.units.length - 1; index >= 0; index -= 1) {
    if (gone.has(ctx.units[index]!.id)) ctx.units.splice(index, 1);
  }
  // Nobody aims at, follows or orders a man who is no longer on the field.
  for (const unit of ctx.units) {
    if (unit.targetId !== null && gone.has(unit.targetId)) unit.targetId = null;
  }
  for (const order of ctx.orders) order.unitIds = order.unitIds.filter((id) => !gone.has(id));
  ctx.orders = ctx.orders.filter((order) => order.unitIds.length > 0);
  for (const [squadId, exitId] of [...lastExit].sort((a, b) => a[0] - b[0])) {
    if (state.out.has(squadId)) continue;
    if (ctx.units.some((unit) => unit.squadId === squadId && columnMan(unit) && fit(unit))) continue;
    state.out.set(squadId, { tick, exitId });
    events.push({ type: 'section_exited', tick, squadId, exitId, command: state.commandSquads.has(squadId) });
  }
}

/** The column men who got out. */
export function menOut(ctx: SimContext): number {
  return ctx.withdrawal?.exited.length ?? 0;
}

export function commandOut(state: WithdrawalState): boolean {
  for (const squadId of state.out.keys()) if (state.commandSquads.has(squadId)) return true;
  return false;
}

/** The requirement is met: enough sections out, and the command section among them when it must be. */
export function requirementMet(state: WithdrawalState): boolean {
  const { sections, command } = state.withdrawal.requirement;
  return state.out.size >= sections && (!command || commandOut(state));
}

export function withdrawalSnapshot(state: WithdrawalState): WithdrawalSnapshot {
  return {
    menOut: state.exited.length,
    sectionsOut: state.out.size,
    sections: state.sections ?? 0,
    required: state.withdrawal.requirement.sections,
    command: state.withdrawal.requirement.command,
    commandOut: commandOut(state),
  };
}

/** add-withdrawal-exits D8: the hashed part (the men out are hashed by id; their state no longer changes). */
export function withdrawalHashState(state: WithdrawalState): unknown {
  return { exited: state.exited.map((unit) => unit.id), out: [...state.out].sort((a, b) => a[0] - b[0]) };
}
