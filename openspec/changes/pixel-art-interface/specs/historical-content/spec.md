## ADDED Requirements

### Requirement: Compendium sections

The compendium SHALL be a machine-readable registry with four sections:
figures, events, places and weapons. Every entry SHALL have an id, a section, a
localized title and text, at least one source reference and a confidence level
(high, medium or low) taken from the project's history documents; events SHALL
also have a date. Entries SHALL come only from material already sourced in
`docs/history` (Macaulay as the baseline, with divergences recorded). The known
historical corrections SHALL be shown as their own page. In the game the
compendium SHALL be a pixel-art book with one tab per section, a list and a
reading page that shows the source line and the confidence of the entry.

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
- **THEN** the page shows its date, text, source line and confidence, and the
  correction that Prestes was not at the fort is reachable from the
  corrections page
