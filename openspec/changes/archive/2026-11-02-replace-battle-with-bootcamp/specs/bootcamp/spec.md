## ADDED Requirements

### Requirement: Single bootcamp experience

The game SHALL open into one bootcamp experience and SHALL NOT expose a separate
skirmish, battle or ten-mission campaign entry. The bootcamp SHALL use a single
large map with buildings, trees, roads, obstacles and training stations.

#### Scenario: Bootcamp entry

- **WHEN** the player starts the game
- **THEN** the bootcamp opens without a battle or campaign selection screen

#### Scenario: Legacy modes absent

- **WHEN** the player looks for skirmish, battle, sandbox combat scenario or the
  ten-mission training campaign
- **THEN** no such player-facing entry exists

### Requirement: Troop selection and enemy troop targeting

Clicking any friendly soldier SHALL select the whole friendly troop. Clicking any
enemy soldier SHALL select the whole enemy troop. No select-all command, button or
keyboard shortcut SHALL exist. Attack-like orders SHALL assign each attacker the
nearest living member of the selected enemy troop and retarget within that troop.

#### Scenario: Friendly troop click

- **WHEN** the player clicks any of the 11 friendly soldiers
- **THEN** all 11 are selected and the HUD shows the troop

#### Scenario: Enemy troop click

- **WHEN** the player clicks any soldier of an enemy troop
- **THEN** the whole enemy troop is highlighted as the target

#### Scenario: Select all absent

- **WHEN** the player presses Ctrl/Cmd+A or searches the HUD
- **THEN** no select-all action occurs and no select-all control exists

#### Scenario: Nearest target

- **WHEN** an attack order targets an enemy troop
- **THEN** each attacker engages its nearest living member and retargets inside
  the same troop if that member dies

### Requirement: Bootcamp curriculum

The bootcamp SHALL teach every current player-facing HUD action through ordered
stations: camera, troop selection, move, hold, face, formations, terrain,
obstacles, stances, Hold Fire, attack, suppress, defend, ambush, recon, flank,
pursue, withdraw, rescue and protect-officer. Each station SHALL have instructor
text, an objective, completion feedback and local retry.

#### Scenario: Curriculum coverage

- **WHEN** the player completes the bootcamp
- **THEN** every current HUD action has been taught by at least one station

#### Scenario: Text dialogue

- **WHEN** a station starts
- **THEN** its instructor text is shown and no voice audio is required

#### Scenario: Local failure

- **WHEN** a station objective fails
- **THEN** the player receives feedback and can retry that station without losing
  overall progress

### Requirement: Non-lethal training combat

Combat instruction SHALL use dummies or an 11-soldier training troop that does
not return fire. The player troop SHALL NOT suffer campaign defeat in the
bootcamp. The officer instructor SHALL be a non-controllable NPC at the command
station.

#### Scenario: Training target

- **WHEN** a combat station begins
- **THEN** its dummy or training troop is available and cannot defeat the player

#### Scenario: Officer protection

- **WHEN** the protect-officer station runs
- **THEN** the officer appears in front, is not selectable and the troop can
  execute the protecting posture around him

### Requirement: Real station movement

Station progression SHALL require real pathfinding and walking. The simulation
SHALL NOT teleport the troop between stations.

#### Scenario: March between stations

- **WHEN** a station is completed and the next is enabled
- **THEN** the troop reaches it through ordinary move orders and pathfinding

### Requirement: Bootcamp progress

The bootcamp SHALL persist completed stations and allow resume after reload.

#### Scenario: Resume

- **WHEN** the player reloads after completing a station
- **THEN** the next incomplete station is restored
