## Purpose

Lets the player choose how hard a battle is, at one of three levels named
for his role (História, Soldado, Oficial), and defines what each level
changes in the simulation, how the choice reaches it and how the levels are
kept apart by measurement.

## ADDED Requirements

### Requirement: Three difficulty levels

The game SHALL offer three difficulty levels, in this order: História
(easy), Soldado (medium) and Oficial (hard). Soldado SHALL be the default.
A battle SHALL be fought at exactly one level, fixed when it starts and
never changed during it. A battle started without a level (the map
editor's playtest, a headless run without one, an older caller) SHALL be
fought at Soldado.

#### Scenario: Default level
- **WHEN** a battle is started with no level given
- **THEN** it is fought at Soldado

#### Scenario: Level fixed for the battle
- **WHEN** a battle is started at Oficial
- **THEN** every tick of that battle applies the Oficial factors until its outcome

### Requirement: What a level changes

A level SHALL change only these, each by one factor per level from a single
table: the hit chance of the enemy side's shots; the enemy commander's
tempo (how often it reviews the field), the strength ratio at which it
counterattacks, the force it sends to retake a lost objective and how early
its last-minutes push starts; the morale the player's side loses to fire,
to losses and to the loss of an officer or its historical figure, and the
rate at which it rallies; and the player's side's ammunition reserve. A
level SHALL NOT add, remove or change sections, weapons, maps, objectives,
the time limit or battle events. For every factor, História SHALL be at
least as favourable to the player as Soldado and Soldado at least as
favourable as Oficial, and at least one factor SHALL differ between each
pair of neighbouring levels. Oficial SHALL be harder for the player than
the balance in force before this change in enemy hit chance and the enemy
commander's counterattack ratio.

#### Scenario: Enemy aim follows the level
- **WHEN** the same enemy rifleman fires at the same target from the same position at História, Soldado and Oficial
- **THEN** his hit chance at História is below that at Soldado, which is below that at Oficial

#### Scenario: Commander counterattacks sooner at Oficial
- **WHEN** the enemy commander holds with a strength ratio of fit soldiers between its Oficial and Soldado counterattack ratios
- **THEN** it counterattacks at Oficial and keeps holding at Soldado

#### Scenario: Morale holds better at História
- **WHEN** a section of the player's side takes the same fire and losses at História and at Oficial
- **THEN** its morale after the fire is higher at História

#### Scenario: Forces unchanged by level
- **WHEN** the same map, rosters and seed are started at each level
- **THEN** both sides field the same sections, soldiers and weapons at every level

### Requirement: Ammunition at Oficial

At Oficial, every soldier of the player's side SHALL start with his
weapon's full magazine and a reserve of 60 % of what he would carry at
Soldado, rounded to the nearest whole round, after his section type's own
ammunition factor. At História and Soldado the reserve SHALL be unchanged.
The enemy side's ammunition SHALL NOT depend on the level. Basis: the
Column's documented shortage of cartridges (Macaulay pp. 113, 151–152;
`docs/history/WEAPONS.md`, `docs/history/FORCES.md`).

#### Scenario: Reduced reserve
- **WHEN** a Column rifleman whose reserve is 45 rounds at Soldado starts a battle at Oficial
- **THEN** he carries a full magazine and a reserve of 27 rounds

#### Scenario: Enemy reserve unchanged
- **WHEN** the same enemy section starts at Soldado and at Oficial
- **THEN** its soldiers carry the same reserve

### Requirement: Choosing the level

The skirmish setup screen SHALL show the three levels as one choice, next
to the time limit, each with its name and a one-line description of what it
means for the player, with the current one marked. The battle SHALL start
at the chosen level. The last level chosen SHALL be saved in local storage
with the rest of the setup and offered again; a saved setup without a level,
or with an unknown one, SHALL offer Soldado. The battle's result screen
SHALL name the level played. Every label and description SHALL be
localized in PT-BR and EN; the PT-BR names SHALL be "História", "Soldado"
and "Oficial", and the EN names "Story", "Soldier" and "Officer".

#### Scenario: Level chosen and started
- **WHEN** the player chooses Oficial on the setup screen and starts the battle
- **THEN** the battle is fought at Oficial

#### Scenario: Level remembered
- **WHEN** the player fights at História and returns to the setup screen
- **THEN** História is offered

#### Scenario: Older saved setup
- **WHEN** the setup saved in local storage has no level
- **THEN** the setup screen offers Soldado and the rest of the saved setup unchanged

#### Scenario: Both languages
- **WHEN** the game runs in EN
- **THEN** the levels read Story, Soldier and Officer with their descriptions in English

### Requirement: Difficulty is deterministic

The level SHALL be part of the battle's configuration and of the hashed
state. The same map, rosters, seed, level and commands SHALL give the same
state hash at every tick; two levels MAY give different hashes. Headless
runs and the battle report SHALL accept a level.

#### Scenario: Same level, same hash
- **WHEN** the same battle is run twice at Oficial from the same seed and commands
- **THEN** the state hash is the same at every tick

#### Scenario: Level in the hash
- **WHEN** the same battle is started at História and at Oficial
- **THEN** the starting state hashes differ

### Requirement: Levels kept apart by measurement

A check SHALL run the headless battle report's scripted player on the
reference skirmish map over 20 fixed seeds at each level and measure the
casualty exchange: the player's side's casualties divided by the enemy's,
each summed over the 20 battles. The check SHALL fail unless the exchange is
at most 0.85 at História, between 0.85 and 1.2 at Soldado, and at least 1.2
at Oficial, and unless it rises from História to Soldado to Oficial. The
scripted player SHALL fight in free fire at every level. The check SHALL
also print each level's win rate, for information only. (The owner,
2026-11-15: the levels are measured by casualties, because the scripted
player's win rate over 20 battles is mostly chance.)

#### Scenario: Levels within their bands
- **WHEN** the difficulty check runs after the factors are tuned
- **THEN** each level's casualty exchange falls within its band, the exchanges rise from História to Oficial, and the check passes

#### Scenario: A level drifts
- **WHEN** a later change brings Oficial's casualty exchange down to 1.05
- **THEN** the difficulty check fails and names Oficial and its exchange

#### Scenario: Win rate is information
- **WHEN** the check runs
- **THEN** it prints each level's wins out of 20 and does not fail on them
