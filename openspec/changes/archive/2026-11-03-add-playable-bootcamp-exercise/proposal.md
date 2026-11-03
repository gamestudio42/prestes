## Why

The current bootcamp teaches controls through a 27-step checklist; it has no mission objective, no pressure and no win/lose loop, so it does not yet deliver the fantasy of commanding a section. This change turns the bootcamp into the first complete playable experience and proves the core loop before campaign content expands.

The player fantasy is an inexperienced section proving itself in a fictional field exercise under an instructor. The core loop is: receive an instructor order, position the troop, use fire and movement, secure the objective, and read the result. The historical scope is none: this is explicitly fictional training content. The MVP is one three-phase exercise with non-lethal opposing fire, victory, defeat and local retry. Non-goals are the ten-mission campaign, save/load of a campaign, new maps, final art or audio.

## What Changes

- Replace the 27-step bootcamp progression with three mission phases: assembly, assault and hold.
- Add mission objectives evaluated from simulation frames: reach, suppress, secure, hold and protect-officer.
- Add non-lethal training fire: training enemies suppress and force cover, but cannot wound, incapacitate or kill player soldiers.
- Add `role` and `nonLethal` to spawned units and add a training-only phase setup command for resume and retry.
- Add an exercise director that emits commands and objective state without owning combat state.
- Replace the bootcamp panel's 27-step checklist with phase objectives, live progress, instructor text, failure, retry and debrief.
- Add zone, approach and fallback markers.
- Persist the current phase and completed phases under a new storage key.
- **BREAKING**: the old 27-step bootcamp progress is not resumed as step progress; the exercise starts at phase 1.
- Remove the unused six-chapter tutorial UI/content and the unused ten-mission campaign flow from the player-facing path.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `bootcamp`: replace ordered checklist progression with a three-phase playable exercise, objectives, non-lethal training fire, failure, retry, debrief and phase progress.
- `simulation`: add non-lethal training fire, training roles and training-only phase setup/cleanup commands.
- `presentation`: replace the checklist panel with objective cards, zone markers, failure and debrief states, and remove stale ten-mission campaign requirements from the bootcamp flow.

## Impact

Affected code:

- `packages/content/src/training-campaign.ts` and a new exercise content module
- `packages/shared/src/protocol.ts`
- `packages/simulation/src/engine.ts`
- `apps/game/src/training/`
- `apps/game/src/App.tsx`
- `apps/game/src/ui/TrainingMissionPanel.tsx`
- `apps/game/src/styles.css`
- `packages/view3d/src/training-layer.ts`
- PT-BR and EN locale catalogs
- Vitest and Playwright suites
- Bootcamp, simulation and presentation specs

No new runtime dependency. No historical claim is made; the exercise is fictional training content and introduces no new historical figure.
