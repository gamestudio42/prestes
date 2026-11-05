## MODIFIED Requirements

### Requirement: AI, cover and obstacles

The 3v3 enemy troops SHALL acquire targets, use formation movement, seek cover and path around obstacles. Each side SHALL have a defensive line of short trench bays with sandbag parapets in front of its start. The enemy commander SHALL hold its line at the start; SHALL send one more troop to attack by bounds whenever its side has 1.4 times the player's fit soldiers it knows of (seen in the last 30 s, each counted once); when no shot has been fired for 30 s SHALL attack with all but one troop, keeping one in its line, toward the nearest known enemy, unseen-fire marker or last contact, and with none toward the player's deployment side; SHALL withdraw a troop that falls under 4 fit soldiers or is mostly pinned; and SHALL have a withdrawn troop that has stopped defend where it stands. A section of either side that has met the enemy and has had no contact for 10 s, while not holding an ordered position, SHALL advance on the last known enemy position, so that a battle does not stall. Before first contact no section is moved by this rule.

#### Scenario: Engagement
- **WHEN** the battle runs for several minutes
- **THEN** units acquire targets, move, occupy cover and engage without all remaining stationary

#### Scenario: Enemy holds in cover
- **WHEN** the battle starts
- **THEN** the enemy troops move into cover facing the player's side before contact

#### Scenario: Counterattack
- **WHEN** the enemy knows of fewer than one player soldier for every 1.4 of its own
- **THEN** at least one enemy troop advances by bounds on the player

#### Scenario: The enemy goes looking
- **WHEN** the player keeps still and no shot is fired for 30 s
- **THEN** two enemy troops attack and one stays in its line

#### Scenario: No stalemate
- **WHEN** a section that met the enemy has had no contact for 10 s and holds no ordered position
- **THEN** it advances on the last known enemy position
