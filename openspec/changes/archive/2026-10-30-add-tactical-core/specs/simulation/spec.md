## ADDED Requirements

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

#### Scenario: Shot consumes ammunition

- **WHEN** a unit fires
- **THEN** its ammunition decreases by one and a shot event is emitted

#### Scenario: Hit applies damage

- **WHEN** a shot hits
- **THEN** the target loses health and morale

#### Scenario: Empty magazine reloads

- **WHEN** a unit reaches zero ammunition
- **THEN** it reloads for a short interval and returns to full ammunition

### Requirement: Cover and line of sight

Hit chance SHALL account for distance, target stance and nearby sandbag cover. The
building SHALL block line of sight and movement.

#### Scenario: Crouching or lying reduces exposure

- **WHEN** a target crouches or lies down
- **THEN** its cover value increases and incoming hit chance decreases

#### Scenario: Building blocks fire

- **WHEN** the building lies between a shooter and a target
- **THEN** the shooter does not acquire that target

### Requirement: Morale and suppression

Hits and near misses SHALL lower morale. A unit below the suppression threshold
SHALL have reduced accuracy and be marked suppressed.

#### Scenario: Fire suppresses

- **WHEN** a unit is hit or near-missed repeatedly
- **THEN** its morale drops and the frame marks it suppressed below the threshold

### Requirement: Outcome

The simulation SHALL expose an outcome: playing, victory when every legalist
unit is dead, or defeat when every player unit is dead.

#### Scenario: Victory

- **WHEN** the last legalist unit dies
- **THEN** the frame outcome becomes victory

#### Scenario: Defeat

- **WHEN** the last player unit dies
- **THEN** the frame outcome becomes defeat
