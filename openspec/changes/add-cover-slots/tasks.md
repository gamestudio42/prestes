## 1. Slot model

- [x] 1.1 Add `building` to `CoverKind` and `coverSlots(cover)` in `packages/shared/src/cover-slots.ts` for every kind per the design; unit-test slot counts, determinism, rotation and that slots sit outside movement-blocking footprints (trench slots inside the walkable floor)
- [x] 1.2 Add `pickSlots` (free, reachable, threat side, region limit, greedy by distance with id tie-breaks) and unit-test the threat side, the region limit and no double assignment

## 2. Simulation

- [x] 2.1 Add `slotHolders` to the context and `slotId` to units; release on new destination, death, incapacitation, rout, despawn and cover removal; unit-test each release path
- [x] 2.2 Use slots in move, move-line, defend, ambush and reserve destinations and in automatic cover seeking, with slot stance, facing and cover value on arrival; mechanics tests: 11 into the trench (8+ in slots, all distinct), defend a wall with the threat to the north (all on the south side), fire over a low wall
- [ ] 2.3 Move building footprints to a shared `BUILDINGS` table, add them to the training cover set as `building` covers, place the view meshes from the same table, and drop the duplicate training-house sight obstacle; mechanics test for a corner slot
- [ ] 2.4 Run the mechanics suite and the bootcamp e2e, then update the determinism golden with `--update` and record why

## 3. Preview and HUD

- [ ] 3.1 Make the preview planner use `pickSlots` without reserving and show each soldier's slot; verify with preview unit tests and the preview-hud e2e
- [ ] 3.2 Draw slot markers (free and taken) for the hovered cover and the pending order, with a free count; e2e test hovering the trench shows its markers and a click onto the trench fills its slots

## 4. Close

- [ ] 4.1 Play stations 4 (trench defense) and 7 (take the line) by hand in Chrome and check soldiers end in visible slots; record the result in `docs/status.md`
- [ ] 4.2 Update `docs/architecture.md`, run `openspec validate add-cover-slots --type change --strict` and the full `pnpm verify`
