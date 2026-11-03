## Purpose

Keeps the game's historical layer honest and reusable: a sourced figure registry,
explicit playability metadata, content labels and a mission-commander contract that
later campaign changes must satisfy.

## ADDED Requirements

### Requirement: Historical figure registry

The project SHALL provide a machine-readable registry of historical figures. Each
entry SHALL include an id, a display name, a role, a playable flag, content labels
and at least one source reference.

#### Scenario: Registry contains the vertical-slice figures

- **WHEN** the registry is loaded
- **THEN** it contains entries for Siqueira Campos and Luis Carlos Prestes with roles and source references

#### Scenario: Figure without a source is rejected

- **WHEN** a registry entry has no source reference
- **THEN** the historical-content validation fails and names the figure id

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
unknown or non-playable commander.

#### Scenario: Valid commander is accepted

- **WHEN** a mission declares a playable figure id that exists in the registry
- **THEN** validation accepts the mission metadata

#### Scenario: Non-playable commander is rejected

- **WHEN** a mission declares a figure whose playable flag is false
- **THEN** validation fails with a commander error

#### Scenario: Unknown commander is rejected

- **WHEN** a mission declares a figure id absent from the registry
- **THEN** validation fails with an unknown-figure error

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
