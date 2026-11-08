## ADDED Requirements

### Requirement: Desk art standard

Every closed desk object SHALL be drawn as clean pixel art at a single on-screen
scale of 2x on every screen size, where one art pixel covers two by two screen
pixels, so that no
two closed objects show different pixel sizes. Every closed object SHALL use the
shared desk palette, one light direction from the top left and a dark outline
one art pixel wide, so it stays legible over the moving menu scene without a
drawn table surface. Each closed object's art SHALL rest on the bottom edge of
its sprite canvas, so every label sits the same distance below its art. Every
closed object SHALL cast the same hard drop shadow, offset by two art pixels and
without blur. The campaign and compendium books SHALL keep their current
silhouette, viewing angle, cover colour and default position. An open book's
frame SHALL use the same cover colour as its closed book. Sprites SHALL NOT be
rotated by arbitrary angles at runtime. Every redrawn sprite SHALL be recorded in
the asset register as original art with its source file and licence. Labels SHALL
keep coming from the PT-BR and EN catalogs; this requirement adds no new text.

#### Scenario: One pixel size on the desk

- **WHEN** the desk is shown with every object closed
- **THEN** every object's art is rendered at an integer 2x scale of its source sprite, at 1440 x 900, at 1280 x 720 and in the narrow layout

#### Scenario: Labels share a baseline distance

- **WHEN** the desk is shown with every object closed
- **THEN** the gap between the lowest opaque art pixel and the label is the same for every object

#### Scenario: Same shadow on every object

- **WHEN** the desk is shown with every object closed
- **THEN** every object casts a hard shadow with the same offset and no blur

#### Scenario: Books keep their look

- **WHEN** the desk opens with the default arrangement
- **THEN** the campaign book is navy and the compendium book is green, at the same default positions and angles as before this change

#### Scenario: Open book keeps its colour

- **WHEN** the player opens the compendium book
- **THEN** the open spread's frame uses the compendium's green; the open campaign spread's frame uses its navy

#### Scenario: Art is registered

- **WHEN** the asset register is read
- **THEN** each redrawn desk sprite is listed as original art with its Aseprite source and licence

### Requirement: Desk pick-up and drop feedback

While the player holds a desk object with the pointer, the object SHALL appear
lifted: it moves up by one art pixel and its hard shadow grows to three art
pixels. Releasing the object SHALL drop it back to the resting shadow in a short
step with no long easing. Dragging SHALL snap an object's position to a 2 px
grid, so a moved object always lands on the art pixel grid; a stored position
off that grid SHALL be snapped when the desk loads. A keyboard move SHALL move
the object by whole grid steps. Under `prefers-reduced-motion: reduce` the
object SHALL NOT move up when held; only its shadow SHALL change.

#### Scenario: Picking an object up

- **WHEN** the player presses the pointer on a closed object and starts to drag it
- **THEN** the object is drawn one art pixel higher with the larger shadow and in front of the other objects

#### Scenario: Dropping an object

- **WHEN** the player releases a held object
- **THEN** the object returns to the resting shadow at the drop position

#### Scenario: Drop lands on the grid

- **WHEN** the player drops an object at any pointer position
- **THEN** the stored x and y of the object are multiples of 2

#### Scenario: Old positions are snapped

- **WHEN** the desk loads a stored layout whose positions are not multiples of 2
- **THEN** each object is placed at the nearest grid position inside the view

#### Scenario: Reduced motion

- **WHEN** the player prefers reduced motion and holds an object
- **THEN** the object does not move up and only its shadow changes

### Requirement: Desk position kept across open and close

Opening a desk object SHALL show its open screen as a centred overlay without
changing or storing the object's desk position. While an object is open, its
closed art SHALL NOT be drawn on the desk. Closing it SHALL show the closed
object again at exactly the position it had before opening. Open screens SHALL
NOT be draggable. When several objects are open, the one most recently opened or
touched SHALL be in front. A resize while an object is open SHALL keep the open
screen centred and SHALL keep the closed position inside the view. In the
narrow layout, where the desk is a scrolling column, an open screen SHALL take
the object's place in the column at the column's width, fully inside the view.

#### Scenario: Close returns to the same place

- **WHEN** the player drags the compendium to a position, opens it and closes it
- **THEN** the closed compendium is drawn at the same position as before opening

#### Scenario: Opening does not store a position

- **WHEN** the player opens an object and reloads the page without moving anything
- **THEN** the stored desk layout holds the position the object had before opening

#### Scenario: Open screen is centred

- **WHEN** the player opens any object from any desk position
- **THEN** its open screen is centred in the view

#### Scenario: Open screen in the narrow layout

- **WHEN** the player opens a book in the narrow layout
- **THEN** the open book sits in the column at its width and no part of it is outside the view

### Requirement: Open book spreads

Both menu books SHALL open into a two-page spread with a fixed role for each
page and SHALL NOT use an inner scroll. Text that does not fit SHALL continue on
the next page. Body text SHALL render at no less than 16 CSS px. Pages SHALL
keep at most a small margin of blank parchment, so that no page shows a large
empty area apart from a deliberate plate or end page. Every spread SHALL show its
page numbers. Previous and next controls and the left and right arrow keys SHALL
turn one spread at a time. Under reduced motion, turning SHALL be instant.
Sections or chapters SHALL be reachable from ribbons on the book's edge and from
a contents page. Every visible string SHALL come from the PT-BR and EN catalogs
or the bilingual content registry, and SHALL switch with the locale without a
reload.

#### Scenario: No inner scroll

- **WHEN** any spread of either book is shown at 1440 x 900 or at 1280 x 720
- **THEN** no page content overflows its page and no page shows a scroll bar

#### Scenario: Turning pages

- **WHEN** the player presses the right arrow key on an open book
- **THEN** the next spread is shown with its page numbers

#### Scenario: Ribbon jumps to a section

- **WHEN** the player activates a section ribbon on the compendium
- **THEN** the book opens at that section's first spread

#### Scenario: Locale switch

- **WHEN** the locale changes while a book is open
- **THEN** the same spread is shown in the new language

### Requirement: Compendium book layout

The open compendium SHALL start on a contents spread that lists the sections
with their entry counts and the entries of the selected section. An entry SHALL
fill a spread. The left page SHALL show the entry's image plate with its caption,
credit and licence, or, when the entry has no registered image, a drawn section
emblem marked as a placeholder in the asset register. The right page SHALL show
the title, the label (historical, dramatized or fictional), the date and place
when known, the short body, the extended note and the sources with confidence.
An extended note longer than the right page SHALL continue on the following
spread. Entries SHALL link to the related entries they name.

#### Scenario: Entry with an image

- **WHEN** the player opens the Miguel Costa entry
- **THEN** the left page shows his portrait with caption, credit and licence, and the right page shows the title, label, body, note and sources

#### Scenario: Entry without an image

- **WHEN** the player opens an entry with no registered image
- **THEN** the left page shows the section emblem and no broken image

#### Scenario: Label and confidence are visible

- **WHEN** any entry is shown
- **THEN** its label and its confidence are visible on the spread

### Requirement: Campaign book layout

The open campaign book SHALL start on a title spread and a contents spread that
lists the prologue and chapters 2 to 8, with number, title, date and commander.
Each chapter SHALL open on a spread whose left page shows an image plate and the
chapter's number, title, date, place, commander, perspective and label, and
whose right page begins the chapter prose. The prose SHALL continue across
spreads. Each chapter SHALL end on a briefing spread with the pitch, a summary of
the objectives and links that open the chapter's compendium entries in the
compendium book. Each chapter SHALL show a play action that is disabled and
labelled "in preparation", and SHALL keep the existing action that brings the
map fan forward for a skirmish.

#### Scenario: Contents lists every chapter

- **WHEN** the player opens the campaign book
- **THEN** the contents spread lists the prologue and chapters 2 to 8 with title, date and commander

#### Scenario: Chapter opening spread

- **WHEN** the player opens chapter 3 from the contents
- **THEN** the left page shows the plate, "Miguel Costa" as commander, the date, place, perspective and the "dramatized" label, and the right page begins the prose

#### Scenario: Missions are not playable yet

- **WHEN** the player reaches any chapter's briefing spread
- **THEN** the play action is visible, disabled and labelled "in preparation"

#### Scenario: Briefing links to the compendium

- **WHEN** the player activates a compendium link on a briefing spread
- **THEN** the compendium book opens, or comes to the front, at that entry

### Requirement: Reference pile default position

The reference pile SHALL have a default position on the desk, like every other
desk object, so the default arrangement and the "tidy desk" action place it
without error. Its default position SHALL keep it below the campaign book on the
left side of the desk, clear of the books' default positions.

#### Scenario: Default arrangement includes the pile

- **WHEN** the desk opens with no stored layout
- **THEN** the reference pile appears at its default position on the left, between the two books, fully inside the view

#### Scenario: Tidy desk with the pile moved

- **WHEN** the player moves the reference pile and activates "tidy desk"
- **THEN** the pile returns to its default position and no error is raised
