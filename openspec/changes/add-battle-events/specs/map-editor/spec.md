## ADDED Requirements

### Requirement: Events panel

The editor SHALL have an Events panel listing the map's events in id order
with their label, trigger and actions summarized in one line each. The
author SHALL add, duplicate, delete and reorder events (reordering
renumbers ids in the new order, and references to events follow), and
edit an event's label, trigger, delay and actions with controls for every
trigger and action kind of the battle events capability: time as mm:ss;
objective and side chosen from lists; area and entry point chosen from the
map's event places; losses as a share; "after event" from the other
events; sections chosen from the side's section types; card title and
text in PT-BR and EN side by side. Every change SHALL be one undoable
step. All labels and messages SHALL be localized in EN and PT-BR; the
author's labels and place names are not translated.

#### Scenario: Author a wave
- **WHEN** the author adds an event "Reforço legalista", sets "time 8:00", adds "troops enter: two rifle sections at 'estrada norte', go for the bridge" and a card in both languages
- **THEN** the panel shows the event's one-line summary, the saved map carries it, and undo removes it step by step

#### Scenario: Delete a referenced event
- **WHEN** the author deletes an event that another event's "after event" trigger names
- **THEN** the editor asks first, naming the event that depends on it, and on confirmation the dependent trigger is left empty and reported by the check

### Requirement: Event places in the editor

The editor SHALL have tools to place entry points (snapped within 10 m of
the map edge, with their facing pointing inward) and to draw trigger areas
(moving, inserting and deleting corners as for deployment areas), each with
a name. Places SHALL be drawn labelled on the map when the Events panel is
open, and selecting an event SHALL highlight the places, objectives and
points it uses. Deleting a place that events use SHALL ask first, naming
them.

#### Scenario: Entry point snaps to the edge
- **WHEN** the author clicks 25 m inside the north edge with the entry point tool
- **THEN** the point is placed on the north edge (within 10 m of it) facing south

#### Scenario: See what an event uses
- **WHEN** the author selects an event that brings troops through "estrada norte" and sends them to the bridge
- **THEN** the entry point and the bridge objective are highlighted on the map

### Requirement: Event checks

The map check SHALL report as errors: an event whose trigger or action
refers to a place, objective, event or section type that does not exist;
a section type not of the action's side; an entry point that is not on
walkable dry ground or not within 10 m of the edge; a move point that is
not reachable from its entry point; a card missing its title or text in
either language; events whose "after event" triggers form a loop; a time
trigger later than the longest time limit (30 min); an event with no
action; more than 24 events. It SHALL warn when an event can never fire
because the event it follows can never fire. Each problem SHALL select the
event (and the place, when there is one) when clicked.

#### Scenario: Chain loop
- **WHEN** event A follows B and B follows A
- **THEN** the check reports a loop naming both events, and clicking it selects A

#### Scenario: Wrong side's section
- **WHEN** a legalist "troops enter" lists a Column section type
- **THEN** the check reports it as an error on that event

### Requirement: Events in the playtest

The playtest SHALL run the map's events as in a battle. A playtest panel
SHALL list the events with their state (waiting, triggered, fired, and the
battle time it fired) and a "fire now" button for each event not yet
fired, which fires it at once (its delay skipped), as if its trigger had
been met. "Fire now" SHALL exist only in the editor's playtest and SHALL be
refused by the simulation in any other battle.

#### Scenario: Rehearse a beat
- **WHEN** the author presses "fire now" on "Reforço legalista" at 1:10 of a playtest
- **THEN** the two sections enter, the card shows, and the panel marks the event fired at 1:10, with events that follow it starting their delays

#### Scenario: Not in a real battle
- **WHEN** a "fire event" command reaches a skirmish or campaign battle outside the playtest
- **THEN** the simulation rejects it and nothing fires
