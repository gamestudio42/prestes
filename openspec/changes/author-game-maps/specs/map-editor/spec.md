## ADDED Requirements

### Requirement: Time of day in the editor

The map properties dialog SHALL offer the map's time of day (a slider from
early morning to late afternoon) and the sun direction (a compass bearing).
While either is changed, the editor's view SHALL light the map as the
battle will, so the author sees which slopes stand out. The values SHALL be
saved in the map document, kept by undo and redo, and labelled in PT-BR and
EN.

#### Scenario: Preview while dragging
- **WHEN** the author drags the time of day from midday to late afternoon with the sun from the west
- **THEN** the editor's view darkens the east faces of the hills as the slider moves

#### Scenario: Saved with the map
- **WHEN** the author sets morning, sun from the east, saves the map and plays it
- **THEN** the battle is lit as morning with the sun from the east

### Requirement: Enemy forces in the map properties

The map properties dialog SHALL list the map's enemy presets and let the
author add and remove presets and add and remove their sections, under the
skirmish roster rules: a section that would break them cannot be added and
the reason is shown, with the preset's men and sections counted. Empty
presets SHALL be dropped on apply; a map without presets SHALL say that the
enemy fields the default roster. Applying SHALL be one undoable step.

#### Scenario: Build a preset
- **WHEN** the author adds a preset (three rifle sections), removes one and adds a machine gun, then applies
- **THEN** the compiled map's presets are rifle, rifle, machine gun; a fourth rifle section was refused at 33 men with its reason shown; undo removes the presets

### Requirement: Map thumbnail from the editor view
On the development server, the editor SHALL save the current view, framed by the author with pan and zoom, as the saved map's thumbnail: the centre of the view, cropped square, without the editor overlays. The thumbnail SHALL be the map's preview picture, shown on its sheet on the desk and on the skirmish setup screen. A map not yet saved to the project SHALL be refused with a message asking to save it first.

#### Scenario: The author frames the thumbnail
- **WHEN** the author saves a map to the project, pans and zooms the view, and selects "Use view as thumbnail"
- **THEN** the map's preview picture is the framed view, and its sheet on the desk shows it

#### Scenario: An unsaved map has no thumbnail yet
- **WHEN** the author selects "Use view as thumbnail" on a map that is not in the project
- **THEN** nothing is written and the editor asks to save the map first

## MODIFIED Requirements

### Requirement: Save to the project

When the editor runs on the development server, it SHALL offer "save to
project", which writes the map document into the project's authored maps
folder after validation passes, under its slot: a campaign map for its
mission, a skirmish map by its id. A map saved for the campaign SHALL carry
its mission id, its setting label and a source note; the editor SHALL
refuse to save it without them. The published build SHALL NOT offer this
action.

#### Scenario: Save to project in dev
- **WHEN** the author saves a valid skirmish map named "Forte" to the project on the development server
- **THEN** `forte.map.json` is written in the authored maps folder and the map checks pass on it

#### Scenario: Campaign map needs a source note
- **WHEN** the author saves a campaign map with an empty source note
- **THEN** the save is refused with a message naming the missing field

#### Scenario: Campaign map saved for its mission
- **WHEN** the author saves a valid map made for "05 A Ponte de Verdinho"
- **THEN** the written document carries the mission id `ponte-de-verdinho` and the campaign book's chapter offers to play it

#### Scenario: Not in the published build
- **WHEN** the editor runs from the published build
- **THEN** "save to project" is not shown and export is offered instead
