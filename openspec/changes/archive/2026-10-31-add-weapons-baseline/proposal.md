## Why

Every unit currently fires the same anonymous rifle using global range, damage
and ammunition constants. The sandbox needs a data-driven weapon profile so the
Mauser can be modelled from the period, and later weapons can be tested without
rewriting combat.

## What Changes

- Add a pure weapon catalog with a `WeaponProfile` type.
- Add the **Mauser 7 mm** as the first and only equipable weapon.
- Give every soldier the Mauser at the start of the sandbox.
- Move fire interval, reload, range, accuracy, damage and suppression from global
  constants into the weapon profile.
- Model a 5-round magazine plus 15-round reserve as a sandbox abstraction of the
  documented ammunition scarcity.
- Show the selected section's weapon and rounds in the orders HUD.
- Add `docs/history/WEAPONS.md` with the period weapons, source citations and an
  explicit separation between documented facts and game abstractions.
- **Non-goals:** equipping other weapons, weapon pickups, vehicles, artillery,
  campaign missions and final weapon art.

## Capabilities

### New Capabilities

- `weapons`: data-driven weapon profiles, historical metadata and validation.

### Modified Capabilities

- `simulation`: unit ammunition and shooting read from the equipped weapon.
- `presentation`: the HUD shows the equipped weapon and its ammunition.

## Impact

- `packages/shared`: weapon types, Mauser profile and snapshot fields.
- `packages/simulation`: weapon-driven fire, reload and initial equipment.
- `packages/content`: localized weapon labels and content validation.
- `apps/game`: weapon/ammo display in the orders panel.
- `docs/history/WEAPONS.md`: new source-backed reference document.
- Tests: profile, ammo, reload, locale, engine, HUD/Playwright.
- No GitHub action.

## Historical scope and legal note

This is a sandbox slice, not a historical mission. The source identifies Brazil's
standard military rifle as a 7 mm Mauser and records the column's ammunition
scarcity; the exact model and all damage/range values are game abstractions. The
MD cites Macaulay and does not reproduce book text. No art or code is copied from
another game.
