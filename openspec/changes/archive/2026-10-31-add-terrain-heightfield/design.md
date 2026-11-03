## Context

Movement currently uses a constant speed and a flat ground plane. Cover is
directional between units and sandbags; terrain is not in the simulation. The
view uses a plane for rendering and picking. See proposal and specs.

## Goals / Non-Goals

**Goals:**

- One shared deterministic terrain source for simulation and view.
- Height, slope and surface change movement speed.
- Ridges, trenches and craters add directional or local cover.
- Units, paths and tracers sit on the terrain.

**Non-Goals:**

- Full terrain LOS, cliff pathfinding, terrain destruction, vehicles or an editor.

## Decisions

### 1. Analytic terrain features

Terrain is defined by a small list of ellipsoidal features:

```ts
interface TerrainFeature {
  id: string;
  kind: 'ridge' | 'trench' | 'crater' | 'road';
  x: number;
  y: number;
  radiusX: number;
  radiusY: number;
  height: number;
  cover: number;
}
```

`terrainHeightAt` sums positive ridge heights and subtracts trench/crater depths
with a linear falloff. This is deterministic, cheap and easy to share.

Alternative: an authored height array. Rejected for this slice because a few
features are enough and easier to tune and test.

### 2. Speed

`terrainSpeedFactor(x, y)` combines local slope and surface:

- road 1.15;
- grass 1.0;
- dirt 0.9;
- ridge 0.85;
- crater 0.75;
- trench 0.6;
- slope penalty `1 - slope * 0.6`.

The result is clamped to 0.4..1.2 and multiplies the unit's step in `moveUnit`.

### 3. Cover

`terrainCoverAgainst` returns:

- trench/crater cover when the unit is inside the feature;
- ridge cover when a sampled point on the unit-to-threat segment is higher than
  both unit and threat by a threshold.

`coverAgainst` takes the maximum of sandbag and terrain cover, then adds stance
cover and caps at 0.75. Sandbag and terrain cover are not stacked.

### 4. View

Build a 120 × 120 m low-poly height mesh at 2 m resolution from the same terrain
function. Characters, path dashes, markers and tracers use `terrainHeightAt`.
`screenToGround` raycasts the terrain mesh, with the old plane as fallback.

### 5. Historical note

The terrain is fictional. It tests mechanics and must not be presented as a map of
a historical action.

## Risks / Trade-offs

- **Terrain mesh and simulation drift** → both use the same shared function.
- **Steep ridge blocks view visually** → the camera can pan/zoom; this slice does
  not add terrain LOS.
- **Units clip into slopes** → characters are placed at the sampled height; no
  slope-aligned rotation yet.
- **Performance** → 2 m grid over 120 m is 3,600 quads, acceptable.
