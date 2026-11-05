# battle-lab Specification

## Purpose
Defines the large-battle sandbox: 3v3 troops of eleven, 120 m rifle and vision range, all-unit LOS cone acquisition, gradual threat scanning and performance requirements for 66 soldiers.

## Requirements

### Requirement: Large battle laboratory

The game SHALL start a 3v3 battle with three player troops and three enemy troops of 11 soldiers each, for 66 units total, from the start menu (beside the bootcamp) and from the sandbox panel. Each troop SHALL be selectable by clicking any of its soldiers. The two sides SHALL deploy about 180 m apart, out of rifle range, so that contact begins when one side moves. As a training battle at Vila Militar, both sides SHALL carry the training ammunition load (5 + 45 rounds). The menu entry SHALL be localized in PT-BR and EN.

#### Scenario: Start 3v3
- **WHEN** the player starts the 3v3 battle in the sandbox
- **THEN** 66 units are created in six squads and each side has three troops

#### Scenario: Start from the menu
- **WHEN** the player chooses the 3 vs 3 battle on the start menu
- **THEN** the battle starts with the same 66 units, without opening the sandbox

#### Scenario: No contact at deployment
- **WHEN** the battle starts and no order is given for 10 s
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

The 3v3 enemy troops SHALL acquire targets, use formation movement, seek cover and path around obstacles. Each side SHALL have a defensive line of short trench bays with sandbag parapets in front of its start. The enemy commander SHALL hold its line at the start; SHALL send one more troop to attack by bounds whenever its side has 1.4 times the player's fit soldiers; when no shot has been fired for 30 s SHALL attack with all but one troop, keeping one in its line; SHALL withdraw a troop that falls under 4 fit soldiers or is mostly pinned; and SHALL have a withdrawn troop that has stopped defend where it stands. A section of either side that has met the enemy and has had no contact for 10 s, while not holding an ordered position, SHALL advance on the last known enemy position, so that a battle does not stall. Before first contact no section is moved by this rule.

#### Scenario: Engagement
- **WHEN** the battle runs for several minutes
- **THEN** units acquire targets, move, occupy cover and engage without all remaining stationary

#### Scenario: Enemy holds in cover
- **WHEN** the battle starts
- **THEN** the enemy troops move into cover facing the player's side before contact

#### Scenario: Counterattack
- **WHEN** the enemy has 1.4 times the player's fit soldiers
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

A deterministic headless run of the 3v3, in which the player's troops hold their own line and counterattack by bounds once they outnumber the enemy 1.25 to 1, SHALL report the battle time, the outcome, each side's casualties, the shots per casualty, the largest number of shots on one tick and the longest stretch with no shot while both sides had fit soldiers. A test SHALL keep these within target bands: the battle ends within 3 to 10 minutes of simulated time, no tick holds more than 8 shots, and no stretch without fire lasts over 75 s (a section crossing the ground between the lines out of range).

#### Scenario: Report within bands
- **WHEN** the report runs with its fixed seed and orders
- **THEN** the battle ends and every figure lies within its band
