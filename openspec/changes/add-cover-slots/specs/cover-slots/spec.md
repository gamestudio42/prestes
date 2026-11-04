## Purpose

Gives every cover object explicit positions where one soldier can take cover, so
orders and automatic cover seeking place soldiers precisely and never stack them.

## ADDED Requirements

### Requirement: Slot layout per cover kind

Every cover object SHALL expose cover slots derived deterministically from its
footprint and rotation. Each slot SHALL have a position, a facing, the side of
the cover it protects against, a stance (standing, crouched or prone) and a cover
value. Sandbags, stone walls and low walls SHALL have slots along both long sides
spaced about 1.2 m apart and 1 m off the face (just outside the 0.8 m movement
clearance); a trench SHALL have slots inside
along its length; a barrel SHALL have one slot per side; a building SHALL have
slots at its corners and along its walls, outside the footprint.

#### Scenario: Trench capacity

- **WHEN** the training trench (about 14 m long) is laid out
- **THEN** it exposes at least 8 slots inside it, all outside every
  movement-blocking footprint

#### Scenario: Deterministic layout

- **WHEN** the same cover object is laid out twice
- **THEN** it produces the same slots in the same order

#### Scenario: Rotated cover

- **WHEN** a sandbag line is placed rotated by 90 degrees
- **THEN** its slots rotate with it and keep facing away from the cover face

### Requirement: Slot reservation

A slot SHALL be held by at most one soldier. A soldier SHALL hold at most one
slot. A slot SHALL be released when its soldier is given a new destination,
falls, routs or is despawned, and when its cover object is removed.

#### Scenario: No stacking

- **WHEN** 11 soldiers are ordered into a trench with 8 slots
- **THEN** 8 soldiers take distinct slots and the other 3 take the nearest open
  positions without sharing a slot

#### Scenario: Release on new order

- **WHEN** a soldier in a slot is ordered to move elsewhere
- **THEN** its slot becomes free on the same tick

### Requirement: Slot selection

Movement, defend, ambush and reserve orders and automatic cover seeking SHALL
choose free, reachable slots on the side away from the nearest threat (or the
order's facing when no threat is known), preferring the slot nearest to each
soldier's formation position. An order SHALL only take slots within 4 m of a
formation position, and never more than 2 m closer to the threat than that
position, unless the order point is on the cover itself, which fills that
cover's slots from up to 16 m. Automatic cover seeking SHALL look within 8 m.
Dispersal, recon and the scripted training troop SHALL NOT take slots. A soldier
in a slot SHALL take the slot's stance unless the player locked a stance, face the
slot's facing, and keep line of sight over the cover toward its ordered target.

#### Scenario: Threat side

- **WHEN** a section defends a stone wall with the enemy to the north
- **THEN** every soldier takes a slot on the south side of the wall

#### Scenario: Line of sight over cover

- **WHEN** a soldier in a low-wall slot has an ordered target in range
- **THEN** it can fire at that target over the wall

#### Scenario: Cover does not pull toward the enemy

- **WHEN** a move ends next to cover whose slots lie toward the enemy
- **THEN** the soldiers stay at their formation positions instead of advancing
  into those slots

#### Scenario: Ordering onto a cover object

- **WHEN** the player orders a move onto a trench
- **THEN** the selected soldiers fill its free slots instead of stopping at the
  parapet

### Requirement: Building cover

The simulation SHALL support a `building` cover kind that blocks movement and
sight, offers corner and wall slots, and gives high cover at a corner slot
against threats on the far side of the building. Buildings SHALL come from one
table shared by the simulation and the view.

#### Scenario: Corner cover

- **WHEN** a soldier holds a building corner slot with the enemy beyond the
  building
- **THEN** it reserves that slot outside the footprint and is covered against
  the threat
