## 1. Weapon catalog

- [x] 1.1 Add `WeaponProfile`, `WeaponId`, `Mauser` profile and validation to `packages/shared/src/weapons.ts`; verify a unit test rejects unknown ids and checks every required field.
- [x] 1.2 Export the weapon API from `packages/shared/src/index.ts`; verify `pnpm typecheck` passes.
- [x] 1.3 Add `docs/history/WEAPONS.md` with the Mauser, Winchester, revolvers, machine guns, automatic rifles and artillery, citing Macaulay pages and labelling abstractions; verify every documented entry has a source.

## 2. Simulation

- [x] 2.1 Add `weaponId`, `magazine` and `reserve` to unit state and the frame snapshot; verify the initial frame shows the Mauser with 5/15.
- [x] 2.2 Drive fire interval, range, accuracy, damage and suppression from the weapon profile; verify the engine test fires at the profile cadence and consumes a magazine round.
- [x] 2.3 Reload from reserve when the magazine empties and expose both values; verify tests cover a full reload, partial reserve and empty reserve.
- [x] 2.4 Update existing combat, suppress and outcome tests for the new ammunition fields; verify the whole simulation suite passes.

## 3. HUD and localization

- [x] 3.1 Add PT-BR/EN weapon label, action and note keys; verify `pnpm check:locales` passes.
- [x] 3.2 Show the selected section's weapon and `magazine / reserve` in the orders panel; verify Playwright sees the weapon and updates ammo after firing.

## 4. Verification

- [x] 4.1 Update `docs/architecture.md` and `docs/status.md` for the weapon catalog and per-unit ammunition; verify no placeholder is called final.
- [x] 4.2 Run `pnpm check`, `pnpm build`, `pnpm e2e`, `openspec validate "add-weapons-baseline" --type change --strict`, and two `pnpm sim` runs; verify hashes match.
- [x] 4.3 Mark tasks complete and archive the change; verify `openspec validate --specs` and `openspec validate --archived` pass.

