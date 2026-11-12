## 1. Map north in the document

- [x] 1.1 Add optional `north` to the map document and `BattleMap`, validate it, normalise it on load, write it only when non-zero, bump the format to version 7 with a no-op migration. Verify: unit tests for read-back, default, migration and invalid input.
- [x] 1.2 Light the battle and editor views from `light.bearing + north`. Verify: unit test on the sun direction helper.

## 2. Compass in the view

- [x] 2.1 Add the pure compass angle helper and `CameraRig.faceNorth`. Verify: unit tests at several yaws and norths, and the shortest turn.

## 3. Editor

- [x] 3.1 Add the north slider to the map properties dialog (EN and PT-BR labels, undo/redo) and the north arrow overlay on the view. Verify: Playwright sets north, saves, reopens and reads the arrow's angle.

## 4. Battle HUD

- [x] 4.1 Add the compass rose to the battle HUD, turning with the camera, with click to north (EN and PT-BR strings). Verify: Playwright reads the rose's angle at several camera rotations and after a click, with a screenshot.

## 5. Gate

- [x] 5.1 Run `pnpm check` and `openspec validate add-map-compass --type change --strict`.
