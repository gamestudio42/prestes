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

### Requirement: Skirmish setup screen

The desk menu SHALL show one generic skirmish map; activating it SHALL open
a setup screen where the player chooses, before the 3 vs 3 starts, the map,
the enemy and his own force, and then starts the battle ("Combater") or
returns to the desk ("Voltar"). The map choice SHALL list every battle map
with its preview and description. The player builds his force by adding,
removing and ordering sections. A roster SHALL hold at most 33 men and 6
sections, at most one command section, one machine-gun crew and two
automatic rifles (Esquadra de 5 and Fuzil-metralhador together); the screen
SHALL show the men used, the sections used and why an addition is refused.
A default roster of three rifle sections SHALL be one action away. The
enemy SHALL be one of: "Sorteado" (a preset of the map drawn by seed, the
default), a preset of the map chosen by name, or a roster the player builds
under the same rules. The last map, roster and enemy choice SHALL be saved
in local storage and offered again. Every label SHALL be localized in PT-BR
and EN.

#### Scenario: Setup opens from the desk
- **WHEN** the player activates the skirmish map on the desk
- **THEN** the setup screen opens with the last map, roster and enemy choice

#### Scenario: Back to the desk
- **WHEN** the player chooses "Voltar" on the setup screen
- **THEN** the desk is shown and no battle starts

#### Scenario: Budget refuses an addition
- **WHEN** the roster holds 30 men and the player adds a rifle section of eleven
- **THEN** the addition is refused and the screen says the 33-man limit is reached

#### Scenario: Default roster
- **WHEN** the player chooses the default roster and starts the battle
- **THEN** the battle starts with three rifle sections of eleven, as before

#### Scenario: Roster remembered
- **WHEN** the player builds a roster, fights and returns to the setup screen
- **THEN** the same roster is offered

#### Scenario: Enemy chosen
- **WHEN** the player chooses one of the map's presets for the enemy and starts the battle
- **THEN** the legalists field that preset and no preset is drawn

#### Scenario: Enemy built
- **WHEN** the player builds the enemy's roster and adds a second machine gun
- **THEN** the addition is refused with the same reason as for his own roster

### Requirement: Mixed-force deployment

Each side's sections SHALL deploy across its map's deployment zone in roster
order: the zone's three section starts first, further sections between and
behind them, every soldier on walkable ground. These are the starting
places; a deployment phase may rearrange them. Each section SHALL be one
selectable troop with its own card. When the enemy is left at "Sorteado",
it SHALL field a roster drawn from preset forces for the map, chosen by the
battle seed, so the same seed fields the same enemy.

#### Scenario: Six small sections deploy
- **WHEN** a roster of six sections starts on Bairro
- **THEN** every soldier stands on walkable ground in the column's zone and six troop cards are shown

#### Scenario: Enemy roster is deterministic
- **WHEN** two battles start with the same seed and map, the enemy left at "Sorteado"
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
