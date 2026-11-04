## ADDED Requirements

### Requirement: Compendium texts in both locales

Every compendium section name, entry title, entry text, confidence label and
correction SHALL exist in the PT-BR and EN catalogs, and the compendium SHALL
switch language with the rest of the interface.

#### Scenario: Catalogs match for the compendium

- **WHEN** `pnpm check:locales` runs
- **THEN** both catalogs contain the same compendium keys

#### Scenario: Language switch in the compendium

- **WHEN** the player switches to EN with an entry open
- **THEN** the tab names, the entry and its confidence label change to English
