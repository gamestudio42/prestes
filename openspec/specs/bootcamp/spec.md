# bootcamp Specification

## Purpose
Defines the single bootcamp experience: troop-level selection and targeting, the officer instructor, a three-phase playable exercise with mission objectives, non-lethal training fire, local retry and persistent phase progress.

## Requirements

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

The bootcamp SHALL teach every current player-facing HUD action through contextual
drills inside the three exercise phases: camera, troop selection, move, hold, face,
formations, terrain, obstacles, stances, Hold Fire, attack, suppress, defend,
ambush, recon, flank, pursue, withdraw, rescue and protect-officer. Drills SHALL be
optional guidance; the exercise SHALL progress through mission objectives, not by
requiring each HUD action as a separate gating step. Each phase SHALL have
instructor text, an objective, completion feedback and local retry where failure
is possible.

#### Scenario: Curriculum coverage

- **WHEN** the player completes the exercise
- **THEN** every current HUD action has been taught by at least one contextual
  drill or objective

#### Scenario: Text dialogue

- **WHEN** a phase starts or an objective changes
- **THEN** its instructor text is shown and no voice audio is required

#### Scenario: Objectives gate progress

- **WHEN** the player performs an optional drill that is not the current objective
- **THEN** the objective does not advance unless its own completion condition is met

#### Scenario: Local failure

- **WHEN** a phase objective fails
- **THEN** the player receives feedback and can retry that phase without losing
  completed phases

### Requirement: Non-lethal training combat

Combat instruction SHALL use a training troop that opens non-lethal fire. Training
fire SHALL suppress, force cover and pressure morale, but SHALL NOT wound,
incapacitate, rout or kill player soldiers. The player troop SHALL NOT suffer
campaign defeat from training fire. The officer instructor SHALL be a
non-controllable NPC at the command station and SHALL be a valid protection
objective.

#### Scenario: Training target

- **WHEN** a combat phase begins
- **THEN** its training troop is available, can return non-lethal fire and cannot
  defeat the player through wounds or death

#### Scenario: Non-lethal training fire

- **WHEN** a training enemy fires at a player soldier
- **THEN** the soldier may gain suppression and lose morale but remains alive,
  unwounded and not incapacitated

#### Scenario: Officer protection

- **WHEN** the hold phase runs
- **THEN** the officer appears near the line, is not selectable and is evaluated by
  the protection objective

### Requirement: Bootcamp progress

The bootcamp SHALL persist the current phase and completed phases and allow resume
after reload. Resume SHALL restart the saved phase from its phase checkpoint rather
than restoring an arbitrary mid-phase unit snapshot.

#### Scenario: Resume

- **WHEN** the player reloads after completing a phase
- **THEN** the next incomplete phase is restored at its checkpoint

#### Scenario: Migration

- **WHEN** only legacy 27-step bootcamp progress exists
- **THEN** the exercise starts at phase 1 and the legacy data is left untouched

### Requirement: Three-phase playable exercise

The bootcamp SHALL be one playable exercise with three ordered phases: assembly,
assault and hold. Each phase SHALL have a mission objective, instructor text,
completion feedback and a clear transition to the next phase. The exercise SHALL
be fictional training content with no historical mission or figure claim. The
commander SHALL remain the fictional training-cadre instructor and the perspective
SHALL remain section command.

#### Scenario: Exercise begins in assembly

- **WHEN** the player starts the bootcamp
- **THEN** phase 1 opens with an assembly-zone objective and no hostile fire

#### Scenario: Phase transitions

- **WHEN** the current phase objectives are met
- **THEN** the instructor confirms the result and phase 2 or phase 3 begins

#### Scenario: Fictional label

- **WHEN** the exercise runs
- **THEN** the panel identifies it as fictional training and no historical mission
  is created or changed

### Requirement: Exercise objectives

The exercise SHALL evaluate objectives from simulation frames without owning
combat state. Objectives SHALL cover reaching a zone, suppressing training
enemies, securing the training line, holding the line for a fixed duration and
protecting the officer instructor. Every objective SHALL expose live progress to
the HUD.

#### Scenario: Reach objective

- **WHEN** at least the required number of living player soldiers enter the
  assembly zone
- **THEN** the reach objective completes

#### Scenario: Suppress objective

- **WHEN** the required number of training enemies remain suppressed for the
  configured duration
- **THEN** the suppress objective completes

#### Scenario: Secure objective

- **WHEN** the required number of player soldiers occupy the training line and no
  living training enemy remains inside it
- **THEN** the secure objective completes

#### Scenario: Hold objective

- **WHEN** the player keeps the required soldiers in the line for the configured
  tick duration with the officer protected
- **THEN** the exercise completes

### Requirement: Training target discipline

Training dummies and training enemies SHALL NOT be acquired automatically by the
player troop. They SHALL only receive fire after an explicit attack, suppress or
flank order. Real enemies SHALL continue to be acquired automatically.

#### Scenario: No automatic fire on entry

- **WHEN** the bootcamp starts and training targets are visible
- **THEN** player soldiers have no target and fire no shots until an explicit
  combat order

#### Scenario: Explicit training order

- **WHEN** the player issues an attack, suppress or flank order against a training
  target
- **THEN** the ordered soldiers engage that target normally

### Requirement: Exercise failure and local retry

Phase 3 SHALL fail when the training line is lost, the officer instructor is out
of action for the configured duration, or the line is occupied by a training
enemy. On failure the simulation SHALL pause and the HUD SHALL show a localized
reason plus a local retry action. Retry SHALL restart the current phase without
losing completed phases.

#### Scenario: Line lost

- **WHEN** the training line is empty of player soldiers for the configured
  duration
- **THEN** the exercise pauses and reports the lost line

#### Scenario: Officer out of action

- **WHEN** the officer instructor is pinned for the configured duration
- **THEN** the exercise pauses and reports the officer

#### Scenario: Retry phase

- **WHEN** the player activates retry
- **THEN** the current phase restarts with its initial troop, training enemy and
  timer state while completed phases remain completed

### Requirement: Exercise debrief

After the hold objective completes, the exercise SHALL pause and show a debrief
with the completion time, remaining ammunition, maximum suppression, soldier
status and instructor assessment.

#### Scenario: Debrief appears

- **WHEN** the final objective completes
- **THEN** the HUD shows the localized debrief and offers replay and continue

#### Scenario: Debrief values

- **WHEN** the debrief is shown
- **THEN** its time and status values match the final simulation frame
