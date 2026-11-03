## Context

The visual slice has a deterministic simulation, three player proxies and a
graybox. This change adds the first playable skirmish. See `proposal.md` for scope.

## Goals / Non-Goals

**Goals:**

- Two player sections and one legalist squad with visible status.
- Selection by HUD and click; move/attack by right-click.
- Deterministic rifle combat with cover, ammunition, morale and reload.
- Victory/defeat and pause/speed.
- Tracers and dead poses.

**Non-Goals:**

- Campaign, save/load, pathfinding around the building, cavalry, artillery,
  aircraft, final art/audio, multiplayer, GitHub.

## Decisions

### 1. Squads are grouping metadata

`UnitSnapshot.squadId` groups units. Selection is presentation state; commands
still target unit ids, which keeps the command protocol simple and the simulation
authoritative. HUD section buttons select the living unit ids of that squad.

### 2. Combat in the simulation

Each unit has health, ammunition, morale, a target and a fire cooldown. Alive
units auto-acquire the nearest visible enemy in range. A shot uses the seeded RNG,
emits a `shot` event, consumes a round and applies damage on a hit. Empty
magazines reload for 30 ticks. This keeps combat deterministic and testable
headless.

### 3. Cover and line of sight

`packages/shared/src/world.ts` owns the building rectangle, sandbag cover points,
fire range and cover calculation. The building blocks line of sight and movement.
Cover = stance bonus (standing 0, crouched 0.25, prone 0.5) plus 0.25 for nearby
sandbags, clamped to 0.65. Hit chance falls with distance and target cover.

### 4. Morale and suppression

A hit costs morale; a miss costs a little. Below 30 morale the unit is suppressed:
accuracy drops and the HUD marks it. At zero the unit stops firing but remains
alive; it can still be ordered to move.

### 5. Outcome

After combat each tick, all legalist dead → victory; all player dead → defeat.
The outcome is frame metadata and stops further firing.

### 6. Input and HUD

The HUD has section cards, stance buttons, pause/1×/2×/4×, objective and outcome.
Left click selects a friendly unit's section; right click on ground moves; right
click on a living enemy attacks. Pointer picking is presentation-only: project
unit world positions to screen and use a ground-plane raycast for move points.

### 7. Traces and death

`TracerLayer` draws short-lived line segments for `shot` events. `CharacterLayer`
uses `alive` to force the prone pose and hide the selection ring for dead units.

### 8. No pathfinding yet

Move orders go in a straight line. The building blocks movement, so a unit ordered
through it stops at the wall. Pathfinding belongs to a later change; the first
skirmish is laid out with open lanes around the building.

## Risks / Trade-offs

- **Combat can stall if both sides lack LOS** → spawn the sections on opposite
  open lanes around the building and test a finite outcome.
- **Auto-fire removes player agency** → attack/hold commands and cover/stance
  still shape the fight; later changes add fire discipline.
- **Straight-line movement can stick at the building** → keep the slice lanes
  open; pathfinding is an explicit non-goal.
- **Balance is provisional** → numbers live in constants and tests; balance pass
  is a later change.
- **Pointer picking at low resolution** → use generous 28 px pick radius and test
  on the actual canvas.
