## ADDED Requirements

### Requirement: Desk start screen with draggable objects

The start screen SHALL present the menu as a desk of physical objects over the
pixel-art scene: a campaign book, a compendium book, a reference pile, an
options compass, a skirmish map fan and the gramophone. The player SHALL be able
to drag each object anywhere inside the start-screen area with a pointer, and
the object SHALL stay fully inside the viewport. Dragging SHALL NOT create a
text selection. Every closed object SHALL carry a single localized label below
its art, using the same font, size and gap, with no box; the campaign label
SHALL read "Campanha"/"Campaign" and the compendium label "A Coluna
Prestes"/"The Prestes Column". The object most recently interacted with SHALL be
drawn in front. The desk SHALL expose a localized "tidy desk" action that
restores the default arrangement and closes the open objects. Every
player-facing label SHALL come from the PT-BR and EN catalogs, and every desk
sprite SHALL be recorded in the asset register; the books and the gramophone MAY
be rasterized from owner-supplied references, which stay out of the repository.

#### Scenario: Desk loads

- **WHEN** the player opens the start screen
- **THEN** the six desk objects appear at their default positions and the primary action is reachable

#### Scenario: Closed objects are labeled

- **WHEN** the desk is closed
- **THEN** every object shows its localized label below the art, with the same font and gap, and no title is painted on a book cover

#### Scenario: Drag an object

- **WHEN** the player drags an object and releases it
- **THEN** the object stays where it was dropped, snapped to the 2 px grid, and is drawn in front

#### Scenario: Drag never selects text

- **WHEN** the player drags any object
- **THEN** the object moves and no text selection is created

#### Scenario: Object stays in view

- **WHEN** the browser window shrinks below an object's position
- **THEN** the object is moved back fully inside the view

#### Scenario: Tidy desk

- **WHEN** the player activates "tidy desk"
- **THEN** every object returns to its default position and the open objects close

#### Scenario: Locale switch updates the desk

- **WHEN** the locale changes between PT-BR and EN
- **THEN** every desk object name, hint and action label updates without a reload

#### Scenario: Art is registered

- **WHEN** the asset register is read
- **THEN** each desk sprite is listed with its Aseprite source, author and licence

### Requirement: Independent menu books with page turning

The campaign book and the compendium book SHALL be independent objects. Each
SHALL open into a centered, full-screen two-page spread shown as an overlay and
close back to its cover at the desk position it had before opening, both MAY be
open at the same time, and opening or closing one SHALL NOT
change the other. The closed books SHALL carry their labels below the art: the
campaign "Campanha"/"Campaign" and the compendium "A Coluna Prestes"/"The
Prestes Column". An open book SHALL turn its pages with visible previous and
next controls or the left and right arrow keys. The campaign book SHALL show the existing "campaign
in preparation" content and an action that brings the map fan to the front. The
compendium book SHALL show the existing section index and entry content.

#### Scenario: Closed books are labeled

- **WHEN** the books are closed
- **THEN** the campaign shows "Campanha"/"Campaign" and the compendium shows "A Coluna Prestes"/"The Prestes Column" below their art

#### Scenario: Both books open at once

- **WHEN** the player opens the campaign book and then the compendium book
- **THEN** both books remain open

#### Scenario: Close a book

- **WHEN** the player presses Escape or the book's close control
- **THEN** that book closes and the other book stays as it was

#### Scenario: Turn a page

- **WHEN** the player activates the next-page control
- **THEN** the book shows the next page with its turn state

#### Scenario: Campaign action opens the maps

- **WHEN** the player activates the campaign book's skirmish action
- **THEN** the map fan is brought to the front and focused

### Requirement: Options compass

The options object SHALL be a compass. The closed compass SHALL carry the
localized "Opções"/"Options" label below the art, like every desk icon.
Activating it SHALL open a centered field-manual screen with the "Options"
heading, the compass, the sound toggle and the language selector. The sound
toggle SHALL keep its no-autoplay behavior, so activating it does not start the
menu music, and its label SHALL reflect the current sound state. The compass
SHALL expose a localized accessible name and expanded state.

#### Scenario: Compass is closed

- **WHEN** the start screen opens
- **THEN** the compass shows the "Opções"/"Options" label below its art and no open screen

#### Scenario: Compass opens

- **WHEN** the player activates the compass
- **THEN** a centered screen shows the options heading, the compass, the sound toggle and the language selector

#### Scenario: Compass closes

- **WHEN** the player activates the compass again or presses Escape
- **THEN** it closes

#### Scenario: Sound and language still work

- **WHEN** the player toggles sound or changes language from the compass
- **THEN** the existing audio and locale behavior updates and the sound toggle does not start the menu music

### Requirement: Skirmish map fan

The skirmish object SHALL present the four battle maps as a perspective fan of
folded map sheets, posed like a folded map on the desk, with soft fold creases.
The fan SHALL carry the localized "Mapas"/"Maps" label below the art. The active
sheet SHALL carry a printed legend strip that is part of the map art, with the
localized name, description and deploy action. Each sheet SHALL be selectable;
selecting a non-active sheet raises it, and activating the active sheet cycles
to the next map. The deploy action SHALL start the 3v3 on the selected map, and
the selected map SHALL survive a tidy desk or a return to the start screen
during the session.

#### Scenario: Fan shows every map

- **WHEN** the player opens the map fan
- **THEN** all four maps are reachable with their localized names and the "Mapas"/"Maps" label sits below the fan

#### Scenario: Legend is part of the sheet

- **WHEN** the player looks at the active map
- **THEN** its name, description and deploy action are printed on the parchment strip that is part of the map sheet

#### Scenario: Select a map

- **WHEN** the player selects a sheet
- **THEN** it comes to the front and its legend is shown

#### Scenario: Cycle the fan

- **WHEN** the player activates the active sheet
- **THEN** the next map comes to the front with its legend

#### Scenario: Start on the selected map

- **WHEN** the player activates deploy
- **THEN** the 3v3 starts on the selected map

#### Scenario: Selected map survives

- **WHEN** the player tidies the desk or returns to the start screen
- **THEN** the selected map is still selected

### Requirement: Reference books dossier

The reference pile SHALL be a closed desk icon labelled "Referências"/"References"
below the art. Activating it SHALL open a centered dossier with a preface
explaining that the books inspired the game as a way of preserving the memory of
Carlos Prestes, and a list of the works consulted: Neill Macaulay, Jorge Amado,
the "O Tempo e o Vento" series by Erico Verissimo, and Jacob Blanc. Each entry
SHALL link to an external catalogue record and reproduce no protected text. The
dossier SHALL close back to the pile, and its labels SHALL come from the PT-BR
and EN catalogs.

#### Scenario: Pile opens the dossier

- **WHEN** the player activates the reference pile
- **THEN** a centered dossier shows the preface and the four linked entries

#### Scenario: Sources are reachable

- **WHEN** the player activates an entry
- **THEN** the catalogue record for that work opens in a new tab

#### Scenario: Pile closes

- **WHEN** the player activates the close control
- **THEN** the dossier closes and the pile returns to the desk

### Requirement: Desk layout persistence

The desk SHALL remember the object positions for the viewer under its own
storage key and SHALL NOT read or write the existing audio, locale, gramophone
or route keys. When storage is unavailable or the saved value is invalid, the
desk SHALL use the default arrangement. The desk SHALL keep every object inside
the view on load and on resize.

#### Scenario: Remember positions

- **WHEN** the player drags an object and reloads
- **THEN** the object returns to the dropped position

#### Scenario: Storage unavailable

- **WHEN** storage throws or contains an invalid value
- **THEN** the desk loads at the default arrangement without an error

#### Scenario: Resize keeps objects in view

- **WHEN** the viewport changes after a saved position is loaded
- **THEN** the object is clamped inside the view

### Requirement: Desk keyboard and reduced motion

Every desk object SHALL be reachable by keyboard with a visible focus state.
The arrow keys SHALL move the focused object, Shift SHALL move it by a larger
step, Enter or Space SHALL open or activate it, and Escape SHALL close an open
object. Under `prefers-reduced-motion: reduce` the open, page-turn and record-groove
animations SHALL be disabled while every action remains available.

#### Scenario: Keyboard moves an object

- **WHEN** the focused object receives an arrow key
- **THEN** it moves and stays inside the view

#### Scenario: Keyboard opens an object

- **WHEN** the focused object receives Enter or Space
- **THEN** it opens or activates

#### Scenario: Escape closes an object

- **WHEN** an object is open and Escape is pressed
- **THEN** it closes

#### Scenario: Reduced motion

- **WHEN** the player prefers reduced motion
- **THEN** no open, page-turn or record-groove animation runs and every control still works

## MODIFIED Requirements

### Requirement: Menu gramophone

The start screen SHALL show a period gramophone as a closed, draggable desk
object over the menu scene. Activating it SHALL open a centered gramophone
screen with the larger machine, the current recording's title, composer,
performer, year, genre, label, catalog number, public-domain year and source, a
rack of the recordings, and previous, play/pause and next controls with
localized accessible labels. The record SHALL NOT rotate; while a track plays,
the groove highlights on the record SHALL shimmer subtly. The closed object
SHALL stay clear of the book covers at the reference desktop size, and the
screen SHALL adapt to narrow viewports. The closed gramophone SHALL carry the
localized "Gramofone"/"Gramophone" label below the art. The "From the next room"
subtitle SHALL NOT be shown.

#### Scenario: Gramophone is visible

- **WHEN** the start screen opens
- **THEN** the closed gramophone is visible without opening a separate page

#### Scenario: Closed label and no subtitle

- **WHEN** the closed gramophone is shown
- **THEN** its label sits below the art and the "From the next room" subtitle is absent

#### Scenario: Gramophone opens

- **WHEN** the player activates the closed gramophone
- **THEN** a centered screen shows the machine, the current recording, the record rack and the transport

#### Scenario: Transport is accessible

- **WHEN** the player tabs to or hovers a gramophone control
- **THEN** it shows a localized accessible label and a visible focus state

#### Scenario: Track line

- **WHEN** the current track changes
- **THEN** the screen updates the title, composer, performer, year and track position, and the active rack row moves

#### Scenario: Gramophone moves

- **WHEN** the player drags the gramophone and releases it
- **THEN** it stays where it was dropped and its transport keeps working

### Requirement: Track metadata card

Changing track SHALL show the recording's metadata. In the book screen the
metadata appears in a localized card with the title, composer, performer, year,
genre, label, catalog number, public-domain year and a link to the source page;
the card SHALL be announced politely to assistive technology, SHALL dismiss
itself after a few seconds and SHALL NOT replace the persistent track line. In
the desk screen the open gramophone screen shows the same metadata persistently
and the active rack row moves; the source link SHALL remain reachable.

#### Scenario: Card on change

- **WHEN** the player moves to another track or a track ends and the next one
  starts in the book screen
- **THEN** the metadata card appears for the new track

#### Scenario: Desk screen metadata

- **WHEN** the current track changes on the desk screen
- **THEN** the gramophone screen shows the new title, composer, performer, year, genre, label, catalog, public-domain year and source, and the active rack row moves

#### Scenario: Card dismisses

- **WHEN** the card has been visible for its timeout
- **THEN** it disappears without stopping playback

#### Scenario: Source is reachable

- **WHEN** the player activates the source link
- **THEN** the Discografia Brasileira page for that recording opens

### Requirement: Period low-poly HUD styling

The HUD and menus SHALL use the pixel kit over the low-poly scene: the sepia
period palette from shared tokens, Pixelify Sans at its crisp sizes, panels and
buttons with 2 px borders and stepped corners, hard offset shadows without
blur, and pixel focus and pressed states. They SHALL NOT use rounded corners,
blurred shadows, CDN fonts or player-facing hardcoded text. The main menu SHALL
show an animated pixel-art scene of the column marching along a road at dusk,
drawn in code and held still when the player prefers reduced motion, with the
desk objects laid over it. The arrow keys SHALL move the focused object and
Enter SHALL open it. The public-domain photograph SHALL appear pixelated in the
sepia palette as the compendium's cover.

#### Scenario: Sepia treatment

- **WHEN** the HUD is visible
- **THEN** panels use the sepia ink, parchment and gold tokens of the period palette, not a green terminal palette

#### Scenario: Pixel treatment

- **WHEN** the HUD is visible
- **THEN** panels and buttons have 2 px borders, stepped corners and hard shadows, and all text uses Pixelify Sans

#### Scenario: Readable at the reference size

- **WHEN** the bootcamp HUD is shown at 1440 x 900 in PT-BR or EN
- **THEN** no HUD label, order name or objective row overflows its control

#### Scenario: Marching menu

- **WHEN** the main menu is open
- **THEN** soldiers march across the pixel scene behind the desk objects, and the arrow keys move the focused object and Enter opens it

#### Scenario: Localized labels

- **WHEN** the locale changes between PT-BR and EN
- **THEN** every HUD label, title and status string changes with it
