## 1. Defensive map

- [x] 1.1 Remove the central house from the scene and add walls, barrels, low walls, a trench, sandbags and terrain elevations.
- [x] 1.2 Add blocking cover, movement collision, sight blocking and cover-aware pathfinding.
- [x] 1.3 Verify obstacle and pathfinding tests and a visual map check.

## 2. Troop and officer

- [x] 2.1 Expand the player troop to five riflemen and one officer in one section.
- [x] 2.2 Add the officer morale aura and always-seek-cover behavior.
- [x] 2.3 Verify engine tests and the six-person HUD card.

## 3. Selection and hints

- [x] 3.1 Select the whole troop on a friendly click and support blue/green directional marquee selection.
- [x] 3.2 Add shield and target hover hints.
- [x] 3.3 Verify selected count and the selection box in the browser.

## 4. Orders

- [x] 4.1 Split Flank into suppressing and flanking halves.
- [x] 4.2 Prefer cover on flank routes and high-cover defensive positions on withdrawal.
- [x] 4.3 Verify engine tests for flank split, withdrawal and determinism.

## 5. Verification

- [x] 5.1 Update architecture/status/assets and objective text.
- [x] 5.2 Run `pnpm check`, `pnpm build`, `pnpm e2e`, `openspec validate "add-defensive-position-map" --type change --strict`, and two `pnpm sim` runs.
- [x] 5.3 Mark tasks complete, archive and validate specs/archives.

