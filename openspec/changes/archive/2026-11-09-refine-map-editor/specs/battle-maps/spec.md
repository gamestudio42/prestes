## ADDED Requirements

### Requirement: Crops and grass look

On every battle map, hand-written or authored, cornfields SHALL be drawn as
rows of stalks with leaf cards and tassels, canefields as dense segmented
stalks with long leaves, tall grass (capim) as clumps of 8–14 thin
blade-shaped cards fanning from the base, and scrub as low bushes; none of
them SHALL be drawn as cones. Fields SHALL thin out at their edge and sway
gently. The look SHALL NOT change concealment, which stays a simulation
rule, and SHALL keep the frame budget at strategic zoom.

#### Scenario: Capim as blades
- **WHEN** a capim clump is seen at tactical zoom
- **THEN** it is drawn as blades fanning from its base, with no conical shape

#### Scenario: Corn in rows
- **WHEN** a cornfield is seen at tactical zoom
- **THEN** its stalks stand in parallel rows with leaves and tassels

#### Scenario: Same concealment
- **WHEN** the determinism check runs after the new plant look
- **THEN** the battle goldens are unchanged by the look

### Requirement: Vegetation grows only on land

No vegetation SHALL stand or conceal in deep water, fords, on bridges, on
paved or cobbled roads, inside building footprints or in trench channels, on
any battle map.

#### Scenario: Ford without scrub
- **WHEN** an authored map whose document has scrub cells on a ford is compiled and a man crouches on the ford
- **THEN** no scrub is drawn on the ford and the man is not concealed

### Requirement: Trench lines in battle

A trench line SHALL lower the ground along its line to its depth over a
1.5 m wide floor and raise a parapet on its fire side. A man on the fire step
of a fire trench SHALL have trench cover against threats on the parapet side
and SHALL be hidden from them while crouched or prone; he SHALL have no
trench cover against threats behind him. Cover slots SHALL lie every 1.2 m
along the fire step, facing the parapet. Movement along the floor SHALL be
at the trench-floor speed, and men SHALL leave and enter a trench anywhere
along it. A communication trench SHALL give the same cover from both sides
and SHALL have no slots. The Fazenda's trench lines SHALL be built by the
same rules.

#### Scenario: Fire step protects forward
- **WHEN** a man crouches on the fire step of a north-facing trench and an enemy fires from the north
- **THEN** he has trench cover and the enemy cannot see him

#### Scenario: No protection from behind
- **WHEN** the same man is fired at from the south, behind the trench
- **THEN** he has no trench cover from that shot

#### Scenario: Slots along a long trench
- **WHEN** a section is ordered to defend at a 60 m fire trench
- **THEN** its men take slots on the fire step, facing the parapet

#### Scenario: Dug into the ground
- **WHEN** a man stands on a trench floor
- **THEN** he is drawn below the surrounding ground, and the parapet stands above it

### Requirement: Bridges clear of the ground

A bridge's deck SHALL meet each bank at that bank's ground height with a
short ramp and SHALL stand above the ground and the water along its whole
length; no ground or water SHALL be drawn through the deck or its rails.
Men SHALL walk onto the deck from either bank without a step.

#### Scenario: Deck over a high bank
- **WHEN** a bridge spans a river whose banks are 1.5 m above the water level
- **THEN** the deck is drawn without ground showing through it, and men cross it from bank to bank

### Requirement: Smooth map edges

Rivers SHALL be drawn along smoothed curves of their centrelines, and the
edges of water SHALL follow a traced outline, not 1 m cell steps. Borders
between painted ground materials SHALL be broken by a fixed dither so long
straight staircases do not show, while the ground stays pixel art.
Geometry edges SHALL be antialiased by default; an options toggle "Smooth
edges" (PT-BR "Suavizar bordas") SHALL turn it off and SHALL be remembered.
None of this SHALL change the simulation.

#### Scenario: Diagonal river bank
- **WHEN** a river drawn at 30° to the grid is seen at tactical zoom
- **THEN** its bank follows a smooth line and shows no regular 1 m staircase

#### Scenario: Turn smoothing off
- **WHEN** the player turns "Smooth edges" off and reloads the game
- **THEN** the battle renders without geometry antialiasing and the option is still off

### Requirement: Map document version 2

Map documents SHALL carry a format version. Version 2 SHALL hold trench
lines and SHALL drop the road camber. A version 1 document SHALL load: each
trench object SHALL become a 12 m straight fire trench at its place, facing
the side the object faced, and road cambers SHALL be ignored. Saving SHALL
always write version 2.

#### Scenario: Old file opens
- **WHEN** the author imports a version 1 document with two trench objects
- **THEN** the map holds two 12 m fire trenches facing as the objects did, and exporting writes version 2
