## MODIFIED Requirements

### Requirement: Battle feel report

A deterministic headless run of the 3v3 on the test map, in which the player's troops hold their own line and counterattack by bounds once they outnumber the enemy 1.25 to 1, SHALL report the battle time, the outcome, each side's casualties, the shots per casualty, the largest number of shots on one tick, the longest stretch with no shot while both sides had fit soldiers, bunching (the largest share of a side's fit soldiers, while it has 6 or more, standing halted with a mate within 1 m; men passing each other on the move do not count), the men who went into a position and the close assaults started and won per side. A test SHALL keep these within target bands: the battle ends within 3 to 10 minutes of simulated time, no tick holds more than 8 shots, no stretch without fire lasts over 75 s, and bunching stays under 15%. The report SHALL also run on any authored map named on its command line, for the author's own review.

#### Scenario: Report within bands
- **WHEN** the report runs on the test map with its fixed seed and orders
- **THEN** the battle ends and every figure lies within its band

#### Scenario: Sections keep their room
- **WHEN** the enemy defends its line and then attacks
- **THEN** fewer than 15% of its fit soldiers ever have a mate within 1 m

#### Scenario: Report on an authored map
- **WHEN** the author runs the report naming a saved skirmish map
- **THEN** it prints the same figures for that map, without failing on the bands

### Requirement: Map defensive lines

Each battle map SHALL place each side's defensive line from its own data:
the trench lines, walls, fences, banks, rocks, scrub edges and house
corners the author placed near each side's deployment area. Each line
SHALL give every section of its side a position with cover facing the
enemy deployment area when the map has that much cover; the map check SHALL
warn when a side's area has cover for fewer sections than it deploys. The
enemy commander's advance toward "the player's deployment side" SHALL use
the active map's player deployment area.

#### Scenario: Enemy takes its line
- **WHEN** the 3v3 starts on the test map
- **THEN** the enemy sections move into cover in their line, facing the player's area, before contact

#### Scenario: Search toward the right side
- **WHEN** the enemy commander attacks with nothing known on the test map
- **THEN** its sections advance toward the player's deployment area by a crossing

#### Scenario: Too little cover is a warning
- **WHEN** the author checks a map whose legalist area has cover for one section of three
- **THEN** the check warns that the legalist line has cover for one section
