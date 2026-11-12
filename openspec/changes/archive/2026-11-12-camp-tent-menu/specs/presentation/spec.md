## MODIFIED Requirements

### Requirement: Desk start screen with draggable objects

The start screen SHALL present the menu as physical objects on a camp table
under a tent at dusk, rasterized from the owner's drawing, which covers the
view and gives way at the sky first: a campaign book, a compendium book, a
reference pile, an options compass, a skirmish map pile, the record player
and the field glasses that open the map editor. Every closed object SHALL be
drawn at the camp table's scale, so it keeps the size of the owner's layout
at any view size. The player SHALL be able to drag each object anywhere
inside the start-screen area with a pointer, and the object SHALL stay fully
inside the viewport. Dragging SHALL NOT create a text selection. Every closed
object SHALL carry a single localized label on a small dark plate below its
art, using the same font, size and gap; the campaign label SHALL read
"Campanha"/"Campaign" and the compendium label "A Coluna Prestes"/"The Prestes
Column". The object most recently interacted with SHALL be drawn in front.
The desk SHALL expose a localized "tidy desk" action that restores the
default arrangement, the places of the owner's layout drawing, and closes the
open objects. A window resize SHALL carry placed objects with the table.
Every player-facing label SHALL come from the PT-BR and EN catalogs, and every
desk sprite and the camp table SHALL be recorded in the asset register; they
MAY be rasterized from owner-supplied references, which stay out of the
repository.

#### Scenario: Desk loads

- **WHEN** the player opens the start screen
- **THEN** the camp table covers the view and the seven desk objects appear at the places of the owner's layout

#### Scenario: Closed objects are labeled

- **WHEN** the desk is closed
- **THEN** every object shows its localized label on a plate below the art, with the same font and gap, and no title is painted on a book cover

#### Scenario: Objects follow the table's scale

- **WHEN** the view is resized
- **THEN** every closed object is drawn at the camp table's new scale and placed objects keep their place on the table

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
- **THEN** every object returns to its place in the owner's layout and the open objects close

#### Scenario: Locale switch updates the desk

- **WHEN** the locale changes between PT-BR and EN
- **THEN** every desk object name, hint and action label updates without a reload

#### Scenario: Art is registered

- **WHEN** the asset register is read
- **THEN** each desk sprite and the camp table are listed with their source, author and licence

## ADDED Requirements

### Requirement: Skirmish map pile of authored maps

The skirmish object SHALL present the saved skirmish maps (and, in
development builds, the test map) as a pile of yellowed parchment cards lying
flat on the table in its perspective, one card per map, any number of them
from one up; every saved map SHALL add its own card. The chosen map SHALL lie
on top, square, with its print showing whole through the card's window, its
localized name and the deploy stamp; the other cards SHALL lie beneath it,
each turned a little so its edge shows. The pile SHALL carry the localized
"Mapas"/"Maps" label below the art. Selecting a card beneath SHALL bring it to
the top; activating the top card or its stamp SHALL open the skirmish setup on
that map. The selected map SHALL survive a tidy desk or a return to the start
screen during the session. With no map to show, the object SHALL show a
single blank card reading "Nenhum mapa ainda — abra o editor" / "No maps yet —
open the editor", with no deploy action.

#### Scenario: Pile shows every saved map

- **WHEN** the player opens the start screen with three skirmish maps saved
- **THEN** the pile holds three cards, each reachable with its localized name, and the "Mapas"/"Maps" label sits below the pile

#### Scenario: Empty pile

- **WHEN** the player opens the start screen in the published game with no skirmish map saved
- **THEN** a blank card says there are no maps yet and points to the editor, and nothing can be deployed

#### Scenario: Top card is printed

- **WHEN** the player looks at the top card
- **THEN** the map's print shows whole through its window, with its name and deploy stamp on the card's legend strip

#### Scenario: Select a map

- **WHEN** the player selects a card beneath the top one
- **THEN** it comes to the top with its print, name and stamp

#### Scenario: Open the setup

- **WHEN** the player activates the top card or its stamp
- **THEN** the skirmish setup opens on that map

#### Scenario: Selected map survives

- **WHEN** the player tidies the desk or returns to the start screen
- **THEN** the selected map is still selected

## REMOVED Requirements

### Requirement: Skirmish map fan of authored maps

**Reason**: camp-tent-menu replaces the fan of folded sheets with a pile of cards lying on the camp table, one per map.

**Migration**: See "Skirmish map pile of authored maps"; the selected map, the empty state and opening the setup carry over.
