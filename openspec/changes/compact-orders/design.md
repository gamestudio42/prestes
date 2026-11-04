## Context

Orders reach the simulation as `move`, `move_line`, `attack`, `suppress`,
`flank`, `withdraw`, `hold`, `face`, `order` (with a `TacticalOrder`),
`hold_fire`, `posture`, `stance`, `formation` and `set_bounding` commands.
The board (`OrderBoard`) lists the catalogue in three tabs. The bootcamp
objectives check orders and effects from frames.

## Decisions

### The nine orders

| Order | Command | Notes |
| --- | --- | --- |
| Move | `move` | march; drag sets facing and spacing |
| Advance | `order: advance` | always by bounds; rifle at the ready |
| Withdraw | `withdraw` | unchanged |
| Halt | `hold` (+ optional `face`) | stop here; takes cover within 6 m; a drag faces |
| Attack | `attack` | follows a running target (was pursue) |
| Suppress | `suppress` | unchanged (keeps on the troop) |
| Flank | `flank` | unchanged |
| Defend | `order: defend` | area, facing drag; with fire control |
| Recon | `order: recon` | unchanged |

Rescue stays a command, reached from the wounded soldier.

### Old orders still accepted

The simulation keeps accepting `ambush`, `pursue`, `disperse`, `reserve`,
`regroup`, `protect-officer` and `set_bounding`, mapped to the new behaviour
(`ambush` = defend + on-contact fire; `reserve` = defend + hold fire;
`disperse` = move with 6 m spacing; `regroup` = move to the centre in close
order; `pursue` = attack; `set_bounding` ignored, Advance bounds). Replays and
tests that use them keep working; the board no longer offers them.

### Fire control

`hold_fire` becomes `fire_control` with `free | contact | hold`; `contact`
holds fire until an enemy is within 25 m of any soldier of the section (or
the section is fired upon), then sets `free` for the section. The old
`hold_fire` command maps to `hold` or `free`.

### Officer cover

With an officer within 10 m and under fire, the soldiers nearest to him (up
to 3) prefer cover slots between him and the threat; this is part of
`reactToFire` and `seekCover` in every posture.

### Bootcamp

Objective kinds stay effect-based. Station 4's ambush checks on-contact fire
opening on a troop inside the zone; station 5's disperse and regroup check
the measured spacing of the section (over 5 m, under 2 m); reserve checks a
defending section with hold fire; pursue checks an Attack following a
running target for 15 m; station 6 checks soldiers within 10 m of the
instructor. The coverage list follows the new catalogue.

## Risks

- A large change across simulation, interface and training; it is split in
  tasks that each keep `pnpm verify` green.
- Players who learnt the old buttons: none outside the project yet.
