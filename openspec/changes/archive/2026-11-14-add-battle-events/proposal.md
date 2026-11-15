## Why

A battle today runs on its opening state: the two forces deploy, the enemy
commander plays the objectives and the clock runs out. Nothing new happens
that the author planned. The campaign missions are written as stories (a
rearguard holding until the wagons reach the river, patriotic battalions
arriving along a road, a government push in the last minutes), and several
mission files already mark these beats as "scripted event, not implemented"
or "a manual trigger before the full mission scripting lands". The owner
asked (2026-11-13) for a way to author these beats in the map editor, the
same place where every battle map is drawn by hand, so the storytelling of
each mission can be driven from the map itself.

## What Changes

- **Battle events in the map document.** A map MAY carry up to 24 events.
  Each event has an author's label, one trigger, an optional delay and one
  or more actions, and fires once.
- **Triggers**: the battle clock reaches a time; an objective is taken or
  lost by a side; a side's fit soldiers enter an authored area; a side's
  losses pass a share of the men it has fielded; another event has fired.
  Chaining events (with a delay) gives sequences ("ten minutes after the
  bridge falls, the enemy pushes").
- **Actions**:
  - *Troops enter*: one or more sections of a side's armies enter the map at
    an authored entry point on the edge, with a first order (move to a
    point, or for the enemy, go for an objective or join the commander's
    plan). Both sides: the Column's arriving sections come under the
    player's command; the enemy's come under the enemy commander.
  - *Enemy posture*: the enemy commander switches to a general offensive,
    a fall back to a line or its own area, or holding where it stands, for
    a set time or until another event fires, then returns to its normal
    plan.
  - *Narrative card*: the battle pauses and a book-style card shows a
    title and text in PT-BR and EN until the player closes it.
- **Event places**: entry points (on the map edge) and trigger areas
  (polygons) are named markers drawn in the editor and shared by events, so
  two waves can use the same road.
- **Editor**: an Events panel lists the map's events, edits trigger, delay
  and actions, draws and names the event places, checks them, and the
  playtest lists the events with a "fire now" button so the author can
  rehearse a beat without waiting for its trigger.
- **Map check**: events refer only to existing places, objectives, events
  and section types of the right side; entry points are walkable and on the
  edge; narrative cards have both languages; no chain loops.
- **Determinism**: events are evaluated inside the simulation on the fixed
  tick, in event order; which events fired and when is part of the hashed
  state. The pause for a card is presentation only (the client stops the
  clock), so headless runs are unchanged by it.
- Map document version 8 → 9; older maps load with no events.

## Player fantasy, loop and scope

The player commands a historical figure's force through a battle whose
shape changes the way the historical one did: help that arrives late,
an enemy that presses when a position falls, a moment where the story
speaks. The core loop is unchanged (deploy, order sections, take and hold
objectives); events change what the player is reacting to.

Historical scope: this change adds the mechanism only. The events of each
campaign mission are authored by the owner per map, with the sources cited
in that mission's file (`docs/campaign/missions/`) and labelled historical,
dramatized or fictional there. No mission events are written by this
change. The multi-perspective approach is unchanged: whoever commands a
mission (Siqueira Campos, Prestes, Miguel Costa, Isidoro Dias Lopes, per
the mission table in `docs/campaign/CAMPAIGN.md`) is set by the
mission, not by its events; an event card may speak in that figure's voice
or the narrator's.

MVP: the five triggers, the three actions, event places, the Events panel,
the map check, playtest "fire now", the paused card.

Non-goals: changing objectives or their values by event, ending the battle
by event, conditions combining several triggers (AND/OR) beyond chaining,
repeating events, recorded voice on cards (a later step of
`ambient-sound-and-voices` may add it), off-map artillery, camera moves,
and authoring the campaign's events themselves.

## Legal and ethical note

Card texts are the owner's original writing, paraphrasing sources and never
reproducing book text (Amado, Macaulay, Blanc or others), under
`docs/history/SOURCE_POLICY.md`. Events that put real people or massacres
on screen follow the same care as the mission files: label dramatized
content as such, avoid hagiography of any figure and do not stage violence
against civilians as spectacle.

## Capabilities

### New Capabilities
- `battle-events`: event data (triggers, delay, actions, event places),
  their deterministic evaluation in the simulation, troops entering,
  enemy posture changes and the paused narrative card.

### Modified Capabilities
- `map-editor`: an Events panel, event places on the map, checks for
  events, and "fire now" in the playtest.
- `battle-maps`: map document version 9 carries events and event places;
  older documents load with none.
- `map-objectives`: the enemy commander's objective play yields to an
  event's posture while it lasts.

## Impact

- `packages/shared/src/maps/` — document types, version 9 migration,
  compile into `BattleMap`, validation.
- `packages/simulation/src/systems/` — a new battle-events system, section
  spawning at an entry point outside the sandbox, posture handling in
  `enemy-commander.ts`; new sim events; `hashState`.
- `packages/shared/src/protocol.ts` — the event-fired sim event and the
  playtest-only fire command.
- `apps/game/src/editor/` — Events panel, place tools, store, undo.
- `apps/game/src/ui/` and `client/GameClient.ts` — the card and the pause.
- Locales (EN, PT-BR) for every editor and HUD string.
- Tests: unit (triggers, actions, determinism, migration, checks), an e2e
  for authoring an event and seeing it fire in the playtest.
