## 0. Before starting

- [x] 0.1 Read `docs/status.md`, then this change's proposal, design and specs; keep the game muted (`prestes.audio.v1`) in the preview pane; do not author events on the owner's campaign maps (the owner writes them) — tests use fixtures and the test map's in-memory copy only; verify: `pnpm check` passes before any change

## 1. Data and map document

- [x] 1.1 Event types (`BattleEvent`, `EventTrigger`, `EventAction`, `EventPlace`) in `packages/shared/src/maps/`, `events?`/`eventPlaces?` on the document body and `BattleMap`, compile step that drops events with no trigger or no action; verify with unit tests of the compile on a fixture with every trigger and action kind
- [x] 1.2 Document version 9 with the 8 → 9 migration step; verify with unit tests: a version 8 fixture loads with no events, a round trip keeps events and places in order and ids, export writes version 9
- [x] 1.3 Event checks in `validate-document.ts` (missing references, wrong side's section, entry point off the edge or not walkable, unreachable move point, card missing a language, `after` loops, time over 30 min, no action, over 24 events, the "can never fire" warning); verify with one unit test per check

## 2. Simulation

- [ ] 2.1 Extract `spawnSection` from `spawnTroop` (no sandbox check), with `spawnTroop` using it; verify: existing sandbox spawn tests and the determinism goldens unchanged
- [ ] 2.2 `battle-events.ts`: event state, fielded counts from deployment end, the five triggers, delay, fire-once, `battle_event_fired` sim event, wired into the engine after objectives and casualties; event state hashed only when the map has events; verify with unit tests for each trigger scenario in the battle-events spec (delay, fires once, objective taken, area entered unseen, losses with reinforcements, chain, not during deployment) and the test-map determinism goldens unchanged
- [ ] 2.3 "Troops enter": queued arrivals 5 s apart at the entry point, file inward, blocked spots skipped, first orders for both sides (column move/stay; legalist move/objective/commander, tagged until arrived or engaged); verify with unit tests of the three troops scenarios (fog for the unseen arrival via the column's vision) and a test that arrivals take ids in spawn order
- [ ] 2.4 Enemy posture in `enemy-commander.ts` (offensive, fall back to area or own area, hold; for a time or until an event; replaced by a later posture; routed keep routing; broken-side fall-back still wins); verify with unit tests of the three posture scenarios and the map-objectives "Posture overrides the guards" scenario, plus the existing Retake and Last minutes tests unchanged
- [ ] 2.5 `fire_battle_event` command, accepted only with the `playtest` start flag, rejected `playtest_only` otherwise; event states in the snapshot only in playtest; verify with unit tests of both scenarios of "Events in the playtest"
- [ ] 2.6 Determinism of a full scripted battle; verify with a test that runs a fixture map with a time trigger, an objective trigger, a chain, an arrival and a posture twice with the same seed and commands and compares hashes on every tick, and that `pnpm sim` completes on it

## 3. Card and pause (game)

- [ ] 3.1 Card queue and pause in `GameClient` (remember speed, speed 0, restore on last close, speed control disabled while open) and the book-style card component in the HUD, title and text in the game's language, close button; HUD strings in EN and PT-BR; verify with unit tests of the queue and speed restore, and `pnpm check:locales`
- [ ] 3.2 Column arrivals in the troop panel; verify in the e2e of 5.1 that an arriving column section can be selected and ordered (fix the panel if it is keyed by the deployment roster)

## 4. Editor

- [ ] 4.1 Store: `entry-point` and `event-area` tools (entry snapped within 10 m of the edge, facing inward; area corners as for deployment areas), event and place selections, add/update/delete/duplicate/reorder events with id renumbering and reference rewrite, each one undo step, delete of a used place or event asks first; verify with unit tests of snapping, renumbering, the delete-referenced-event scenario and undo
- [ ] 4.2 Places drawn labelled in the viewport while the Events panel is open, and the selected event's places, objectives and move points highlighted; verify by screenshot in the preview pane of the editor with the test map's in-memory copy (not saved)
- [ ] 4.3 `EventsPanel`: list with one-line summaries and the form for every trigger and action (mm:ss, side and objective lists, place pickers, losses share, after-event list, section pickers by the side's armies, card PT-BR/EN side by side); labels in EN and PT-BR; check problems select the event and place; verify with `pnpm check:locales` and the e2e of 5.1
- [ ] 4.4 Playtest: `playtest: true` start flag from the editor, a playtest-only events panel in the HUD with each event's state and fire time and a "fire now" button; verify with the e2e of 5.1

## 5. Integration

- [ ] 5.1 Playwright e2e: in the editor on an unsaved copy of the test map, place an entry point, author "Reforço legalista" (time 0:30, two sections through the entry, go for the bridge, a card in both languages), playtest, see the card pause the battle and resume at the same speed, use "fire now" on a second event that brings a Column section and order that section from the troop panel; verify: `pnpm e2e` passes
- [ ] 5.2 Docs: the event authoring steps in `docs/maps/GUIA_MAPAS_CAMPANHA.md` (PT-BR, for the owner), the mission files' "manual trigger before the full mission scripting lands" notes pointed at events, `docs/status.md` updated; verify: `pnpm verify` passes and `openspec validate add-battle-events --type change --strict` passes
