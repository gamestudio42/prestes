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

The order board SHALL offer eleven orders grounded in infantry doctrine: Move,
Advance (always by bounds), Withdraw and Halt for movement; Attack (which
follows a running target), Suppress, Area fire (fire into the area of a
suspected contact), Flank and Aim (turn the front to a clicked point, showing
each soldier's line of sight) for fire and manoeuvre; Defend and Recon for
position. Halt SHALL clear every pending order (as Escape does), then stop the
section and take cover. Rescue SHALL be reached from a wounded comrade rather
than the board. Disperse, regroup, reserve, ambush, pursue and
protect-officer SHALL be expressed through the facing and spacing drag, fire
control, posture and automatic behaviour, and the simulation SHALL still
accept their commands, mapped to the new behaviour.

#### Scenario: Ten orders
- **WHEN** the player opens the order board
- **THEN** it shows the ten orders and Area fire, eleven in all: Move, Advance, Withdraw, Halt, Attack, Suppress, Area
  fire, Flank, Aim, Defend and Recon, each with its availability

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

### Requirement: Queued orders

A section SHALL hold a queue of at most three orders given with Shift: a
Shift order SHALL be appended to the queue instead of replacing the current
primary order, and queued orders SHALL run in the order given, each becoming
active when the previous order completes or is cleared. Halt and Escape SHALL
clear the queue together with the current order. A queued order SHALL be
validated when it is given and again when it becomes active; one that is no
longer valid at activation SHALL be dropped with a localized rejection event
without changing the world. The queue SHALL be deterministic and part of the
hashed state.

#### Scenario: Shift appends
- **WHEN** the player holds Shift and gives a move order to a section that already has an active order
- **THEN** the order joins the queue and the current order is unchanged

#### Scenario: The queue runs in order
- **WHEN** the active order completes or is cleared
- **THEN** the next queued order becomes active, in the order it was given

#### Scenario: Halt clears the queue
- **WHEN** the player gives Halt or presses Escape
- **THEN** the current order and every queued order are cleared and the section takes cover

#### Scenario: Invalid at activation
- **WHEN** a queued attack's target dies before the order becomes active
- **THEN** the order is dropped with a rejection event and the following queued order becomes active

#### Scenario: Queue limit
- **WHEN** a section already holds three queued orders and the player shifts another one
- **THEN** the order is refused and the queue is unchanged

### Requirement: Area fire on a suspected contact

The player SHALL be able to order a section, or any soldiers of one section,
to fire into the area of a suspected contact. The order SHALL be armed from
the fire row of the board (label PT-BR "Fogo na área", EN "Area fire") and
given by clicking a "?" unseen-fire marker or a faded ghost of a lost enemy;
the pick prompt SHALL read PT-BR "Escolha um contato suspeito (?)" and EN
"Pick a suspected contact (?)", and the tip SHALL say in both locales that
the fire rarely hits, mostly keeps heads down and spends ammunition.

The simulation SHALL accept the order only when its point lies within 8 m of
a contact the ordering side holds: an unseen-fire marker it received in the
last 10 s, or the last sighting, in the last 7 s, of an enemy it no longer
sees. Otherwise it SHALL reject the command with the reason
`no_suspected_contact`, shown to the player as a localized PT-BR and EN
message, and leave the state unchanged. With fog of war off it SHALL accept
any point. It SHALL reject the order during the deployment phase as other
fire orders.

The area SHALL be a disc round the contact: the marker's own uncertainty
radius for a marker, 5 m for a sighting, never under 4 m or over 12 m, and
6 m round any point accepted with fog of war off. For up
to 20 s each ordered soldier SHALL keep his position, face the area and fire
into it at his weapon's rapid fire interval while the disc's centre is
within his weapon's reach. Each round SHALL be aimed at a point of the disc
drawn from the seeded RNG to which his line of fire is not blocked by
terrain, buildings or solid cover (vegetation does not stop it); he SHALL
try up to three points, and with none open he waits and looks again. Each
round SHALL:

- roll to hit the living, fit enemy inside the disc nearest that point, if
  there is one, with chance = weapon accuracy × range factor × (1 − target's
  cover) × the shooter's army and section marksmanship × 0.03, never more
  than 0.03; a hit SHALL do the suppress order's reduced damage;
- add to every living enemy within the disc plus 2 m half the suppression a
  missed aimed round of that weapon adds to its target, reduced by cover as
  for aimed fire;
- spend one round from the soldier's ammunition and reload as other fire;
- give a concealed shooter away and, when the side under fire does not see
  him and an enemy is inside the disc, produce the unseen-fire marker for
  that side, as any shot.

A soldier SHALL stop area fire when its 20 s end, when his rounds left fall to
a quarter of his weapon's full load (rounded up) or below, or when the player
gives his section another order. While he fires into the area his automatic
target selection SHALL be off, except that a soldier who sees an enemy inside
the disc, or within 15 m of himself, SHALL stop area fire and engage that
enemy with aimed fire under his section's fire control. Area fire SHALL fire
under any fire control (it is an explicit order) and leave the section's fire
control setting unchanged. The order, its rolls and its end SHALL be
deterministic: the same seed and commands SHALL give the same state hash at
every tick.

#### Scenario: Fire at a "?"
- **WHEN** an unseen enemy rifleman fires at the player's section from 80 m
  and the player orders Area fire on the "?" that appears
- **THEN** the section fires into the disc round the marker for up to 20 s,
  and the frame shows the order and the disc

#### Scenario: Fire at a lost contact
- **WHEN** an enemy section the player saw walks behind a hedge and the player
  orders Area fire on a ghost within 5 s
- **THEN** the order is accepted with a 5 m disc round the ghost

#### Scenario: No contact there
- **WHEN** fog of war is on and an area-fire command names a point 30 m from
  any marker or sighting the side holds
- **THEN** the simulation rejects it with `no_suspected_contact`, the state is
  unchanged and the player sees the localized reason

#### Scenario: Hits are rare
- **WHEN** a Mauser rifleman fires area fire at a disc holding one standing
  enemy in the open 60 m away
- **THEN** each round's hit chance is about 0.012 and never over 0.03, and a
  hit does the suppress order's reduced damage

#### Scenario: Mostly suppression
- **WHEN** a section of eight riflemen fires area fire for 10 s at a disc
  holding an enemy who is not hit
- **THEN** his suppression rises by half a missed aimed round's suppression
  for every round fired, and he is suppressed or pinned

#### Scenario: Empty bushes
- **WHEN** the enemy has left the disc before the order is given
- **THEN** the rounds hit no one, suppress no one, and still spend ammunition

#### Scenario: It costs cartridges
- **WHEN** a Mauser rifleman with 20 rounds keeps area fire on a disc
- **THEN** he stops when 5 rounds are left, or after 20 s, whichever comes first

#### Scenario: The enemy shows himself
- **WHEN** an enemy inside the disc becomes visible to an area-firing soldier
- **THEN** that soldier stops area fire and fires aimed rounds at him under
  his section's fire control

#### Scenario: The contact's centre is hidden
- **WHEN** a building hides the centre of the disc from a soldier but part
  of the disc is open to him
- **THEN** he fires into the open part of the disc

#### Scenario: No line of fire
- **WHEN** a soldier of the ordered section has a building between him and
  the disc
- **THEN** he holds his position and does not fire while the others do

#### Scenario: Under hold fire
- **WHEN** the section's fire control is Hold fire and the player orders Area
  fire
- **THEN** the section fires into the area and its fire control is still Hold
  fire when the order ends

#### Scenario: One man
- **WHEN** the player box-selects one soldier of a section and orders Area fire
- **THEN** only that soldier fires into the area

#### Scenario: Same result every run
- **WHEN** the same battle with an area-fire order is run twice from the same
  seed and commands
- **THEN** the state hash is the same at every tick
