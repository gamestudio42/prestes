## 1. Simulation

- [ ] 1.1 Fire control (`free | contact | hold`) with contact opening at 25 m or when fired upon; `hold_fire` mapped
- [ ] 1.2 Advance always bounds; `set_bounding` accepted and ignored
- [ ] 1.3 Attack follows a running target (pursue folded in; defensive does not follow; 40 m leash)
- [ ] 1.4 Halt takes cover within 6 m and accepts a facing
- [ ] 1.5 Old orders mapped: ambush, reserve, disperse, regroup, pursue, protect-officer
- [ ] 1.6 Automatic officer cover in fire reaction and cover seeking
- [ ] 1.7 Tests for each mapping and new behaviour; determinism golden recorded if it moves

## 2. Interface

- [ ] 2.1 Order catalogue of nine orders on two rows (movement; fire and manoeuvre plus position); icons and texts in both languages
- [ ] 2.2 Fire control selector replaces the Hold Fire toggle; bounding toggle removed
- [ ] 2.3 Rescue from a wounded comrade (right-click and cursor hint)
- [ ] 2.4 Three postures; Regroup shortcut (closes the section on its centre)

## 3. Bootcamp

- [ ] 3.1 Objectives of stations 2 to 6 over the new set; coverage list updated
- [ ] 3.2 Station texts (pt-BR and EN)

## 4. Close

- [ ] 4.1 E2E moved to the new buttons; `pnpm verify`
- [ ] 4.2 Hand check of the seven stations in Chrome; record in `docs/status.md`
