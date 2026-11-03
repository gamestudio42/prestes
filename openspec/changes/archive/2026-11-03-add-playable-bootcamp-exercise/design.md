## Context

See `proposal.md` for motivation. The current bootcamp is a presentation-side
director over `TrainingAction` signals and waypoint proximity. The simulation is
authoritative, deterministic and worker-owned. Training dummies are inert and are
not auto-acquired. The existing App has three tutorial content paths; only
`BOOTCAMP_MISSION` and `TrainingMissionPanel` are player-facing.

The change must fit the existing command/event/frame boundary, preserve the
deterministic hash, and keep all player-facing strings in EN/PT-BR catalogs.

## Goals / Non-Goals

**Goals:**

- Make one three-phase bootcamp exercise playable end to end.
- Keep mission state in a pure director that reads frames and emits commands.
- Add non-lethal training fire without adding a second combat model.
- Support local phase retry and resume from a phase checkpoint.
- Replace the 27-step checklist with mission objectives and live progress.
- Remove the dead tutorial/campaign path from the player-facing build.

**Non-Goals:**

- Campaign progression, save/load of a campaign, or a ten-mission flow.
- New maps, final art, audio, vehicles or additional weapons.
- A general-purpose scenario scripting language.
- Refactoring the 4k-line engine before the exercise is playable.

## Decisions

### Phase content lives in a dedicated exercise schema

Create `BootcampExercise` with three `ExercisePhase` entries and typed objectives.
Keep `TrainingMission`/`TRAINING_MISSIONS` out of the new flow. Alternative:
extend the 27-step `TrainingStep` model. Rejected because it would keep the
checklist as the core abstraction.

### Simulation gets two small training-only capabilities

- `role` and `nonLethal` fields on spawned units and snapshots.
- `training_phase` and `despawn_role` commands accepted only in training/sandbox.

`training_phase` resets the phase checkpoint: clears orders, removes training
enemies, repositions the player troop and officer, resets training state and spawns
the phase enemy. This supports resume and retry without a full simulation snapshot.

Alternative: serialize/restore the whole engine. Rejected for this slice because it
adds a large state-contract surface to a 4k-line engine.

### Non-lethal fire is an attacker property

When a non-lethal attacker hits a player soldier, the engine applies suppression
and bounded morale pressure but skips HP damage, wounds, incapacitation, death and
rout. The training enemy remains a normal target and can be killed by the player.
Morale is floored during training fire so the tutorial cannot fail by panic.

Alternative: zero-damage dummies. Rejected because it creates no pressure and no
reason to use cover or suppression.

### The exercise director is pure and presentation-side

`apps/game/src/training/exercise.ts` evaluates objectives from frames and returns
state plus commands. It never owns unit positions, combat state or timers outside
the frame tick. The App sends commands and pauses on failure/success.

Alternative: a simulation-owned mission controller. Rejected for the first slice;
the simulation should expose frame facts, while mission sequencing is content.

### Progress is phase-based

Use `prestes.bootcamp.exercise.v1` with `phaseIndex`, `completedPhases`, `completed`
and optional best time. On resume, start a fresh client and send `training_phase`
for the saved phase. Legacy `prestes.bootcamp.steps.v1` is not migrated into phase
progress; the new exercise starts at phase 1.

### Objectives use explicit runtime values

The HUD receives objective values such as soldiers in zone, suppressed enemies,
seconds held and officer status. Values are computed from frames by the director,
not by the panel.

### Markers stay in the presentation layer

`TrainingMarker` gains `zone`, `approach` and `fallback` kinds plus an optional
radius. `TrainingLayer` renders them without simulation footprint. Only the
active phase markers are shown.

### Dead tutorial paths are removed after the new flow is green

`apps/game/src/tutorial/*`, `TutorialPanel`, `TrainingCampaignScreen`, `boot-camp.ts`
and the unused `TRAINING_MISSIONS` flow are removed or isolated at the end of the
change. This avoids carrying two truths and removes tests that protect unused code.

## Risks / Trade-offs

- [Training fire feels harmless] → suppression, pin, timer and line-loss failure
  preserve pressure without death.
- [Retry becomes complex] → phase checkpoint command instead of snapshot; player
  loses mid-phase position, which is acceptable for a drill.
- [Director duplicates simulation state] → objectives are derived values only; no
  unit or combat state is cached.
- [HUD becomes noisy] → at most three objectives and three markers per phase.
- [Old specs conflict] → the delta spec supersedes the ten-mission campaign path;
  `boot-camp` is marked obsolete during archive.
- [Performance regression] → no new heavy art; markers are a few draw calls; budget
  remains under 1 MB and ≥25 FPS headless tactical.

## Migration Plan

1. Create the exercise content and protocol fields.
2. Add non-lethal and phase setup to the simulation with unit tests.
3. Add the pure exercise director and tests.
4. Wire phase 1 end to end.
5. Add phases 2 and 3, failure and retry.
6. Replace the panel and markers.
7. Remove the dead tutorial paths and update docs/specs.
8. Run the full validation suite.

Rollback: revert the OpenSpec change and remove the new content/module. Existing
sandbox, 3v3 lab and simulation tests remain functional independently.

## Open Questions

None that change the spec or task sequence. Tuning values for suppression duration,
hold ticks and failure windows will be adjusted during playtest without changing
the objective model.
