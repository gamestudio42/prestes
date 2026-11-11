## Purpose

How a section is recognised and read in the interface: its thumbnail in the
lists, and the panel that details a troop's men and condition.

## ADDED Requirements

### Requirement: Section thumbnails

Every section type of every army SHALL have a thumbnail rendered from the
game's soldier model in the army's uniform with the type's weapons. The
thumbnail SHALL be shown in the roster builder's type list and roster rows,
on the section's card in battle and in the troop panel's header. The
thumbnails SHALL be built by a tool from the section catalog and shipped as
images; the content check SHALL fail for a section type without one, and
the asset register SHALL list them. Each thumbnail SHALL have a text
alternative, the section type's localized name.

Historical note: the thumbnails show the uniforms and weapons recorded in
`docs/history/FORCES.md` and `WEAPONS.md`; they depict no named person.

#### Scenario: The roster list shows pictures
- **WHEN** the player opens the roster builder for the Column
- **THEN** every section type in the list shows its thumbnail beside its name

#### Scenario: A type without a thumbnail
- **WHEN** a section type is added to the catalog and the thumbnail tool has not been run
- **THEN** the content check fails and names the type

#### Scenario: Types are told apart
- **WHEN** the thumbnails of a rifle section and a machine-gun section of the same army are compared
- **THEN** the machine-gun thumbnail shows the gun and its crew

### Requirement: Roster type cards

The roster builder SHALL list each section type as a card with its
thumbnail, name, number of men, its weapons as icons with counts and its
one-line description. A type that cannot be added SHALL stay visible with
the reason in place of the description. The cards SHALL be reachable and
operable by keyboard as the list is today, and all text SHALL come from the
PT-BR and EN catalogs.

#### Scenario: Weapons at a glance
- **WHEN** the player looks at the card of a section with four rifles and an automatic rifle
- **THEN** the card shows a rifle icon with 4 and an automatic-rifle icon with 1

#### Scenario: A refused type says why
- **WHEN** the roster already holds the one machine gun allowed
- **THEN** the machine-gun card shows the reason and cannot be added

### Requirement: Troop panel header

The troop panel SHALL open with the selected section's thumbnail, its name
and type, its army, its current order, and its men counted as fit, wounded
and down. With several sections selected the header SHALL show the count of
sections and the same totals over all of them.

#### Scenario: One section selected
- **WHEN** the player selects a rifle section with nine fit men, one wounded and one down, under a defend order
- **THEN** the header shows its thumbnail, name, army, "Defend" and 9 fit, 1 wounded, 1 down

#### Scenario: Three sections selected
- **WHEN** the player selects three sections
- **THEN** the header shows "3 sections" and the totals of the three

### Requirement: Soldier rows

The troop panel SHALL list the section's soldiers one per row, leader first
and casualties last, each with his role, his weapon, a state word (fit,
wounded, pinned, down, routed, or the position he is inside) and his health,
morale and ammunition as bars with a label or icon that names each. A state
SHALL be told by its word and by its colour, never by colour alone. A row
SHALL NOT need a tooltip to be read; the tooltip MAY add detail.

#### Scenario: A pinned man is named
- **WHEN** a soldier of the selected section is pinned
- **THEN** his row reads "pinned" and is marked apart from the fit men

#### Scenario: Out of ammunition is seen
- **WHEN** a soldier has no rounds left
- **THEN** his ammunition bar is empty and marked as empty

#### Scenario: Readable without colour
- **WHEN** the panel is viewed in greyscale
- **THEN** each soldier's state can still be read from its word

### Requirement: Troop condition gauges

The troop panel SHALL show the section's morale, cover, cohesion and
suppression as four named gauges, each with its value and a word for its
band (for morale: steady, suppressed, pinned, panicked, routed, as the
simulation names them). The bands SHALL be those the simulation uses, read
from shared data, not thresholds written in the view.

#### Scenario: A band has a word
- **WHEN** the selected section's morale state is suppressed
- **THEN** the morale gauge shows its value and the word for suppressed

#### Scenario: Bands follow the simulation
- **WHEN** the simulation's morale thresholds are changed
- **THEN** the gauge's bands change with them, with no change in the view

### Requirement: Troop alerts

The troop panel SHALL show, above the soldier rows, what needs the player's
attention in the selected section, most urgent first: no ammunition, the
section pinned or panicked, a casualty waiting for rescue, a machine gun
without a gunner. With none, the alert area SHALL take no space.

#### Scenario: A gun without a gunner
- **WHEN** the selected machine-gun section's gunner is down and no crewman has taken the gun
- **THEN** the panel shows the alert at the top

#### Scenario: Nothing to report
- **WHEN** the selected section is fit, supplied and not under fire
- **THEN** no alert is shown and the rows start under the header

### Requirement: Troop panel localization and size

Every label, state word, band word and alert of the troop panel and the
roster cards SHALL come from the PT-BR and EN catalogs. The troop panel
SHALL show a section of eleven men without scrolling at 1280 x 720, and a
larger selection SHALL scroll inside the panel without covering the map
beyond the panel's own area.

#### Scenario: Eleven men fit
- **WHEN** a section of eleven is selected at 1280 x 720 in PT-BR
- **THEN** all eleven rows are visible without scrolling

#### Scenario: Language switch
- **WHEN** the player switches language with the panel open
- **THEN** every label, state and alert changes without a reload
