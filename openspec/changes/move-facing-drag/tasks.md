## 1. Simulation

- [ ] 1.1 `facing?: Vec2` on `move` and `order` commands; validation (`invalid_position`)
- [ ] 1.2 Move and ground tactical orders use the ordered facing for formation slots and the cover planner; defend and ambush prefer it over the enemy direction
- [ ] 1.3 `orderFacing` on the unit: aim and facing set on arrival and kept while holding; cleared by a later order
- [ ] 1.4 Tests: rotated wedge and column, facing kept on arrival, invalid facing, golden replay unchanged

## 2. Preview and input

- [ ] 2.1 Preview request `facing`; `planOrderPreview` uses it
- [ ] 2.2 Canvas gesture: left-drag with a ground order armed and right-drag set the facing; Shift + drag keeps the line spread
- [ ] 2.3 Facing arrow in the preview layer (pixel style)
- [ ] 2.4 Station texts that teach the line drag mention Shift (pt-BR and EN)

## 3. Close

- [ ] 3.1 e2e: drag a facing on the training ground and check the arrival facing
- [ ] 3.2 `pnpm verify`; hand check in Chrome; record in `docs/status.md`
