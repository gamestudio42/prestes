# fog-of-war Specification

## Purpose
Defines fog of war: what each side sees of the enemy, what the player is shown of soldiers he does not see, the marker an unseen enemy's fire leaves, and that the enemy commander decides only from what its own side knows.

## Requirements

### Requirement: Side vision

The simulation SHALL compute, for each side, the set of enemy soldiers that
side sees, and SHALL send it with every frame. A side SHALL see an enemy
soldier when at least one of its fit soldiers has him within 120 m and either
inside his 65-degree vision cone or within 15 m around him, with a line of
sight clear of sight-blocking covers and buildings at the two men's eye
heights. Vision SHALL be deterministic for the same seed and commands and SHALL
be refreshed at least every 0.2 s.

#### Scenario: Seen in the cone
- **WHEN** an enemy stands 80 m in front of a soldier, in the open
- **THEN** the soldier's side sees him

#### Scenario: Hidden behind a wall
- **WHEN** a high stone wall lies between the enemy and every soldier of the side
- **THEN** the side does not see him

#### Scenario: Felt close by
- **WHEN** an enemy is 10 m behind a soldier, outside his cone, with a clear line
- **THEN** the side sees him

### Requirement: Only the seen enemy is shown

Where fog of war is on, the view SHALL draw an enemy soldier only while the
player's side sees him, and the player SHALL be able to select or target only
seen enemies. When a seen enemy drops out of sight, a faded silhouette SHALL
stay where he was last seen for 5 s and then vanish. An enemy seen dead or
incapacitated SHALL stay shown. The player's own soldiers SHALL always be
shown. When the battle ends the fog SHALL lift, so the end panel counts each
side's true losses.

#### Scenario: Out of sight
- **WHEN** an enemy section walks behind a building
- **THEN** its soldiers are no longer drawn, faded silhouettes mark where they
  were for 5 s, and the player cannot order an attack on them

#### Scenario: The fallen stay
- **WHEN** an enemy is seen falling and his position is later out of sight
- **THEN** his body stays shown

### Requirement: Unseen fire marker

When an enemy soldier the player's side does not see fires, the simulation
SHALL emit an unseen-fire event with a marker position near the shooter: off
by an error drawn from the seeded RNG, up to 3 m plus 8% of the distance to the
soldier fired at, and up to half as much for each further
shot from within 6 m of the same spot in the last 10 s, never under 2 m. The
view SHALL show a "?" at the marker for 8 s, start that shot's tracer and
sound from the marker, and SHALL NOT reveal the shooter.

#### Scenario: A shot from the scrub
- **WHEN** an unseen enemy 100 m away fires at the player's section
- **THEN** a "?" appears within 11 m of him, the tracer starts at the "?", and
  he stays hidden

#### Scenario: Repeated fire narrows it down
- **WHEN** the same unseen enemy fires three times in 10 s
- **THEN** the third marker lies within 3 m of him

### Requirement: The enemy knows what it saw

The enemy commander and the contact rule SHALL use only what their side knows:
enemy soldiers it sees or saw in the last 30 s, unseen-fire markers of the
other side's shots, and its sections' last contacts. They SHALL NOT read the
player's real positions or strength. With nothing known, a section going
looking SHALL advance toward the player's deployment side.

#### Scenario: A hidden section is not counted
- **WHEN** the player keeps one of three sections out of the enemy's sight
- **THEN** the enemy commander's strength comparison counts only the two it saw

### Requirement: Where fog of war applies

Fog of war SHALL be on in the 3 vs 3 battle and off in the bootcamp. The
sandbox SHALL offer a fog-of-war toggle, labelled in PT-BR and EN, off when the
player controls both sides.

#### Scenario: Bootcamp shows all
- **WHEN** a bootcamp station runs
- **THEN** every training enemy is drawn as before

#### Scenario: Sandbox toggle
- **WHEN** the player turns fog of war on in the sandbox
- **THEN** unseen legalists stop being drawn
