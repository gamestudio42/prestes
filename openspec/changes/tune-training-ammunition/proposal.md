## Why

Station 7 (take the line) cannot be finished by hand. Each soldier carries 20
rounds (a 5-round magazine and a 15-round reserve), and a suppress order fires
every 0.8 s (8 ticks) instead of every 1.2 s until the target dies or is out of
sight. In the manual Chrome run of 2026-11-04 Suppress emptied every soldier in
about 20 s at 2x, so the section had nothing left to clear the line with. Long
stations also ran short earlier (15/0 rounds early in phase 2).

The 20 rounds are deliberate for the Coluna: they abstract its documented
ammunition scarcity, about twenty thousand cartridges for roughly twelve hundred
men (Macaulay, *The Prestes Column*, 1974, p. 113). The tutorial is different:
it is regular army training at Vila Militar, where the troop is issued from the
depot. Decided with the user on 2026-11-04: raise ammunition only in training and
revisit campaign values later; also make suppress ease off once the target is
pinned.

## What Changes

- New **training ammunition load**: in the training exercise every player
  soldier and the instructor start each station and each retry with a 5-round
  magazine and a 45-round reserve (50 rounds). The sandbox, the battle lab and
  the training enemy keep the Mauser profile's 20 rounds.
- **Suppress eases when the target is pinned**: a suppressing soldier fires at
  the fast suppress interval while its target is not pinned, and at the weapon's
  normal fire interval once the target is pinned. The order, its accuracy trade
  and its morale damage are unchanged.
- The determinism golden may change if the default run uses suppress fire.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `weapons`: adds the training ammunition load next to the sandbox model.
- `bootcamp`: the station refill restores the training load.
- `simulation`: the suppress order fires at the normal rate on a pinned target.

## Impact

- `packages/shared/src/weapons.ts` (training load constant), `packages/simulation`
  (training spawn and refill, suppress cooldown), tests and possibly the
  determinism golden. No HUD change: the ammunition readout already shows
  magazine and reserve.
- Player fantasy and core loop are unchanged; the station objectives are
  unchanged. No mission, commander or perspective changes.
- Historical note: the Coluna's scarcity stays the default model; the training
  load is labelled as a game abstraction of depot issue, not a sourced figure.
- Localization: no new player strings in PT-BR or EN.
- Non-goals: campaign or skirmish ammunition balance, resupply mechanics.
