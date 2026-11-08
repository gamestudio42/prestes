## ADDED Requirements

### Requirement: Compendium images and extended notes

A compendium entry MAY reference one or more images. Each image SHALL be listed
in the asset register with its credit, licence and rights determination, and an
image without a recorded determination SHALL NOT be referenced. An entry MAY
carry a place and an extended note in addition to its short body. Every
player-facing caption, place, body and note SHALL exist in both PT-BR and EN.
Validation SHALL fail when an entry references a missing image file, an
unregistered image or a text missing in either locale. The compendium SHALL
include the drafted entries from `docs/campaign/compendium/entries/`, including
the figures Miguel Costa and Isidoro Dias Lopes, each with its section, label,
sources and confidence as recorded in the docs.

#### Scenario: Image must be registered

- **WHEN** an entry references an image path that is not in the asset register
- **THEN** the content check fails and names the entry and the path

#### Scenario: Bilingual parity

- **WHEN** an entry has an extended note in EN but not in PT-BR
- **THEN** the content check fails and names the entry and the missing locale

#### Scenario: Drafted entries are present

- **WHEN** the compendium registry is read
- **THEN** it contains every entry id from `docs/campaign/compendium/entries/`, including `miguel-costa` and `isidoro-dias-lopes`

### Requirement: Campaign chapter registry

The project SHALL provide a machine-readable campaign registry of the prologue
and chapters 2 to 8, in campaign order. Each chapter SHALL declare an id, a
number, a localized title, a date, a place, a commander that resolves to the
figure registry, a localized perspective, one label (historical, dramatized or
fictional), at least one source reference, an optional image reference from the
compendium images, bilingual prose split into pages, a bilingual briefing (pitch
and objectives summary), the compendium entries it links to, and a playable
flag. The playable flag SHALL be false for every chapter until its mission
exists. Commanders SHALL follow `docs/campaign/CAMPAIGN.md`:

- Siqueira Campos for the prologue.
- Luís Carlos Prestes for chapters 2, 5, 6 and 7.
- Miguel Costa for chapter 3.
- Isidoro Dias Lopes for chapter 4.
- Luís Carlos Prestes for chapter 8, with the exiles as the perspective.

Chapter dates and places SHALL match `docs/history/TIMELINE.md`. Validation SHALL
fail on an unknown commander, an unknown source, an unknown compendium link,
missing text in either locale, or a playable chapter without a mission.

#### Scenario: Registry order and commanders

- **WHEN** the campaign registry is read
- **THEN** it lists the prologue and chapters 2 to 8 in order, and chapter 3's commander is `miguel-costa`

#### Scenario: No playable chapter yet

- **WHEN** the campaign registry is validated
- **THEN** every chapter's playable flag is false

#### Scenario: Unknown link fails

- **WHEN** a chapter links to a compendium id that does not exist
- **THEN** the content check fails and names the chapter and the id

#### Scenario: Prose is original and labelled

- **WHEN** a chapter's prose is shown
- **THEN** its label is shown with it and the text is the project's own dramatization, with sources listed on the briefing spread
