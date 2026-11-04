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
enemy soldier SHALL select the whole enemy troop, including a click on a fallen
member while the troop still has living members. No select-all command, button
or keyboard shortcut SHALL exist. Attack and suppress orders SHALL spread the
attackers over the living members of the selected enemy troop: each attacker
takes the nearest member that has fewer than ceil(attackers / members) shooters.
Flank and pursue orders SHALL assign each attacker the nearest living member. All
of them SHALL retarget within that troop when a member falls.

#### Scenario: Friendly troop click

- **WHEN** the player clicks any of the 11 friendly soldiers
- **THEN** all 11 are selected and the HUD shows the troop

#### Scenario: Enemy troop click

- **WHEN** the player clicks any soldier of an enemy troop, alive or fallen
- **THEN** the whole enemy troop is highlighted as the target while it has living
  members

#### Scenario: Select all absent

- **WHEN** the player presses Ctrl/Cmd+A or searches the HUD
- **THEN** no select-all action occurs and no select-all control exists

#### Scenario: Fire spread across the troop

- **WHEN** 11 soldiers attack or suppress an enemy troop of 6
- **THEN** every living member of the troop is engaged and no member has more
  than two attackers

#### Scenario: Nearest target

- **WHEN** a flank or pursue order targets an enemy troop
- **THEN** each attacker engages its nearest living member and retargets inside
  the same troop if that member dies

### Requirement: Bootcamp curriculum

The bootcamp SHALL teach and exercise every current player-facing HUD action
through mandatory station objectives: camera, troop selection, box selection,
move, hold, face, formations, stances, postures, Hold Fire, alternating movement,
attack, suppress, flank, withdraw, advance, defend, ambush, recon, pursue,
disperse, reserve, regroup, rescue and protect-officer, plus the officer aura and
officer loss. Optional drills SHALL NOT be the only place a mechanic is taught.
Each station SHALL have instructor text, objectives, completion feedback and local
retry where failure is possible.

#### Scenario: Curriculum coverage

- **WHEN** the player completes the exercise
- **THEN** every current HUD action has been required by at least one station
  objective

#### Scenario: Text dialogue

- **WHEN** a station starts or an objective changes
- **THEN** its instructor text is shown and no voice audio is required

#### Scenario: Objectives gate progress

- **WHEN** the player performs an action that is not part of the current
  objectives
- **THEN** no objective advances unless its own completion condition is met

#### Scenario: Local failure

- **WHEN** a station objective fails
- **THEN** the player receives feedback and can retry that station without losing
  completed stations

### Requirement: Non-lethal training combat

Combat instruction SHALL use training troops that open non-lethal fire. Training
fire SHALL suppress, force cover and pressure morale, but SHALL NOT wound,
incapacitate, rout or kill player soldiers. The player troop SHALL NOT suffer
campaign defeat from training fire. The officer instructor SHALL be a
non-controllable NPC that accompanies the section and SHALL be a valid protection
objective. Station 6 MAY incapacitate one player soldier and the instructor
through the training setup, never through training fire.

#### Scenario: Training target

- **WHEN** a combat station begins
- **THEN** its training troop is available, can return non-lethal fire and cannot
  defeat the player through wounds or death

#### Scenario: Non-lethal training fire

- **WHEN** a training enemy fires at a player soldier
- **THEN** the soldier may gain suppression and lose morale but remains alive,
  unwounded and not incapacitated

#### Scenario: Officer protection

- **WHEN** a station with a protection objective runs
- **THEN** the instructor is near the section, is not selectable and is evaluated
  by the protection objective

### Requirement: Bootcamp progress

The bootcamp SHALL persist the current station and completed stations and allow
resume after reload. Resume SHALL restart the saved station from its checkpoint
rather than restoring an arbitrary mid-station unit snapshot.

#### Scenario: Resume

- **WHEN** the player reloads after completing a station
- **THEN** the next incomplete station is restored at its checkpoint

#### Scenario: Three-phase migration

- **WHEN** only progress from the three-phase exercise exists
- **THEN** assembly maps to station 1, assault to station 2, hold to station 7,
  a completed exercise stays completed, and the old data is replaced by the new
  format

#### Scenario: Migration

- **WHEN** only legacy 27-step bootcamp progress exists
- **THEN** the exercise starts at station 1 and the legacy data is left untouched

### Requirement: Exercise objectives

The exercise SHALL evaluate objectives from simulation frames and events without
owning combat state. Objective kinds SHALL cover selection, zone reach, order
effect (an order is active and its effect is observed in the frame), suppression,
target hit, hold fire, facing, flank position, bounding advance, withdrawal,
defend in cover, ambush trigger, hold duration, recon report, pursuit, dispersal,
reserve, regroup, rescue completion, officer protection and cohesion. Every
objective SHALL expose live progress to the HUD.

#### Scenario: Reach objective

- **WHEN** at least the required number of living player soldiers enter the zone
- **THEN** the reach objective completes

#### Scenario: Suppress objective

- **WHEN** the required number of training enemies remain suppressed for the
  configured duration
- **THEN** the suppress objective completes

#### Scenario: Secure objective

- **WHEN** the required number of player soldiers occupy the training line and no
  living training enemy remains inside it
- **THEN** the secure objective completes

#### Scenario: Flank objective

- **WHEN** at least the required number of ordered soldiers reach a position on
  the target troop's side at the configured angle
- **THEN** the flank objective completes

#### Scenario: Rescue objective

- **WHEN** the incapacitated soldier is carried, treated and evacuated
- **THEN** the rescue objective completes

#### Scenario: Hold objective

- **WHEN** the player keeps the required soldiers in the line for the configured
  tick duration with the instructor protected
- **THEN** the hold objective completes

### Requirement: Training target discipline

Training dummies and training enemies SHALL NOT be acquired automatically by the
player troop. They SHALL only receive fire after an explicit attack, suppress,
flank, pursue or ambush order, or while the troop defends an area the training
enemy enters. Real enemies SHALL continue to be acquired automatically.

#### Scenario: No automatic fire on entry

- **WHEN** the bootcamp starts and training targets are visible
- **THEN** player soldiers have no target and fire no shots until an explicit
  combat order

#### Scenario: Explicit training order

- **WHEN** the player issues an attack, suppress, flank, pursue or ambush order
  against a training target
- **THEN** the ordered soldiers engage that target normally

### Requirement: Exercise failure and local retry

A station SHALL fail when its configured failure condition holds: the training
line is empty for the configured duration, the instructor is pinned or out of
action beyond the configured duration where the station protects it, or a
training enemy occupies a held zone. On failure the simulation SHALL pause and the
HUD SHALL show a localized reason plus a local retry action. Retry SHALL restart
the current station without losing completed stations.

#### Scenario: Line lost

- **WHEN** the held line is empty of player soldiers for the configured duration
- **THEN** the exercise pauses and reports the lost line

#### Scenario: Officer out of action

- **WHEN** the instructor is pinned for the configured duration in a station that
  protects it
- **THEN** the exercise pauses and reports the officer

#### Scenario: Retry phase

- **WHEN** the player activates retry
- **THEN** the current station restarts with its initial troop, training enemy,
  ammunition and timer state while completed stations remain completed

### Requirement: Exercise debrief

After the final station completes, the exercise SHALL pause and show a debrief
with the completion time, remaining ammunition, maximum suppression, soldier
status, stations completed and instructor assessment.

#### Scenario: Debrief appears

- **WHEN** the final objective completes
- **THEN** the HUD shows the localized debrief and offers replay and continue

#### Scenario: Debrief values

- **WHEN** the debrief is shown
- **THEN** its time and status values match the final simulation frame

### Requirement: Seven-station exercise

The bootcamp SHALL be one playable exercise with seven ordered stations: 1
formation and movement, 2 fire, 3 maneuver, 4 defense, 5 recon and pursuit, 6
wounded and officer, 7 final combined exercise. Each station SHALL have a title,
instructor text, mandatory objectives, completion feedback and a transition to
the next station. The exercise SHALL be fictional training content with no
historical mission or figure claim. The commander SHALL remain the fictional
training-cadre instructor and the perspective SHALL remain section command.

#### Scenario: Exercise begins at station 1

- **WHEN** the player starts the bootcamp with no saved progress
- **THEN** station 1 opens with its formation objectives and no hostile fire

#### Scenario: Station transitions

- **WHEN** every mandatory objective of the current station is met
- **THEN** the instructor confirms the result and the next station begins at its
  checkpoint

#### Scenario: Fictional label

- **WHEN** the exercise runs
- **THEN** the panel identifies it as fictional training and no historical mission
  is created or changed

### Requirement: Mechanic objectives per station

Each station SHALL gate progress on objectives that are verified from simulation
frames and events, not on button presses alone. The stations SHALL require:

- station 1: select the section, box-select, move to a zone, change formation,
  change stance and reach the assembly zone with five soldiers;
- station 2: attack a training target until it is hit, suppress a training troop
  for the configured duration, hold fire while a target is visible, and face a
  marked direction;
- station 3: flank a suppressed training troop so that flankers reach its side,
  advance with alternating movement (bounding) to a marked line, and withdraw out
  of a marked danger zone;
- station 4: defend a marked area with soldiers in cover, trigger an ambush when
  a training troop enters the zone, and hold position under training fire for the
  configured duration;
- station 5: obtain a recon report from a marked area, pursue a withdrawing
  training target, disperse in a marked area, place soldiers in reserve, and
  regroup the section within the cohesion band;
- station 6: rescue an incapacitated soldier through carry, treatment and
  evacuation, keep the section in protect-officer posture near the instructor,
  and keep cohesion while the instructor is out of action;
- station 7: suppress, take and hold the training line with the instructor
  protected, as in the former assault and hold phases.

#### Scenario: Effect, not click

- **WHEN** the player activates an order button but the ordered effect does not
  happen (for example no flanker reaches the target's side)
- **THEN** the objective does not complete

#### Scenario: Curriculum coverage

- **WHEN** the player completes the exercise
- **THEN** every order in the order catalogue, every stance, every posture,
  formation change, Hold Fire, alternating movement, rescue and the officer aura
  and loss have been required by at least one objective

### Requirement: Instructor accompanies the section

The officer instructor SHALL stay a non-controllable NPC who accompanies the
section during each station, staying within aura range of the section unless a
station places it elsewhere, and who gives the station's orders through
instructor text and officer callouts.

#### Scenario: Instructor follows

- **WHEN** the section moves at least 15 m during a station
- **THEN** the instructor moves to stay within 12 m of the section centroid unless
  the station pins the instructor to a checkpoint

#### Scenario: Instructor gives the orders

- **WHEN** a station or objective starts
- **THEN** the instructor's callout names the order the player must give

### Requirement: Station ammunition refill

At the start of every station, and on retry, the player troop SHALL have its
magazine and reserve restored to the training ammunition load.

#### Scenario: Refill on station start

- **WHEN** station 3 starts after the section spent ammunition in station 2
- **THEN** every living player soldier has 5 rounds in the magazine and 45 in
  reserve

### Requirement: Training ground course

The bootcamp SHALL take place on a dedicated training map, a fictional army
training field near Vila Militar / Deodoro, Rio de Janeiro, in 1922. Historical
note: Prestes served in the 1st Engineer Company at Deodoro in 1922 and the
conspiracy was organized around Vila Militar (Macaulay, *The Prestes Column*,
1974, ch. II, pp. 37-38); the field, its layout and its officers are fictional.
The commander of every station is the officer instructor (an NPC) and the
perspective is the player's training section.

The map SHALL lay out one course along a road with one area per station, in
station order: parade ground and barracks (formation), firing range (fire),
maneuver field (maneuver), training trench line (defense), farm hamlet (recon),
aid post (wounded) and assault line (final). Each station SHALL start with the
section at the entry of its own area, and its objectives, markers and training
troop SHALL lie inside that area. The road SHALL connect the areas in course
order on the map; between stations the section is placed at the next entry and
the camera moves to it. The training map SHALL NOT contain the props of the
default sandbox map. Sandbox tools opened during the bootcamp act on the
training map. Area names SHALL come from the PT-BR and EN locale catalogs.

#### Scenario: Stations follow the road

- **WHEN** the player completes a station
- **THEN** the next station starts in the next area along the road and the
  section starts at that area's entry

#### Scenario: Station content stays in its area

- **WHEN** any station starts
- **THEN** its markers, objective points and training troop are inside its own
  area

#### Scenario: No sandbox props

- **WHEN** the training map is built
- **THEN** it contains only the training ground's covers, buildings and props,
  and the same data drives the simulation and the view

#### Scenario: Saved progress resumes

- **WHEN** a player with saved progress at station 4 continues
- **THEN** station 4 starts in the training trench area

### Requirement: Commander balloon

The instructor's current order SHALL be shown in a speech balloon over the
instructor in the world and in the training panel, and SHALL change when the
current objective changes. When the instructor is off screen the balloon SHALL
be hidden and the panel SHALL still show the order. The text SHALL come from the
PT-BR and EN locale catalogs; no voice audio is required.

#### Scenario: Balloon shows the order

- **WHEN** an objective becomes current
- **THEN** a balloon over the instructor shows that objective's order

#### Scenario: Off-screen instructor

- **WHEN** the camera moves so the instructor is off screen
- **THEN** the balloon is hidden and the panel still shows the order
