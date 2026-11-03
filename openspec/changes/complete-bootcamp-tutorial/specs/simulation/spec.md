## ADDED Requirements

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

## MODIFIED Requirements

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
