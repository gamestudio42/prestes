# historical-content Specification

## Purpose
Keeps the game's historical layer honest and reusable: a sourced figure registry,
explicit playability metadata, content labels and a mission-commander contract that
later campaign changes must satisfy.

## Requirements

### Requirement: Historical figure registry

The project SHALL provide a machine-readable registry of historical figures. Each
entry SHALL include an id, a display name, a role, a playable flag, content labels
and at least one source reference. Siqueira Campos, Luís Carlos Prestes, Miguel
Costa and Isidoro Dias Lopes SHALL be playable, since each commands a campaign
map (on the field or as a voice).

#### Scenario: Registry contains the vertical-slice figures

- **WHEN** the registry is loaded
- **THEN** it contains entries for Siqueira Campos and Luis Carlos Prestes with roles and source references

#### Scenario: Figure without a source is rejected

- **WHEN** a registry entry has no source reference
- **THEN** the historical-content validation fails and names the figure id

#### Scenario: Chapter commanders are playable

- **WHEN** the registry is loaded
- **THEN** Miguel Costa and Isidoro Dias Lopes are playable

### Requirement: Source documents

The repository SHALL contain `docs/history/SOURCES.md` and
`docs/history/TIMELINE.md`, and every source reference in the registry SHALL
resolve to a source listed in `SOURCES.md`.

#### Scenario: Source reference resolves

- **WHEN** a figure references a source key
- **THEN** the key exists in `docs/history/SOURCES.md`

#### Scenario: Unknown source key is rejected

- **WHEN** a figure references a source key absent from `SOURCES.md`
- **THEN** the validation fails and names the unknown key

### Requirement: Source authority hierarchy

The historical layer SHALL use a documented tier hierarchy: Macaulay's *The
Prestes Column* as Tier 0 for chronology, route and military operations; Amado
as Tier 1 for tone and arc; Blanc as Tier 1 for social and interior history;
regional studies as Tier 3; and the MVCP portal as a Tier 4 finding aid. The
hierarchy and conflict rule SHALL be recorded in
`docs/history/SOURCE_POLICY.md`.

#### Scenario: Chronology conflict

- **WHEN** Macaulay and a regional study give different dates or places for the same event
- **THEN** the game uses Macaulay as baseline and records the divergence in `docs/history/TIMELINE.md`

#### Scenario: Social claim

- **WHEN** a claim concerns civilians, local legitimacy or interior life
- **THEN** it cites Blanc or a regional study rather than Macaulay alone

#### Scenario: Finding aid is not authority

- **WHEN** a claim cites the MVCP portal
- **THEN** the citation points to the underlying work, not to the portal as the authority

### Requirement: Consultation status and source matrix

Every source entry SHALL declare a consultation status: full, partial or
citation-only. Each chapter SHALL have a source matrix with at least two
independent sources and SHALL identify gaps where only citation-level material
exists.

#### Scenario: Citation-only is visible

- **WHEN** a mission cites a source that was not read in full
- **THEN** the source register marks it citation-only and states what was consulted

#### Scenario: Chapter matrix

- **WHEN** a chapter is planned
- **THEN** its source matrix lists primary and secondary sources and the unresolved gaps

### Requirement: Scans, OCR and DRM

Book scans, OCR text and extracted map images SHALL remain under `livros/`, which
SHALL be gitignored. The project SHALL NOT bypass DRM or redistribute
copyrighted scans; repository content SHALL contain only paraphrased notes and
page citations.

#### Scenario: Repository contains no scans

- **WHEN** the repository is inspected
- **THEN** no book scan, OCR text or extracted map image is tracked

#### Scenario: DRM file is not ingested

- **WHEN** a source file is DRM-protected
- **THEN** it is not processed; a DRM-free copy or user-provided notes are required

### Requirement: Playable figure and mission commander

The project SHALL provide a validation contract that ties a mission to one
playable historical figure and one perspective. A mission SHALL NOT reference an
unknown or non-playable commander. A campaign map that declares a commander
SHALL declare the `commanderId` of the chapter its mission belongs to.

#### Scenario: Valid commander is accepted

- **WHEN** a mission declares a playable figure id that exists in the registry
- **THEN** validation accepts the mission metadata

#### Scenario: Non-playable commander is rejected

- **WHEN** a mission declares a figure whose playable flag is false
- **THEN** validation fails with a commander error

#### Scenario: Unknown commander is rejected

- **WHEN** a mission declares a figure id absent from the registry
- **THEN** validation fails with an unknown-figure error

#### Scenario: Map commander differs from the chapter's

- **WHEN** the map Porto Mendes (mission `a-divisao`, chapter commander Miguel Costa) declares Luís Carlos Prestes as its commander
- **THEN** validation fails with a commander error naming the map

### Requirement: Content labels

Every historical narrative or codex entry SHALL declare one label: historical,
dramatized or fictional. The player-facing codex SHALL display the label.

#### Scenario: Codex shows the label

- **WHEN** the player opens a codex entry
- **THEN** the entry shows its historical, dramatized or fictional label

#### Scenario: Missing label is rejected

- **WHEN** a narrative entry has no label
- **THEN** the historical-content validation fails and names the entry

### Requirement: Known historical corrections

The historical documents SHALL record the corrections that constrain the
campaign: Prestes was absent from the Forte de Copacabana revolt, the 1924 Sao
Paulo revolt was a separate front, Miguel Costa was the formal column commander,
and maps use 1920s political borders.

#### Scenario: Corrections are documented

- **WHEN** `docs/history/TIMELINE.md` is read
- **THEN** it records the Forte absence, the separate Sao Paulo front, the command relationship and the 1920s borders

### Requirement: Compendium sections

The compendium SHALL be a machine-readable registry with four sections:
figures, events, places and weapons. Every entry SHALL have an id, a section, a
localized title and text, at least one source reference and a confidence level
(high, medium or low) taken from the project's history documents; events SHALL
also have a date. Entries SHALL come only from material already sourced in
`docs/history` (Macaulay as the baseline, with divergences recorded). The known
historical corrections SHALL be shown as their own page, listing only the
corrections to claims the game or its content makes; a correction for a claim
the game does not make SHALL NOT be listed. In the game the compendium SHALL
be a pixel-art book with one tab per section, a list and a reading page that
shows the source line and the confidence of the entry.

#### Scenario: Sections are filled from sourced material

- **WHEN** the compendium registry is loaded
- **THEN** it contains the two figures, the events of the historical timeline,
  the places named in them and the documented weapons, each with a source and
  a confidence

#### Scenario: Entry without a source is rejected

- **WHEN** a compendium entry has no source reference or no confidence
- **THEN** the historical-content validation fails and names the entry id

#### Scenario: Reading an entry

- **WHEN** the player opens the Events tab and selects the 1922 revolt
- **THEN** the page shows its date, text, source line and confidence

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
