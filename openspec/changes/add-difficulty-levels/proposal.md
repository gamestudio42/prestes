## Why

Every skirmish today is played at one fixed strength: the enemy's aim, the
enemy commander's tempo and the Column's morale are constants in the
simulation. A newcomer and a player who knows the game meet the same
fight. The owner asked (2026-11-15) for three difficulty levels, named for
the player's role: **História** (easy), **Soldado** (medium) and **Oficial**
(hard), with all three rebalanced rather than today's balance kept as one
of them. The armies' catalog also left a decision waiting on this
(faction-armies, 2026-11-11): "no ammunition handicap for the column until
a difficulty selector exists". Ammunition scarcity alone would only punish
the player, so the owner and I agreed to add an economical fire setting
that lets him spend rounds sparingly.

## What Changes

- **Three difficulty levels**: `historia`, `soldado`, `oficial`, chosen per
  battle on the skirmish setup screen next to the time limit, remembered
  in local storage, default Soldado. The level travels in the battle's
  start request into the simulation; absent (older callers, the editor's
  playtest, headless runs without a flag) it is Soldado.
- **What a level tunes**, from one table of factors in `packages/shared`:
  - the enemy's aim (hit chance of every enemy soldier's shots);
  - the enemy commander: how often it reviews the field, the strength
    ratio at which it counterattacks, how hard it retakes a lost objective
    and when its last-minutes push starts;
  - the Column's morale: how much fire, losses and the loss of officers
    shake it, and how fast it rallies;
  - the Column's ammunition: on Oficial each section carries a reduced
    reserve (on top of its type's own factor).
- **All three rebalanced**: Soldado is no longer the current constants
  but a slightly gentler fight; História is clearly forgiving; Oficial is
  harder than today. Factors are tuned against the headless battle report
  (`tools/battle-report.ts`) to target win rates for its scripted player,
  and confirmed by the owner playing each level.
- **Economical fire**: a fourth fire control setting, next to free fire,
  on contact and hold fire. Under it a section fires only at enemies
  within a share of its weapons' range, takes longer between rifle shots
  for a better-aimed shot, and keeps automatic bursts short. It is
  available at every level; at Oficial it becomes the way to make the
  reserve last. Explicit fire orders (area fire, suppress) fire as
  ordered.
- **Fire control voices** (the owner, 2026-11-15): setting free,
  economical, on-contact or hold fire is spoken and answered like an order,
  three takes each, captioned in PT-BR and EN. The economical setting's
  first take is the owner's line, "Só atirem quando virem o branco dos
  olhos deles!". The owner records them with the other voices; playback
  uses the voice director of `ambient-sound-and-voices`.
- **HUD**: the Fire row of the order board gains the economical button
  with its own icon slice and tooltip; the setup screen gains the
  difficulty choice with a one-line description of each level. The
  battle's result screen names the level played.
- **Determinism**: the level is part of the battle's configuration and of
  the hashed state; the same seed, level and commands give the same hash.
  Rebalancing Soldado changes today's outcomes, so the determinism goldens
  are re-recorded once, with that reason.

## Player fantasy, loop and scope

The player chooses how hard the Column's war is for him: História lets him
follow the battle and learn the orders; Soldado asks for sound use of
cover and objectives; Oficial is a fight with a sharper enemy and a column
short of cartridges, where every volley is a decision. The core loop
(deploy, order sections, take and hold objectives) is unchanged; the level
changes how forgiving it is.

Historical scope: the ammunition scarcity at Oficial and the economical
fire setting follow the documented shortage of the Column (about twenty
thousand cartridges in June 1925, roughly sixteen per man, and Mausers
going without 7 mm rounds in Goiás; Macaulay pp. 113, 151–152, recorded in
`docs/history/WEAPONS.md` and `docs/history/FORCES.md`). The other factors
are game balance and make no historical claim.

Multi-perspective approach: unchanged. The level applies to the player's
side whoever commands it; no historical figure is added or made playable
by this change. When the campaign becomes playable it may use the same
selector.

MVP: the three levels in skirmish, the economical setting, the setup
choice, the tuning pass and the owner's check.

## Non-goals

- Picking up ammunition from the fallen or from captured positions.
- A difficulty for the campaign's progression (there is no playable
  campaign yet).
- Changing the enemy's ammunition, the map's forces or the rosters by
  level; the level never adds or removes sections.
- An adaptive difficulty that changes during a battle.
- A difficulty selector in the map editor's playtest (it runs Soldado).

## Legal and ethical note

The level names are the player's role in the fiction (story, soldier,
officer); they make no judgement about the historical people. No book text
is reproduced; the historical basis is paraphrased with page citations
under the source policy. The economical fire setting is a game abstraction
of fire discipline, not a claim about any documented order.

## Capabilities

### New Capabilities

- `difficulty`: the three levels, their factor table, where the player
  chooses one, how it reaches the simulation, the Oficial ammunition
  reserve, determinism, the tuning targets and localization.

### Modified Capabilities

- `orders`: the fire control requirement gains the economical setting,
  its rules and the spoken lines for every fire control setting.

## Impact

- `packages/shared`: `Difficulty` type and factor table; `difficulty` on
  the `start` worker request; `'economy'` added to `FireControl`; the
  result frame carries the level.
- `packages/simulation`: `engine.ts` and `spawning.ts` (Oficial reserve),
  `systems/combat.ts` (enemy aim factor, economical fire),
  `systems/enemy-commander.ts` (commander factors), `systems/morale.ts`
  (Column morale factors), `systems/commands.ts` (the new fire control
  mode), state hash.
- `apps/game`: `ui/menu/setupState.ts` and `SkirmishSetup.tsx`
  (difficulty choice, storage), `GameClient.ts` (start request),
  `ui/hud/OrderBoard.tsx` and the icon map (economical button), the
  result screen.
- `packages/content` locales: level names and descriptions, economical
  fire label and tooltip, in PT-BR and EN.
- Voices: 24 new takes (4 settings × 3 commander + 3 answer) in the
  recording script and the voice line catalog; depends on the voice
  director and captions of `ambient-sound-and-voices` (5.3–5.5).
- `tools`: `battle-report.ts` and `headless-sim.ts` take `--difficulty`;
  `determinism-golden.json` re-recorded once.
- Tests: simulation unit tests per factor, setup storage, e2e for the
  setup choice and the economical button.
