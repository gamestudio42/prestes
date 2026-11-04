## Context

See proposal.md (Why). The review that motivates this change ran a headless audit
of every order on fresh engines (training and sandbox modes) and a manual Chrome
pass. Confirmed working: move, withdraw, hold, face, flank (3 of 5 soldiers moved
more than 6 m sideways), recon (reports, no shots), pursue, defend, advance,
disperse, reserve, regroup, protect-officer, rescue chain (carry, treat,
evacuate, recover), stances, postures, formations, bounding, hold fire and the
morale chain (suppressed, pinned, panicked). Confirmed broken: attack, suppress
and ambush behind sight-blocking cover; officer loss without morale effect.

Boundaries that shape the approach:

- Simulation/presentation boundary: the exercise director in `apps/game` reads
  frames and events and sends commands; it never mutates simulation state. New
  objectives are evaluated from frames and events, and new training behavior
  (instructor follow, ammunition refill, casualty drill) lives in the simulation
  behind the training-only phase setup command.
- Deterministic kernel: every simulation change keeps the fixed tick and seeded
  RNG; the determinism golden is updated once, deliberately, at the end of the
  simulation group.
- Content schema: stations stay data in `packages/content/src/bootcamp-exercise.ts`
  (`ExercisePhase` with objectives, markers, setup, failure); new objective kinds
  extend the existing discriminated union.
- Low-poly pipeline and figure roster: untouched. No historical research is
  needed; the bootcamp is labelled fictional training and the instructor is a
  fictional training-cadre officer.

## Goals / Non-Goals

**Goals:**

- Every mechanic is required by at least one objective, checked by an automated
  coverage test over the station data.
- Each station is short (1 to 3 minutes at 1x) and has one clear instruction at
  a time.
- The mechanics audit becomes a permanent regression suite.

**Non-Goals:**

- Player-controlled command troop (commander + 2) for campaign and skirmish.
- New mechanics beyond what the simulation already has, except the specified
  officer-loss consequence, instructor follow, LOS approach and ammunition
  refill.

## Decisions

**Stations as data, objectives as typed predicates.** `ExercisePhase` becomes a
station with an ordered objective list. Objective kinds are added to the union:
`select`, `box-select`, `formation`, `stance`, `posture`, `order-effect`,
`target-hit`, `hold-fire`, `facing`, `flank-position`, `bounding-advance`,
`withdraw-out`, `defend-in-cover`, `ambush-trigger`, `recon-report`, `pursue`,
`disperse`, `reserve`, `regroup`, `rescue-complete`, `protect-officer`,
`cohesion-hold`, plus the existing `reach`, `suppress`, `secure` and `hold`.
Each kind has one pure evaluator in `apps/game/src/training/objectives.ts` taking
`(objective, frame, events, ticks, tickDelta)`. UI-only actions (selection,
box-select, camera) are recorded by the existing `recordTrainingAction` and
passed into the evaluator, so a click still counts only together with an observed
frame state (for example `select` needs `selectedCount` equal to the living
section). Alternative: free-form scripted steps (rejected: not testable, couples
content to UI).

Objectives inside a station complete in order; only the active objective is
highlighted, so the instructor gives one order at a time. Alternative: all at
once (rejected: noisy for a tutorial).

**Station plan.** Coordinates reuse the bootcamp field (assembly (28, 4), line
(52, -18), approach (82, 10)) plus new markers per station:

| # | Station | Mandatory objectives | Enemy |
|---|---|---|---|
| 1 | Formation | select, box-select, formation wedge, stance crouch and prone, reach assembly with 5 | none |
| 2 | Fire | attack a dummy until hit, suppress the training troop 20 ticks, hold fire 50 ticks with target visible, face a marker | 6 static training enemies |
| 3 | Maneuver | flank (2 flankers at 60°+ from the target's facing), bounding advance to a line, withdraw out of a danger marker | 6 training enemies holding |
| 4 | Defense | defend the trench area with 4 soldiers in cover, ambush triggers on an approaching troop, hold 300 ticks | approaching training troop |
| 5 | Recon | recon report from a marked area, pursue a withdrawing dummy troop 15 m, disperse, reserve, regroup within the cohesion band | withdrawing training troop |
| 6 | Wounded and officer | rescue one soldier set incapacitated by the setup; protect-officer near the instructor; the setup then takes the instructor out of action and the section must keep cohesion above 40 for 200 ticks | light training fire |
| 7 | Final | suppress, secure and hold the line 600 ticks with the instructor protected | full training troop |

Failure conditions keep today's hold rules in station 7 and add a station-6
failure if cohesion falls below 20 for 100 ticks.

**Instructor follow in the simulation.** A training-only system moves the
instructor toward the section centroid with a cover-first destination when it is
more than 15 m away, stopping within 12 m. A `pinInstructor` flag in the phase
setup disables it. The callout for the active objective uses the existing
`OrderCallout` overlay on the instructor. Alternative: director sends move
commands for the instructor (rejected: the instructor is not commandable and the
director must not micro-manage simulation units).

**LOS approach.** `advanceTowardTarget` uses `combatRange` (clamped to the weapon
range) as its stop distance and, when the target is in range but `visible()` is
false, picks the nearest reachable point within 10 m with line of sight to the
target, preferring points with directional cover against the target that do not
block the shooter's own sightline. Automatic cover seeking for a unit with an
ordered target rejects cover that blocks the sightline to it. The same check runs
for ambush and defend once a target is acquired.

**Officer loss.** `updateOfficerLoss` records, per officer, whether its loss was
already applied. On the first tick an officer is dead or incapacitated it applies
−20 morale to living allies within 25 m and −15 cohesion to its squad (floored
at 0), and the aura stops naturally because `applyOfficerAura` already skips
officers out of action. Recovery clears the flag. Alternative: continuous penalty
while absent (rejected: double-counts with the missing aura).

**Ammunition refill.** The phase setup command restores magazine and reserve from
the weapon profile for every living player soldier. No new resupply mechanic.

**Icon map.** `ui/hud/orderMeta.ts` gains one `ICONS` record keyed by every
control id; a unit test asserts every catalogue order and posture has an icon and
that icons are unique among controls shown together:

| Control | Icon | Control | Icon |
|---|---|---|---|
| attack | Crosshair | defend | Shield |
| suppress | Flame | disperse | Expand |
| move | Move | reserve | Layers |
| withdraw | Undo2 | regroup | Shrink |
| hold | Hand | posture balanced | Scale |
| face | Compass | posture aggressive | Swords |
| advance | ChevronsUp | posture defensive | ShieldHalf |
| flank | CornerUpRight | posture protect-officer | UserCheck |
| rescue | HeartPulse | Hold Fire | Ban |
| recon | Binoculars | bounding | Split |
| ambush | TreePine | clear order | Eraser |
| pursue | Footprints | preview | Route |
| codex | BookOpen | sandbox | FlaskConical |

The board grows from 12 to 16 order buttons; the sectors become Fire (2),
Movement (5) and Troop (9), and the board wraps on narrow widths.

**HUD shell.** Tick, path count and outcome move from the top rail to a
"Simulation" block at the top of the sandbox inspector (the e2e specs that read
`tick-value` read it there or through the dev bridge). The command row's
visually-hidden text becomes visible compact text; the row height drops to fit
one line.

**Start screen.** Replaces the placeholder tagline with a final line, removes the
repeated corner kicker, shows Continue and Restart when progress exists, and adds
an audio toggle next to the language selector.

**Tests.**

- `packages/simulation/test/mechanics.test.ts`: one scenario per order and
  officer mechanic, adapted from the review audit, including the LOS regression
  (riflemen behind the stone at (0, 4) must fire within 100 ticks).
- `packages/content` and `apps/game` unit tests for station data, every objective
  evaluator, migration and the curriculum coverage check.
- `tests/e2e/training-campaign.spec.ts` rewritten to drive each station through
  the dev bridge with `stepUntil`, one test per station plus one full run.
- Visual baselines re-recorded after the icon and HUD change, after reviewing the
  new screenshots.

## Risks / Trade-offs

- [LOS repositioning changes combat everywhere, not only in training] → the
  mechanics suite and existing simulation tests cover attack, flank and cover;
  the determinism golden is updated once with the reason in the commit.
- [Seven stations make the tutorial long] → each station targets 1 to 3 minutes,
  progress saves per station, and Continue resumes.
- [Objective predicates can be flaky with stochastic combat] → objectives check
  observed effects with tolerances (for example "2 of the ordered soldiers") and
  e2e drives stations by simulated ticks, not wall-clock time.
- [Officer-loss penalty could rout a section in station 6] → training fire stays
  non-lethal and station 6 has light fire; the failure threshold is cohesion
  below 20, not rout.

## Migration Plan

Progress key `prestes.bootcamp.exercise.v1` is read and migrated to
`prestes.bootcamp.stations.v2` (assembly → 1, assault → 2, hold → 7, completed
stays completed). The v1 key is removed after the first successful v2 save, so
the old data is replaced by the new format. Legacy 27-step progress still starts
at station 1 and is left untouched. Rollback is reverting the change; the old
code ignores the v2 key and starts at phase 1.

## Open Questions

- Exact marker coordinates for stations 2 to 6 are tuned while implementing each
  station; they do not change the specs or the task breakdown.
