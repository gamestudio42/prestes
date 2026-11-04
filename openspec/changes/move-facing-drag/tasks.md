## 1. Simulation

- [x] 1.1 `facing?: Vec2` on `move` and `order` commands; validation (`invalid_position`)
- [x] 1.2 Move and ground tactical orders use the ordered facing for formation slots and the cover planner; defend and ambush prefer it over the enemy direction
- [x] 1.3 The ordered facing is stored as the soldiers' aim, so they face it on arrival and keep it while holding; bounding keeps it
- [x] 1.4 Tests: rotated wedge and column, facing kept on arrival, invalid facing, golden replay unchanged

## 2. Preview and input

- [x] 2.1 Preview request `facing`; `planOrderPreview` uses it
- [x] 2.2 Canvas gesture: left-drag with a ground order armed and right-drag set the facing; Shift + drag keeps the line spread
- [x] 2.3 Facing arrow in the preview layer (pixel style)
- [x] 2.4 The assembly hint teaches the facing drag (pt-BR and EN); no station taught the line drag

## 3. Close

- [x] 3.1 e2e: drag a facing on the training ground and check the arrival facing
- [ ] 3.2 `pnpm verify`; hand check in Chrome; record in `docs/status.md`
