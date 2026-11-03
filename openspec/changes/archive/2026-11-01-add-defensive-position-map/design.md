## Context

The sandbox has terrain and dynamic cover but the central house blocks the map,
only three player units exist and selection is section-based. Cover volumes are
not movement blockers. Flank sends every unit to a side, withdrawal moves directly
away and there is no hover affordance.

## Goals / Non-Goals

**Goals:**

- A readable defended-position sandbox with mixed cover.
- One six-person troop: five riflemen and one officer.
- Collision with blocking cover and pathfinding around it.
- Whole-troop click selection plus directional marquee selection.
- Officer morale aura and cover seeking.
- Cover-aware flank split and withdrawal.
- Hover shield/target hints.

**Non-Goals:**

- Campaign, new weapons, vehicles, destructible obstacles, final art.

## Decisions

### 1. Cover volumes are obstacles

`CoverPoint` gains `blocksMovement` and `blocksSight`. Sandbags, stone walls,
low walls and barrels block movement; high stone walls also block sight. The
trench is walkable. The central building is removed; pathfinding and movement use
the cover list. `isPointBlockedByCovers` and `isLineBlockedForMovement` provide the
checks.

### 2. Six-person troop

Player units are five infantry and one officer in one section. The officer has
the same Mauser baseline, regenerates morale for allies within 12 m and seeks
cover even without a target. The HUD card shows the whole troop.

### 3. Selection

A friendly click selects every active player unit. A drag creates a marquee:
leftward drag is blue and selects all player units in the box (including the
officer); rightward drag is green and selects only infantry. Commands operate on
the selected ids.

### 4. Flank split

The Flank command divides the selected troop in half: the first half suppresses
the target and holds, the second half receives flank paths. Flank candidates are
scored by cover against the target and then travel distance.

### 5. Withdrawal

Withdraw evaluates cover positions on the side away from the nearest enemy,
prefers high cover, and falls back to a direct route away when no cover is
reachable. Suppression fallback follows the same cover preference.

### 6. Hover hints

`GameCanvas` projects the cursor to ground or units. An enemy under the cursor
shows a target icon. Defensible ground with cover against a legalist shows a
shield icon. These are presentation-only and never issue commands.

## Risks / Trade-offs

- **Obstacle collision can trap a unit** → pathfinding fallback and direct withdraw.
- **Marquee direction can be misread** → blue/green box colour and HUD selected
  count.
- **Six units slow the browser smoke test** → keep the 60 s test timeout and simple
  scenes.
- **Officer aura can mask suppression** → aura is small and only within 12 m.
