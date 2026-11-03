## 1. Shared pathfinding

- [x] 1.1 Add A* on the 1 m grid around the building with deterministic tie-breaking and path smoothing.
- [x] 1.2 Add a shared pathfinding test: clear route is direct, blocked route detours.

## 2. Simulation

- [x] 2.1 Add facing fields to units and snapshots; face target or path.
- [x] 2.2 Make move commands compute per-unit A* paths, follow waypoints and create per-unit route orders.
- [x] 2.3 Add stance lock on stance commands.
- [x] 2.4 Add auto-cover: idle unit with target and low cover seeks a sandbag with LOS, occupancy and cooldown checks.
- [x] 2.5 Verify combat still resolves and path/facing/cover tests pass.

## 3. Presentation

- [x] 3.1 Rotate character roots toward facing.
- [x] 3.2 Verify path layer draws the detour route.

## 4. Verification

- [x] 4.1 Run `pnpm check` and `pnpm build`.
- [x] 4.2 Run `pnpm e2e`.
- [x] 4.3 Inspect a screenshot with units aiming and a detour path.
- [x] 4.4 Run `openspec validate "add-unit-ai" --type change --strict` and `gs42-standards check`/`doctor`.
- [x] 4.5 Produce the delivery report.

