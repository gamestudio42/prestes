## Purpose

Defines the order lifecycle, catalogue, priority rules and concurrent-order model
that let a unit execute a primary task while detaching soldiers for higher-priority
interrupts.

## ADDED Requirements

### Requirement: Order lifecycle

Every order SHALL pass through received, validated, active and completed,
interrupted or failed states. Validation SHALL reject invalid units, targets,
areas, states or resources without changing the world.

#### Scenario: Valid order begins
- **WHEN** the player issues a valid order
- **THEN** the order becomes active and the unit receives compatible tasks

#### Scenario: Invalid order is rejected
- **WHEN** an order targets a dead unit, an inaccessible area or an incompatible state
- **THEN** the simulation emits a rejection reason and leaves the state unchanged

#### Scenario: Order completion
- **WHEN** the order condition is reached
- **THEN** the order completes and the unit becomes ready or resumes a suspended order

### Requirement: Order catalogue

The unit controller SHALL support attack, flank, withdraw, advance, defend, ambush,
regroup, pursue, disperse, protect officer, recon, reserve and rescue.

#### Scenario: All catalogue orders are addressable
- **WHEN** the player opens the order menu
- **THEN** every catalogue order is listed under its category and shows availability

#### Scenario: Unavailable order explains itself
- **WHEN** an order cannot run because of state, strength, officer or target
- **THEN** the menu shows a localized reason instead of silently doing nothing

### Requirement: Primary order and interrupts

A unit SHALL have at most one primary order. Higher-priority interrupts MAY suspend
part of the unit without deleting the primary order.

#### Scenario: One primary order
- **WHEN** the player issues a new primary order
- **THEN** the previous primary order is replaced safely and compatible interrupts may continue

#### Scenario: Detached interrupt
- **WHEN** a rescue interrupt is created during a defend order
- **THEN** only the rescue team is detached and the remaining soldiers continue defending

#### Scenario: Resource lock
- **WHEN** a soldier or cover position is already owned by an interrupt
- **THEN** another order cannot assign the same exclusive resource

### Requirement: Order priority

Orders SHALL have critical, very-high, high, normal and low priorities. Higher
priority SHALL preempt lower priority only through a safe transition.

#### Scenario: Rescue preempts a normal task
- **WHEN** a casualty appears during a normal tactical order
- **THEN** rescue may interrupt the normal task without abandoning the unit

#### Scenario: Withdraw preempts flank
- **WHEN** the player orders a withdraw during a flank
- **THEN** the flank is suspended or aborted and the unit moves to safety

#### Scenario: Player override
- **WHEN** the player issues an explicit emergency order
- **THEN** the player order overrides the current priority, with a safe state transition

### Requirement: Concurrent orders

The order manager SHALL allow multiple active orders only when their scopes and
resources do not conflict. Every primary remains visible while suspended.

#### Scenario: Defend and rescue coexist
- **WHEN** a casualty is incapacitated during a defend order
- **THEN** the defence remains primary and a rescue team detaches

#### Scenario: Flank and rescue coexist
- **WHEN** a casualty occurs during a flank
- **THEN** the flank and rescue groups retain the parent unit reference

#### Scenario: No duplicate controller
- **WHEN** a soldier is being carried
- **THEN** no other order can move or command that soldier independently

### Requirement: Safe interruption

An order SHALL NOT be interrupted in a way that leaves a soldier attached to a dead
or invalid actor, duplicated, deleted or in an incompatible state.

#### Scenario: Carrier incapacitated
- **WHEN** a rescuer becomes incapacitated while carrying
- **THEN** the system transfers, completes or safely aborts the carry without duplicating the casualty

#### Scenario: New order during carry
- **WHEN** the player issues a new order while a rescue is carrying
- **THEN** the system chooses safe completion, transfer or abort and reports the result

#### Scenario: Animation state
- **WHEN** an interrupted order has an animation in progress
- **THEN** the transition uses a valid state and does not freeze the character

### Requirement: Unexpected target or route loss

The controller SHALL re-evaluate orders when a target dies, a destination becomes
inaccessible, cover is occupied or a route is blocked.

#### Scenario: Target dies
- **WHEN** the current target dies
- **THEN** the order invalidates the target and reacquires or completes according to its type

#### Scenario: Route blocked
- **WHEN** a path becomes invalid
- **THEN** the controller recalculates; if no route exists it interrupts or fails the order with a reason

### Requirement: Officer loss

The loss of an officer SHALL update leadership and apply a bounded morale and
cohesion consequence without disabling the unit permanently.

#### Scenario: Officer dies
- **WHEN** the officer is killed
- **THEN** the aura is removed, morale/cohesion drop and the unit remains commandable

### Requirement: Order feedback

Each unit SHALL expose primary order, pending condition, interrupts, progress,
completion and interruption reasons.

#### Scenario: Suspended primary
- **WHEN** a primary order is suspended by an interrupt
- **THEN** the unit panel continues to show the primary and the interrupt

#### Scenario: Completion and failure
- **WHEN** an order completes or fails
- **THEN** a localized event and panel state explain the result
