## Context

See proposal.md for the why. What exists today:

- Officers are already a unit kind (`kind: 'officer'`): the Comando
  section's first man (`shared/sections.ts`, `simulation/systems/model.ts`).
  `morale.ts` gives them a 12 m aura (`applyOfficerAura`) and a once-per-
  absence loss (`updateOfficerLoss`: 25 m, -20 morale, -15 cohesion to his
  section, protect-officer interrupted); `fire-reaction.ts` screens them.
- Out of fire a soldier self-rallies to `SELF_RALLY_CAP` (60).
- Campaign maps carry `columnForce` (every one starts with `comando`),
  `events`, `eventPlaces`, `noEnemy`, and their index entry names the
  mission (`AUTHORED_MAP_INDEX[].mission`).
- Figures and chapters live in `packages/content` (`figures.ts`,
  `campaign/chapters.ts`, each chapter with a `commanderId`). `shared` does
  not import `content`.
- The outcome is decided in `combat.ts` (`DecidedBy`), the hash is
  `engine.hashState()` over `JSON.stringify(units)` plus optional blocks
  added only when present.
- There is no order-latency mechanic: orders apply on the tick they arrive.

## Goals / Non-Goals

**Goals:**
- The figure is an officer with one extra flag, so every officer rule keeps
  working on him without special cases.
- Maps without a commander hash exactly as before (skirmish, test, and the
  bootcamp/3v3 scenarios); only the campaign goldens move.
- Map-level data only: no new map-wide system beyond what the spec names.

**Non-Goals:**
- Order latency, a portrait, a unique 3D model, a second figure per map,
  skirmish officers (later change), campaign progression or save state.

## Decisions

**D1. Map document field.** `MapDocument.commander?: { figure: string;
presence: 'field' | 'voice'; loss: 'defeat' | 'continue' }`, compiled into
`BattleMap.commander` as `{ presence, loss }` only (the simulation never
needs the figure id; the view reads it from the document). Alternative: a
figure field on the Comando section in `columnForce`: rejected, because a
voice commander has no section and the loss outcome is map-wide.

**D2. Who is the figure.** At spawn, when `commander.presence === 'field'`,
the officer of the first `comando` section of the column gets
`figure: true` on `MutableUnit` (and on the snapshot record). The key is
absent on every other unit, so `JSON.stringify(units)` and the hash do not
change on maps without a commander. Alternative: a separate `figureId` on
the engine: rejected, every officer loop would need a lookup.

**D3. Command radius in `morale.ts`.** A new `applyCommandRadius(ctx)` runs
next to `applyOfficerAura`, and `selfRally` reads a per-unit cap: 75 inside
30 m of a fit figure, 60 otherwise. Same faction, any Column army (the
figure commands the column; the officer aura stays own-army). Constants:
`COMMAND_RADIUS = 30`, `COMMAND_RALLY_CAP = 75`, `COMMAND_RATE = 0.1`.
Iteration order is unit-id order, as for the aura, so it is deterministic.

**D4. Loss.** `updateOfficerLoss` branches on `figure`: radius 40 m, -25
morale, the same cohesion and protect-officer handling, and it pushes
`commander_down { tick, unitId, cause: 'killed' | 'incapacitated' }`. The
existing `officerLossApplied` flag guards it, so recovery re-arms it. On
`loss: 'defeat'` the engine sets `outcome = 'defeat'` with `decidedBy:
'commander'` in the same tick, checked before the annihilation/objective
rules in `combat.ts` so the cause is unambiguous.

**D5. Trigger.** `EventTrigger` gains `{ kind: 'commander' }`; the scripted
state records the tick `commander_down` was first emitted and the trigger
checks it. Hashed with the scripted state already (only on maps with
events).

**D6. Checks split by package.** `shared` (map document check): shape,
commander only on `use: 'campaign'`, field commander needs a `comando` in
`columnForce`, commander trigger needs a field commander. `tools/check-maps.ts`
plus a `content` test: the figure is registered and playable and equals the
chapter `commanderId` of the map's `mission`. Alternative: move chapters to
`shared`: rejected, too wide for this change.

**D7. Presentation.** `TroopPanel` shows the figure's `displayName` and
localized `roleKey` on the Comando card when a unit has `figure`. `view3d`
draws a placeholder pennant over that unit: **placeholder
`figure-pennant-placeholder`** (a coloured flag primitive), listed in the
asset register as a placeholder. The HUD maps `commander_down` to a localized
notice with the name. Strings: `commander.down.killed`,
`commander.down.incapacitated`, editor `editor.commander.*`, in `en` and
`pt-BR` (checked by `check-locales`).

**D8. Editor.** A Commander section in the map's properties, shown only for
campaign maps: figure select (playable figures), presence, loss; the map
check's messages appear in the existing check list.

**Historical research method and roster.** The per-map presence and loss come
from each mission doc's source matrix and failure conditions, Macaulay (Tier
0) first: Prestes present at Ramada, the Verdinho, Serra Nova and the
Pantanal; Miguel Costa the division's formal commander at the Paraná
crossing; Isidoro at Foz, not at Catanduvas (voice); Siqueira Campos wounded
and surviving at Copacabana (continue). Cordeiro and Estilac Leal are not in
`FIGURES.md` and are not named. Roster after the change: Siqueira Campos,
Prestes, Miguel Costa, Isidoro Dias Lopes, all playable.

**Boundary and kernel.** The simulation receives `{ presence, loss }` and
emits `commander_down`; it never sees names. Everything runs on the fixed
100 ms tick with no randomness added. No new low-poly assets beyond the
placeholder pennant.

## Risks / Trade-offs

- [The working tree has uncommitted edits in `document.ts`, `types.ts`,
  `engine.ts`, `combat.ts`, `model.ts`, `EditorApp.tsx` and the editor
  locales (another session's work)] → start the apply after that work is
  committed, and commit with explicit paths.
- [Defeat on incapacitation can feel harsh when a stray shot drops him] →
  the figure is screened like any officer; the player's counter is
  positioning. Revisit the 40 m / -25 values in playtest, not in the spec.
- [Campaign goldens move] → regenerate `tools/determinism-golden.json` in its
  own task and confirm skirmish/test goldens are unchanged.
- [Copacabana is a small map with four groups and no relief; a field figure
  with loss continue changes its pacing] → the owner chose Siqueira on the
  field (2026-11-15); check in the muted playthrough that the prologue still
  plays as a delaying action, and tune only the radius values if not.

## Migration Plan

Additive: maps without `commander` are unaffected. Rollback is removing the
field from the campaign maps.
