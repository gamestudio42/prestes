# force-roster Specification

## Purpose
Defines the forces each side fields in a skirmish: the section types, the skirmish setup screen where both rosters are built or chosen, how mixed forces deploy, and the speed and command of a section.

## Requirements

### Requirement: Section types

The game SHALL define section types as data shared by the simulation and the
view, each belonging to one army and each with a localized name and
description (PT-BR and EN), its men and each man's rank and weapon. The
catalog SHALL hold at least:

- for the Coluna Prestes: Comando do destacamento (an officer with a
  revolver, a bugler and two riflemen), Fogão (a chief and ten riflemen),
  Meio fogão (four riflemen), Fogão com fuzil-metralhador (four riflemen and
  an automatic rifle), Guarnição de fuzil-metralhador (an automatic rifle
  and two riflemen), Peça de metralhadora (a crew of four serving one 7 mm
  machine gun), Potreada (five men with Winchester .44 rifles, one also with
  a revolver) and Veteranos gaúchos (eight riflemen);
- for the Forças legalistas: Comando de companhia (an officer with a
  revolver, a bugler and two riflemen), Infantaria do Exército (eleven
  riflemen), Brigada Militar (eleven riflemen), Provisórios (eight men with
  Mauser and Winchester rifles), Peça de metralhadora and Guarnição de
  fuzil-metralhador;
- for the Batalhões patrióticos: Chefe e capangas (a chief with a revolver
  and a Winchester and three men with Winchesters), Jagunços (six men with
  Winchester .44 rifles, one also with a revolver), Jagunços com Mauser (five
  riflemen and an automatic rifle), Voluntários (ten riflemen) and Cangaceiros (six riflemen, each
  also with a revolver).

A name that is a period term SHALL cite its source in the section's
compendium note, and a name that is a game organization SHALL be labelled
so there. The Cangaceiros' note SHALL say that their fighting the column is
dramatized, and the type SHALL name no person. The weapons follow
`docs/history/WEAPONS.md` and the forces `docs/history/FORCES.md`
(`macaulay-1974`, pp. 48, 111–113, 151–152, 189–192, 228).

#### Scenario: Catalog is complete
- **WHEN** the content check runs
- **THEN** every section type has an army, men, weapons from the catalog, and a name and description in PT-BR and EN

#### Scenario: Command section steadies others
- **WHEN** a section stands within the officer's aura of a fit command section of its own army
- **THEN** it receives the officer aura as the sandbox officer gives it

#### Scenario: The fogão is the column's rifle section
- **WHEN** the player adds a Fogão to the column's roster
- **THEN** the roster gains a section of eleven men with Mauser rifles, and its compendium note cites the source of the name

#### Scenario: Cangaceiros are labelled
- **WHEN** the player reads the Cangaceiros' compendium note
- **THEN** it says the commissioning is documented and their fighting the column is dramatized

### Requirement: Skirmish setup screen

The desk menu SHALL show one generic skirmish map; activating it SHALL open
a setup screen where the player chooses, before the 3 vs 3 starts, the map,
the enemy and his own force, and then starts the battle ("Combater") or
returns to the desk ("Voltar"). The map choice SHALL list every battle map
with its preview and description. The player builds his force, of the
Coluna Prestes, by adding, removing and ordering sections of that army. A
roster SHALL hold at most 33 men and 6 sections, at most one command
section, one machine-gun crew, one section of cangaceiros and two automatic
rifles (Fogão com fuzil-metralhador, Guarnição de fuzil-metralhador and
Jagunços com Mauser together); the screen SHALL show the men used, the sections used and why an
addition is refused. A default roster of three rifle sections of the army
SHALL be one action away. The enemy SHALL be one of: "Sorteado" (a preset of
the map drawn by seed, the default), a preset of the map chosen by name, or
a roster the player builds under the same rules for one enemy army he
chooses, the Forças legalistas or the Batalhões patrióticos. A preset SHALL
show the armies it holds. The last map, roster and enemy choice SHALL be
saved in local storage and offered again; a roster saved before the armies
existed SHALL be offered with each older section type mapped to its
successor, and a type with no successor replaced by its army's rifle
section, which the screen SHALL say once. Every label
SHALL be localized in PT-BR and EN.

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
- **THEN** the battle starts with three Fogões of eleven

#### Scenario: Roster remembered
- **WHEN** the player builds a roster, fights and returns to the setup screen
- **THEN** the same roster is offered

#### Scenario: Enemy chosen
- **WHEN** the player chooses one of the map's presets for the enemy and starts the battle
- **THEN** the enemy fields that preset, each section in its army, and no preset is drawn

#### Scenario: Enemy built
- **WHEN** the player builds the enemy's roster and adds a second machine gun
- **THEN** the addition is refused with the same reason as for his own roster

#### Scenario: Enemy army chosen
- **WHEN** the player builds the enemy's roster for the Batalhões patrióticos
- **THEN** only that army's section types are offered

#### Scenario: A roster saved before the armies
- **WHEN** a player with a saved roster of "Seção de fuzileiros" and "Irregulares" opens the setup screen
- **THEN** the roster is offered as a Fogão and a Potreada

### Requirement: Mixed-force deployment

Each side's sections SHALL deploy across its map's deployment zone in roster
order: the zone's three section starts first, further sections between and
behind them, every soldier on walkable ground. These are the starting
places; a deployment phase may rearrange them. Each section SHALL be one
selectable troop with its own card. When the enemy is left at "Sorteado",
it SHALL field a roster drawn from preset forces for the map, chosen by the
battle seed, so the same seed fields the same enemy.

#### Scenario: Six small sections deploy
- **WHEN** a roster of six sections starts on the test map (`campo-de-provas`)
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
