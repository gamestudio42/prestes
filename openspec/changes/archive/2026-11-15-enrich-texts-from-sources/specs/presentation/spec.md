## MODIFIED Requirements

### Requirement: Campaign book layout

The open campaign book SHALL start on a title spread and a contents spread that
lists the prologue and chapters 2 to 8, with number, title, date and commander.
The title spread SHALL show the campaign motto as its epigraph: "A maior
marcha revolucionária do mundo." in PT-BR and "The greatest revolutionary
march in the world." in EN.

Each chapter SHALL open on a spread whose left page shows an image plate and
the chapter's number, title, date, place, commander, perspective and label.
The right page SHALL begin the chapter prose, and the prose SHALL continue
across spreads.

A quotation in the prose SHALL be set apart from the dramatized text, as an
indented block or in italics, and followed by its attribution line.

Each chapter SHALL end on a briefing spread with the pitch, a summary of the
objectives and links that open the chapter's compendium entries in the
compendium book. Each chapter SHALL show a play action that is disabled and
labelled "in preparation". It SHALL keep the existing action that brings the
map fan forward for a skirmish.

#### Scenario: Contents lists every chapter

- **WHEN** the player opens the campaign book
- **THEN** the contents spread lists the prologue and chapters 2 to 8 with title, date and commander

#### Scenario: Title spread shows the motto

- **WHEN** the player opens the campaign book in PT-BR
- **THEN** the title spread shows "A maior marcha revolucionária do mundo." as its epigraph, and in EN "The greatest revolutionary march in the world."

#### Scenario: Chapter opening spread

- **WHEN** the player opens chapter 3 from the contents
- **THEN** the left page shows the plate, "Miguel Costa" as commander, the date, place, perspective and the "dramatized" label, and the right page begins the prose

#### Scenario: Quotation is set apart

- **WHEN** the player reaches the Porto Nacional page of chapter 6
- **THEN** the manifesto quotation is visually distinct from the surrounding prose and is followed by its attribution line

#### Scenario: Missions are not playable yet

- **WHEN** the player reaches any chapter's briefing spread
- **THEN** the play action is visible, disabled and labelled "in preparation"

#### Scenario: Briefing links to the compendium

- **WHEN** the player activates a compendium link on a briefing spread
- **THEN** the compendium book opens, or comes to the front, at that entry
