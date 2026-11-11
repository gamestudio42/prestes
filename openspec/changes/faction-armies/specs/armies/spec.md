## Purpose

The armies of the game: who fights, what each force is called, which
sections it fields and the historical record those choices rest on.

## ADDED Requirements

### Requirement: Three armies

The game SHALL define three armies as data shared by the simulation and the
view: the Column, the legalist regulars and the patriotic battalions. Each
army SHALL have a localized name and description (PT-BR and EN), a side
(the Column fights the other two), a catalog of section types and a uniform
set. Every soldier in a battle SHALL belong to one army, and the frame SHALL
carry it.

Historical note: the composition of the government's forces and of the
column is recorded in `docs/history/FORCES.md`, from `macaulay-1974` as the
baseline; each army's compendium note cites it.

#### Scenario: Armies are complete
- **WHEN** the content check runs
- **THEN** every army has a name and description in PT-BR and EN, a side, at least four section types and a uniform set

#### Scenario: A soldier's army is known
- **WHEN** a battle starts with a section of the patriotic battalions
- **THEN** every man of it reports that army in the frame

### Requirement: Period names

Every army name and section type name shown to the player SHALL be a term
used for that force at the time, recorded in `docs/history/FORCES.md` with a
source key and a page or chapter, or SHALL be marked there as a game
organization; a name marked so SHALL say it in its compendium note. The
content check SHALL fail for a name that is neither.

#### Scenario: A sourced name
- **WHEN** the content check reads a section type whose name is recorded with a source in the forces document
- **THEN** it passes

#### Scenario: An unrecorded name
- **WHEN** a section type's name is neither sourced nor marked as a game organization
- **THEN** the content check fails and names the section type

### Requirement: Sections by army

Each army SHALL field its own section types, and a section type SHALL belong
to one army. The types of an army SHALL differ from the others' in what the
record supports: men, weapons, ammunition carried, marching speed, and the
morale and training values the simulation uses. The roster builder SHALL
list only the chosen army's types, and a roster holding a type of another
army SHALL be refused.

#### Scenario: The roster lists one army
- **WHEN** the player builds a force for the Column
- **THEN** only the Column's section types are offered

#### Scenario: A foreign section is refused
- **WHEN** a roster for the legalist regulars holds a patriotic battalion's section type
- **THEN** the roster is rejected with the reason

#### Scenario: Armies fight differently
- **WHEN** a regular rifle section and a patriotic battalion's rifle section of the same strength take the same fire in the same cover, with the same seed
- **THEN** their morale falls at the rates their armies define, and the two results differ

### Requirement: Enemy presets name their armies

Every section of a battle map's enemy preset SHALL be a section type of an
enemy army, so the preset says which army each section belongs to, and a
preset MAY mix the legalist regulars and the patriotic battalions. A map
saved before armies existed SHALL load with its enemy sections as legalist
regulars, each mapped to that army's successor of its old type, and the map
check SHALL report a preset holding an unknown section type or a type of
the Column.

#### Scenario: A mixed enemy
- **WHEN** a preset holds two regular sections and one patriotic battalion section
- **THEN** the battle starts with the three, each in its army's uniform

#### Scenario: An older map
- **WHEN** a map saved before this change is loaded
- **THEN** its enemy sections fight as legalist regulars and the map check passes

### Requirement: Armies are deterministic

The values an army gives its sections SHALL be data read by the simulation
alone, so the same seed, map, rosters and commands give the same state
hashes.

#### Scenario: Same battle twice
- **WHEN** a battle with all three armies runs twice with the same seed and commands
- **THEN** the state hashes are identical tick by tick
