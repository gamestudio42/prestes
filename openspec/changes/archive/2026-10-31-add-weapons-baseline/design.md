## Context

The simulation currently uses global `FIRE_RANGE`, `MAX_AMMO`, `FIRE_INTERVAL_TICKS`,
`RELOAD_TICKS` and hardcoded damage. The frame exposes `ammo` as a single number.
The sandbox starts with six rifle-armed proxies and must stay deterministic and
headless-testable. See `proposal.md` and the specs for the contract.

## Goals / Non-Goals

**Goals:**

- Make the Mauser the single equipable weapon for this slice.
- Put weapon data in the shared package so simulation stays independent of React,
  Three.js and locale catalogs.
- Keep historical identity and game statistics separately labelled.
- Preserve determinism and the command/event boundary.

**Non-Goals:**

- Other equipable weapons, pickups, attachments, vehicles or artillery.
- Final weapon meshes, muzzle flashes and animations.
- Campaign mission content.

## Decisions

### 1. Pure catalog in `packages/shared/src/weapons.ts`

`WeaponProfile` contains only numbers, enums and source-key strings. It does not
import content or presentation. The simulation imports the profile by id; the HUD
resolves the localized name through the content catalog.

Alternative: put profiles in `packages/content`. Rejected because the simulation
would then depend on the content package and its locale data.

### 2. Mauser as the only equipable profile

The profile uses:

```text
id: mauser-7mm
kind: bolt-rifle
caliber: 7 mm Mauser
magazine: 5
reserve: 15
fireIntervalTicks: 12
reloadTicks: 30
range: 26
accuracy: 0.75
damage: 18..30
suppression: 1.0
historicalIdentity: documented
historicalStats: abstracted
sourceRefs: [macaulay-1974]
```

The source identifies the standard rifle as a 7 mm Mauser (Macaulay, p. 113) but
does not provide the model, muzzle velocity or rate of fire used by the game. The
stats are therefore labelled abstracted. The 5 + 15 rounds model is a sandbox
abstraction of the roughly 20,000 cartridges for about 1,200 men recorded at
p. 113, not a claim that every soldier carried exactly 20 rounds.

Alternative: invent a specific Mauser model and ballistic table. Rejected because
the source does not support it.

### 3. Per-unit magazine and reserve

Replace the single `ammo` number with `magazine` and `reserve`; the snapshot
exposes both. Firing decrements magazine. A reload moves `min(magazineSize,
reserve)` rounds from reserve into magazine over `reloadTicks`. The HUD displays
`magazine / reserve`. Existing tests that assert "ammo < 20" become "magazine +
reserve < 20" or use the new fields.

Alternative: keep one abstract ammo number. Rejected because it cannot model clips
or later weapons with different magazine sizes.

### 4. Weapon-driven fire

`fire()` reads the profile each shot:

- range check;
- accuracy;
- damage range;
- suppression multiplier;
- fire interval;
- reload time.

Suppression order keeps its morale effect but uses the weapon's suppression value
as a multiplier. The existing `suppress` command remains a player order.

### 5. Historical document

`docs/history/WEAPONS.md` is a reference document, not a stat sheet. It has three
sections: documented, representative and abstracted. It cites Macaulay pages:
p. 113 for the Mauser, machine guns, automatic rifles, ammunition and absence of
artillery; p. 54 for revolvers, Winchesters and lances in irregular gaucho forces;
p. 152 for .44 Winchester ammunition in the backlands; p. 85 for government/
captured artillery. The document explicitly says the source does not name the
Mauser model.

### 6. Localization

Weapon labels and notes use `weapon.mauser7mm.name`, `.action`, `.note` keys in
both catalogs. The code and simulation use only `mauser-7mm`. `check:locales`
enforces key parity.

## Risks / Trade-offs

- **Changing ammo fields breaks tests** → update tests to magazine/reserve and keep
  a total-rounds helper.
- **5 + 15 may feel short** → sandbox will add an unlimited-ammo toggle in the
  sandbox change; this slice keeps the historical abstraction.
- **Source lacks ballistic data** → all values are explicitly abstracted and
  centralized for later tuning.
- **Future weapons may need new fields** → the profile is additive; avoid
  overfitting to one rifle.
