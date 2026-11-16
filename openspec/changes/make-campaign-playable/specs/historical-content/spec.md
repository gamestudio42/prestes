## MODIFIED Requirements

### Requirement: Campaign chapter registry

The project SHALL provide a machine-readable campaign registry of the prologue
and chapters 2 to 8, in campaign order. Each chapter SHALL declare:

- an id and a number;
- a localized title;
- a date and a place;
- a commander that resolves to the figure registry;
- a localized perspective;
- one label: historical, dramatized or fictional;
- at least one source reference;
- an optional image reference from the compendium images;
- bilingual prose split into pages;
- a bilingual briefing (pitch and objectives summary);
- the compendium entries it links to;
- a playable state, derived at run time: a chapter is playable when an
  authored campaign map holds its mission id.

The registry SHALL NOT store a playable flag. A chapter's mission id SHALL
be its own id, and a chapter SHALL be playable exactly when an authored
campaign map records that mission id.
Commanders SHALL follow `docs/campaign/CAMPAIGN.md`:

- Siqueira Campos for the prologue.
- Luís Carlos Prestes for chapters 2, 5, 6 and 7.
- Miguel Costa for chapter 3.
- Isidoro Dias Lopes for chapter 4.
- Luís Carlos Prestes for chapter 8, with the exiles as the perspective.

Chapter dates and places SHALL match `docs/history/TIMELINE.md`. Validation SHALL
fail on an unknown commander, an unknown source, an unknown compendium link,
missing text in either locale, or two authored maps holding the same
chapter's mission. The published build's check SHALL also fail on a chapter
with no authored map; in development a chapter without a map SHALL stay
readable, with no play action.

Chapter prose MAY contain attributed quotations under the quotation rule.
Chapter 6 (Serra Nova) SHALL have these additions:

- It opens with a page set at Porto Nacional in October 1925. The page
  bridges June 1925 to April 1926 and quotes the manifesto.
- It ends with the memory of the column at the mouth of the Urucuia, as a
  paraphrase.
- It lists `manifesto-1925` and `mozzer-2009` among its sources.
- It links to `manifesto-porto-nacional-1925`,
  `batalhoes-patrioticos-bahia` and `coluna-no-grande-sertao`.

Chapter 8 (La Gaiba) SHALL have these additions:

- It contains Moreira Lima's farewell to the dead as an attributed
  quotation.
- It lists `lima-1931` among its sources.
- It links to `lourenco-moreira-lima`.

The prologue SHALL link to `tenentismo`. Chapter 4 (Frente do Paraná) SHALL
link to `positivismo-militar`.

The chapter date and date range of chapter 6 SHALL stay `1926-04-22` to
`1926-04-26`. The Porto Nacional page is a retrospective opening, and the
chapter's date does not move.

#### Scenario: Registry order and commanders

- **WHEN** the campaign registry is read
- **THEN** it lists the prologue and chapters 2 to 8 in order, and chapter 3's commander is `miguel-costa`

#### Scenario: No playable chapter yet

- **WHEN** the campaign registry is read with the eight authored campaign maps in the project
- **THEN** all eight chapters are playable, and removing the La Gaiba map makes only chapter 8 not playable

#### Scenario: Published build needs every map

- **WHEN** the published build's content check runs and a chapter has no authored map
- **THEN** the check fails and names the chapter

#### Scenario: Unknown link fails

- **WHEN** a chapter links to a compendium id that does not exist
- **THEN** the content check fails and names the chapter and the id

#### Scenario: Prose is original and labelled

- **WHEN** a chapter's prose is shown
- **THEN** its label is shown with it, the text is the project's own dramatization apart from attributed quotations of public-domain or free-licence sources, and sources are listed on the briefing spread

#### Scenario: Chapter 6 opens at Porto Nacional

- **WHEN** the player opens chapter 6
- **THEN** the first prose page is headed with Porto Nacional, October 1925, and quotes the manifesto with its attribution, and the chapter date still reads April 1926

#### Scenario: Chapter 8 carries the eulogy

- **WHEN** the player reads chapter 8
- **THEN** one page shows Moreira Lima's farewell to the dead of La Gaiba as a quotation attributed to him, and the briefing links to his compendium entry
