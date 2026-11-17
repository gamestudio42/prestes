## MODIFIED Requirements

### Requirement: Enemy forces in the map properties

The map properties dialog SHALL list the map's enemy presets and let the
author add and remove presets and add and remove their sections, under the
skirmish roster rules for the edited map's size: a section that would break
them cannot be added and the reason is shown, with the preset's men and
sections counted against that size's limits. Resizing a map to a smaller
size SHALL report every preset and the fixed column force that no longer
fit, and the map check SHALL refuse the map until they do. Empty presets
SHALL be dropped on apply; a map without presets SHALL say that the enemy
fields the default roster. Applying SHALL be one undoable step. Every count
and reason SHALL be localized in PT-BR and EN.

#### Scenario: Build a preset
- **WHEN** the author of a small map adds a preset (three rifle sections), removes one and adds a machine gun, then applies
- **THEN** the compiled map's presets are rifle, rifle, machine gun; a fourth rifle section was refused at 33 men with its reason shown; undo removes the presets

#### Scenario: A medium map's preset
- **WHEN** the author of a medium map adds five rifle sections to a preset
- **THEN** all five are accepted and the preset shows 55 of 66 men

#### Scenario: Shrinking the map
- **WHEN** the author resizes a medium map holding a preset of 55 men to small
- **THEN** the editor reports the preset as over 33 men and the map check refuses the map
