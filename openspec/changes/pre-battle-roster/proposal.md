## Why

The user liked the battle maps (2026-11-05) and asked for the next layer: a
pre-battle roster where the player builds his force from several kinds of
section (a command section, small teams of 4 and 5, rifle sections, an
automatic-rifle team, a machine-gun crew, irregulars) and a wider set of
1920s weapons. Today every 3 vs 3 is three identical sections of eleven
Mauser riflemen, so the maps' choices (a flank through the cane, holding a
ford, a street corner) all play with the same tool.

## What Changes

- **Section types**: a catalog of sections, each a fixed make-up of men,
  ranks and weapons:
  - Comando (command): an officer with a revolver, a bugler and two
    riflemen; the officer's aura steadies sections near him.
  - Esquadra de 4: four riflemen, quick and hard to see.
  - Esquadra de 5: four riflemen and an automatic rifle.
  - Seção de fuzileiros: eleven riflemen (today's section).
  - Fuzil-metralhador: a team of three, an automatic rifle and two
    riflemen carrying its magazines.
  - Metralhadora 7 mm: a crew of four serving one machine gun, which must
    be set up before it fires and cannot fire on the move.
  - Irregulares: five men with Winchester .44 rifles and revolvers, fast
    and short of range.
- **Weapons**: the catalog grows from the Mauser to five: Mauser 7 mm
  rifle, fuzil automático 7 mm, metralhadora 7 mm (crew-served), Winchester
  .44 and revólver. Identities follow `docs/history/WEAPONS.md`; models are
  not named where the source does not name them, and statistics stay
  labelled abstracted.
- **Skirmish setup screen** (user, 2026-11-08): the desk no longer shows the
  fan of skirmish maps; one generic map, "Escaramuça", lies on it, and
  clicking it opens a setup screen where the player chooses, in one place:
  - the map (a list with each map's preview and description);
  - the enemy: "Sorteado" (one of the map's preset forces, drawn by seed),
    one preset chosen by name, or "Montar" (built with the same builder and
    rules as his own);
  - his own force, within a budget of 33 men and at most 6 sections, with
    limits (one machine gun, one command section, two automatic rifles). A
    default roster (three rifle sections) is one click.
  "Combater" starts the battle and "Voltar" returns to the desk. The
  choices are saved locally. Each section is placed on the map's
  deployment zone in the order chosen; `add-deployment-phase` then lets the
  player rearrange them in his deployment area before the battle starts.
- **The enemy's force**: the legalists field the roster the player chose
  for them; left at "Sorteado", they draw one of a few preset forces per
  map, deterministic by seed.
- **Battle report** and goldens: the default roster keeps today's 3 x 11
  force, so the existing goldens and feel bands hold; new tests cover the
  mixed forces.
- Every new name, label and tooltip is localized in PT-BR and EN.

## Capabilities

### New Capabilities

- `force-roster`: section types, the skirmish setup screen and the roster
  rules, the enemy's roster and deployment of mixed forces.

### Modified Capabilities

- `weapons`: the period weapon set, the crew-served machine gun, and
  per-weapon ammunition.
- `battle-lab`: the 3 vs 3 is fought with the two rosters instead of a
  fixed 3 x 11.

## Impact

- `packages/shared` (weapon catalog, section catalog, roster validation,
  protocol: rosters in the start request), `packages/simulation` (unit
  creation from rosters, machine-gun set-up and crew, automatic fire,
  revolver range, officer aura on the command section, enemy roster),
  `packages/view3d` (weapon models or placeholders per kind, machine gun on
  its tripod), `apps/game` (the desk's generic skirmish map and the setup
  screen it opens, replacing the fan of maps; HUD weapon card per weapon), `packages/content` (locales, compendium weapon entries
  updated), tests, asset register.
- Depends on `add-battle-maps` (archive it first): the roster deploys into
  each map's zones.
- **Player fantasy**: a tenente choosing who goes where: the machine gun on
  the ford, the irregulars through the cane, the command section where the
  line wavers.
- **Core loop**: map, roster, deployment, battle, end; then adjust the
  roster and fight again.
- **Historical scope**: the column's arms at the start of the march were the
  7 mm Mauser, four 7 mm machine guns and about four automatic rifles
  (`macaulay-1974`, p. 113); irregulars carried Winchesters and revolvers
  (pp. 54, 152). The section types are a game organization, labelled as
  such, not a reconstruction of the column's order of battle.
- **Multi-perspective**: no historical figure commands in the skirmish; the
  command section's officer is a fictional tenente.
- **Legal and ethical note**: none beyond the standing rules; weapons are
  shown as period equipment, not glorified, and no brand is used.
- **MVP**: five weapons, seven section types, the setup screen with its
  budget and limits, the enemy's presets and the three enemy choices, the
  machine-gun set-up, locales, tests.
- **Non-goals**:
  - artillery (75 mm, 105 mm), cavalry and horses, grenades, promotions and
    experience, weapon pick-up from the fallen;
  - the campaign roster: it works differently (it accumulates from phase 02)
    and is defined with the campaign;
  - choosing the player's faction: a separate change, which also adds the
    Northeastern militia (its name to be settled from the sources); the
    player is the column here.
