## ADDED Requirements

### Requirement: Objectives on every battle map

Each battle map SHALL define 3 to 5 objectives (the Vila Militar field 2),
each with an id, a localized name (PT-BR and EN), an area (a circle of 12 to
30 m or a polygon), a flag point inside it, a value of 1 to 3 and an initial
owner: neutral, or the side whose deployment zone is nearer when it lies
within 60 m of that zone. Objectives SHALL be data shared by the simulation
and the view, and the content check SHALL verify that every objective is
reachable from both zones and does not overlap another.

#### Scenario: Fazenda objectives
- **WHEN** the Fazenda is loaded
- **THEN** it has objectives at the casa-sede, the engenho, the road crossing and the central trench, with their values and owners

#### Scenario: Content check
- **WHEN** an objective is placed in deep water
- **THEN** the content check reports it unreachable

### Requirement: Capture and hold

A side SHALL take an objective after it has had fit soldiers inside the area
and the enemy none for 10 continuous seconds. While both sides have fit
soldiers inside, the objective SHALL be contested and SHALL NOT change
owner. An objective SHALL keep its owner when its holders leave, until the
enemy takes it. Routed, incapacitated and garrisoned-elsewhere soldiers SHALL
NOT count. Capture SHALL be deterministic.

#### Scenario: Taking the engenho
- **WHEN** a column section stands in the engenho objective for 10 s with no legalist inside
- **THEN** the objective's owner becomes the column

#### Scenario: Contested
- **WHEN** one legalist soldier enters while the column is capturing
- **THEN** the capture stops and the owner does not change

#### Scenario: Held without staying
- **WHEN** the column takes the bridge objective and leaves it
- **THEN** it stays the column's until a legalist captures it

### Requirement: Battle clock and victory

The skirmish page SHALL let the player choose a time limit of 15, 20 or 30
minutes (default 20), localized. The battle SHALL end at the time limit,
or earlier when a side holds every objective for 2 continuous minutes, or
when a side breaks or has no fit soldier. The winner SHALL be: the side
that is not broken when the other breaks; otherwise the side holding more
objective value at the end; equal value SHALL be a draw. The end panel
SHALL show each objective's owner and each side's value, and how the battle
was decided.

#### Scenario: Time runs out
- **WHEN** the clock reaches the limit with the column holding value 4 and the legalists value 3
- **THEN** the battle ends in victory and the panel says it was decided on objectives

#### Scenario: All objectives held
- **WHEN** the column holds every objective for 2 minutes
- **THEN** the battle ends in victory before the time limit

#### Scenario: Draw
- **WHEN** the time limit is reached with equal value
- **THEN** the battle ends in a draw

### Requirement: Flags and objective strip

Each objective SHALL be drawn with a flagpole whose cloth shows its owner's
colour (neutral, column, legalist), an area outline at tactical zoom, and a
capture ring that fills while it is being taken. The top bar SHALL show an
objective strip (name, owner, value, contested state) and the battle clock.
Objectives SHALL be visible to both sides regardless of fog of war; their
owner SHALL be known to both; who is inside SHALL follow fog of war.

#### Scenario: Flag changes colour
- **WHEN** the column takes the praça
- **THEN** the praça's flag shows the column's colour and the strip shows the column as owner

#### Scenario: Fog still hides the men
- **WHEN** an unseen legalist section contests a player-held objective
- **THEN** the strip shows it contested but the legalists are not drawn

### Requirement: The commander plays the objectives

The enemy commander SHALL keep at least one section on or near each of its
objectives of value 2 or more, SHALL send its attacking sections toward the
objective of most value that it does not hold (nearest first on ties), and
SHALL send a section to retake an objective it loses, using only what its
side knows. When the clock leaves less than 3 minutes and it holds less
value, it SHALL commit all but one section to attack.

#### Scenario: Retake
- **WHEN** the player takes a legalist-held objective of value 2
- **THEN** within 60 s a legalist section is ordered toward it

#### Scenario: Last minutes
- **WHEN** 2 minutes are left and the legalists hold less value
- **THEN** all but one legalist section are attacking
