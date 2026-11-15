## Context

See proposal.md (Why). Today the outcome is decided in `updateOutcome`
(`packages/simulation/src/systems/combat.ts`), in this order: column fell back
→ no fit column man → legalists fell back → no fit legalist → all objectives
held (column, then legalists) → objective value at the time limit. "Fell back"
comes from `fallBack` in `systems/enemy-commander.ts`: a side under a fifth of
its starting strength with 60 s of no contact routs to its own edge and is
`broken`. Battle events (`systems/battle-events.ts`, `shared/maps/events.ts`)
already have trigger areas drawn in the editor, a card action and enemy
postures that override the commander. The map document is version 9; the
editor already draws polygons (deployment areas, objectives, trigger areas)
and checks reachability with `findPath` from the deployment areas.

## Goals / Non-Goals

**Goals:**
- One small, deterministic rule (a fit man in an exit leaves) that composes
  with the existing outcome, events and commander code without changing any
  map that has no exits.
- Exits authored like the areas the editor already has, so the main session
  can add them to maps 02, 05, 06 and 08 with no new concepts.

**Non-Goals:**
- Exits for the legalists, partial "screening" scores, horses or baggage,
  boats carrying men during the battle, casualties carried between missions.
- Editing the authored campaign maps (the main session does that afterwards).

## Decisions

### D1. Data: `withdrawal` on the document and the compiled map

```ts
interface MapExit { id: number; name: LocalizedText; polygon: Vec2[] }
interface Withdrawal { exits: MapExit[]; requirement: { sections: number; command: boolean } }
// MapDocumentBody.withdrawal?: Withdrawal ; BattleMap.withdrawal?: Withdrawal
```

Version 9 → 10, a relabel (`withdrawal` new and optional), with the shape
check (`isWithdrawal`) and `compileMapDocument` copying it (rounded corners,
requirement clamped to ≥ 1). A separate field rather than a new
`EventPlace` kind: exits change the outcome, exist without any event, and the
editor and the HUD treat them as gameplay layers like deployment areas.
*Alternative:* exits as event places plus an event action "victory" — rejected:
it would make the win condition depend on authoring an event and could not
express "saved, not broken".

### D2. Leaving: a per-man `exited` state, removed from play

`MutableUnit` gains `exited: boolean` (default false). A new step in the tick,
after movement and before vision, combat, objectives, events and outcome:
for each fit column unit (alive, not incapacitated, not routed, not dummy)
inside an exit polygon (`pointInPolygon`), set `exited = true`, `alive` stays
true, clear its path/target/order, and emit `{ type: 'unit_exited', unitId,
exitId }`. Every system that iterates units for the field (`fit()` helpers,
vision, targeting, objective capture, triggers, cover slots, garrisons, the
frame sent to the view) treats `exited` as "not on the field". To keep this
from being scattered, the shared `fit` predicates are changed to require
`!unit.exited`, and a single `onField(unit)` helper is used where code checks
only `alive`. *Alternative:* setting `alive = false` or moving the unit out of
bounds — rejected: both would make the man read as a loss or as a body in
every count that the report and the losses trigger rely on. A section's "got out" is derived and recorded once in
`ctx.withdrawal.out: Map<squadId, { tick, exitId }>` with a
`{ type: 'section_exited', squadId, exitId, command }` event; the command
section is the column squad whose type is in the `command` limit group.
*Why per man:* sections arrive strung out; removing a whole section when its
first man arrives would teleport the rest, and waiting for all of them inside
the area makes small exits jam. *Alternative:* a "withdraw through exit" order
— rejected for the MVP: moving into the area already reads as the order, and
exits are kept off the deployment area by the check (D6).

Routed men never exit (they are not fit). Fall-back routs men toward their
own edge as today; if that edge passes through an exit they still do not
exit, which keeps fall-back a defeat.

### D3. Outcome rule

In `updateOutcome`, when `ctx.withdrawal` exists, compute
`met = out.size >= requirement.sections && (!requirement.command || commandOut)`
first. Order on a withdrawal map:

1. `met` → victory, `decidedBy: 'withdrawal'`.
2. column fell back → defeat, `broken`.
3. no fit column man on the field → defeat, `'cut-off'` if any man exited,
   else `annihilation`.
4. legalists fell back / no fit legalist → victory (as today).
5. legalists held every objective 2 min → defeat (as today).
6. time limit reached (objectives or not) → defeat, `'cut-off'`.

The column's all-objectives and value-at-time-limit branches are skipped.
`DecidedBy` gains `'withdrawal' | 'cut-off'`. The time limit applies to a
withdrawal map even without objectives (today it applies only when there are
objectives); `ctx.timeLimitTicks` is already set for every battle.
A met requirement wins on the same tick over everything else (step 1 first),
matching the spec.

`fallBack` counts the column's exited men as fit for the
`men < start * BROKEN_SHARE` test, but only on-field men are routed.

The `outcome` event gains `withdrawal?: { menOut, sectionsOut, sections,
required, command, commandOut }`, read by the end panel; it also rides in the
frame so the HUD can show progress before the end.

### D4. Events trigger

`EventTrigger` gains `{ kind: 'exited'; sections: number } | { kind: 'exited';
command: true }` (stored as one kind with exactly one of the two fields).
`triggerMet` reads `ctx.withdrawal.out`. Area and losses triggers use the
updated `fit` predicate; losses count only non-exited men as lost (an exited
man is neither fit nor lost, but stays in `fielded`). `updateBattleEvents`
already runs before `updateOutcome`, so an "exited" event that fires on the
tick the battle ends has its card in that tick's events and the end panel
shows it (the HUD already shows a card arriving with the end).

### D5. Enemy commander: block and turn

A new plan `'block-exit'` in `SectionPlan`. On the first think after
deployment ends, on a withdrawal map: pick the exit nearest the column's
deployment centroid (ties by id); compute the path from that centroid to the
exit's centroid with `findPath`; the block point is the path point 60 % of the
way (rounded to the metre, snapped to walkable). Assign the legalist section
nearest that point (two nearest when it has ≥ 4 sections), order `defend` at
it. These sections are skipped by the objective-guard and lost-contact rules,
like `garrison`. Each think, for each exit, if the side knows (via
`knownEnemies`) a column man within 60 m of the exit's nearest edge point, the
sections with plan `attack` (and idle `hold` sections not guarding or
blocking) are ordered to attack the nearest known man of that group. Postures
already replace the commander's rules; the block is (re)applied when a posture
ends. All randomness, if any, goes through `ctx.rng`; none is planned.
*Alternative:* defending the exit area itself — rejected: a section standing
in the exit is easy to bypass on a wide edge and turns the exit into a melee
in a polygon; the route block forces the player to fight or flank.

### D6. Editor and checks

- `ToolId` gains `'exit'`; it reuses the polygon tool of trigger areas
  (corners move/insert/delete, whole-shape move) and stores to
  `doc.withdrawal.exits`. Name fields PT-BR/EN in the selection panel.
- Map properties gains a "Retirada" block (sections spinner 1..N, command
  checkbox), shown while there are exits.
- The Events panel adds the "exited" trigger.
- Checks in `validate-document.ts` (exits, requirement) and
  `validate-events.ts` (trigger), with new problem codes and targets
  `{ kind: 'exit', id }` and `{ kind: 'map-properties' }`; reachability by
  `findPath` from the column's derived section starts to a walkable sample
  point inside the exit (the same approach as `objective-unreachable`).
  "Sections the column fields": `columnForce` length when fixed; else the
  roster maximum (`MAX_SECTIONS` from the roster rules).

### D7. View and HUD

`packages/view3d` draws each exit as a ground decal band in the column's
colour with chevrons pointing toward the nearest map edge and a label, in the
same layer as the deployment areas (shown during deployment and the battle).
Exited units are absent from the frame's unit list (the worker filters them),
so the view and the unit panel need no special case; the troop panel shows the
section as "Fora" from the frame's withdrawal block. The top bar gets a
withdrawal chip next to the objective strip; the end panel gets one `dt/dd`
row and an extra "Saíram" column in the losses table (column row only).

### D8. Determinism

`hashState` adds each unit's `exited` and `ctx.withdrawal.out` (sorted) and the
block assignments (already in `plans`). The determinism tool gains a
`withdrawal` golden: a 1,000-tick battle on a test fixture map (a document in
`tools/fixtures/`, not an authored map) with two exits and a scripted column
move into one, so leaving, the trigger and the outcome are exercised. Existing
goldens must not change (no exits → no new state is hashed but `exited:false`;
to keep goldens stable, `exited` is hashed only when true).

## Simulation/presentation boundary and content schema

The rule lives in the simulation (Web Worker, no Three.js/React/DOM). The view
reads only the compiled map's `withdrawal` and the frame's withdrawal block
and events. The content schema change is D1; nothing in `packages/content`
beyond locale strings.

## Historical method and figures

No new historical claim is made by this change; the four missions keep their
own sourced write-ups in `docs/campaign/` (Macaulay 1974 as Tier 0, cited in
the spec's note). The figure for all four is Luís Carlos Prestes; the rule
only knows "the command section".

## Risks / Trade-offs

- [`exited` missed in some loop, so a gone man is shot or captures a flag] →
  change the shared `fit` predicates rather than each call site, add an
  `onField` helper, and a test that an exited man is invisible to vision,
  targeting, capture and triggers.
- [Exits on a narrow edge jam pathing at the border] → exits are polygons the
  author sizes; men leave on entering, so nobody stands in them.
- [Cheesy win: send one fast section out at once] → the requirement is the
  author's lever (count + command section); the commander blocks the route
  from the start; checks forbid exits touching the deployment area.
- [Timing of the time limit on withdrawal maps without objectives changes
  nothing for other maps] → the branch is guarded by `ctx.withdrawal`.
- [Determinism goldens shift] → hash `exited` only when true; run
  `pnpm check:determinism` before and after.

## Migration Plan

Version 10 is a relabel; version 9 maps load unchanged. Authored maps get exits
only when the main session edits them, re-recording their goldens then.
Rollback is reverting the change; no stored data depends on it until a map
uses exits.

## Open Questions

- Exact look of the exit decal (colour, chevrons) can be settled when drawing
  it; it changes no rule.
