# weapons Specification

## Purpose
Defines the data-driven weapons available in the sandbox, their historical
metadata and the rules that keep combat and player-facing labels coherent.

## Requirements

### Requirement: Weapon profile catalog

The project SHALL define weapon profiles as pure data with an id, action kind,
calibre, magazine, reserve, fire interval, reload time, range, accuracy, damage
range, suppression, historical status and source references.

#### Scenario: Profile is complete

- **WHEN** the catalog is inspected
- **THEN** every weapon has all profile fields and at least one source reference

#### Scenario: Unknown weapon is rejected

- **WHEN** a unit requests a weapon id that is not in the catalog
- **THEN** validation reports an unknown weapon error

### Requirement: Mauser baseline

The first equipable weapon SHALL be the Mauser 7 mm, identified by Macaulay as
Brazil's standard military rifle and the main arm of the revolutionary troops
(Macaulay, *The Prestes Column*, 1974, p. 113). The catalog SHALL NOT claim a model
designation that the cited source does not name.

#### Scenario: Mauser is the default

- **WHEN** the sandbox starts
- **THEN** every soldier is equipped with the Mauser profile

#### Scenario: Historical label is honest

- **WHEN** the weapon is shown or documented
- **THEN** its documented identity is separated from its abstracted game statistics

### Requirement: Sandbox ammunition model

The Mauser SHALL use a 5-round magazine and a 15-round reserve, for 20 rounds at
deployment. This is a playable abstraction of the column's documented ammunition
scarcity; the source records about twenty thousand cartridges for roughly twelve
hundred men (Macaulay, p. 113).

#### Scenario: Magazine empties

- **WHEN** a Mauser fires its fifth round
- **THEN** it starts reloading and cannot fire until the reload completes

#### Scenario: Reserve is consumed

- **WHEN** the unit reloads
- **THEN** the magazine is refilled from the reserve and the reserve decreases by the rounds loaded

#### Scenario: Reserve is empty

- **WHEN** both magazine and reserve are empty
- **THEN** the unit cannot fire

### Requirement: Localized weapon names

Every weapon name, action and short historical note SHALL come from the PT-BR and
EN locale catalogs. The simulation SHALL expose only stable ids and numeric state.

#### Scenario: Locale switch

- **WHEN** the player switches between PT-BR and EN
- **THEN** the weapon name and description update without a reload

#### Scenario: Catalogs match

- **WHEN** `pnpm check:locales` runs
- **THEN** both catalogs contain the same weapon keys

### Requirement: Period weapon reference

`docs/history/WEAPONS.md` SHALL document the Mauser, Winchester .44, revolvers,
machine guns, automatic rifles and artillery that appear in the period sources,
with book/page citations and a clear note on what is documented, representative or
abstracted.

#### Scenario: Source-backed entry

- **WHEN** a weapon is listed as documented
- **THEN** the entry cites a source key and page or chapter

#### Scenario: Abstraction is labelled

- **WHEN** a game statistic is not in the source
- **THEN** the document labels it as a game abstraction

### Requirement: Training ammunition load

In the training exercise, every player soldier and the instructor SHALL carry a
5-round magazine and a 45-round reserve, for 50 rounds per station. The 3 vs 3
battle, a training battle between sections on the test map (`campo-de-provas`),
SHALL issue the same load to every soldier of both sides: at the aimed rate of
fire 20 rounds last about 80 seconds, and the battle runs for minutes. The
training enemy, dummies and the sandbox SHALL keep the Mauser profile's 20
rounds. Historical note: the load represents depot issue to a regular army
training troop and is a game abstraction, not a sourced figure; the Coluna's
scarcity (Macaulay, p. 113) remains the default model. The readout uses the
existing PT-BR and EN ammunition strings; no new strings are added.

#### Scenario: Training troop starts with the training load

- **WHEN** a training exercise starts
- **THEN** every living player soldier and the instructor have 5 rounds in the
  magazine and 45 in reserve

#### Scenario: The 3 vs 3 battle draws the training load

- **WHEN** the 3 vs 3 battle starts
- **THEN** all 66 soldiers have 5 rounds in the magazine and 45 in reserve

#### Scenario: Other modes keep the sandbox model

- **WHEN** the sandbox starts, or a training enemy spawns
- **THEN** those soldiers have 5 rounds in the magazine and 15 in reserve

### Requirement: Period weapon set

The weapon catalog SHALL hold the Mauser 7 mm rifle, the fuzil automático
7 mm, the metralhadora 7 mm, the Winchester .44 and the revólver, each with
its own magazine, reserve, fire rates, reload, range, accuracy, damage and
suppression, and a localized name and description in PT-BR and EN. Where the
source does not name a model, the game SHALL NOT name one; identities follow
`docs/history/WEAPONS.md` and statistics SHALL be labelled abstracted. The
Winchester SHALL have a shorter range and a faster aimed rate than the
Mauser; the revólver SHALL reach 25 m; the automatic rifle SHALL fire short
bursts with more suppression than a rifle.

#### Scenario: Ranges differ
- **WHEN** a revolver, a Winchester and a Mauser have an enemy at 60 m in sight
- **THEN** only the Winchester and the Mauser can fire at him

#### Scenario: Burst fire suppresses
- **WHEN** an automatic rifle and a Mauser fire the same number of seconds at a section
- **THEN** the automatic rifle's fire adds more suppression

### Requirement: Crew-served machine gun

The metralhadora 7 mm SHALL be served by a crew: it fires only after it has
been set up for 4 s where it halts, never while moving; when its gunner
falls, the next fit crewman takes it over; it fires belts of long reach and
heavy suppression, and its ammunition is the crew's. Its tripod and the crew
SHALL be drawn by the view.

#### Scenario: No fire on the move
- **WHEN** the machine-gun crew is ordered to move
- **THEN** the gun does not fire until it has halted and been set up for 4 s

#### Scenario: Crewman takes over
- **WHEN** the gunner is incapacitated
- **THEN** a fit crewman takes the gun and it fires again after setting up

### Requirement: Per-weapon ammunition

Each soldier SHALL carry his weapon's magazine and reserve, and the HUD
weapon card SHALL show the selected section's weapons and rounds, localized.
A section's riflemen SHALL NOT feed the machine gun or the automatic rifle
except the crew and team members who carry its magazines.

#### Scenario: Weapon card shows the mix
- **WHEN** the player selects an Esquadra de 5
- **THEN** the weapon card lists the Mauser and the automatic rifle with their rounds
