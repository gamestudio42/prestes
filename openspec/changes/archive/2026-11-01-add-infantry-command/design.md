## Context

The current sandbox has deterministic combat, directional cover, terrain,
cohesion, a six-person troop and attack/flank/withdraw orders. It does not have a
formal order stack, formations, wounds, rescue or persistence. The detailed
reference is `docs/design/INFANTRY_COMMAND.md`; this document records the technical
choices and the concurrency contract.

## Goals / Non-Goals

**Goals:**

- A reusable order manager and unit controller.
- One primary order plus scoped interrupts.
- Explicit soldier states and safe transitions.
- Formations, cohesion and fatigue as order parameters.
- Rescue, evacuation and recovery with persistent identity.
- Readable UI feedback.

**Non-Goals:**

- Implementing code in this specification change.
- Campaign missions, new weapons, vehicles, final art or multiplayer.

## Decisions

### 1. Order manager, unit controller, soldier AI

The Order Manager validates commands and owns a `UnitOrderState`. The Unit
Controller turns the primary order and interrupts into tasks and owns group
composition. Soldier AI executes navigation, cover and combat. Shared systems
(terrain, cover, navigation, morale, casualties) are reused.

Alternative: each order owning its own navigation. Rejected because it duplicates
systems and makes concurrency impossible to reason about.

### 2. Primary plus scoped interrupts

```ts
interface UnitOrderState {
  primary: OrderInstance | null;
  interrupts: OrderInstance[];
  suspended: OrderInstance[];
}
```

An interrupt has scope (`unit`, `group`, `soldier`), priority, owned resources and
resumption/failure rules. One primary order is active; detachments may run
concurrently. A soldier and a cover position are exclusive resources.

Alternative: a simple queue. Rejected because a queue would stop the defence while
a rescue runs. Alternative: fully independent soldiers. Rejected because it
produces the robot-like behaviour the specification warns against.

### 3. Explicit soldier state

`idle`, `moving`, `attacking`, `in_cover`, `supporting`, `flanking`, `retreating`,
`rallying`, `wounded`, `incapacitated`, `rescuing`, `being_carried`, `treating`,
`evacuating`, `recovering`, `dead`.

Every state transition is validated. `being_carried`, `treating`, `evacuating`,
`recovering` and `dead` are exclusive and reject incompatible orders.

### 4. Morale, cohesion and fatigue

Morale and cohesion remain separate; both are 0–100. Fatigue is added with movement,
combat and carrying and reduces speed/efficiency. Officer aura applies bounded
morale and cohesion benefits. Low cohesion slows coordinated movement and requests
regroup.

### 5. Formations

Column, line, wedge and free formations generate per-soldier slots from the unit
reference. Changing formation does not replace the primary order. The controller
waits for laggards rather than teleporting.

### 6. Rescue as a high-priority interrupt

Rescue follows identify, select rescuer, support, approach, carry, cover, first aid,
evacuate, recover, return. One rescuer per casualty. The casualty is attached only
after contact. Carrier and casualty move as one operation. Invalid carry states are
never allowed.

### 7. Persistence

A soldier record keeps stable id, battles, wounds, rescues, recovery and
availability. Evacuation removes the soldier from the active field but not from the
record. Recovery ends into `available`; the same soldier returns.

### 8. Determinism and configuration

Order stack, interrupts, tasks, state, reservations and casualty records are part of
the hashed state. Tuning values live in shared configuration. No wall-clock time or
unseeded randomness.

## Chapter 21: Concurrent and unexpected orders

The full chapter lives in `docs/design/INFANTRY_COMMAND.md`. The engineering rule is:

- **Defend + rescue:** defence remains primary. A rescue interrupt detaches one
  rescuer and optional support; the rest keep their slots and fire. On completion
  the team returns to defence. The unit never stops defending wholesale.
- **Flank + rescue:** the support group can cover while the manoeuvre group
  continues; a casualty inside the route may detach one rescuer. Both groups keep
  the parent unit id.
- **Withdraw + rescue:** establish a rear rally point first. Rescue may continue
  only with a safe route; otherwise abort safely. Evacuation outranks the original
  primary if the unit is overrun.
- **Ambush + casualty:** treat without revealing the ambush; activation happens once.
- **Carrier incapacitated:** transfer, complete safely or abort; never duplicate or
  leave the casualty attached to an invalid carrier.
- **Two casualties:** queue; never assign one rescuer twice.
- **New order during carry:** complete, transfer or abort safely; never hard-cancel
  an animation into an invalid state.
- **Officer loss:** remove aura, apply bounded morale/cohesion shock, keep the unit
  commandable.

Every interrupt has a visible marker and reason. The primary remains visible while
suspended. This is what prevents the troop from looking like isolated robots.

## Risks / Trade-offs

- **Order stack complexity** → constrain scopes/resources and test conflicts.
- **Rescue can stall the unit** → one rescuer per casualty; support stays on primary.
- **Persistent records expand save/load** → keep records in a shared data schema and
  hash them; campaign persistence is a later slice.
- **Concurrent movement can oscillate** → cooldowns, reservations and explicit
  resumption conditions.
- **UI density** → categories and an inspect panel rather than 13 permanent buttons.

## Migration Plan

Specification only. Implementation should proceed in vertical slices: state/order
contracts, movement/formations, defence/support orders, rescue/persistence. Each
slice must preserve the existing attack, cover, morale and determinism tests.

## Historical method and roster

No historical claim, figure or mission is added. The system is a dramatised
abstraction; the existing source policy and multi-perspective campaign rule remain.
