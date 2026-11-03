## 1. Protocol and simulation

- [x] 1.1 Add `Stance` and the `stance` command to `packages/shared`; verify typecheck and protocol tests.
- [x] 1.2 Add stance to unit state, snapshots and the world hash; verify the default is standing.
- [x] 1.3 Handle valid, empty and unknown-unit stance commands; verify rejection events and unchanged hash for invalid commands.
- [x] 1.4 Update simulation/shared test fixtures for stance; verify `pnpm test`.

## 2. Character rig

- [x] 2.1 Rebuild the character proxy as a part hierarchy with separate legs, arms, head, hat, rifle, gear, ring and shadow.
- [x] 2.2 Keep ring and shadow as ground-fixed siblings; verify they do not rotate in prone.
- [x] 2.3 Verify body, head, hat, legs, arms and rifle exist at tactical span.

## 3. Procedural animation

- [x] 3.1 Implement a distance-based walk cycle for legs and arms with idle settle.
- [x] 3.2 Implement crouch and prone pose weights with easing; verify the body lowers and lies down.
- [x] 3.3 Verify return-to-standing restores the upright pose.
- [x] 3.4 Verify character scale still follows the strategic-span rule.

## 4. UI

- [x] 4.1 Add stand, crouch and prone HUD buttons that send stance commands for the debug column.
- [x] 4.2 Add PT-BR/EN stance labels; verify `pnpm check:locales`.
- [x] 4.3 Verify stance buttons work after a language switch.

## 5. Documentation

- [x] 5.1 Update `docs/architecture.md`, `docs/status.md` and `docs/assets.md` with the stance rig and procedural animation.
- [x] 5.2 Add a decision note if the stance contract changes beyond the design.

## 6. Verification

- [x] 6.1 Run `pnpm check` and `pnpm build`.
- [x] 6.2 Run `pnpm e2e`; verify start, movement path, crouch, prone and return to standing without errors.
- [x] 6.3 Capture and inspect a screenshot of standing, crouched and prone units.
- [x] 6.4 Run `openspec validate "add-cover-stances" --type change --strict` and `gs42-standards check`/`doctor`.
- [x] 6.5 Produce the delivery report.

