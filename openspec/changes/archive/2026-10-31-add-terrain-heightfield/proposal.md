## Why

The sandbox is flat. Cover and movement ignore height, so a ridge or trench cannot
change a fight. The next slice adds a deterministic heightfield and makes terrain
change movement speed and cover.

## What Changes

- Add a shared sandbox terrain with a low ridge, trench, crater and road.
- Add `terrainHeightAt`, `terrainSpeedAt`, `terrainSurfaceAt` and
  `terrainCoverAgainst`.
- Multiply unit movement speed by slope and surface.
- Add terrain cover to the existing directional cover calculation.
- Render a low-poly heightfield from the same shared terrain data.
- Place characters, paths, markers and tracers at terrain height.
- **Non-goals:** full 3D LOS, destructible terrain, terrain editor, vehicles,
  campaign missions and final art.

## Capabilities

### New Capabilities

- `terrain`: deterministic height, surfaces, speed and cover.

### Modified Capabilities

- `simulation`: movement speed and cover read terrain.
- `presentation`: the scene renders the heightfield and places units and paths on it.

## Impact

- `packages/shared`: terrain features and height/speed/cover helpers.
- `packages/simulation`: terrain-aware movement and cover.
- `packages/view3d`: heightfield mesh, character/path/tracer heights, terrain raycast.
- Tests: height, slope, speed, terrain cover and rendering heights.
- No GitHub action.

## Historical scope and legal note

The sandbox terrain is fictional and designed to test mechanics. It is not a
historical map and makes no claim about a real engagement. No map scan or book
text is reproduced.
