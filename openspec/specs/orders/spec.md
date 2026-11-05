# orders Specification

## Purpose
Defines order lifecycle, priorities, interruptions and tactical order behaviour.

## Requirements

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

The order board SHALL offer ten orders grounded in infantry doctrine: Move,
Advance (always by bounds), Withdraw and Halt for movement; Attack (which
follows a running target), Suppress, Flank and Aim (turn the front to a
clicked point, showing each soldier's line of sight) for fire and manoeuvre;
Defend and Recon for position. Halt SHALL clear every pending order (as Escape
does), then stop the section and take
cover. Rescue SHALL be reached from a wounded comrade rather than the board.
Disperse, regroup, reserve, ambush, pursue and
protect-officer SHALL be expressed through the facing and spacing drag, fire
control, posture and automatic behaviour, and the simulation SHALL still
accept their commands, mapped to the new behaviour.

#### Scenario: Ten orders
- **WHEN** the player opens the order board
- **THEN** it shows Move, Advance, Withdraw, Halt, Attack, Suppress, Flank,
  Aim, Defend and Recon, each with its availability

#### Scenario: All catalogue orders are addressable
- **WHEN** the player opens the order menu
- **THEN** every catalogue order is listed under its row and shows
  availability, and the folded orders are reachable through the drag, fire
  control, posture or the wounded comrade

#### Scenario: Ambush through fire control
- **WHEN** the player orders Defend with fire control on contact and an enemy
  troop walks into 25 m of the section
- **THEN** the section holds fire until then and opens fire together

#### Scenario: Old command still works
- **WHEN** a replay sends the old `disperse` order
- **THEN** the section moves to the point with 6 m between soldiers

#### Scenario: Unavailable order explains itself
- **WHEN** an order cannot run because of state, strength, officer or target
- **THEN** the board shows a localized reason instead of silently doing nothing

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

The loss of an officer (killed or incapacitated) SHALL update leadership and apply
a bounded morale and cohesion consequence without disabling the unit permanently.
The officer's morale aura SHALL stop while the officer is out of action. Every
living soldier of the officer's faction within 25 m SHALL lose 20 morale once, and
the section's cohesion SHALL drop by 15 points once, never below zero.
Protect-officer orders SHALL be interrupted.

#### Scenario: Officer dies
- **WHEN** the officer is killed
- **THEN** the aura is removed, morale/cohesion drop and the unit remains commandable

#### Scenario: Officer incapacitated
- **WHEN** the officer is incapacitated
- **THEN** nearby soldiers lose 20 morale once, the aura stops, protect-officer
  orders are interrupted and the aura resumes if the officer recovers

#### Scenario: Consequence applies once
- **WHEN** the officer stays out of action for many ticks
- **THEN** the morale and cohesion drop is applied only once per loss

### Requirement: Order feedback

Each unit SHALL expose primary order, pending condition, interrupts, progress,
completion and interruption reasons.

#### Scenario: Suspended primary
- **WHEN** a primary order is suspended by an interrupt
- **THEN** the unit panel continues to show the primary and the interrupt

#### Scenario: Completion and failure
- **WHEN** an order completes or fails
- **THEN** a localized event and panel state explain the result

### Requirement: Previewable order intent

Every selectable order SHALL expose a previewable intent before commitment,
covering paths, destinations, cover positions and facing.

#### Scenario: Previewable catalogue
- **WHEN** the player chooses any catalogued order
- **THEN** the order can be previewed before it is sent to the simulation

#### Scenario: Commit uses preview
- **WHEN** the player confirms a previewed order
- **THEN** the committed command uses the previewed destination or target

### Requirement: Cover-first destinations

For orders that move soldiers, the controller SHALL assign each soldier a free,
reachable cover slot near its formation destination, on the side away from the
threat, then fall back to the formation slot. Slots SHALL be reserved so no two
soldiers share one.

#### Scenario: Cover preferred
- **WHEN** a soldier has a free reachable cover slot near its formation slot
- **THEN** its commanded destination is that cover slot and the slot is reserved

#### Scenario: Formation fallback
- **WHEN** no free reachable cover slot exists
- **THEN** the soldier keeps its formation slot

#### Scenario: Travel enters cover
- **WHEN** a soldier reaches its cover slot
- **THEN** it takes the slot's stance and facing behind the cover

### Requirement: Fire control

A section SHALL have one fire control setting: free fire, on contact, or
hold fire. On contact SHALL hold fire until an enemy is within 25 m of any of
its soldiers or the section is fired upon, then switch the section to free
fire.

#### Scenario: Contact opens fire
- **WHEN** a section on contact sees an enemy at 60 m and later at 20 m
- **THEN** it does not fire at 60 m and opens fire at 20 m

### Requirement: Automatic officer cover

When an officer is under fire, up to three soldiers within 10 m of him SHALL
prefer cover slots between him and the threat, in every posture.

#### Scenario: Officer screened
- **WHEN** the instructor is fired upon with the section around him
- **THEN** soldiers take the free slots that put them between him and the
  shooter
