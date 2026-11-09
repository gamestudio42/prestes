# battle-lab Specification

## Purpose
Defines the large-battle sandbox: 3v3 troops of eleven, 120 m rifle and vision range, all-unit LOS cone acquisition, gradual threat scanning and performance requirements for 66 soldiers.

## Requirements

### Requirement: Large battle laboratory

The game SHALL start a 3v3 battle between the player's roster and the enemy's roster, on the battle map the player chose (the Vila Militar field when none is chosen), from the skirmish setup screen and from the sandbox panel. With the default roster each side fields three rifle sections of 11 soldiers, 66 units in all, as before. Each section SHALL be selectable by clicking any of its soldiers. The two sides SHALL deploy in their map's deployment zones, about 180 m apart, out of rifle range, so that contact begins when one side moves. As a training battle, riflemen SHALL carry the training load (5 + 45 rounds) and the other weapons their own training loads. The menu entry SHALL be localized in PT-BR and EN.

#### Scenario: Start 3v3
- **WHEN** the player starts the 3v3 battle in the sandbox with the default roster
- **THEN** 66 units are created in six squads and each side has three troops

#### Scenario: Start from the menu
- **WHEN** the player builds a roster and starts the 3 vs 3 from the skirmish setup screen
- **THEN** the battle starts with the player's roster against the enemy's on the chosen map, without opening the sandbox

#### Scenario: No contact at deployment
- **WHEN** the battle starts on any map with any rosters and no order is given for 10 s
- **THEN** no shot is fired

### Requirement: Long-range vision and rifle

The Mauser SHALL have a 120 m range. Every unit SHALL use a forward cone with range, line-of-sight and cover blocking for target acquisition. Idle units SHALL scan gradually toward nearby threats, while acquisition still requires the target inside the cone and LOS.

#### Scenario: Target inside cone
- **WHEN** an enemy is within range, inside the forward cone and has clear LOS
- **THEN** the unit can acquire and fire at it

#### Scenario: Target outside cone
- **WHEN** an enemy is outside the cone and the unit has not turned
- **THEN** the unit does not acquire it

### Requirement: Large-battle performance

Vision rendering SHALL use batched line geometry. Large unit counts SHALL use instanced character proxies at strategic zoom. Target acquisition SHALL avoid repeated O(n) ally scans per candidate. The 3v3 scenario SHALL have a deterministic headless benchmark.

#### Scenario: Headless 3v3
- **WHEN** the 3v3 benchmark runs 1,000 ticks
- **THEN** it reports tick time and a stable hash without freezing

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

### Requirement: Battle end

The 3v3 SHALL end in victory when every enemy soldier is dead, incapacitated or routed, and in defeat when every player soldier is. On the end the simulation SHALL emit one end event and the view SHALL show an end panel with the result, the battle time and each side's casualties, and actions to restart the battle or return to the menu. The panel text SHALL be localized in PT-BR and EN.

#### Scenario: Victory
- **WHEN** the last fit enemy soldier is incapacitated
- **THEN** the battle ends in victory and the end panel shows the time and casualties

#### Scenario: Restart
- **WHEN** the player chooses restart on the end panel
- **THEN** a new 3v3 battle starts with all 66 soldiers

### Requirement: Battle feel report

A deterministic headless run of the 3v3, in which the player's troops hold their own line and counterattack by bounds once they outnumber the enemy 1.25 to 1, SHALL report the battle time, the outcome, each side's casualties, the shots per casualty, the largest number of shots on one tick, the longest stretch with no shot while both sides had fit soldiers, and bunching: the largest share of a side's fit soldiers (while it has 6 or more), over the battle, standing halted with a mate within 1 m, closer than a man's width (men passing each other on the move do not count). A test SHALL keep these within target bands: the battle ends within 3 to 10 minutes of simulated time, no tick holds more than 8 shots, no stretch without fire lasts over 75 s (a section crossing the ground between the lines out of range), and bunching stays under 15%.

#### Scenario: Report within bands
- **WHEN** the report runs with its fixed seed and orders
- **THEN** the battle ends and every figure lies within its band

#### Scenario: Sections keep their room
- **WHEN** the enemy defends its line and then attacks
- **THEN** fewer than 15% of its fit soldiers ever have a mate within 1 m

### Requirement: Map defensive lines

Each battle map SHALL place each side's defensive line from its own data:
trench bays with parapets on Fazenda, banks, rocks and scrub edges on Serra e
Rio, and barricades and house corners on Bairro. Each line SHALL give every
section of its side a position with cover facing the enemy deployment zone.
The enemy commander's advance toward "the player's deployment side" SHALL use
the active map's player deployment zone.

#### Scenario: Enemy takes its line
- **WHEN** the 3v3 starts on Bairro
- **THEN** the enemy sections move into cover in their line, facing the player's zone, before contact

#### Scenario: Search toward the right side
- **WHEN** the enemy commander attacks with nothing known on Serra e Rio
- **THEN** its sections advance toward the player's deployment zone by a crossing

### Requirement: A decided battle ends

When a side's fit soldiers fall below one fifth of its starting strength and
it has had no contact for 60 s, its remaining fit soldiers SHALL fall back
off the field toward their own map edge as routed, and the battle SHALL end
with the other side's victory once they are routed. Fallen and
incapacitated men stay as casualties. The end panel SHALL count the men who
fell back as routed. With the default rosters, every battle map's battle
report SHALL end with an outcome on three seeds. A battle's length is not
fixed here: map objectives (add-map-objectives) will shape it.

#### Scenario: Last survivors fall back
- **WHEN** the enemy has 5 of 33 fit soldiers left and no contact for 60 s
- **THEN** they rout toward the enemy's edge and the battle ends in victory

#### Scenario: Battles end on every map
- **WHEN** the battle report runs on Fazenda, Serra e Rio and Bairro with seeds 1922, 7 and 42
- **THEN** every run ends with an outcome within the report's 15 minutes

### Requirement: Concealed fire at range

A concealed soldier who fires SHALL be revealed for 4 s only to enemy
observers within 50 m of him; observers farther away SHALL instead receive
the unseen-fire marker near him, as for any unseen shooter. When a section
whose fire control the player has not set settles in concealing vegetation,
its fire control SHALL become "fire on contact" (hold fire until an enemy
is within 60 m). A soldier revealed by his own fire SHALL be marked
"Revelado" in his ring and in the HUD, localized in PT-BR and EN.

#### Scenario: Long-range shot from the capim
- **WHEN** a soldier prone in the capim fires at an enemy 117 m away
- **THEN** the enemy side is not shown him but gets a "?" marker near him

#### Scenario: Close shot gives him away
- **WHEN** the same soldier fires at an enemy 30 m away
- **THEN** that enemy's side sees him for 4 s

#### Scenario: Concealed section holds its fire
- **WHEN** a section with default fire control goes prone in the canefield
- **THEN** it holds fire until an enemy comes within 60 m

### Requirement: The winning side searches

When a side's commander has sections idle and knows of no enemy, those
sections SHALL sweep, in order: the last known enemy positions, then the
concealing vegetation, enclosed yards and crossings within 60 m of them,
then the enemy's deployment zone. Sweeping sections SHALL move by bounds and
attack an enemy they see. Searching SHALL use only what the side knows (fog
of war).

#### Scenario: Search the cane
- **WHEN** the last enemy section hides crouched in the Fazenda canefield after being seen entering it
- **THEN** an idle legalist section sweeps the canefield within 2 minutes

#### Scenario: No cheating
- **WHEN** an enemy section hides somewhere it was never seen near
- **THEN** the searching sections do not head straight for it
