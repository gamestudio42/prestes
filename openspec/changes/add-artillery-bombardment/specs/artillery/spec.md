## ADDED Requirements

### Requirement: Gun profiles

The simulation SHALL know two gun profiles, each with a lethal radius, a
wounding radius and a suppression radius around the burst:

| Gun | Lethal | Wounding | Suppression |
|---|---|---|---|
| 75 mm field gun (`field-75`) | 5 m | 15 m | 30 m |
| 105 mm howitzer (`howitzer-105`) | 7 m | 22 m | 40 m |

Historical note: the government brought 75 mm field guns and 105 mm
howitzers against the rebels in 1924 and 1925 (`docs/history/WEAPONS.md`,
Macaulay pp. 85, 93); the radii are game values for low-poly battles at
section scale, not ballistic data.

#### Scenario: The howitzer reaches further
- **WHEN** one 75 mm shell and one 105 mm shell land 18 m from a standing man in the open
- **THEN** the 75 mm shell cannot wound him and the 105 mm shell can

### Requirement: Shell schedule and landing point

Each shell SHALL be scheduled by the simulation, announced by a
`shell_incoming` sim event 2 s (20 ticks) before it lands, with its gun and
landing point, and SHALL land on that tick with a `shell_impact` sim event
at the same point. The landing point SHALL be the aim point offset by a
distance up to the bombardment's spread, uniform over the disc, drawn from
the simulation's seeded RNG and clamped inside the map bounds. Nothing about
a shell SHALL depend on wall-clock time or on the presentation.

#### Scenario: Warned before it lands
- **WHEN** a shell is scheduled to land on tick 1,200
- **THEN** a `shell_incoming` event with its landing point is emitted on tick 1,180 and a `shell_impact` at the same point on tick 1,200

#### Scenario: Within the spread
- **WHEN** a bombardment with a 20 m spread fires 200 shells at one aim point
- **THEN** every landing point lies within 20 m of the aim point

### Requirement: Damage and wounds by distance

On impact, every soldier of either side, alive and not already down, within
the gun's wounding radius SHALL have a chance of being hit: 85% inside the
lethal radius, falling linearly to 10% at the wounding radius, multiplied
by one minus his protection. A hit inside the lethal radius SHALL do heavy
damage (60 to 100) and in the ring outside it lighter damage (20 to 55),
going through the same wound, incapacitation and death rules as a rifle
hit, with the same morale loss for comrades nearby when a man goes down.
Men are resolved in ascending unit id; every draw comes from the seeded RNG.
Shells SHALL hit men of the firing side as well.

#### Scenario: Falloff
- **WHEN** 500 shells from one gun land at fixed distances from standing men in the open (2 m, 10 m and 14 m for the 75 mm gun)
- **THEN** the share of men hit falls with distance and matches the stated chances within statistical tolerance

#### Scenario: Out of reach
- **WHEN** a 75 mm shell lands 16 m from a man
- **THEN** he takes no damage, though he may be suppressed

#### Scenario: Own guns
- **WHEN** a legalist bombardment's shell lands next to a legalist section
- **THEN** those legalist men can be hit like anyone else

### Requirement: Protection from a burst

A man's protection against a burst SHALL be the larger of: the cover he has
against the burst point as against a shooter there (his stance, and walls,
parapets, logs or terrain between him and the burst); 0.8 when he stands in
a trench piece (from any side, unless the shell lands within 1.5 m of him);
the cover of the position he garrisons. Protection SHALL never exceed 0.8.

#### Scenario: Prone men survive more
- **WHEN** the same shells land at the same distances from standing men and prone men in the open
- **THEN** fewer prone men are hit

#### Scenario: Trench shelters from every side
- **WHEN** shells land 8 m behind a manned fire trench (on the side it does not face)
- **THEN** the men in the trench are protected as from the front

#### Scenario: Direct hit on a trench
- **WHEN** a shell lands within 1.5 m of a man in a trench
- **THEN** the trench gives him no protection beyond his stance

### Requirement: Suppression and morale

On impact, every soldier within the gun's suppression radius SHALL gain
suppression and lose morale, both scaled by how close he is (full at the
burst, none at the radius) and reduced by his protection, at a strength
that pins a man in the open within a few close bursts. The army's and
section's morale values (`unitValues`) SHALL apply as for small-arms fire.

#### Scenario: A near miss pins
- **WHEN** two 75 mm shells land 8 m from a standing section in the open and nobody is hit
- **THEN** the section's men are pinned or close to it, and their morale has fallen

#### Scenario: Far bursts unsettle less
- **WHEN** the same two shells land 25 m from the section
- **THEN** its men gain far less suppression and lose far less morale

### Requirement: Craters

A shell that lands on dry, open ground (no cover piece, building or water
there) and with no crater within 3 m SHALL leave a crater, while the battle
holds fewer than 40. A crater SHALL be low cover of 1.5 m radius (sheltering
prone and crouched men, not standing men), SHALL NOT block movement or
sight, and SHALL be part of the battle's cover for the rest of the battle,
so men can take it and the hashed state includes it.

#### Scenario: Shell hole as cover
- **WHEN** a shell leaves a crater and a section seeks cover nearby
- **THEN** the crater is among the cover it can take, and a prone man in it has cover against fire

#### Scenario: Crater cap
- **WHEN** 60 shells land on open ground far apart
- **THEN** the battle holds 40 craters and later shells leave none

### Requirement: Artillery is deterministic

Pending shells, active bombardments and craters SHALL be part of the hashed
state. The same map, seed and commands SHALL give the same shells on the
same ticks at the same points with the same results. A battle with no
bombardment SHALL draw no random numbers and add nothing to the hashed
state for artillery, so its hashes are unchanged.

#### Scenario: Same bombardment twice
- **WHEN** a map with a bombardment runs twice with the same seed and commands
- **THEN** the shells land on the same ticks at the same points and the state hashes match on every tick

#### Scenario: Maps without artillery unchanged
- **WHEN** the determinism check runs the existing battle maps, none with a bombardment
- **THEN** their recorded hashes match
