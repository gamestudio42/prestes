## Purpose

Defines the data-driven weapons available in the sandbox, their historical
metadata and the rules that keep combat and player-facing labels coherent.

## ADDED Requirements

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
