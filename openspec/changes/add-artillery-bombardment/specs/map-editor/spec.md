## ADDED Requirements

### Requirement: Bombardment in the Events panel

The Events panel SHALL offer "Artillery bombardment" ("Bombardeio de
artilharia") among the actions, with controls for: the side whose guns
fire; the gun (75 mm field gun / 105 mm howitzer); the target (an event
area from the map's places, or the enemy's positions); the rate (shells
per minute); the spread (m); and the duration, as mm:ss or "until event"
chosen from the other events. Its one-line summary SHALL name the side,
gun, target, rate and duration. Selecting the event SHALL highlight the
target area with a ring of the spread around its middle. Every change
SHALL be one undoable step; every label SHALL be localized in EN and PT-BR.

#### Scenario: Author the São Paulo shelling
- **WHEN** the author adds to an event "bombardment: legalists, 105 mm howitzer, area 'Brás', 4 per minute, 40 m, 3:00"
- **THEN** the panel summarizes it on one line, the map shows the area and the 40 m ring, the saved map carries the action, and undo removes it

### Requirement: Bombardment checks

The map check SHALL report as errors: a bombardment whose target area or
"until" event does not exist or is not an area; a bombardment lasting
until its own event; a rate, spread or duration out of range. It SHALL warn
when an area bombardment's aim point lies inside the firing side's own
deployment area. Each problem SHALL select the event when clicked.

#### Scenario: Missing area
- **WHEN** the area a bombardment targets is deleted
- **THEN** the editor asks first, naming the event, and the check then reports the bombardment as an error on that event

#### Scenario: Shelling one's own lines
- **WHEN** a legalist bombardment targets an area whose middle lies in the legalist deployment area
- **THEN** the check shows a warning on that event, and the map can still be saved and played
