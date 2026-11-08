## Context

- Units are created in `packages/simulation/src/systems/model.ts` by
  `battleUnits(deployment)`: six squads of eleven `INFANTRY_TEMPLATE`
  soldiers, two ranks of six 2.8 m apart, squad ids 1-3 (column) and 11-13
  (legalist). `UnitKind` is `'infantry' | 'officer' | 'dummy'`.
- `packages/shared/src/weapons.ts` has one profile, `mauser-7mm` (magazine 5,
  reserve 15, aimed 30-50 ticks, reaction 5-25, reload 30, range 120,
  accuracy 0.55, damage 35-55, suppression 1). `WeaponKind` already lists
  `bolt-rifle | lever-rifle | pistol | machine-gun | automatic-rifle`. The
  3v3 issues `TRAINING_AMMUNITION` (5 + 45).
- Combat (`systems/combat.ts` `fire()`) runs one aimed shot per cooldown:
  reaction delay on a new target, aimed interval, suppressive interval,
  reload from reserve. `visible()` uses the battle's `combatRange` (120 m),
  not the weapon's.
- The officer aura (`systems/morale.ts` `applyOfficerAura`) steadies allies
  of the same faction within 12 m of a fit `officer`. `regroup` and
  `protect-officer` orders are refused without an officer (`no_officer`).
- The start request carries `seed, scenario, battleMap`; the menu is the
  desk (`MenuDesk`), where the skirmish maps lie as a fan of sheets
  (`SkirmishMaps`) whose active sheet starts the battle.
- The HUD (`apps/game/src/ui/hud/`) shows section cards (`SquadCards`), a
  troop summary and a weapon card that assumes one weapon per section.

## Goals / Non-Goals

**Goals:** section and weapon catalogs as data; a roster spread with budget
and limits; mixed-force deployment on all four maps; burst fire; a
crew-served machine gun; per-weapon range and ammunition; a command section
that carries the officer aura and enables `regroup`; an enemy roster by seed;
a HUD that shows mixed weapons; the default roster reproducing today's
battle and goldens bit for bit.

**Non-Goals:** artillery, cavalry, grenades, experience, persistent losses,
picking up weapons, a points economy beyond the man count, multiplayer.

## Decisions

### 1. Weapon catalog

`WeaponId` becomes `'mauser-7mm' | 'fuzil-automatico-7mm' |
'metralhadora-7mm' | 'winchester-44' | 'revolver'`. `WeaponProfile` gains:

```ts
fire: 'aimed' | 'burst' | 'belt';
burst?: { rounds: [number, number]; gapTicks: number; hitFactor: number };
setupTicks?: number;          // machine gun only
crew?: number;                // machine gun only: men needed to serve it
nameKey: MessageKey; descriptionKey: MessageKey;
```

Starting values (all `historicalStats: 'abstracted'`, identities from
`docs/history/WEAPONS.md`; tuned by the battle report):

| Weapon | Kind | Fire | Mag | Training reserve | Aimed (ticks) | Reload | Range | Acc. | Damage | Supp. | Source |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Mauser 7 mm | bolt-rifle | aimed | 5 | 45 | 30-50 | 30 | 120 | 0.55 | 35-55 | 1 | Macaulay p. 113 |
| Fuzil automático 7 mm | automatic-rifle | burst 3-5, gap 2, hit x0.6 | 20 | 100 | 25-40 between bursts | 45 | 110 | 0.45 | 35-55 | 2.5 per round | p. 113 |
| Metralhadora 7 mm | machine-gun | belt 6, gap 1, hit x0.5 | 250 | 750 (squad pool) | 15-25 between bursts | 80 | 140 | 0.4 | 35-55 | 3 per round | p. 113 |
| Winchester .44 | lever-rifle | aimed | 9 | 36 | 18-30 | 45 (rounds one by one) | 80 | 0.5 | 30-45 | 1 | pp. 54, 152 |
| Revólver | pistol | aimed | 6 | 18 | 15-25 | 40 | 25 | 0.45 | 25-40 | 0.5 | p. 54 |

Rejected: naming models (Madsen, Hotchkiss, Winchester 1892): the source
does not name them, and the project rule forbids presenting inferred models
as fact.

### 2. Weapon range in sight and fire

`visible()` takes `min(ctx.combatRange, weapon.range)` for the shooter, so a
revolver does not acquire a man at 60 m. Vision (fog of war) keeps its
120 m: seeing is not shooting. For the Mauser the result is unchanged, so
the default goldens hold.

### 3. Fire modes in `fire()`

- `aimed`: today's loop, untouched.
- `burst`: on a shot, draw a burst length from `burst.rounds` with the
  engine RNG; the soldier holds `burstLeft` and fires the next round after
  `gapTicks`, each a separate hit roll at `accuracy x hitFactor`, each adding
  `suppression`. After the burst: the aimed interval. Magazine empties
  mid-burst end it and start a reload.
- `belt`: as burst, with the machine-gun rules below.

New `MutableUnit` fields are optional (`burstLeft?`, `gunSetAt?`,
`gunner?`) so the default battle's hash JSON is unchanged.

### 4. The machine gun

- The squad of type `metralhadora` has a gunner (carries `metralhadora-7mm`)
  and three loaders with Mausers who carry the belt pool.
- The gun is `set` when the gunner has not moved for `setupTicks` (40 ticks,
  4 s); any path step resets it. Not set: it does not fire. The HUD card
  shows "montando" / "pronta".
- Ammunition: the gunner's magazine is the belt in the gun (250); reloads
  draw from the squad pool `gunPool` (750 at start), kept on the squad, not
  on the man. Loaders do not fire their Mausers while the gun is firing and
  within 3 m of the gunner (they feed it).
- When the gunner falls, the nearest fit squad mate (ties by id) becomes
  gunner on the next tick, takes the gun's weapon id and the belt, and must
  set it up again; with no fit mate, the gun is silent.
- Movement: the crew moves at 0.85 of walking speed (carrying the gun).

### 5. Section catalog

`packages/shared/src/sections.ts`:

```ts
type SectionTypeId = 'comando' | 'esquadra-4' | 'esquadra-5' | 'fuzileiros'
  | 'fuzil-metralhador' | 'metralhadora' | 'irregulares';
interface SectionType {
  id: SectionTypeId; nameKey: MessageKey; descriptionKey: MessageKey;
  men: Array<{ role: 'officer' | 'bugler' | 'rifleman' | 'gunner' | 'loader' | 'irregular'; weapon: WeaponId; sidearm?: WeaponId }>;
  speedFactor?: number;           // the gun crew 0.85, irregulars 1.1
  limit?: number;                 // per roster
  sides: Array<'column' | 'legalist'>;
}
```

| Type | Men | Weapons | Limit | Notes |
| --- | --- | --- | --- | --- |
| Comando | 4 | officer revolver; bugler Mauser; 2 riflemen Mauser | 1 | officer aura 12 m; enables regroup and protect-officer |
| Esquadra de 4 | 4 | 4 Mauser | - | small, hard to spot (no rule change; size only) |
| Esquadra de 5 | 5 | 4 Mauser, 1 fuzil automático | 2 (shares the automatic-rifle limit) | |
| Seção de fuzileiros | 11 | 11 Mauser | - | today's section |
| Fuzil-metralhador | 3 | 1 fuzil automático, 2 Mauser (carry its magazines) | 2 (shared) | |
| Metralhadora 7 mm | 4 | 1 metralhadora, 3 Mauser loaders | 1 | set-up, pool |
| Irregulares | 5 | 5 Winchester .44, the first also a revolver | - | speed x1.1; codex note: vaqueanos, provisórios |

The automatic-rifle limit counts Esquadra de 5 and Fuzil-metralhador
together (at most 2 automatic rifles in a roster).

### 6. Roster rules

`Roster = { sections: SectionTypeId[] }`; `validateRoster(roster)` returns
`{ ok, men, sections, refusals: Array<{ code, values }> }` with codes
`over-men` (> 33), `over-sections` (> 6), `limit` (type, max), `empty`.
`canAdd(roster, type)` returns the first refusal for the page to show.
`DEFAULT_ROSTER = ['fuzileiros', 'fuzileiros', 'fuzileiros']`.

### 7. Deployment of mixed forces

`battleUnits(deployment, rosters)`:

- Slots: the zone's three section starts (front), then three rear slots
  14 m behind (away from the enemy), between the front ones
  (x midpoints and the centre); roster order fills front then rear.
- A section of n men stands in ranks of up to six, 2.8 m apart, centred on
  its slot; the gun crew stands with the gunner in front.
- Squad ids: column 1-6, legalist 11-16; unit ids sequential from 1 in
  column-then-legalist order, as today.
- Every soldier is checked against walkable ground (deep water, buildings);
  a blocked soldier moves to the nearest walkable point within 6 m (the
  map content check proves a 6-section roster fits on every map).
- `DEFAULT_ROSTER` on both sides yields exactly today's units in today's
  order, so `hashState()` and every golden are unchanged.

### 8. The enemy's roster

Each map gains `enemyForces: Roster[]`. The setup screen offers three
enemy choices: "Sorteado", a preset by name, or a built roster. A chosen
or built roster is sent as `rosters.legalist` and used as is. The engine
picks `enemyForces[floor(rng.nextFloat() x n)]` only when the player passed
his roster and no `legalist` one ("Sorteado"); with no roster at all (tests,
tools, the default battle), the enemy is the default and the RNG is not
drawn, so goldens hold. Maps without presets (authored maps) field the
default roster when drawn. Presets:

| Map | Preset A | Preset B | Preset C |
| --- | --- | --- | --- |
| Vila Militar | 3 x fuzileiros (33) | comando, 2 x fuzileiros, esquadra-4 (30) | - |
| Fazenda | comando, metralhadora, 2 x fuzileiros (30) | 3 x fuzileiros (33) | 2 x irregulares, fuzileiros, esquadra-5, esquadra-4 (30) |
| Serra e Rio | metralhadora, fuzil-metralhador, 2 x fuzileiros, esquadra-4 (33) | 3 x irregulares, fuzileiros, esquadra-4 (30) | 3 x fuzileiros (33) |
| Bairro | comando, 2 x esquadra-5, 3 x esquadra-4 (26) | fuzileiros, metralhadora, 2 x esquadra-4, irregulares (28) | 3 x fuzileiros (33) |

All presets are checked by `validateRoster` in the content check (each at
most 33 men). The enemy commander already plans per section; with more,
smaller sections it keeps "one more section attacks" and "all but one
attack when quiet".

### 9. Skirmish setup screen

The book menu is gone; the desk replaced it. The user asked (2026-11-08)
for one generic map on the desk that opens a screen where the whole
skirmish is set up, instead of the fan of map sheets.

Flow: desk → the generic "Escaramuça" map (a desk object in place of the
fan) → setup screen → "Combater" → battle (or, after
`add-deployment-phase`, the deployment phase). "Voltar" returns to the
desk. Layout at 1440 x 900 and 1280 x 720, a planning board in the desk's
art:

- Left column, the map: the battle maps as a list (preview from
  `public/maps/<id>.png`, name), the chosen map's larger preview and
  description. Later changes add to this column (`add-map-objectives`: the
  time limit and the objectives over the preview).
- Centre, your force: the section types as entries (name, men, weapons as
  small icons, one-line description); Enter or click adds; a refused type
  shows its reason inline ("limite de 33 homens", "só uma metralhadora").
  Below, the roster in order (up to 6 rows: type, men, ▲ ▼ ✕), counters
  "Homens 29/33 · Seções 5/6" and "Tropa padrão".
- Right column, the enemy: a three-way choice "Sorteado" / a preset (a list
  of the map's presets, each with its sections and men) / "Montar" (the
  same builder as the centre, for the legalists). Changing the map resets a
  chosen preset to "Sorteado"; a built roster is kept.
- Footer: "Voltar" and "Combater" (disabled while either roster is
  refused or empty).
- Keyboard: Tab moves between the three columns; arrows move between
  entries; Enter adds or activates; Delete removes the focused roster row;
  Escape is "Voltar".
- Saved in `localStorage` under `prestes.roster.v1` as
  `{ map, roster, enemy: { kind: 'drawn' } | { kind: 'preset', index } |
  { kind: 'built', roster } }`; invalid saved data falls back to the
  default (Vila Militar, default roster, "Sorteado").
- The player is the column. A faction choice is a separate change (with
  the Northeastern militia); the screen leaves room for it at the top of
  the centre column and shows nothing for it now.

The six slots of section 7 are where the sections start; once
`add-deployment-phase` is in, the player moves them inside his side's
deployment area before pressing "Iniciar batalha".

### 10. HUD

- Section cards show the type's name ("Comando", "Esquadra de 5") and the
  men alive.
- The weapon card lists each weapon in the selected section with its rounds
  (magazine/total), and for the gun crew the set-up state and the belt pool.
- The troop summary lists each man with his weapon's short name.
- Sandbox: a "Tropa" select to spawn a troop of a chosen section type
  (reuses `spawn_troop` with a `section` field).

### 11. View

Weapon placeholders by kind in `character-layer.ts`/soldier models: the
rifle model for Mauser; a shorter rifle for the Winchester; no long arm and
a pistol pose for the officer; a bipod rifle for the automatic rifle; a
tripod gun (`placeholder:metralhadora`) drawn at the gunner when set, and
carried (hidden) when moving. One tracer and one sound per burst. All in
the asset register as named placeholders.

### 12. Protocol and determinism

`WorkerRequest.start` gains `rosters?: { column: Roster; legalist?: Roster }`.
Rosters are plain data; the simulation creates units and draws the enemy
preset with the engine RNG (only when a player roster is given). New
goldens: a fixed mixed roster on each map (`check-determinism` gains
`mixedRosters`). Hash JSON gains no field for default battles.

### Historical research method

Weapons and their place: `docs/history/WEAPONS.md` (Macaulay pp. 54, 85, 93,
113, 152). Section types are a game organization, said so in each type's
codex note and in a compendium "Forces in the skirmish" entry. The
irregulars' note distinguishes rebel vaqueanos from government provisórios
(the Chimango provisional militias, Macaulay ch. II-III). No historical
figure commands; the Comando's officer is a fictional tenente.

## Risks / Trade-offs

- [The machine gun dominates open maps] → set-up, no fire on the move,
  exposed crew, one per roster, a finite pool; feel bands per map.
- [Bursts flood tracer and audio layers] → one tracer and one sound per
  burst in the view.
- [Six small sections overload the HUD] → the Troops window lists up to six
  cards and scrolls past three (already in place).
- [Enemy presets make some maps one-sided] → battle report runs each preset
  against the default roster on three seeds; presets outside the bands are
  retuned before the hand check.
- [Goldens drift] → defaults reproduce today's units and draw no RNG; a test
  pins the default roster's unit list.

## Migration Plan

No saved data to migrate. The default roster reproduces today's battle.
`prestes.roster.v1` is new; absent or invalid means the default.

## Open Questions

- Should the enemy sometimes field a smaller force (fewer than 33) on
  defensive maps? Deferrable: presets are data and can change after the
  battle report without touching the specs.
