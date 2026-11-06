## Context

Units are created in `systems/model.ts` from fixed templates
(`battleUnits(deployment)`: six squads of eleven, one weapon id
`mauser-7mm`). `shared/weapons.ts` has one profile; `WeaponKind` already
lists bolt rifle, lever rifle, pistol, machine gun and automatic rifle.
Combat (`systems/combat.ts`) reads the shooter's weapon for range, rates,
reload and accuracy, but assumes aimed single shots. The officer aura exists
in `systems/morale.ts` for the sandbox officer. The start request carries
seed, scenario and battle map; the menu is the book (`StartScreen`).

## Goals / Non-Goals

**Goals:** section and weapon catalogs as data; a roster page with budget and
limits; mixed-force deployment; burst fire; a crew-served machine gun; an
enemy roster by seed; the default roster reproducing today's battle and
goldens.

**Non-Goals:** artillery, cavalry, grenades, experience, persistent losses,
picking up weapons.

## Decisions

### Catalogs in `shared`

`shared/sections.ts`: `SectionType { id, nameKey, descriptionKey, men:
Array<{ rank: 'officer' | 'bugler' | 'soldier' | 'gunner' | 'loader', weapon:
WeaponId, carries?: WeaponId }> }`. `shared/weapons.ts` grows to five
profiles and a `fire: 'aimed' | 'burst' | 'belt'` field, `setupTicks` and
`crew` for the machine gun. Rosters are `{ sections: SectionTypeId[] }`;
`validateRoster(roster)` returns the refusals the page shows (budget, count,
limits). Rejected: free per-soldier weapon choice; too fiddly for the
skirmish and against the section as the unit of command.

### Units from rosters

`battleUnits(deployment, rosters)` places the sections: the zone's three
starts take sections 1-3; sections 4-6 stand 14 m behind, between them.
Small sections use the same two-rank block, narrower. Squad ids keep their
ranges (1-9 column, 11-19 legalist). The default roster yields exactly
today's units in today's order, so the goldens hold.

### Fire modes

- `aimed`: today's loop.
- `burst`: 3 to 5 rounds 0.15 s apart, then an aimed pause; each round rolls
  to hit with a burst penalty and adds suppression.
- `belt`: the machine gun fires 6-round bursts at a high rate within its
  range, only in state `set` (set-up timer after halting; reset on any move).
  The gun is the gunner's weapon; on his fall the nearest fit crewman of the
  squad becomes gunner (deterministic by id). Ammunition is a squad pool
  carried by the loaders.

### Enemy roster

`shared/maps/*` gain `enemyForces: Roster[]` (two or three presets each,
e.g. Fazenda: two rifle sections and a machine gun on the trench line;
Bairro: small teams and irregular provisórios). The engine picks one with
the battle RNG before anything else draws from it; the default roster
battle (no rosters passed) keeps the old 3 x 11 enemy so goldens hold.

### Roster page

A spread of the book between the skirmish page and the battle: the left page
lists section types (name, men, weapons, description); the right page is the
roster with men used x/33, sections x/6, order arrows, Default and Start.
Saved in local storage (`prestes.roster`). Section cards in the HUD show the
type's name.

### Simulation/presentation boundary and determinism

Catalogs are pure data; rosters travel in the start request; the simulation
creates units and runs fire modes; the view draws weapon placeholders by
kind (rifle, carbine-length Winchester, revolver in hand, automatic rifle
with bipod, machine gun on a tripod) until Blender models exist. New goldens
for a mixed roster on each map; the default goldens unchanged.

### Historical research method

Weapon identities and their place come from `docs/history/WEAPONS.md`
(Macaulay pp. 54, 85, 93, 113, 152). The game names no model the source does
not name ("fuzil automático 7 mm", not a brand). Section types are a game
organization and say so in their codex note. Figure roster: unchanged; the
command section's officer is fictional.

## Risks / Trade-offs

- [The machine gun dominates open maps] → set-up time, no fire on the move,
  crew exposure, one per roster, scarce belts; tuned by the battle report.
- [Small teams make the AI worse] → the enemy commander plans per section
  already; presets keep the enemy at three to five sections.
- [Bursts flood the tracer and audio layers] → one tracer per burst in the
  view, one sound per burst.

## Migration Plan

No saved data to migrate. The default roster reproduces the current battle.
