## ADDED Requirements

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
