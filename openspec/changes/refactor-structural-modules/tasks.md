## 1. Engine context and shared helpers

- [ ] 1.1 Create `packages/simulation/src/systems/context.ts` with the `SimContext` type and a `createContext(engine)` helper, and have the engine build its context once; verify `pnpm typecheck` and that `pnpm check:determinism` still matches `eee8ea8f`
- [ ] 1.2 Move snapshot and hash code (`snapshotUnits`, `hashState` internals, `frame` assembly) to `systems/snapshot.ts`; verify `pnpm check:determinism`, `pnpm sim` (`206ab124`) and `pnpm verify:quick`
- [ ] 1.3 Move shared geometry helpers (`nearestOpenPoint`, `occupied`, `nearestEnemy`, `nearestEnemyAt`, `facingToward`, `squadCentroid`, `clampToRegion`) to `systems/geometry.ts`; verify both hashes and `pnpm verify:quick`

## 2. Engine systems

- [ ] 2.1 Move formation code (`reflowFormation`, formation slot assignment) to `systems/formations.ts`; verify both hashes and `pnpm verify:quick`
- [ ] 2.2 Move movement (`moveUnit`, `separateUnits`, `groupSpeedFactor`, `repairStalledMovement`, `queueUnitOrder`, `updatePostureMovement`, `advanceTowardTarget`, `moveTowardOfficer`) to `systems/movement.ts`; verify both hashes and `pnpm verify:quick`
- [ ] 2.3 Move bounding (`updateBounding`, `assignBoundingDirect`, `setBoundingCover`, `assignBoundingAdvance`) to `systems/bounding.ts` and point the `assignBoundingDirect` unit test at the module; verify both hashes and `pnpm verify:quick`
- [ ] 2.4 Move cover (`seekCover`, `nearCoverObject`, `rescueCover`, `spawnCover`) to `systems/cover.ts`; verify both hashes and `pnpm verify:quick`
- [ ] 2.5 Move combat (`acquireTargets`, `visible`, `fire`, `updateFacing`) to `systems/combat.ts`; verify both hashes and `pnpm verify:quick`
- [ ] 2.6 Move morale and cohesion (`updateMoraleStates`, `reactToSuppression`, `fleePanicked`, `nearestEdge`, `checkRouted`, `applyOfficerAura`, `updateCohesion`, `updateSoldierStates`, `updateOfficerLoss`) to `systems/morale.ts`; verify both hashes and `pnpm verify:quick`
- [ ] 2.7 Move casualties and rescue (`incapacitate`, `wound`, `woundFor`, wound factors, `releaseCarry`, `startNextRescue`, `updateRescue`, `updateRecovery`) to `systems/casualties.ts`; verify both hashes and `pnpm verify:quick`
- [ ] 2.8 Move tactical orders (`applyTacticalOrder`, `updatePursuit`, `updateRecon`, `seekFlank`, `chooseFlankSide`, `assignFlankPaths`, `assignFlankPath`, `beginWithdraw`, `cleanupOrders`, `clearArrivedOrders`) to `systems/orders.ts`; verify both hashes and `pnpm verify:quick`
- [ ] 2.9 Move command handling and spawning (`applyCommand`, `applyLineMove`, `spawnDummy`, `spawnTroop`, `setTrainingPhase`, `despawnRole`, `resetTrainingUnit`, `reinforce`, `applyRoster`, `updateOutcome`) to `systems/commands.ts` and `systems/spawning.ts`; verify both hashes and `pnpm verify:quick`
- [ ] 2.10 Confirm `engine.ts` holds only state, the public API and the tick order (about 800 lines or fewer), that no system imports DOM, React, Three.js or Node APIs, and run the full `pnpm verify`

## 3. HUD

- [ ] 3.1 Record visual baselines: add `tests/e2e/visual.spec.ts` with `toHaveScreenshot` for the start screen and the bootcamp HUD (canvas masked, animations disabled), generate baselines with `--update-snapshots`, and verify the spec passes twice in a row
- [ ] 3.2 Move order icon, label and posture tables to `apps/game/src/ui/hud/orderMeta.ts` and `IconButton` to its own file; verify `pnpm verify:quick` and the visual spec
- [ ] 3.3 Extract `OrderBoard`, `SquadCard`, `WeaponCard`, `CommandRow` and `StatRail` into `apps/game/src/ui/hud/`, keeping props and every `data-testid`; verify `Hud.tsx` is about 350 lines or fewer, `pnpm verify:quick` and the visual spec

## 4. App hooks

- [ ] 4.1 Extract `useTestBridge` and `useKeyboardShortcuts` into `apps/game/src/hooks/`; verify `pnpm verify:quick` and the e2e smoke, selection and sandbox specs
- [ ] 4.2 Extract `useGameClient` (client creation, frame, speed, start and reset); verify `pnpm verify:quick` and the e2e smoke and tactical specs
- [ ] 4.3 Extract `useExerciseDirector` (exercise state, director effect, progress, retry and debrief); verify `pnpm verify:quick` and the training-campaign e2e spec
- [ ] 4.4 Extract `useSandbox` and `useOrders`; verify `App.tsx` is about 500 lines or fewer and run the full `pnpm verify`

## 5. Styles

- [ ] 5.1 Remove dead CSS blocks (training campaign overview, the duplicated mission briefing sheet, and any other selector with no use in `apps/game/src`, including template-built class names), listing each removed selector group in the commit; verify the visual spec and `pnpm verify:quick`
- [ ] 5.2 Split `styles.css` into `apps/game/src/styles/` domain files imported in the original cascade order from `styles/index.css`, and import it from `main.tsx`; verify no file is over about 1,200 lines, the visual spec, the bundle budget and `pnpm verify:quick`

## 6. Documentation and final check

- [ ] 6.1 Update `docs/architecture.md` with the simulation systems layout and the app hooks, HUD components and styles folders, and record line counts before and after in `docs/status.md`
- [ ] 6.2 Run `openspec validate refactor-structural-modules --type change --strict` and the full `pnpm verify`, and verify both hashes are unchanged (`eee8ea8f`, `206ab124`)
