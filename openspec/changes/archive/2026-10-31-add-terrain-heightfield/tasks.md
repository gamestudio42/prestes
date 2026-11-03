## 1. Shared terrain

- [x] 1.1 Add terrain feature types, sandbox features and `terrainHeightAt`, `terrainSurfaceAt`, `terrainSpeedFactor` and `terrainCoverAgainst`; verify unit tests for height, slope speed and ridge cover.
- [x] 1.2 Add terrain cover to `coverAgainst` without stacking sandbag and terrain bonuses; verify world tests.

## 2. Simulation

- [x] 2.1 Multiply movement step by terrain speed; verify a unit crossing the ridge moves slower than one on flat ground.
- [x] 2.2 Use terrain cover in fire and snapshots; verify a unit behind the ridge receives more cover than one in front.
- [x] 2.3 Keep panic paths, map bounds and deterministic hashes working; verify the full engine suite.

## 3. View

- [x] 3.1 Render a low-poly heightfield from the shared terrain and raycast it for ground picking; verify the scene test or screenshot.
- [x] 3.2 Place characters, paths, markers and tracers at terrain height; verify units do not float over the ridge.

## 4. Verification

- [x] 4.1 Update architecture/status/docs for terrain; verify no placeholder is called final.
- [x] 4.2 Run `pnpm check`, `pnpm build`, `pnpm e2e`, `openspec validate "add-terrain-heightfield" --type change --strict`, and two `pnpm sim` runs; verify matching hashes.
- [x] 4.3 Mark tasks complete, archive, and verify `openspec validate --specs` and `--archived`.

