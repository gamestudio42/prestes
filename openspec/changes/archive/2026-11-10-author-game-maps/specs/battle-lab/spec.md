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

### Requirement: Large battle laboratory

The game SHALL start a 3v3 battle between the player's roster and the enemy's roster, on the battle map the player chose (the test map, `campo-de-provas`, when none is chosen), from the skirmish setup screen and from the sandbox panel. With the default roster each side fields three rifle sections of 11 soldiers, 66 units in all, as before. Each section SHALL be selectable by clicking any of its soldiers. The two sides SHALL deploy in their map's deployment zones, about 180 m apart, out of rifle range, so that contact begins when one side moves. As a training battle, riflemen SHALL carry the training load (5 + 45 rounds) and the other weapons their own training loads. The menu entry SHALL be localized in PT-BR and EN.

#### Scenario: Start 3v3
- **WHEN** the player starts the 3v3 battle in the sandbox with the default roster
- **THEN** 66 units are created in six squads and each side has three troops

#### Scenario: Start from the menu
- **WHEN** the player builds a roster and starts the 3 vs 3 from the skirmish setup screen
- **THEN** the battle starts with the player's roster against the enemy's on the chosen map, without opening the sandbox

#### Scenario: No contact at deployment
- **WHEN** the battle starts on any map with any rosters and no order is given for 10 s
- **THEN** no shot is fired

### Requirement: A decided battle ends

When a side's fit soldiers fall below one fifth of its starting strength and
it has had no contact for 60 s, its remaining fit soldiers SHALL fall back
off the field toward their own map edge as routed, and the battle SHALL end
with the other side's victory once they are routed. Fallen and
incapacitated men stay as casualties. The end panel SHALL count the men who
fell back as routed. With the default rosters, the test map's battle report
SHALL end with an outcome on three seeds. A battle's length is not fixed
here: map objectives (add-map-objectives) will shape it.

#### Scenario: Last survivors fall back
- **WHEN** the enemy has 5 of 33 fit soldiers left and no contact for 60 s
- **THEN** they rout toward the enemy's edge and the battle ends in victory

#### Scenario: Battles end on every map
- **WHEN** the battle report runs on the test map (`campo-de-provas`) with seeds 1922, 7 and 42
- **THEN** every run ends with an outcome within the report's 15 minutes

### Requirement: The winning side searches

When a side's commander has sections idle and knows of no enemy, those
sections SHALL sweep, in order: the last known enemy positions, then the
concealing vegetation, enclosed yards and crossings within 60 m of them,
then the enemy's deployment zone. Sweeping sections SHALL move by bounds and
attack an enemy they see. Searching SHALL use only what the side knows (fog
of war).

#### Scenario: Search the cane
- **WHEN** the last enemy section hides crouched in a field of tall crop after being seen entering it
- **THEN** an idle legalist section sweeps that field within 2 minutes

#### Scenario: No cheating
- **WHEN** an enemy section hides somewhere it was never seen near
- **THEN** the searching sections do not head straight for it
