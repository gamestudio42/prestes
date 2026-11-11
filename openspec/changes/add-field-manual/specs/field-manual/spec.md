## Purpose

The field manual explains the game's rules to the player inside the game: a
part of the book "A Coluna Prestes" with short text pages on commanding
sections, kept in step with the order catalog.

## ADDED Requirements

### Requirement: Manual part of the Column's book

The book "A Coluna Prestes" SHALL carry a Manual part after the compendium's
sections and before the corrections page. The book's contents spread SHALL
list the Manual with its pages, and choosing one SHALL open that page. Manual
pages SHALL be read with the book's own page turning (previous and next
controls, left and right arrow keys) and SHALL fit their spread without
scrolling at 1440 x 900 and 1280 x 720. The Manual SHALL be text: it SHALL NOT
need video, sound or a network request.

Historical note: the Manual describes game rules and makes no historical
claim; a page that touches a period fact links to the compendium entry that
carries the source.

#### Scenario: Open the Manual from the contents
- **WHEN** the player opens the book and chooses "Moving" under Manual in the contents
- **THEN** the book shows the Moving page

#### Scenario: Turn the Manual's pages
- **WHEN** the player is on a Manual page and presses the right arrow key
- **THEN** the next Manual page is shown, and after the last one the corrections page

#### Scenario: Pages fit the spread
- **WHEN** any Manual page is shown at 1280 x 720 in PT-BR or EN
- **THEN** no text is cut off and the page does not scroll

### Requirement: Manual pages

The Manual SHALL have twelve pages, in this order: camera and selection;
moving; fire; formation, facing and spacing; cover and stance; deployment;
objectives and the battle clock; positions; fog of war; morale, suppression
and the wounded; sections and weapons; queued orders and the keys. Each page
SHALL have a title and two to four paragraphs, and a page that covers orders
SHALL list them with the same name and tip the order board shows.

#### Scenario: An order reads as on the board
- **WHEN** the player reads the Fire page
- **THEN** attack, suppress and flank are listed with the names and tips the order board shows for them

#### Scenario: The machine gun's set-up is explained
- **WHEN** the player reads the sections and weapons page
- **THEN** it says the machine gun fires only once halted and set up, and links to the weapon's compendium entry

### Requirement: The Manual covers the order catalog

Every order of the order catalog SHALL be named by at least one Manual page,
and a Manual page SHALL NOT name an order the catalog does not have. The
content check SHALL fail otherwise and name the order and the page.

#### Scenario: A new order without a page
- **WHEN** an order is added to the order catalog and no Manual page names it
- **THEN** the content check fails and names the order

#### Scenario: A page naming a removed order
- **WHEN** a Manual page names an order that is no longer in the catalog
- **THEN** the content check fails and names the page and the order

### Requirement: Manual localization

Every Manual title, paragraph and contents entry SHALL come from the locale
catalogs in PT-BR and EN, with English as the source language, and SHALL
change with the language switch without a reload. The locale check SHALL fail
when a Manual text is missing in either locale.

#### Scenario: Language switch
- **WHEN** the player switches from PT-BR to EN on a Manual page
- **THEN** the same page is shown in English

#### Scenario: Missing translation
- **WHEN** a Manual paragraph exists in EN and not in PT-BR
- **THEN** the locale check fails and names the key
