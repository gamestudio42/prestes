# simulation Specification

## Purpose
Defines the deterministic game simulation that later missions build on: fixed-step
time, seeded randomness, replayable state and a command/event boundary that keeps
presentation out of the simulation.

## Requirements

### Requirement: Deterministic fixed-step simulation

The simulation SHALL advance in fixed 100 ms ticks. Given the same seed and the
same ordered commands, two runs SHALL produce the same state hash at the same tick.

#### Scenario: Two headless runs match

- **WHEN** two headless runs start from the same seed and apply the same command sequence
- **THEN** both runs report the same state hash at every checked tick

#### Scenario: Different seeds diverge

- **WHEN** two headless runs use different seeds and the same command sequence
- **THEN** the state hashes differ

### Requirement: Headless simulation

The simulation core SHALL run in a headless process without a browser, DOM,
renderer or user interface.

#### Scenario: Headless runner succeeds

- **WHEN** the headless runner executes a scenario for a fixed number of ticks
- **THEN** it completes without loading rendering or UI code and reports a final hash

### Requirement: Command and event boundary

Player and system intentions SHALL enter the simulation as commands, and the
simulation SHALL expose results as events and frames. Frames SHALL include unit
faction and active order paths for presentation, while presentation SHALL NOT
mutate simulation state directly.

#### Scenario: Rejected command produces an event

- **WHEN** a command is invalid for the current state
- **THEN** the simulation emits a rejection event with a machine-readable reason and leaves the state unchanged

#### Scenario: Presentation reads only frames and events

- **WHEN** the presentation layer requests the current state
- **THEN** it receives a read-only frame with units, factions, order paths and events, without a mutable simulation handle

### Requirement: Seeded randomness

All simulation randomness SHALL come from the simulation's seeded random source.
The simulation SHALL NOT use wall-clock time or an unseeded random source.

#### Scenario: Random-dependent behaviour is reproducible

- **WHEN** a scenario that uses randomness is run twice with the same seed and commands
- **THEN** both runs produce the same events and final hash

### Requirement: State hashing

The simulation SHALL expose a stable state hash covering its authoritative state,
including unit faction. Presentation order metadata SHALL not change the world
hash.

#### Scenario: Hash changes after a state mutation

- **WHEN** a valid command changes simulation state
- **THEN** the state hash after the tick differs from the hash before the command

#### Scenario: Hash is stable without changes

- **WHEN** the simulation advances with no commands that change state
- **THEN** the authoritative state hash remains unchanged

#### Scenario: Order metadata does not mutate the world

- **WHEN** an order path is exposed in a frame
- **THEN** reading it does not change the state hash

### Requirement: Active order paths

The simulation SHALL expose active move orders as ordered path points with a
kind and the participating unit ids. An order SHALL clear when all its units
reach the target. When a soldier's route is searched again on the way (a
cover or a soldier in the way), his order's path points SHALL follow the new
route from where he stands, so the drawn route is the one he walks.

#### Scenario: Move command creates a path

- **WHEN** a valid move command is applied
- **THEN** the next frame contains an order with a route from the unit group to the target

#### Scenario: Re-routed soldier updates his path

- **WHEN** a moving soldier finds his way blocked and takes a new route
- **THEN** the next frame's order for him holds the new route's points from his position

#### Scenario: Arrival clears the order

- **WHEN** every unit in the order reaches the target
- **THEN** the next frame no longer contains that order

#### Scenario: Invalid command creates no path

- **WHEN** a move command is rejected
- **THEN** no order path is added to the frame

### Requirement: Stance state

Each unit SHALL have a stance: standing, crouched or prone. The default SHALL be
standing, and stance SHALL be part of the authoritative world state and hash.

#### Scenario: Default stance

- **WHEN** the simulation starts
- **THEN** every unit reports standing in its frame snapshot

#### Scenario: Stance changes the hash

- **WHEN** a valid stance command changes a unit
- **THEN** the state hash differs from before the command

### Requirement: Stance command

A stance command SHALL target one or more units and SHALL be rejected when the
unit list is empty or contains an unknown unit. A rejected stance command SHALL
leave the state and hash unchanged.

#### Scenario: Valid stance command

- **WHEN** a stance command targets existing units
- **THEN** the next frame reports the requested stance for those units

#### Scenario: Invalid stance command

- **WHEN** a stance command has no units or an unknown unit
- **THEN** the simulation emits a rejection event and the hash is unchanged

### Requirement: Squads

Units SHALL belong to a squad. The frame SHALL expose each unit's squad, health,
ammunition, morale, alive flag and cover value. Player units SHALL be grouped into
two sections; the legalist opposition SHALL form one squad.

#### Scenario: Squads are visible

- **WHEN** the skirmish starts
- **THEN** the frame reports two player squads and one legalist squad with their members

#### Scenario: Dead units stay in the frame

- **WHEN** a unit is killed
- **THEN** its alive flag becomes false and it no longer fires or moves

### Requirement: Attack and hold commands

The simulation SHALL accept `attack` commands that set a target for one or more
units and `hold` commands that stop movement and clear the target. Unknown or
dead targets SHALL be rejected without changing the hash.

#### Scenario: Valid attack

- **WHEN** an attack command targets a living enemy
- **THEN** the units acquire that target and fire when in range and line of sight

#### Scenario: Invalid attack

- **WHEN** an attack command targets an unknown or dead unit
- **THEN** the simulation emits a rejection event and the hash is unchanged

#### Scenario: Hold clears orders

- **WHEN** a hold command is applied
- **THEN** the units stop and no longer have an active target

### Requirement: Rifle combat

Alive units SHALL automatically engage visible enemies in range. Each shot SHALL
consume one round, emit a shot event, use the seeded RNG for hit chance and apply
damage on a hit. Units SHALL reload automatically when empty.

Aimed rifle fire SHALL come at the weapon's aimed interval (3 to 5 s for the
Mauser) with a per-soldier variation drawn from the seeded RNG, and a soldier's
first shot at an enemy he has just acquired SHALL wait a reaction delay of 0.5
to 2.5 s, so that a section's fire is spread over time rather than fired as one
volley. Suppressive fire MAY use a faster rate. A rifle hit SHALL take 35 to 55
of a soldier's 100 health, so that two or three hits put him out of action;
when he goes down he SHALL be incapacitated or, with a lower probability drawn
from the seeded RNG, killed outright (a soldier already severely wounded dies).
A soldier who fired within the last 10 s SHALL shift to a new target within
his aimed rhythm, without a fresh reaction delay. Hit chance SHALL fall to 0.6
against a target moving faster than a walk, and to 0.6 for a shooter who is
himself suppressed. These figures are game abstractions of bolt-action
practice, not sourced statistics.

#### Scenario: Shot consumes ammunition

- **WHEN** a unit fires
- **THEN** its ammunition decreases by one and a shot event is emitted

#### Scenario: Hit applies damage

- **WHEN** a shot hits
- **THEN** the target loses health and morale

#### Scenario: Empty magazine reloads

- **WHEN** a unit reaches zero ammunition
- **THEN** it reloads for a short interval and returns to full ammunition

#### Scenario: A section does not fire as one volley

- **WHEN** a section of 11 acquires an enemy section at the same tick and fires
  aimed shots for 30 s
- **THEN** no single tick holds more than three of its shots, and each
  soldier's interval between aimed shots lies between 3 and 5 s

#### Scenario: Two or three hits

- **WHEN** an unwounded soldier is hit by aimed rifle fire
- **THEN** he is out of action (incapacitated or dead) after two or three hits,
  never after one and never needing four

#### Scenario: Same seed, same fire

- **WHEN** the same battle runs twice with the same seed and commands
- **THEN** every shot happens on the same tick with the same result

### Requirement: Cover and line of sight

Hit chance and suppression accumulation SHALL account for directional cover,
distance, target stance and the equipped weapon. A cover volume SHALL protect a
unit only when it lies between that unit and the threat. Low cover SHALL require
crouching or lying down; high cover MAY protect a standing unit. The building
SHALL block line of sight and movement.

Cover SHALL lose its value at close quarters: against a shooter within 10 m a
cover volume SHALL give at most a third of its protection, and against a
shooter inside the same cover volume (in the same trench) none. Whether a cover
lies between the unit and the threat SHALL be decided exactly along the whole
line of fire, so a parapet a metre in front of a soldier counts against a
shooter at any range; line of sight SHALL be decided the same way.

#### Scenario: Cover only protects from the covered side

- **WHEN** a unit is behind a sandbag relative to the shooter
- **THEN** it receives cover against that shooter

#### Scenario: Flanking ignores the front cover

- **WHEN** a shooter is on the open side of a sandbag
- **THEN** the unit does not receive that sandbag's cover against the shooter

#### Scenario: Low cover requires a low stance

- **WHEN** a standing unit is directly behind a low sandbag
- **THEN** it receives less cover than the same unit crouched or prone

#### Scenario: Crouching or lying reduces exposure

- **WHEN** a target crouches or lies down
- **THEN** its cover value increases and incoming hit chance decreases

#### Scenario: Building blocks fire

- **WHEN** the building lies between a shooter and a target
- **THEN** the shooter does not acquire that target

#### Scenario: Assault reaches the parapet

- **WHEN** a soldier in a trench is fired at from 6 m in front of the parapet
- **THEN** the trench gives him at most a third of the cover it gives against
  the same shooter at 60 m

#### Scenario: Clearing the trench

- **WHEN** an attacker inside a trench fires at a defender in the same trench
- **THEN** the trench gives the defender no cover against him

#### Scenario: Parapet against long-range fire

- **WHEN** a crouched soldier sits 2 m behind a sandbag parapet and the shooter
  is 160 m away on the other side
- **THEN** the parapet adds its cover

### Requirement: Morale and suppression

Hits and near misses SHALL raise suppression and lower morale. Suppression SHALL
decay when the unit is no longer under fire. Cover SHALL reduce both hit chance and
suppression accumulation. A unit above the suppression threshold SHALL be
`suppressed`; a unit with high suppression SHALL be `pinned`; a pinned unit with
very low morale SHALL become `panicked`.

#### Scenario: Fire suppresses

- **WHEN** a unit is hit or near-missed repeatedly
- **THEN** its suppression rises, its morale falls and the frame marks it suppressed

#### Scenario: Cover reduces suppression

- **WHEN** two units receive the same fire, one behind cover and one in the open
- **THEN** the covered unit accumulates less suppression

#### Scenario: Suppression decays

- **WHEN** a unit is no longer under fire
- **THEN** its suppression decreases over time

### Requirement: Outcome

The simulation SHALL expose an outcome: playing, victory when every legalist unit
is dead or routed, or defeat when every player unit is dead or routed.

#### Scenario: Victory

- **WHEN** the last combat-effective legalist unit is removed
- **THEN** the frame outcome becomes victory

#### Scenario: Defeat

- **WHEN** the last combat-effective player unit is removed
- **THEN** the frame outcome becomes defeat

#### Scenario: Routed unit counts as lost

- **WHEN** the last player unit routes off the map
- **THEN** the outcome becomes defeat

### Requirement: Facing direction

Every unit SHALL expose a facing direction. A unit with a target SHALL face the
target; otherwise it SHALL face its current movement path; otherwise it SHALL keep
its last facing. An explicit attack order SHALL turn the soldier toward the target.

#### Scenario: Face the target

- **WHEN** a unit has a visible target
- **THEN** its facing vector points toward that target

#### Scenario: Face movement

- **WHEN** a unit moves without a target
- **THEN** its facing vector points along its path

#### Scenario: Keep idle facing

- **WHEN** a unit has no target and no movement path
- **THEN** its facing vector remains at its last value instead of turning to the
  nearest enemy

### Requirement: Pathfinding around obstacles

Move orders SHALL produce a path around the building instead of a straight line
through it.

#### Scenario: Route around the building

- **WHEN** a unit is ordered across the building
- **THEN** its path contains waypoints that avoid the building footprint

#### Scenario: Clear route stays direct

- **WHEN** the straight line to the destination is clear
- **THEN** the path contains only the destination waypoint

### Requirement: Automatic cover seeking

A unit in the open with a visible target SHALL seek a nearby sandbag cover point
that has line of sight to the target, when it is not already moving on a player
order. It SHALL crouch at cover unless the player has explicitly set its stance.

#### Scenario: Seek cover

- **WHEN** a unit is in the open with a target and a reachable sandbag cover point
- **THEN** it moves to the cover position and gains cover

#### Scenario: Player stance wins

- **WHEN** the player explicitly sets a unit's stance
- **THEN** automatic cover does not override that stance

#### Scenario: No cover available

- **WHEN** no cover point has line of sight to the target
- **THEN** the unit keeps fighting from its current position

### Requirement: Tactical target selection

Alive units SHALL choose a visible enemy in range using a deterministic tactical
score. The score SHALL prefer closer enemies, enemies with less cover, suppressed
enemies, officers and enemies not already engaged by an ally. Ties SHALL resolve
to the lowest unit id. A unit SHALL keep its current target while that target
remains visible and its score is close to the best alternative.

#### Scenario: Prefers an exposed target

- **WHEN** a unit can see a nearby enemy in the open and a farther enemy behind cover
- **THEN** it selects the nearer exposed enemy

#### Scenario: Avoids overkill

- **WHEN** two allies already target one visible enemy and another visible enemy has no attacker
- **THEN** the unit prefers the unengaged enemy

#### Scenario: Selection is deterministic

- **WHEN** two simulations run with the same seed and commands
- **THEN** both select the same target for every unit at every tick

#### Scenario: Stable target

- **WHEN** a unit's current target stays visible and no alternative is clearly better
- **THEN** the unit keeps its current target

### Requirement: Flanking movement

A unit with a visible target in cover SHALL flank when an ally is already
engaging that target. The unit SHALL move to a side position with line of sight to
the target, outside the building and not occupied by another unit. At most one
unit SHALL flank a given target at a time, and a flank move SHALL respect its
cooldown.

#### Scenario: One unit flanks a covered target

- **WHEN** a target is in cover and one ally is engaging it
- **THEN** one other unit receives a path to a side position with line of sight

#### Scenario: No duplicate flankers

- **WHEN** a unit is already flanking a target
- **THEN** no second unit receives a flank path to that target

#### Scenario: No flank without line of sight

- **WHEN** every side position is blocked by the building or occupied
- **THEN** the unit keeps its current position and continues firing when possible

### Requirement: Suppression reaction

A suppressed unit below the morale threshold SHALL react when it is not following
a player move order. It SHALL seek nearby cover that is farther from its target
than its current position. When no such cover exists, it SHALL hunker down by
crouching or lying prone. A player stance lock SHALL take precedence over the
automatic posture change.

#### Scenario: Suppressed unit falls back

- **WHEN** a suppressed unit in the open has retrograde cover within reach
- **THEN** it moves to that cover and gains its cover value

#### Scenario: Suppressed unit hunkers down

- **WHEN** a suppressed unit has no retrograde cover
- **THEN** it crouches or lies prone without leaving its position

#### Scenario: Player stance is preserved

- **WHEN** a suppressed unit has an explicit player stance
- **THEN** the reaction does not change that stance

#### Scenario: Player move order is preserved

- **WHEN** a suppressed unit is following a player move order
- **THEN** the reaction does not replace that path

### Requirement: Section movement spacing

A move command that targets more than one unit SHALL assign distinct formation
slots instead of sending every unit to the same point. Slots SHALL be spaced
perpendicular to the travel direction and SHALL remain outside the building. A
unit whose slot has no path SHALL fall back to the ordered destination.

#### Scenario: Section arrives spaced

- **WHEN** two units are ordered to the same destination
- **THEN** their final positions are at least the formation spacing apart

#### Scenario: Single unit keeps a direct route

- **WHEN** one unit is ordered to a destination with a clear line
- **THEN** its path contains only the destination waypoint

#### Scenario: Blocked slot falls back

- **WHEN** a formation slot lies inside the building
- **THEN** that unit uses the ordered destination instead of the blocked slot

### Requirement: Player intent authority

Automatic tactical movement SHALL NOT replace an active player move order. An
explicit attack target SHALL be kept while it remains alive and visible. An
explicit stance SHALL remain locked against automatic posture changes.

#### Scenario: Active move order is not interrupted

- **WHEN** a unit is moving on a player order and a tactical AI opportunity appears
- **THEN** the unit continues on its player path

#### Scenario: Explicit attack survives

- **WHEN** a player orders an attack on a visible enemy
- **THEN** the unit keeps that target while it remains valid

#### Scenario: Stance lock survives

- **WHEN** a player sets a stance and the AI wants another posture
- **THEN** the unit keeps the player's stance

### Requirement: Suppress order

A suppress command SHALL target a living enemy and set the selected living units
to suppress that target's position: the section SHALL spread its rifles over the
living men of the target's squad, nearest the named man first, rather than lay
them all on him. Suppressing units SHALL keep their position, fire at their man
when visible, trade some lethal accuracy for stronger morale damage and keep the
order on the target's troop: when a suppressor's man dies, routs or falls, he
SHALL switch to the nearest visible member of the same squad within 15 m of it.
The order SHALL clear when no such member is in sight or the player issues
another order. They SHALL fire at the fast suppress interval while their man is
not pinned and at the weapon's normal fire interval while he is pinned.

#### Scenario: Suppress a target

- **WHEN** the player suppresses a visible enemy with a selected section
- **THEN** the units stop moving, keep firing at the enemy's position and reduce
  morale there faster than a normal attack

#### Scenario: A suppressing section covers the position

- **WHEN** a section of 11 is ordered to suppress a man of an enemy section of 11
- **THEN** its rifles are laid on several different men of that section

#### Scenario: Suppress eases on a pinned target

- **WHEN** a suppressor's man is pinned
- **THEN** that suppressor keeps firing at him at the weapon's normal fire
  interval instead of the suppress interval

#### Scenario: Suppress keeps on the troop

- **WHEN** a suppressor's man routs and two of his squad mates are visible
  within 15 m of him
- **THEN** that suppressor switches to the nearer of them and keeps suppressing

#### Scenario: Suppression ends

- **WHEN** no member of the target's squad is left in sight, or the player
  orders a move
- **THEN** the suppress order clears and the units resume normal behaviour

#### Scenario: Suppress rejects an invalid target

- **WHEN** a suppress command targets an unknown, dead or friendly unit
- **THEN** the simulation rejects it and leaves the state unchanged

### Requirement: Flank order

A flank command SHALL target a living enemy and assign the selected living units a
side route around that enemy. Each unit SHALL use a valid side position with line
of sight, outside the building and not occupied; when no side position exists it
SHALL keep its current position. A flank order SHALL use the `flank` order kind.

#### Scenario: Player flanks a target

- **WHEN** the player flanks a living enemy with a selected section
- **THEN** each unit receives a flank route around the target and the frame exposes a flank order

#### Scenario: Flank falls back safely

- **WHEN** no flank position has a valid route
- **THEN** the unit stays in place and the command still reports a clear result

### Requirement: Withdraw order

A withdraw command SHALL move the selected living units away from the nearest
enemy toward a reachable rear position. The path SHALL avoid the building and
SHALL use the `withdraw` order kind. Withdrawing units SHALL clear an active
target and stop suppressing or flanking.

#### Scenario: Section withdraws

- **WHEN** the player orders a section to withdraw
- **THEN** every living unit receives a route away from the nearest enemy and the frame marks it as a withdraw order

#### Scenario: Withdraw clears attack state

- **WHEN** a unit with an attack or suppress target withdraws
- **THEN** its target clears and it does not fire while following the withdraw route

### Requirement: Hold position order

A hold-position command SHALL stop the selected living units and mark them as
holding. Holding units SHALL NOT start automatic movement, cover seeking,
flanking or withdrawal, but SHALL keep engaging visible enemies. A move, flank or
withdraw command SHALL clear the hold.

#### Scenario: Hold stops automatic movement

- **WHEN** a unit is holding and a tactical AI opportunity appears
- **THEN** the unit keeps its position

#### Scenario: Hold still fires

- **WHEN** a holding unit sees an enemy in range
- **THEN** it fires without moving

### Requirement: Weapon-driven shooting

A unit SHALL fire using the range, accuracy, fire interval, damage and suppression
of its equipped weapon profile. Global combat constants SHALL NOT override the
equipped profile.

#### Scenario: Weapon defines the shot

- **WHEN** a unit fires
- **THEN** the shot uses its weapon's range, accuracy, damage and suppression values

#### Scenario: Weapon defines the cadence

- **WHEN** a weapon has a fire interval
- **THEN** the unit waits that many ticks between shots

### Requirement: Per-unit ammunition

Each unit SHALL track magazine rounds and reserve rounds for its equipped weapon.
Reloading SHALL move rounds from the reserve into the magazine.

#### Scenario: Ammunition is per unit

- **WHEN** two units fire different amounts
- **THEN** each unit exposes its own magazine and reserve values

#### Scenario: Reload preserves state

- **WHEN** a reload begins
- **THEN** the unit cannot fire until the reload timer ends and the magazine is filled from reserve

### Requirement: Pinned and panic reaction

An uncovered suppressed unit SHALL crouch or lie down unless its stance is locked.
A pinned unit SHALL seek retrograde cover or hunker in place. A panicked unit SHALL
stop fighting and obey no player order until it leaves the map. Panic SHALL
override a player stance lock.

#### Scenario: Uncovered soldier lies down

- **WHEN** a suppressed unit is exposed and has no stance lock
- **THEN** it drops to crouched or prone

#### Scenario: Pinned soldier seeks cover

- **WHEN** a pinned unit has retrograde cover within reach
- **THEN** it moves to that cover

#### Scenario: Panic overrides stance

- **WHEN** a unit becomes panicked with a locked stance
- **THEN** its stance changes and it begins to flee

### Requirement: Routed units

A panicked unit SHALL flee toward the nearest map edge. When it crosses the map
boundary it SHALL become `routed`, emit a `unit_routed` event, stop firing, stop
moving and stop blocking cover. A routed unit SHALL NOT count as a combat-effective
unit.

#### Scenario: Panic reaches the edge

- **WHEN** a panicked unit reaches a map boundary
- **THEN** it becomes routed and a `unit_routed` event is emitted

#### Scenario: Routed unit leaves the fight

- **WHEN** a unit is routed
- **THEN** it cannot fire, move or be targeted

### Requirement: Terrain-aware movement

The simulation SHALL multiply each unit's movement step by the terrain speed
factor at its current position. Terrain SHALL NOT break pathfinding, panic routing
or the map bounds.

#### Scenario: Rough ground slows a unit

- **WHEN** a unit moves across a ridge or trench
- **THEN** it covers less distance per tick than on flat ground

#### Scenario: Terrain does not remove movement

- **WHEN** a unit has a valid path across terrain
- **THEN** it eventually reaches the destination

### Requirement: Terrain-aware cover

Hit chance and suppression SHALL use terrain cover in addition to sandbag and
stance cover. Terrain cover SHALL not stack with sandbag cover.

#### Scenario: Ridge protects the reverse slope

- **WHEN** the ridge lies between a unit and the shooter
- **THEN** the unit receives terrain cover

#### Scenario: Trench protects its occupant

- **WHEN** a unit is inside the trench
- **THEN** incoming fire uses the trench cover value

### Requirement: Frame cover set

The frame SHALL expose the simulation's current cover volumes. Fire, cover
seeking and suppression SHALL use that set.

#### Scenario: Frame includes spawned cover

- **WHEN** a cover is spawned
- **THEN** the next frame includes its geometry

#### Scenario: Cover is simulation-owned

- **WHEN** the view renders cover
- **THEN** it reads the frame's cover list rather than a static client list

### Requirement: Sandbox spawn commands

The simulation SHALL accept sandbox-only commands to spawn cover and target
dummies. Spawn commands SHALL be rejected in non-sandbox mode.

#### Scenario: Spawn accepted in sandbox

- **WHEN** a sandbox simulation receives a valid cover or dummy spawn
- **THEN** the object is added deterministically and included in the state hash

#### Scenario: Spawn rejected outside sandbox

- **WHEN** a mission simulation receives a spawn command
- **THEN** it rejects the command and leaves the state unchanged

### Requirement: Dummy targets

A dummy SHALL be a stationary unit with no weapon, no AI, no movement and no
outcome weight. It SHALL be targetable by player units.

#### Scenario: Dummy can be hit

- **WHEN** a player unit fires at a dummy
- **THEN** the dummy can take damage and die

#### Scenario: Dummy is ignored by outcome

- **WHEN** the outcome is computed
- **THEN** dummies are not counted as legalist combat units

### Requirement: Blocking obstacles

Cover volumes marked as movement blockers SHALL block unit movement and pathfinding.
High cover SHALL also block line of sight. The central house SHALL not remain as an
invisible obstacle.

#### Scenario: Unit cannot walk through a wall
- **WHEN** a unit is ordered across a stone wall
- **THEN** its path goes around the wall

#### Scenario: High wall blocks fire
- **WHEN** a stone wall lies between shooter and target
- **THEN** the shooter does not acquire the target

### Requirement: Cover-aware flank split

A Flank command SHALL divide the selected troop into two halves: one suppresses
the target and holds, the other flanks. Flank positions SHALL prefer cover against
the target.

#### Scenario: Half suppresses
- **WHEN** a six-person troop flanks
- **THEN** three units suppress and three receive flank routes

#### Scenario: Covered flank
- **WHEN** a flank candidate has cover against the target
- **THEN** it is preferred over an exposed candidate

### Requirement: Defensive withdrawal

Withdraw and suppression fallback SHALL prefer defensible high-cover positions
away from the nearest enemy, falling back to a direct retreat when none is reachable.

#### Scenario: Withdraw to cover
- **WHEN** a unit withdraws and a high-cover position away from the enemy is reachable
- **THEN** it moves there

#### Scenario: Direct fallback
- **WHEN** no cover route is reachable
- **THEN** the unit retreats directly away from the enemy

### Requirement: Troop cohesion

Each active soldier SHALL have cohesion that updates from squad spacing and officer
proximity. Low cohesion SHALL reduce movement speed, and auto-cover SHALL prefer
positions near the squad centroid.

#### Scenario: Spacing reduces cohesion
- **WHEN** a soldier moves far from the troop
- **THEN** its cohesion falls below 100

#### Scenario: Cohesion slows movement
- **WHEN** cohesion is low
- **THEN** the movement step is reduced

### Requirement: One-side flank

A group flank SHALL choose a single side of the target and assign every flanker to a
candidate on that side.

#### Scenario: All flankers use one side
- **WHEN** a group flanks
- **THEN** all flank paths finish on the same side of the target

#### Scenario: Flank fallback
- **WHEN** no side candidate has a path
- **THEN** the affected unit falls back to attack

### Requirement: Forward vision cone

A unit SHALL see a target only when the target is within weapon range, inside a
65-degree forward vision cone and not blocked by sight-blocking cover. Target
acquisition, suppression targeting and fire SHALL use the same visibility rule.

#### Scenario: Target in front

- **WHEN** a target stands inside the unit's forward cone with clear line of sight
- **THEN** the unit can acquire and fire at that target

#### Scenario: Target behind

- **WHEN** a target stands behind the unit and outside the forward cone
- **THEN** the unit does not acquire or fire at that target while keeping its
  facing

#### Scenario: Cover interrupts the cone

- **WHEN** sight-blocking cover lies between the unit and an otherwise visible
  target
- **THEN** the unit does not acquire or fire at that target

#### Scenario: Explicit attack turns the soldier

- **WHEN** the player issues an attack, suppress, flank or pursue order
- **THEN** the ordered units face the chosen target

### Requirement: Defensive formation facing

A defend or ambush order SHALL orient its line perpendicular to the threat
direction at the picked point, keep cover candidates on the picked side of a
blocking cover, assign distinct cover destinations per soldier, and face the
nearest threat after arrival when no target or path overrides it.

#### Scenario: Defend behind a wall

- **WHEN** the player orders a section to defend on the near side of a wall
- **THEN** every soldier's destination stays on that side and the line faces the
  threat

#### Scenario: No cover stacking

- **WHEN** several soldiers can reach the same cover candidate
- **THEN** only one uses it and the others use distinct slots or other cover

#### Scenario: Defensive facing

- **WHEN** a defending or ambushing soldier has no target and no path
- **THEN** its facing points at the nearest threat, matching its aim and cone

### Requirement: Non-lethal training fire

The simulation SHALL support units that fire non-lethal training rounds. A
non-lethal attacker SHALL apply suppression and bounded morale pressure to its
target, but SHALL NOT reduce target health, create a wound, incapacitate, rout or
kill a player soldier. A non-lethal attacker SHALL remain a normal target that the
player troop can wound or kill. The hash and deterministic behavior SHALL include
the non-lethal flag and role.

#### Scenario: Non-lethal hit

- **WHEN** a non-lethal training shot hits a player soldier
- **THEN** the soldier remains alive, unwounded and not incapacitated

#### Scenario: Non-lethal suppression

- **WHEN** a non-lethal training shot hits or near-misses a player soldier
- **THEN** suppression rises and morale falls but remains above the training floor

#### Scenario: Training enemy remains vulnerable

- **WHEN** the player troop fires at a training enemy
- **THEN** the training enemy can be wounded or killed normally

#### Scenario: No training rout

- **WHEN** a player soldier is under sustained non-lethal fire
- **THEN** the soldier does not enter panic or rout from that fire

### Requirement: Training roles and phase setup

Spawned units SHALL optionally expose a training role and a non-lethal flag to the
frame. The simulation SHALL accept a training-only phase setup command that clears
active orders, removes prior training enemies, repositions the player troop and
officer at the station checkpoint, resets their training state, restores every
player soldier's magazine and reserve to the weapon profile, optionally pins the
instructor, optionally incapacitates listed player soldiers or the instructor for
casualty drills, and spawns the station enemy. The simulation SHALL accept a
training-only despawn command for a role. Both commands SHALL be rejected outside
training or sandbox contexts.

#### Scenario: Spawn training troop

- **WHEN** the bootcamp spawns a training troop with a training role and non-lethal
  flag
- **THEN** the frame exposes that role and flag and the troop behaves as a
  non-lethal attacker

#### Scenario: Phase setup

- **WHEN** the bootcamp sends a valid phase setup command
- **THEN** prior training enemies are removed, the player troop is placed at the
  station checkpoint with full ammunition and the new training enemy is spawned

#### Scenario: Casualty drill setup

- **WHEN** a phase setup lists a player soldier to incapacitate
- **THEN** that soldier starts the station incapacitated and can be rescued

#### Scenario: Despawn role

- **WHEN** the bootcamp despawns the training-enemy role
- **THEN** training enemies are removed and their orders and target references are
  cleared

#### Scenario: Reject outside training

- **WHEN** a phase setup or role despawn command is sent outside training or
  sandbox mode
- **THEN** the simulation rejects it and leaves the state hash unchanged

### Requirement: Line-of-sight approach

A unit with an attack, suppress, pursue or flank-support intent whose target is
within firing range but not visible SHALL reposition to a reachable point from
which the target is visible, preferring cover that does not block its own
sightline. The approach SHALL use the same range as firing. A unit SHALL NOT take
automatic cover at a point that blocks its line of sight to its current ordered
target.

#### Scenario: Blocked sightline in range

- **WHEN** a soldier with an attack order stands within firing range of its target
  behind sight-blocking cover
- **THEN** within 100 ticks it moves to a point with line of sight and fires

#### Scenario: Same range for approach and fire

- **WHEN** a soldier approaches a target in a scenario whose combat range is
  shorter than the weapon range
- **THEN** it stops at a distance from which it can fire, not beyond the combat
  range

#### Scenario: Cover does not blind the shooter

- **WHEN** an ordered shooter seeks automatic cover
- **THEN** the chosen cover keeps line of sight to the ordered target

### Requirement: Training instructor follow

In training, the officer instructor SHALL follow the player section, moving to
stay within 12 m of the section centroid whenever it is farther than 15 m, and
SHALL keep seeking cover at its destination. A station setup MAY pin the
instructor to its checkpoint instead.

#### Scenario: Follow the section

- **WHEN** the section centroid moves 20 m away from the instructor in training
- **THEN** the instructor moves until it is within 12 m of the centroid

#### Scenario: Pinned instructor

- **WHEN** a station setup pins the instructor to its checkpoint
- **THEN** the instructor does not follow the section

### Requirement: Reaction to fire

A soldier SHALL be under fire for 3 s after a shot is aimed at him or at a
squad mate within 6 m. While under fire, a soldier with no target SHALL turn
toward the shooter. A standing soldier without a player stance lock SHALL
crouch, unless his order keeps him moving (move, withdraw, flank, pursue,
rescue). An idle or holding soldier with the balanced or defensive posture
SHALL take a free cover slot within 6 m that guards against the shooter and
is not closer to him, when one exists. Aggressive soldiers SHALL keep their
stance and place. The reaction SHALL not replace a player's order.

#### Scenario: First shots in the open
- **WHEN** an idle balanced section in the open is fired upon
- **THEN** its soldiers crouch on the first shot, before any is suppressed

#### Scenario: Cover in reach
- **WHEN** an idle soldier under fire has a free cover slot 4 m away on his
  side, guarding against the shooter
- **THEN** he moves into it

#### Scenario: Shot from behind
- **WHEN** a soldier with no target is fired upon from outside his vision
  cone
- **THEN** he turns toward the shooter and, once he sees him, returns fire

#### Scenario: Orders and stance are kept
- **WHEN** a soldier on a move order, or with a player stance lock, is fired
  upon
- **THEN** he keeps his path and his stance

#### Scenario: Aggressive holds
- **WHEN** an aggressive soldier is fired upon
- **THEN** he turns and returns fire without crouching or moving

### Requirement: Suppressive fire on a position

Cover SHALL reduce the suppression a shot causes far less than it reduces the
chance of a hit (to at least 70% of the open-ground value), and a shot SHALL
also suppress every man of the target's side within 4 m of the target at half
strength.

#### Scenario: Rounds keep the bay down

- **WHEN** a shot is fired at a man in a trench bay with a mate 2 m away
- **THEN** the mate's suppression rises too

### Requirement: Nerve returns out of fire

A soldier no longer under fire (suppression under 10) SHALL regain morale
slowly, 0.3 a second, up to 60; only an officer's presence lifts him beyond.

#### Scenario: Pinned with no one shooting

- **WHEN** a soldier pinned by low morale is no longer fired at for a minute
- **THEN** his morale rises and he is no longer pinned
