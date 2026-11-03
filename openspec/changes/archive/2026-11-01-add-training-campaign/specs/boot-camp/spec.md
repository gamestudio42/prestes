## ADDED Requirements

### Requirement: Ten-mission training campaign

The training campaign SHALL define ten ordered missions with number, title,
briefing, objectives, mechanics, map zone and unlock state. Missions 1 and 2 SHALL
be playable; missions 3-10 SHALL be visible but locked with complete briefings.

#### Scenario: Mission catalog

- **WHEN** the player opens the training campaign
- **THEN** all ten missions are listed in order with title, objective and status

#### Scenario: First two playable

- **WHEN** the player starts a fresh campaign
- **THEN** mission 1 is unlocked, mission 2 unlocks after mission 1, and missions
  3-10 remain locked

#### Scenario: Locked briefing

- **WHEN** the player selects a locked mission
- **THEN** its briefing and objectives remain readable and no mission starts

### Requirement: Campaign overview map

The campaign overview SHALL present an original low-poly sepia camp map with ten
numbered zones, tutorial flow, legend, mission cards, progress summary and
dynamic-event reminders. It SHALL use the shared HUD visual tokens and SHALL NOT
use the supplied reference image as a raster asset.

#### Scenario: Map and legend

- **WHEN** the campaign overview opens
- **THEN** zones 1-10, the tutorial flow, legend, progress and mission list are
  visible at desktop width

#### Scenario: Mission selection

- **WHEN** the player selects a mission card or map zone
- **THEN** the briefing panel updates to that mission and exposes start/replay or
  the locked reason

#### Scenario: Narrow layout

- **WHEN** the viewport is narrow
- **THEN** the map and mission list remain usable without clipping

### Requirement: Mission 1 camera and selection

Mission 1 SHALL teach camera movement, zoom, rotation, single selection, box
selection and select-all. It SHALL contain no opposing force, target dummy or
combat, and SHALL complete only through the player's real input actions.

#### Scenario: Camera lesson

- **WHEN** the player pans with the keyboard or screen edge and changes zoom/rotation
- **THEN** the mission advances through those steps

#### Scenario: Selection lesson

- **WHEN** the player selects one unit, box-selects and selects all
- **THEN** the corresponding steps complete

#### Scenario: No combat

- **WHEN** mission 1 runs
- **THEN** no target, enemy or shot is spawned

### Requirement: Mission 2 movement cover and stance

Mission 2 SHALL require the section to reach marked waypoints, occupy marked cover
and use standing, crouched and prone stances. It SHALL contain no opposing force,
target dummy or combat.

#### Scenario: Reach marked points

- **WHEN** the section reaches all marked movement points
- **THEN** the movement objectives complete

#### Scenario: Occupy cover

- **WHEN** a soldier reaches a marked cover station
- **THEN** the cover objective completes and the stance prompt is shown

#### Scenario: Use all stances

- **WHEN** the player switches standing, crouched and prone
- **THEN** the stance objectives complete

#### Scenario: No combat in mission 2

- **WHEN** mission 2 runs
- **THEN** no target, enemy or shot is spawned

### Requirement: Training progress and unlock

The campaign SHALL persist completed and unlocked missions and the active mission
in `prestes.training.v1`. It SHALL support resume, replay and reset, and SHALL
migrate completed ground/field boot-camp checkpoints to missions 1/2 without
carrying the paused Contact state.

#### Scenario: Complete and unlock

- **WHEN** the player completes mission 1
- **THEN** mission 2 unlocks and the progress is stored locally

#### Scenario: Resume

- **WHEN** the player reloads after completing a mission
- **THEN** the campaign resumes with the same completed/unlocked state

#### Scenario: Replay

- **WHEN** the player replays a completed mission
- **THEN** it starts from the mission beginning without clearing later progress

#### Scenario: Reset

- **WHEN** the player resets training progress
- **THEN** only `prestes.training.v1` is cleared and mission 1 is unlocked

#### Scenario: Migrate old checkpoints

- **WHEN** only `prestes.bootcamp.v1` exists
- **THEN** completed ground/field map to missions 1/2 and Contact is ignored

### Requirement: Training field for areas 1-2

The client SHALL render an original low-poly camp field for areas 1-2, using the
existing deterministic simulation cover volumes and unit spawns, with camp props
and mission markers arranged around them. It SHALL NOT require a new collision
profile or target boards in missions 1-2.

#### Scenario: Camp field

- **WHEN** mission 1 or 2 starts
- **THEN** the field shows the training yard, camp props, roads and marked areas

#### Scenario: Deterministic cover

- **WHEN** a mission runs
- **THEN** movement and cover use the same simulation-owned cover volumes as the
  deterministic engine

#### Scenario: No targets

- **WHEN** mission 1 or 2 starts
- **THEN** no target dummy or target board is rendered

### Requirement: Mission briefing and runtime

The campaign SHALL show a briefing with mission number, title, objective, mechanics,
estimated time and reward before starting. During a mission it SHALL show the
current objective, hint, progress, completion feedback and pause/continue controls.
The mission director SHALL observe frames/events and use the command boundary.

#### Scenario: Briefing

- **WHEN** the player selects a playable mission
- **THEN** the briefing shows its objective, mechanics and start action

#### Scenario: Mission panel

- **WHEN** a mission is running
- **THEN** the mission panel shows the active objective, hint and progress

#### Scenario: Completion

- **WHEN** all required steps are met
- **THEN** the mission pauses, shows completion feedback and offers continue/replay

#### Scenario: Command boundary

- **WHEN** a mission sends setup or player intent
- **THEN** it uses commands and frame/event observation rather than mutating
  simulation state directly

## REMOVED Requirements

### Requirement: Six checkpointed chapters

**Reason**: Replaced by the ten-mission training campaign and its progress model.

**Migration**: Completed ground/field checkpoints map to missions 1/2; other
old checkpoints are ignored until their corresponding mission is implemented.

### Requirement: Training targets before real combat

**Reason**: Missions 1-2 remove targets by design; targets and combat move to
mission 3 when the new training layout supports them.

**Migration**: Use the sandbox target-dummy tool for manual combat drills until
mission 3 is implemented.

### Requirement: Mechanic coverage

**Reason**: Coverage is split across the ten-mission catalog; only missions 1-2
are delivered in this change.

**Migration**: Mission metadata names the mechanics for each phase; later changes
implement and test missions 3-10.

### Requirement: Deterministic acceptance run

**Reason**: Replaced by the campaign acceptance run for missions 1-2 and later
per-mission runs.

**Migration**: The browser test completes missions 1-2, verifies unlock/resume and
records a video; deterministic kernel tests remain unchanged.
