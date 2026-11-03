## Context

Cover is currently a static `COVER_POINTS` constant used by simulation and view.
Frames expose units and order paths, but no cover list or sandbox entities. The
client can already pause and set speed, and the worker can step a fixed number of
ticks. Terrain is a shared analytic heightfield.

## Goals / Non-Goals

**Goals:**

- Inspect the mechanics without reading the debug console.
- Place cover and targets in the sandbox from the UI.
- Keep the sandbox deterministic and inside the existing command/event boundary.
- Keep the future mission path free of sandbox-only commands.

**Non-Goals:**

- Campaign, save/load, terrain editor, vehicles, new weapons, destructible props.
- A full level editor.

## Decisions

### 1. Simulation owns the cover set

`CoverPoint` stays the shared geometry type. The engine creates its cover list from
the initial points and accepts a sandbox `spawn_cover` command. `Frame.covers`
exposes a copy. `coverAgainst` takes an optional cover list so existing tests and
mission code can use the default set.

Alternative: client-only cover. Rejected because fire, cover and determinism would
diverge from the rendered props.

### 2. Sandbox commands are explicit

```ts
type Command =
  | { type: 'spawn_cover'; kind: CoverKind; to: Vec2 }
  | { type: 'spawn_dummy'; to: Vec2 };
```

Both commands are accepted only by the sandbox simulation. Invalid kinds or
positions inside the building are rejected with a new machine-readable reason.
Each spawn emits a frame update and is included in the hash.

Alternative: direct mutation through the UI. Rejected because the worker owns
state and the command boundary would be bypassed.

### 3. Dummies are units with no AI

A dummy is a `UnitSnapshot` with `kind: 'dummy'`, `faction: 'target'`, full health,
no weapon, no movement, no fire, and a `dummy` flag. It can be targeted by players
and counted for hit tests, but is ignored by outcome and by the enemy AI. It is
rendered as a low-poly target board, not a soldier.

Alternative: separate target props. Rejected because fire, selection and hit
events already operate on units; a dummy unit is the smallest deterministic
extension.

### 4. Inspector is read-only presentation

The panel derives every value from the frame and selected unit id. It never stores
simulation state. Cover and speed values come from shared helpers; elevation comes
from `terrainHeightAt`. No strings outside the locale catalog.

### 5. Reset restarts the worker

The reset action disposes the current `GameClient` and creates a new one with the
same seed. This preserves determinism and avoids a second reset code path in the
engine.

### 6. Pause and step

The sandbox uses speed 0 and a `step` action that sends one tick through the
existing worker protocol. The HUD's normal pause/speed controls remain available.

## Risks / Trade-offs

- **Sandbox-only commands may leak into missions** → guard with a simulation mode
  option; missions will construct the engine without sandbox commands.
- **Dynamic cover can overlap units/buildings** → reject center inside the
  building and overlapping units; allow deliberate adjacency.
- **Dummy faction affects targeting** → explicitly include targets for player
  fire, exclude from AI and outcome; tests cover both.
- **Panel can grow into a level editor** → keep the MVP to inspector, reset,
  sandbag/stone/trench and dummies.
