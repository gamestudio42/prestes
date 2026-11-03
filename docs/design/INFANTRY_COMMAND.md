# Infantry Command, Movement and Order Specification

Status: design reference for `add-infantry-command`. This document is normative
only where an OpenSpec requirement says so; it describes the intended system and
separates the current implementation from planned work.

## 1. Purpose

Define how a player commands a section, how the unit controller turns one order
into tasks for individual soldiers, and how morale, cohesion, terrain, fatigue,
wounds and concurrent events change the result.

The player gives objectives. Soldiers execute locally. The unit remains the
accountable entity.

## 2. Principles

1. **Command by orders.** The player selects a unit and states intent; individual
   movement is not a player responsibility.
2. **Individual autonomy.** Each soldier has a state and can act locally inside
   the current task.
3. **Collective coordination.** A unit keeps a shared reference, formation and
   task ledger.
4. **Environmental awareness.** Paths, cover, occupancy and line of sight use the
   shared world model.
5. **Persistent consequences.** Wounds, deaths, fatigue, experience and officer
   loss carry between fights.
6. **Readable behaviour.** Every order must produce a visible, explainable
   difference in what the unit does and why.

## 3. Control hierarchy

- **Commander / player:** selects units, issues orders, chooses targets, areas and
  formations, and interrupts orders.
- **Order Manager:** validates orders, owns the order stack, resolves priority and
  records completion or interruption.
- **Unit Controller:** turns the primary order and any interrupts into tasks,
  assigns groups, maintains the unit reference, monitors cohesion and requests
  resumption or fallback.
- **Soldier AI:** navigates, occupies cover, fires, takes cover, carries out
  support/rescue tasks and exposes its state.
- **Support systems:** terrain, cover, navigation, combat, morale, cohesion,
  fatigue, casualties, animation, persistence and localization.

The simulation remains authoritative and deterministic. Presentation only reads
frames and sends commands.

## 4. Order lifecycle

Every order follows the same contract:

```text
received -> validated -> active -> (completed | interrupted | failed)
```

An order instance carries:

- stable `id`;
- `type` and issuing player command;
- target/area/destination references;
- scope (`unit`, `group`, `soldier`);
- priority class;
- assigned soldier ids and group ids;
- start tick, expected completion or condition;
- interruption and resumption rules;
- reason on completion, interruption or failure.

Rejected orders emit a machine-readable reason and do not change the world.
Completed and interrupted orders are events; the presentation can show them.

## 5. Unit and soldier data

### 5.1 Collective attributes

| Attribute | Meaning |
|---|---|
| Total strength | Registered members |
| Active strength | Members present on the field |
| Fit strength | Members able to act |
| Wounded | Incapacitated or recovering members |
| Dead | Permanent losses |
| Average morale | Consolidated morale |
| Cohesion | Organisational quality, not physical distance alone |
| Average fatigue | Accumulated exertion |
| Officer | Leadership reference |
| Active order | Primary order and any active interrupts |
| Operational state | Ready, engaged, disorganised, withdrawing, recovering |

Collective values are derived from individual records. They must not contradict
the soldiers shown in the frame.

### 5.2 Individual states

| State | Meaning | Allowed actions |
|---|---|---|
| `idle` | Available, no active task | Receive tasks |
| `moving` | Following a path | Fire if rules allow |
| `attacking` | Engaging a target | Fire, take cover |
| `in_cover` | Occupying a covered position | Fire, observe |
| `supporting` | Supporting an active order | Context-specific |
| `flanking` | Executing a manoeuvre route | Move, fire when in position |
| `retreating` | Withdrawing under an order | Move, defensive fire |
| `rallying` | Returning to the unit reference | Move |
| `wounded` | Injured but mobile | Reduced movement and accuracy |
| `incapacitated` | Cannot act autonomously | Be rescued |
| `rescuing` | Performing a rescue task | Move/carry, no other task |
| `being_carried` | Attached to a rescuer | No independent action |
| `treating` | Providing first aid | Treat only |
| `evacuating` | Leaving the field | No combat |
| `recovering` | In reserve recovery | Not on field |
| `dead` | Permanent loss | None |

Transitions are controlled. A soldier in `being_carried`, `treating`,
`evacuating`, `recovering` or `dead` cannot receive an incompatible combat or
movement task.

## 6. Morale, cohesion and leadership

- **Morale** is willingness to continue. Initial bands: excellent 80–100, good
  60–79, unstable 40–59, low 20–39, critical 0–19. These are tuning defaults.
- **Cohesion** is the ability to act as an organised unit. It is affected by
  spacing, group separation, losses, long movement, officer presence and
  successful collective orders. Low cohesion slows response and coordinated
  movement; high cohesion does not imply high morale.
- **Leadership** is an officer aura. Soldiers inside the radius receive a bounded
  morale and coordination benefit. The benefit is removed when they leave. The
  loss of an officer applies a morale and cohesion shock but never disables the
  unit permanently.

Collective values are derived; individual auras are applied per soldier.

## 7. Terrain, cover and occupancy

- Every cover position has an index, occupancy capacity, access state, stable id
  and reference point.
- Cover is directional: the volume must lie between the soldier and the threat.
- Low cover requires crouch/prone; high cover can block line of sight.
- A position is scored from cover, distance, accessibility, occupancy, current
  order and ally proximity. The highest cover is not always the best choice.
- A position is reserved while a soldier is moving to or occupying it and released
  when the soldier leaves, changes order or is removed.

## 8. Movement and formations

Formations are parameters of the active order, not separate orders.

| Formation | Shape | Use |
|---|---|---|
| Column | Longitudinal, compact | Narrow routes, march |
| Line | Lateral, spread | Defensive front, fire line |
| Wedge | Central reference with lateral members | Flexible advance |
| Free | Flexible min/max spacing | Rough terrain |

A coordinated move assigns one destination per soldier, avoids ally collisions,
respects obstacles, recalculates blocked routes and caps separation. The unit
reference moves only when enough members are ready; a lagging member may reduce
the collective speed or trigger a regroup request, never teleport.

## 9. Order catalogue

| Category | Orders |
|---|---|
| Attack | Attack, flank |
| Movement | Advance, withdraw, pursue |
| Defence | Defend position, ambush |
| Organisation | Regroup, disperse, protect officer |
| Support | Recon, reserve, rescue |

### 9.1 Attack

Acquire a valid target, move into engagement range, use the shared combat and
cover systems, update a lost target, and end on target loss, new order or unit
incapacity.

### 9.2 Flank

Split the fit strength into support and manoeuvre groups. Support holds, observes
and suppresses. Manoeuvre takes one committed side, seeks cover and returns to the
unit when the order completes. The unit controller keeps both groups linked to the
original unit. If a group has no fit members, reassess the order.

### 9.3 Withdraw

Choose a direction away from the threat, evaluate accessible covered positions,
move the unit while limiting dispersion, and finish on a safe position or a new
order. Re-evaluate if the chosen position becomes blocked or occupied.

### 9.4 Advance

Move to a destination using a formation and a shared reference. Each soldier gets
a slot; the controller monitors separation and slows or waits for laggards.
Recompute routes when blocked.

### 9.5 Defend position

Occupy a region, distribute soldiers across available cover, keep them inside the
region, and react to threats without abandoning the position for an uncontrolled
pursuit. Redistribute when positions become invalid.

### 9.6 Ambush

Prepare, wait, monitor an activation condition, activate once, then transition to
a follow-up order. It does not retrigger for the same event. The controller records
what activated it.

### 9.7 Regroup

Identify fit members, choose a central reference or the officer, assign individual
destinations, wait for laggards and recover cohesion. Dead, evacuated and
recovering members do not participate. Soldiers in a higher-priority interrupt are
not teleported out of it.

### 9.8 Pursue

Track a retreating target, update the collective destination, cap separation and
stop on target loss, critical fatigue, critical morale, new orders or loss of
conditions.

### 9.9 Disperse

Spread fit members over a region with minimum separation, preserving unit identity
and a route back to formation. Dispersion is temporary and reversible.

### 9.10 Protect officer

Keep the unit linked to its officer, preserve his position and update the formation
when he moves. The officer remains vulnerable; his loss updates leadership but does
not deactivate the unit.

### 9.11 Recon

Move to a region, reveal information, record contacts and return or wait. Avoid
unnecessary engagement; the unit may disengage if the order is recon.

### 9.12 Reserve

Hold a region, suppress automatic engagement, wait for orders and preserve
persistent attributes. Reserve is a state of availability, not only physical
position.

### 9.13 Rescue

See Chapter 11. Rescue is a high-priority interrupt, not a reason for the whole
unit to abandon its primary order.

## 10. Wounds and mortality

| Category | State | Consequence |
|---|---|---|
| Light | `wounded` | Reduced mobility/accuracy, still acts |
| Moderate | `wounded` | Stronger reduction |
| Severe | `incapacitated` | Requires rescue |
| Fatal | `dead` | Permanent loss |

A soldier keeps a stable identity across fights. The record stores battles,
wounds, rescues given/received, recovery and availability. A rescued soldier is not
deleted; he moves to `recovering` and later returns to `available`.

## 11. Rescue pipeline

```text
identify casualty -> select rescuer -> prepare support -> approach ->
carry -> reach cover -> first aid -> evacuate -> reserve -> recover -> available
```

- Only fit soldiers can be assigned.
- One rescuer per casualty; no rescuer can carry two casualties.
- The casualty becomes `being_carried` only when the rescuer reaches it.
- The rescuer and casualty move as one logical operation; there are not two
  independent movers.
- Cover destination must be accessible and compatible with carrying.
- First aid has a configured duration; evacuation happens only after treatment.
- If the rescuer is incapacitated, transfer the task or abort safely.
- If the casualty dies, end the operation and record `dead`.
- If the order is cancelled, stop at a safe state; never leave a carried soldier
  in an invalid state.
- A unit in withdrawal may prioritize evacuation over the original order.

## 12. Priority and interruption

| Priority | Category |
|---|---|
| Critical | Terminal state, incapacitation |
| Very high | Rescue and preservation of strength |
| High | Withdrawal and survival |
| Normal | Current tactical order |
| Low | Reorganisation and secondary movement |

A higher-priority interrupt can suspend a primary order. The player can always
replace an order, but the controller must choose a safe transition. An animation
in progress, a carried soldier or an occupied cover position cannot simply be
discarded.

## 13. Player feedback

Each unit reports active primary order, pending condition, progress, strength,
morale, cohesion, fatigue, wounded count and officer presence. Orders show
received/active/waiting/completed/interrupted/unavailable. Rescue has its own
rescuer, casualty, phase and progress.

## 14. Determinism and configuration

- All simulation decisions are deterministic; no wall-clock time or unseeded RNG.
- Order, state, task, cover reservation and casualty records are hashed state.
- Tuning parameters live in one shared configuration: aura radius, morale bonus,
  cohesion distance, minimum cover, movement speed, fatigue penalty, regroup time,
  first-aid time, recovery time, cover capacity and dispersion limit.
- The presentation never mutates simulation state.

## 15. Acceptance

A feature is complete when:

1. The player can issue it from the interface.
2. The controller validates and interprets it.
3. Members receive compatible tasks.
4. The behaviour is visible.
5. Completion and interruption are visible.
6. No soldier is left in an invalid state.
7. The player can replace the order.
8. It works with different unit sizes.
9. It preserves the existing attack, cover, morale and determinism systems.
10. Rescue preserves identity, synchronized states, evacuation timing and recovery.

## 16. Test matrix

Cover attack, flank, withdraw, advance, defend, ambush, regroup, pursue, disperse,
protect officer, recon, reserve and rescue. For each: full strength, reduced
strength, target loss, officer loss, critical morale, blocked route, occupied
cover, multiple simultaneous orders, interrupted animation, multiple casualties
and deterministic replay.

## 17. Roadmap

1. Consolidate state and order contracts; preserve current attack/flank/withdraw.
2. Advance, formations, regroup, disperse.
3. Defend, ambush, recon, reserve, protect officer.
4. Pursue, coordination and priority refinement.
5. Wounds, rescue, evacuation, recovery and persistence.
6. Integration tests, performance and balance.

## 18. Current implementation status

Already present: deterministic engine, Mauser combat, directional cover, terrain,
morale/suppression, panic/rout, cohesion, 5 soldiers + officer, one-side flank,
withdraw toward cover, selection marquee, sandbox spawns and target dummies.

Not yet implemented: advance/defend/ambush/regroup/pursue/disperse/protect/recon/
reserve orders, fatigue, wound categories, rescue pipeline, recovery persistence,
full order manager and concurrent order stack.

## 19. Historical and legal note

The system is a gameplay abstraction. It makes no historical claim about a real
engagement and adds no historical figure. The existing source policy, asset
register and book-scan restrictions remain in force.

## 20. Open questions

- How much of the campaign persistence layer belongs in the sandbox slice?
- Should a dedicated officer record be separate from the unit record?
- How much order status should be visible by default versus in the sandbox panel?

## 21. Concurrent and Unexpected Orders

This chapter is the contract for the most important behaviour: two or more orders
coexisting without turning the unit into isolated robots.

### 21.1 Core model

A unit owns one **primary order**. Higher-priority **interrupts** can suspend parts
of the unit without replacing the primary order. Each interrupt has:

- scope: `unit`, `group` or `soldier`;
- a priority;
- a start and end state;
- the soldiers and groups it owns;
- the primary tasks it suspends;
- a resumption condition, a failure condition and a timeout.

A soldier has at most one exclusive action. A group can be detached for an
interrupt while the rest of the unit continues the primary order.

### 21.2 Order stack

```text
UnitOrderState
  primary: OrderInstance | null
  interrupts: OrderInstance[]
  suspended: OrderInstance[]
```

Rules:

1. One primary order at a time.
2. Multiple interrupts may exist only if their scopes and resources do not
   overlap.
3. A soldier cannot be in two exclusive scopes.
4. A cover position is reserved once.
5. An interrupt cannot silently delete the primary order.
6. The player can cancel an interrupt; the primary order is reassessed.
7. The player can replace the primary order; compatible interrupts may survive.

### 21.3 Defend plus rescue

The unit is defending a region. A soldier becomes incapacitated.

- The primary `defend` order remains active.
- A rescue interrupt is created with `soldier`/`group` scope.
- One rescuer and, optionally, one support soldier are detached.
- The rest keep their positions and fire.
- The rescuer approaches, carries, treats and evacuates.
- On completion, the rescue team returns to its defence slot; the unit returns to
  the primary order.
- If the region is overrun, the primary order is interrupted; the rescue may
  continue if it is the higher priority, or abort safely.

The unit does not stop defending. The rescuer does not become an independent
one-man army.

### 21.4 Flank plus rescue

The support group can provide covering fire while the manoeuvre group continues.
If a casualty falls inside the manoeuvre route:

- one soldier may be detached to rescue;
- the manoeuvre group continues with reduced strength or pauses;
- if the group has no fit members left, the flank order is reassessed;
- the manoeuvre and rescue groups keep their parent unit id.

### 21.5 Withdraw plus rescue

Withdrawal has high priority, but an incapacitated soldier is critical.

- The unit establishes a rear rally point.
- A rescue team may be left behind or detached only if it has a safe route.
- If the rescuer cannot reach cover, the rescue is aborted, not left in an
  invalid animation state.
- If the unit is overrun, evacuation has priority over the original primary order.

### 21.6 Ambush plus unexpected contact

An ambush waits for an activation condition. If a casualty occurs before
activation, the unit may treat it as an interrupt without revealing the ambush.
If contact triggers the ambush, the primary order transitions to the configured
follow-up; rescue remains a separate interrupt if needed.

The same activation event cannot retrigger the ambush repeatedly.

### 21.7 Reserve plus request

A unit in reserve suppresses automatic engagement. A player order or a rescue
request may activate it. Reserve does not erase the unit's persistent state or
its officer link.

### 21.8 Carrier becomes incapacitated

A carrying rescuer cannot simply drop the casualty.

1. Freeze the carry at a safe point.
2. Select another fit rescuer if one is reachable.
3. Otherwise mark the casualty `incapacitated` at the carry point and end the
   rescue with a failure event.
4. Never duplicate the casualty or leave it attached to a dead carrier.

### 21.9 Conflicting orders

| Conflict | Resolution |
|---|---|
| Defend and rescue | Rescue interrupt detaches a team; defence remains primary |
| Flank and withdraw | Withdraw preempts; flank is suspended or aborted |
| Ambush and attack | Attack replaces ambush only after the player order is valid |
| Rescue and retreat | Retreat establishes a safe point; rescue either continues with a safe route or aborts |
| Protect officer and rescue | Officer protection remains, but the rescue team may detach if the officer still has cover |
| Two rescues, one rescuer | Queue; one casualty per rescuer |
| New order during carry | Evaluate safe completion, transfer or abort; do not hard-cancel the animation |

### 21.10 Unexpected events

- Officer dies: update leadership, apply morale/cohesion shock, keep the unit
  functional.
- Target disappears: invalidate the target and reacquire under the primary order.
- Route becomes blocked: recalculate; if impossible, interrupt/fail with reason.
- Cover is occupied: reserve a different position or fall back.
- Unit is reduced below a fit threshold: abort coordinated orders that require a
  group and request regroup/withdraw.
- Two casualties at once: queue, prioritize the nearest reachable casualty, never
  assign one rescuer twice.
- A soldier is ordered while `being_carried`: reject with `invalid_state`.
- A unit is ordered while evacuating: reject or queue; never teleport.

### 21.11 Readability

Every interrupt has a visible marker and a reason in the unit panel. The primary
order remains visible while suspended. A rescue shows rescuer, casualty, phase and
progress. The player should be able to answer: what is the unit doing, what part is
detached, why, and when will it return?

### 21.12 Acceptance for concurrency

- Defend + rescue: the rest of the unit keeps defending while one rescue team works.
- Flank + rescue: both groups remain linked to the parent unit.
- Withdraw + rescue: the casualty is never duplicated or abandoned in an invalid
  state.
- New order during carry: the system chooses complete/transfer/abort safely.
- Two casualties: no rescuer is assigned twice.
- Deterministic replay: order stack, interrupts, reservations and states hash
  identically across runs.
