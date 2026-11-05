import type { ExerciseObjective, TrainingAction } from '@prestes/content';
import type { Frame, UnitSnapshot } from '@prestes/shared';

const SECURE_TICKS = 20;
const INSTRUCTOR_SQUAD = 99;

/** What the HUD knows that the frame does not: recorded actions and selection. */
export interface ObjectiveInput {
  actions: ReadonlySet<TrainingAction>;
  selectedCount: number;
}

export interface ObjectiveResult {
  current: number;
  target: number;
  done: boolean;
}

/**
 * Per-objective memory kept by the director between frames: tick counters,
 * baselines and flags such as "an order was seen". Evaluators mutate it.
 */
export type ObjectiveMemory = Record<string, number>;

interface Context {
  frame: Frame;
  memory: ObjectiveMemory;
  tickDelta: number;
  input: ObjectiveInput;
}

type Evaluator = (objective: ExerciseObjective, context: Context) => ObjectiveResult;

export function playerUnits(frame: Frame): UnitSnapshot[] {
  return frame.units.filter(
    (unit) =>
      unit.faction === 'column' &&
      unit.squadId !== INSTRUCTOR_SQUAD &&
      unit.alive &&
      !unit.routed &&
      !unit.incapacitated &&
      !unit.dummy,
  );
}

export function trainingEnemies(frame: Frame): UnitSnapshot[] {
  return frame.units.filter(
    (unit) => unit.role === 'training-enemy' && unit.alive && !unit.routed && !unit.incapacitated,
  );
}

export function instructorUnit(frame: Frame): UnitSnapshot | null {
  return (
    frame.units.find(
      (unit) =>
        unit.faction === 'column' && unit.kind === 'officer' && !unit.dummy && unit.alive,
    ) ?? null
  );
}

export function inside(
  unit: { x: number; y: number },
  point: { x: number; y: number } | undefined,
  radius: number,
): boolean {
  return point !== undefined && (unit.x - point.x) ** 2 + (unit.y - point.y) ** 2 <= radius * radius;
}

export function countInside(
  units: readonly UnitSnapshot[],
  point: { x: number; y: number } | undefined,
  radius: number,
): number {
  return point ? units.filter((unit) => inside(unit, point, radius)).length : 0;
}

function centroid(units: readonly UnitSnapshot[]): { x: number; y: number } | null {
  if (units.length === 0) {
    return null;
  }
  return {
    x: units.reduce((sum, unit) => sum + unit.x, 0) / units.length,
    y: units.reduce((sum, unit) => sum + unit.y, 0) / units.length,
  };
}

const count = (current: number, target: number): ObjectiveResult => ({
  current,
  target,
  done: current >= target,
});

/** Counts up while `held`, resets otherwise; done after `ticks`. */
function sustained(
  objective: ExerciseObjective,
  context: Context,
  held: boolean,
  current: number,
): ObjectiveResult {
  const key = `${objective.id}:held`;
  const next = held ? (context.memory[key] ?? 0) + context.tickDelta : 0;
  context.memory[key] = next;
  const target = objective.ticks ?? 1;
  return { current: held ? Math.min(next, target) : current, target, done: next >= target };
}

/** Remembers that a condition was true at least once in this objective. */
function seen(objective: ExerciseObjective, context: Context, flag: string, now: boolean): boolean {
  const key = `${objective.id}:${flag}`;
  if (now) {
    context.memory[key] = 1;
  }
  return context.memory[key] === 1;
}

const withOrder = (units: readonly UnitSnapshot[], order: string) =>
  units.filter((unit) => unit.order === order);

const evaluators: Record<ExerciseObjective['kind'], Evaluator> = {
  camera(objective, { input }) {
    const used = (['camera-pan', 'camera-zoom', 'camera-rotate'] as const).filter((action) =>
      input.actions.has(action),
    ).length;
    return count(used, objective.count ?? 1);
  },
  select(objective, { input }) {
    const target = objective.minUnits ?? 1;
    return count(input.actions.has('select') ? input.selectedCount : 0, target);
  },
  'box-select'(_objective, { input }) {
    return count(input.actions.has('box-select') ? 1 : 0, 1);
  },
  formation(objective, { frame }) {
    const units = playerUnits(frame).filter((unit) => unit.formation === objective.formation);
    return count(units.length, objective.minUnits ?? 1);
  },
  stance(objective, { frame }) {
    const units = playerUnits(frame).filter((unit) => unit.stance === objective.stance);
    return count(units.length, objective.minUnits ?? 1);
  },
  posture(objective, { frame }) {
    const units = playerUnits(frame).filter((unit) => unit.posture === objective.posture);
    return count(units.length, objective.minUnits ?? 1);
  },
  reach(objective, { frame }) {
    return count(countInside(playerUnits(frame), objective.point, objective.radius ?? 0), objective.minUnits ?? 1);
  },
  order(objective, { frame, input }) {
    if (objective.action && !input.actions.has(objective.action)) {
      return count(0, objective.minUnits ?? 1);
    }
    const units = withOrder(playerUnits(frame), objective.order ?? '').filter(
      (unit) => objective.fireControl === undefined || unit.fireControl === objective.fireControl,
    );
    return count(units.length, objective.minUnits ?? 1);
  },
  'open-order'(objective, { frame }) {
    // The section opened out: its soldiers stand, on average, at least
    // `threshold` metres from their nearest comrade.
    const units = playerUnits(frame).filter((unit) => !unit.incapacitated);
    if (units.length < (objective.minUnits ?? 2)) {
      return count(0, objective.minUnits ?? 2);
    }
    const nearest = units.map((unit) =>
      Math.min(...units.filter((other) => other !== unit).map((other) => Math.hypot(other.x - unit.x, other.y - unit.y))),
    );
    const mean = nearest.reduce((sum, value) => sum + value, 0) / nearest.length;
    return count(mean >= (objective.threshold ?? 5) ? units.length : 0, objective.minUnits ?? 2);
  },
  'target-hit'(objective, { frame, memory }) {
    // Done once the training troop has lost health since the objective started.
    const enemies = trainingEnemies(frame);
    const health = enemies.reduce((sum, unit) => sum + unit.hp, 0);
    const baselineKey = `${objective.id}:baseline`;
    if (enemies.length === 0 && memory[baselineKey] === undefined) {
      return count(0, 1);
    }
    memory[baselineKey] ??= health;
    return count(health < memory[baselineKey]! ? 1 : 0, 1);
  },
  suppress(objective, context) {
    const enemies = trainingEnemies(context.frame);
    const target = objective.count ?? 1;
    const current = enemies.length === 0 ? target : enemies.filter((unit) => unit.suppressed).length;
    const result = sustained(objective, context, current >= target, current);
    return { current, target, done: result.done };
  },
  'hold-fire'(objective, context) {
    // Holding fire is the skill; it does not depend on targets still standing.
    const holding = playerUnits(context.frame).filter((unit) => unit.holdFire).length;
    const held = holding >= (objective.minUnits ?? 1);
    return sustained(objective, context, held, holding);
  },
  facing(objective, { frame }) {
    const point = objective.point;
    const limit = Math.cos(((objective.threshold ?? 30) * Math.PI) / 180);
    const units = playerUnits(frame).filter((unit) => {
      if (!point) {
        return false;
      }
      const dx = point.x - unit.x;
      const dy = point.y - unit.y;
      const length = Math.hypot(dx, dy);
      return length > 0 && (unit.facingX * dx + unit.facingY * dy) / length >= limit;
    });
    return count(units.length, objective.minUnits ?? 1);
  },
  'flank-position'(objective, { frame, memory }) {
    // A flanker counts once its bearing from the target troop differs from the
    // section's starting bearing by at least `threshold` degrees.
    const enemies = centroid(trainingEnemies(frame));
    const section = centroid(playerUnits(frame));
    if (!enemies || !section) {
      return count(0, objective.minUnits ?? 1);
    }
    const startKey = `${objective.id}:bearing`;
    memory[startKey] ??= Math.atan2(section.y - enemies.y, section.x - enemies.x);
    const start = memory[startKey]!;
    const limit = ((objective.threshold ?? 50) * Math.PI) / 180;
    // The flank order ends when a soldier arrives, so remember who received it.
    for (const unit of withOrder(playerUnits(frame), 'flank')) {
      memory[`${objective.id}:flanker:${unit.id}`] = 1;
    }
    const flankers = playerUnits(frame).filter((unit) => {
      if (memory[`${objective.id}:flanker:${unit.id}`] !== 1) {
        return false;
      }
      const bearing = Math.atan2(unit.y - enemies.y, unit.x - enemies.x);
      const delta = Math.abs(Math.atan2(Math.sin(bearing - start), Math.cos(bearing - start)));
      return delta >= limit;
    });
    return count(flankers.length, objective.minUnits ?? 1);
  },
  'bounding-advance'(objective, context) {
    const player = playerUnits(context.frame);
    const bounded = seen(objective, context, 'bounding', player.some((unit) => unit.boundTeam === 'a' || unit.boundTeam === 'b'));
    const arrived = countInside(player, objective.point, objective.radius ?? 0);
    return count(bounded ? arrived : 0, objective.minUnits ?? 1);
  },
  'withdraw-out'(objective, context) {
    const player = playerUnits(context.frame);
    // Pinned soldiers cannot move under fire, so the objective counts soldiers
    // out of the zone rather than requiring every last one.
    const withdrew = seen(objective, context, 'withdraw', withOrder(player, 'withdraw').length > 0);
    const out = player.length - countInside(player, objective.point, objective.radius ?? 0);
    return count(withdrew ? out : 0, objective.minUnits ?? player.length);
  },
  'defend-in-cover'(objective, { frame }) {
    const units = withOrder(playerUnits(frame), 'defend').filter(
      (unit) =>
        inside(unit, objective.point, objective.radius ?? 0) && unit.cover >= (objective.threshold ?? 0.25),
    );
    return count(units.length, objective.minUnits ?? 1);
  },
  'ambush-trigger'(objective, context) {
    const player = playerUnits(context.frame);
    // Set: the section waits with fire on contact (the old Ambush order too).
    const waiting = player.filter((unit) => unit.fireControl === 'contact' || unit.order === 'ambush');
    const set = seen(objective, context, 'set', waiting.length >= (objective.minUnits ?? 1));
    const struck = trainingEnemies(context.frame).some((unit) => unit.suppressed || unit.suppression > 0);
    return count(set && struck ? 1 : 0, 1);
  },
  secure(objective, context) {
    const current = countInside(playerUnits(context.frame), objective.point, objective.radius ?? 0);
    const target = objective.minUnits ?? 1;
    const enemiesInside = countInside(trainingEnemies(context.frame), objective.point, objective.radius ?? 0);
    const key = `${objective.id}:held`;
    const next = current >= target && enemiesInside === 0 ? (context.memory[key] ?? 0) + context.tickDelta : 0;
    context.memory[key] = next;
    return { current, target, done: next >= SECURE_TICKS };
  },
  hold(objective, context) {
    const current = countInside(playerUnits(context.frame), objective.point, objective.radius ?? 0);
    const key = `${objective.id}:held`;
    const next = current >= (objective.minUnits ?? 1) ? (context.memory[key] ?? 0) + context.tickDelta : (context.memory[key] ?? 0);
    context.memory[key] = next;
    const target = objective.ticks ?? 1;
    return { current: Math.min(next, target), target, done: next >= target };
  },
  'recon-report'(_objective, { frame }) {
    return count(playerUnits(frame).some((unit) => unit.reconContacts > 0) ? 1 : 0, 1);
  },
  pursue(objective, context) {
    // A pursuit succeeds when a pursuer closes within `threshold` metres of its
    // target or the pursued target is brought down.
    const enemies = trainingEnemies(context.frame);
    // Attack follows a running target (compact-orders): attackers and
    // pursuers both count.
    const player = playerUnits(context.frame);
    const pursuers = [...withOrder(player, 'pursue'), ...withOrder(player, 'attack')];
    const key = `${objective.id}:target`;
    const chased = pursuers.find((unit) => unit.targetId !== null)?.targetId;
    if (chased !== undefined && chased !== null) {
      context.memory[key] = chased;
    }
    const remembered = context.memory[key];
    if (remembered === undefined) {
      return count(0, 1);
    }
    const target = enemies.find((enemy) => enemy.id === remembered);
    const closed = pursuers.some(
      (unit) => target !== undefined && Math.hypot(target.x - unit.x, target.y - unit.y) <= (objective.threshold ?? 15),
    );
    return count(closed || target === undefined ? 1 : 0, 1);
  },
  regroup(objective, context) {
    const player = playerUnits(context.frame);
    const ordered = seen(objective, context, 'order', withOrder(player, 'regroup').length > 0);
    const center = centroid(player);
    const close = center ? countInside(player, center, objective.radius ?? 8) : 0;
    return count(ordered ? close : 0, objective.minUnits ?? 1);
  },
  'rescue-complete'(objective, context) {
    const section = context.frame.units.filter(
      (unit) => unit.faction === 'column' && unit.squadId !== INSTRUCTOR_SQUAD && !unit.dummy,
    );
    const casualties = section.filter((unit) => unit.alive && unit.incapacitated).length;
    const hadCasualty = seen(objective, context, 'casualty', casualties > 0);
    const evacuated = section.some((unit) => unit.soldierState === 'recovering');
    return count(hadCasualty && casualties === 0 && evacuated ? 1 : 0, 1);
  },
  'protect-officer'(objective, { frame }) {
    const instructor = instructorUnit(frame);
    if (!instructor) {
      return count(0, objective.minUnits ?? 1);
    }
    const guards = playerUnits(frame).filter(
      (unit) =>
        // Protecting the officer is automatic now: the section keeps by him.
        inside(unit, instructor, objective.radius ?? 10),
    );
    return count(guards.length, objective.minUnits ?? 1);
  },
  'cohesion-hold'(objective, context) {
    const player = playerUnits(context.frame);
    const average =
      player.length === 0 ? 0 : player.reduce((sum, unit) => sum + unit.cohesion, 0) / player.length;
    return sustained(objective, context, average >= (objective.threshold ?? 40), Math.round(average));
  },
};

export function evaluateObjective(
  objective: ExerciseObjective,
  frame: Frame,
  memory: ObjectiveMemory,
  tickDelta: number,
  input: ObjectiveInput,
): ObjectiveResult {
  return evaluators[objective.kind](objective, { frame, memory, tickDelta, input });
}

/** Static target shown before an objective has been evaluated. */
export function objectiveTarget(objective: ExerciseObjective): number {
  if (objective.ticks !== undefined && objective.kind !== 'suppress') {
    return objective.ticks;
  }
  if (objective.kind === 'suppress' || objective.kind === 'camera') {
    return objective.count ?? 1;
  }
  return objective.minUnits ?? 1;
}
