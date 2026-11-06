## ADDED Requirements

### Requirement: Section types

The game SHALL define section types as data shared by the simulation and the
view, each with a localized name and description (PT-BR and EN), its men and
each man's rank and weapon. The catalog SHALL hold at least: Comando (an
officer with a revolver, a bugler and two riflemen), Esquadra de 4 (four
riflemen), Esquadra de 5 (four riflemen and an automatic rifle), Seção de
fuzileiros (eleven riflemen), Fuzil-metralhador (an automatic rifle and two
riflemen), Metralhadora 7 mm (a crew of four serving one machine gun) and
Irregulares (five men with Winchester .44 rifles, one also with a revolver).
The types are a game organization and SHALL be labelled so in their codex
note; the weapons follow `docs/history/WEAPONS.md` (`macaulay-1974`, pp. 54,
113, 152).

#### Scenario: Catalog is complete
- **WHEN** the content check runs
- **THEN** every section type has men, weapons from the catalog, and a name and description in PT-BR and EN

#### Scenario: Command section steadies others
- **WHEN** a section stands within the officer's aura of a fit command section
- **THEN** it receives the officer aura as the sandbox officer gives it

### Requirement: Pre-battle roster

After choosing the map, the player SHALL build his force on a roster page of
the book menu before the 3 vs 3 starts: adding and removing sections and
ordering them. The roster SHALL hold at most 33 men and 6 sections, at most
one command section, one machine-gun crew and two automatic-rifle teams; the
page SHALL show the men used, the sections used and why an addition is
refused. A default roster of three rifle sections SHALL be one action away.
The last roster SHALL be saved in local storage and offered again.

#### Scenario: Budget refuses an addition
- **WHEN** the roster holds 30 men and the player adds a rifle section of eleven
- **THEN** the addition is refused and the page says the 33-man limit is reached

#### Scenario: Default roster
- **WHEN** the player chooses the default roster and starts the battle
- **THEN** the battle starts with three rifle sections of eleven, as before

#### Scenario: Roster remembered
- **WHEN** the player builds a roster, fights and returns to the roster page
- **THEN** the same roster is offered

### Requirement: Mixed-force deployment

Each side's sections SHALL deploy across its map's deployment zone in roster
order: the zone's three section starts first, further sections between and
behind them, every soldier on walkable ground. Each section SHALL be one
selectable troop with its own card. The enemy SHALL field a roster of the
same budget drawn from preset forces for the map, chosen by the battle seed,
so the same seed fields the same enemy.

#### Scenario: Six small sections deploy
- **WHEN** a roster of six sections starts on Bairro
- **THEN** every soldier stands on walkable ground in the column's zone and six troop cards are shown

#### Scenario: Enemy roster is deterministic
- **WHEN** two battles start with the same seed and map
- **THEN** the enemy fields the same sections in the same places

### Requirement: Section speed and command

The machine-gun crew SHALL march at 0.85 of a rifle section's pace and the
irregulars at 1.1. The officer of a Comando SHALL be an officer for every
rule that needs one: the officer aura within 12 m and the regroup and
protect-officer orders, which SHALL be refused while no fit officer of the
side is on the field.

#### Scenario: Gun crew is slower
- **WHEN** a Metralhadora crew and a rifle section march 100 m on pasture
- **THEN** the crew arrives about 18 % later

#### Scenario: Regroup needs the Comando
- **WHEN** the player orders regroup with no Comando in his roster
- **THEN** the order is refused and a localized reason is shown

#### Scenario: Regroup with the Comando
- **WHEN** the player's roster has a fit Comando officer and he orders a section to regroup
- **THEN** the section regroups on the officer
