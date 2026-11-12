## ADDED Requirements

### Requirement: North in the editor

The map properties dialog SHALL offer the map's north as a slider from 0 to
355 degrees in 5-degree steps, labelled with the bearing and its
eight-point direction in PT-BR and EN. The editor's view SHALL show a north
arrow in a corner that points to true north and follows the slider while it
moves. The value SHALL be saved in the map document and kept by undo and
redo.

#### Scenario: Arrow follows the slider
- **WHEN** the author sets north to 90 in the map properties
- **THEN** the view's north arrow points to the right

#### Scenario: Saved with the map
- **WHEN** the author sets north to 45, saves, and opens the map again
- **THEN** the dialog shows 45 and the arrow points to the upper right
