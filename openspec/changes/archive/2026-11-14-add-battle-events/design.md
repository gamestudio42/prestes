## Context

See proposal.md for why. What exists today:

- Maps are `MapDocument`s (`packages/shared/src/maps/document.ts`, version
  8, migrated one version at a time in `migrate`) compiled into the
  `BattleMap` that both the worker and the view load. Objectives and enemy
  presets already travel this way (`objectives?`, `enemyForces?`).
- The editor (`apps/game/src/editor/`) keeps the map, the tool, the
  selection and the undo history in `store.ts`; `EditorApp.tsx` holds the
  panels; `EnemyForces.tsx` is the closest model for a list-editing panel.
  The playtest stores the unsaved document and opens
  `index.html?playtest=1`; the worker gets it as `mapDocument` in the start
  message.
- The simulation runs on a fixed 100 ms tick. The battle clock is
  `tickCount - battleStartTick` (it starts when deployment ends).
  `enemy-commander.ts` (`updateBattleFlow`, every 10 ticks) assigns guards,
  retakes, the last-minutes commit and the fall-back of a broken side;
  `objectives.ts` handles capture.
- Sections can only be added at runtime in the sandbox/training
  (`spawnTroop`, `reinforce` in `spawning.ts`, both reject
  `sandbox_only` elsewhere). `spawnTroop` already builds a troop from a
  section type (men, weapons, speed).
- The client paces the worker (`GameClient`, speed 0/1/2/4/8); speed 0 is a
  pause that the simulation never sees.

## Goals / Non-Goals

**Goals:**
- One data model for events shared by editor, check, simulation and view.
- Events evaluated entirely inside the deterministic simulation.
- The card pause done in the client, so the simulation stays headless.

**Non-Goals:**
- A general scripting language or expression conditions.
- Saving and restoring a battle mid-way (events state only has to hash).

## Decisions

### D1. Data model (shared)

```ts
type EventSide = 'column' | 'legalist';
interface EventPlace { id: number; name: string;
  kind: 'entry'; point: Vec2; facing: Vec2 } |
  { id: number; name: string; kind: 'area'; polygon: Vec2[] };
type EventTrigger =
  | { kind: 'time'; seconds: number }
  | { kind: 'objective'; objective: number; side: EventSide; change: 'taken' | 'lost' }
  | { kind: 'area'; area: number; side: EventSide }
  | { kind: 'losses'; side: EventSide; percent: number }
  | { kind: 'after'; event: number };
type EventAction =
  | { kind: 'troops'; side: EventSide; entry: number; sections: SectionTypeId[];
      order: { kind: 'move'; to: Vec2 } | { kind: 'stay' }
           | { kind: 'objective'; objective: number } | { kind: 'commander' } }
  | { kind: 'posture'; posture: 'offensive' | 'fall-back' | 'hold';
      area?: number; until: { seconds: number } | { event: number } }
  | { kind: 'card'; title: LocalizedText; text: LocalizedText };
interface BattleEvent { id: number; label: string; trigger: EventTrigger | null;
  delay: number; actions: EventAction[] }
```

Both `MapDocumentBody` and `BattleMap` get `events?` and `eventPlaces?`.
`trigger: null` exists only so the editor can hold a half-made event and
the check can report it; the compiler drops events with no trigger or no
action (and the check makes that an error before save).

*Alternative*: inline geometry on each trigger/action. Rejected: the owner's
missions reuse a road for several waves, and a named place keeps them in
step when moved.

### D2. Version 9 migration

`MAP_DOCUMENT_VERSION = 9`; the 8 → 9 step is a version bump (both fields
optional and absent). Same pattern as 4 → 5 for objectives.

### D3. Simulation system `battle-events.ts`

State on `SimContext.battle`: `events: Map<number, { triggeredAt: number |
null; firedAt: number | null }>`, the posture `{ posture, area?, endsAt |
untilEvent } | null`, `fielded: { column, legalist }` (men count, starts at
deployment end, grows with arrivals) and a queue of pending arrivals
`{ tick, side, section, entry, order, index }`.

Each tick, after objectives and casualties, in ascending event id:
1. Mark triggered events whose trigger is met (objective taken/lost read
   from the objective owner change this tick; `after` reads `firedAt` of
   the named event, so a chain in ascending id fires the same tick when the
   delay is 0 and a chain in descending id one tick later — deterministic
   either way).
2. Fire events whose `triggeredAt + delay * 10 <= tick`: run actions in
   order, set `firedAt`, emit `battle_event_fired { eventId, card? }`.
3. Release pending arrivals whose tick has come; end the posture when its
   time is up or its event fired.

Losses are counted from `fielded` and the side's units that are dead,
incapacitated or routed. Nothing runs before `battleStartTick`.

`hashState` adds the event state, the posture and the pending queue only
when the map has events, so maps without events keep their hash (spec:
battle-maps "Same hash without events").

### D4. Arrivals

Extract the section-building part of `spawnTroop` into a function that
does not check the sandbox flag (`spawnSection(ctx, side, type, at, facing)`),
used by both. A "troops" action queues its sections 50 ticks apart; each
one spawns in a file of its men along the facing, starting at the entry
point and stepping inward, skipping blocked spots (as `spawnTroop` does).
New squad ids come from `nextSquadId` in spawn order.

First orders: the column gets a normal move command issued by the
simulation for that squad (or none for `stay`); the view's troop panel
already builds from the snapshot's squads, so a new squad appears there —
verify in the e2e, and add the section to the panel's roster list if it
is keyed by the deployment roster. Legalist arrivals get `goFor` toward a
point or objective and are tagged so the commander leaves them alone until
they arrive (or are engaged), then treats them like the others;
`commander` puts them straight into the commander's pool.

### D5. Posture in the enemy commander

`commandLegalists` checks `ctx.battle.posture` first. `offensive` reuses
the attack path (`attackObjective`, then nearest known enemy) for every
fit section; `fall-back` paths every fit section to the area's centroid
(or the own deployment area's) with a `defend` order; `hold` issues
`defend` in place. Guards, retakes and the last-minutes commit are skipped
while a posture is in force (map-objectives delta). Orders are re-issued
only when a section is idle or its target changed, as today. The broken
side's automatic fall-back (`fallBack`) still wins over any posture.

### D6. Fire now (playtest)

A command `fire_battle_event { eventId }` accepted only when the battle
was started from an editor `mapDocument` with a new start flag
`playtest: true`; otherwise rejected with `playtest_only`. It sets
`triggeredAt = tick` and a zero delay for that event. Since it is a
command, it is logged like every other and the run stays reproducible.

### D7. Card and pause (presentation)

`GameClient` gets `battle_event_fired` with a card; it pushes the card on a
queue, remembers the current speed and sets speed 0; the HUD shows a
book-style card (reusing the menu book styles from `menu-desk.css`)
with the localized title/text and a close button; closing pops the queue
and restores the speed when empty. The speed control is disabled while a
card is open. Headless runs (`pnpm sim`, determinism check) never see a
client, so nothing pauses (spec: Narrative card, Headless).

### D8. Editor

- `store.ts`: tools `entry-point` and `event-area`; selection kinds
  `event-place` and `event`; actions add/move/delete place,
  add/update/delete/duplicate/reorder event — each one undo step.
  Reordering renumbers ids and rewrites `after` triggers and `until.event`.
- `EventsPanel.tsx`: list + form, modelled on `EnemyForces.tsx`; section
  pickers use the side's armies (`rosterArmies`/section catalog), not the
  skirmish roster limits.
- Map drawing: places drawn in the editor viewport like deployment areas,
  labelled; the selected event's places, objectives and move points
  highlighted.
- Check: `validate-document.ts` gets the event checks (spec: Event checks),
  loop detection by DFS over `after` edges.
- Playtest: a small panel in the game HUD shown only with `?playtest=1`,
  reading event states from the snapshot (`battle.events` added to the
  snapshot only in playtest) and sending `fire_battle_event`.

### Content schema, research, figures

Card texts are map content written by the owner in the editor, stored in
the map document (both languages), and checked for both languages; they
are not in the locale catalog because they belong to one map. Historical
backing for each mission's events is recorded in that mission's file with
its sources (Macaulay first for chronology), not in this change. No
figure roster change; the mission's commander is unchanged by events.

Low-poly pipeline: no new models. Arriving sections use the existing
section uniforms; entry points and areas are editor-only overlays.

## Risks / Trade-offs

- [Spawning a file of men at the edge into water, a wall or a house] →
  the check requires walkable dry ground at the entry point; spawning
  skips blocked spots inward, as `spawnTroop` does, and the playtest shows
  it.
- [Posture fights the commander's own logic and sections jitter] → posture
  is checked first and the normal rules are skipped entirely while it
  lasts; orders re-issued only on change.
- [Column arrivals not appearing in the troop panel if it is keyed by the
  deployment roster] → a dedicated e2e step; fix the panel within this
  change if needed.
- [Card pause lets the player read the battlefield for free] → accepted;
  the pause is the owner's chosen presentation, and the player can already
  pause with speed 0.
- [Hash change for maps without events] → state added to the hash only
  when the map has events; determinism goldens on the test map must stay
  unchanged.

## Migration Plan

Version bump with an empty migration step; old maps load unchanged. No
saved games exist to migrate. Rollback is reverting the change; version 9
files with events would then be refused as newer, which is acceptable
while the game is local.

## Open Questions

- Card look (exact layout, an illustration slot) can be refined during the
  slice with the owner's review, without changing the behaviour.
