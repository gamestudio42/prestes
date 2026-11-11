## Why

The user played rosters with a machine-gun section (2026-11-09) and could not
tell whether the gun fires. A seeded probe of the 3 vs 3 shows that it does,
in bursts of six, but rarely, at the edge of its reach, and that the player
cannot perceive it:

| Map / seed | Player roster | MG rounds | bursts | hits per round | median distance |
| --- | --- | --- | --- | --- | --- |
| vila-militar 1922 | MG + 2 rifle sections | 379 | 64 | 6.1% | 113 m |
| vila-militar 1924 | same | 178 | 30 | 12.9% | 117 m |
| vila-militar 1925 | same | 192 | 32 | 7.8% | 116 m |
| fazenda 1922 | mixed six sections | 35 | 6 | 2.9% | 119 m |
| fazenda 1924 | mixed | 89 | 15 | 6.7% | 118 m |
| fazenda 1925 | mixed | 122 | 21 | 6.6% | 119 m |

(Rifle hits per round: 14-22%. The 750-round belt pool never ran dry.)

Three causes:

1. **The gun walks.** Of the time the gunner has a target, the gun is not set
   up 35-65% of it, almost all under attack, pursue and advance orders: the
   crew moves with the riflemen, every step resets the 4 s set-up, and the
   gun does not fire (vila-militar 1924: 149 s advancing with a target in
   sight, not one burst).
2. **The reach is the rifle's.** The profile says 140 m, but the 3 vs 3 caps
   every weapon at the Mauser's 120 m and the gunner's own sight is 120 m, so
   the "long reach" of the spec does not exist; the gun fires at 113-119 m,
   where each round hits about one time in eleven.
3. **A burst looks and sounds like one rifle shot.** The view and the audio
   act only on the first round of a burst: one Mauser report, one thin
   tracer and, for the player's own gun, the Mauser's bolt worked 1.3 s
   later. The muzzle flashes of the other five rounds land in the same
   spot within 0.6 s. The automatic rifle has the same problem.

## What Changes

- **The gun halts to fire**: a machine-gun crew under an attack, pursue or
  advance order halts and sets up when an enemy its side sees is within the
  gun's reach and the gunner has a line of fire; it moves on with the order
  once it has had no target for a while. A plain move order still moves it
  (the player relocating the gun). The rule "no fire on the move" stays.
- **The gun's own reach**: the gunner engages to the gun's 140 m any enemy
  his side sees (under fog of war, the side's sighting), when he has a line
  of fire to him; other weapons keep the 120 m cap.
- **A machine-gun sound**: every round of a belt or burst weapon is heard,
  spaced as the simulation fires them, with a sound of its own (a
  procedurally synthesized original machine-gun report; the automatic rifle
  a lighter one); a burst takes one voice of its own budget, so rifles are
  still heard under it; no rifle bolt follows automatic fire.
- **Tracers that read**: belt and burst weapons draw a tracer for each round;
  the gun's tracers are brighter and longer than a rifle's; every tracer
  keeps a minimum on-screen width so it is seen in the strategic band.
  Smoke rises once per burst, the flash at each round.
- **Gun state on the HUD**: the weapon card of a machine-gun section shows
  whether its gun is moving, setting up or set, localized PT-BR and EN.
- **Battle feel report**: per-weapon figures (rounds, bursts, hits) and the
  share of time the gun was set while it had a target, with a band.
- Not breaking for saves; the determinism goldens change only for rosters
  that hold a machine gun (the default 3 x 11 force is unchanged).

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `weapons`: "Crew-served machine gun" gains the halt-to-fire rule and the
  gun's real 140 m reach on the side's sightings.
- `audio`: "Gunshot from shot events" plays a distinct sound per weapon kind
  and every round of automatic fire, with a bounded voice budget.
- `presentation`: "Combat feedback" draws a tracer per round of automatic
  fire, heavier for the gun, readable in every camera band; a new
  requirement shows the machine-gun state on the weapon card.
- `battle-lab`: "Battle feel report" reports per-weapon fire and the gun's
  set-up share, with a band.

## Impact

- `packages/simulation`: `systems/combat.ts` (engage range of a belt weapon,
  target from the side's sightings), `systems/machine-gun.ts` and
  `systems/movement.ts` / `systems/orders.ts` (halt to fire), the
  determinism golden of the mixed roster (`tools/determinism-golden.json`).
- `packages/shared`: a snapshot field for the gun state (`protocol.ts`).
- `packages/view3d`: `tracer-layer.ts` (per-round, per-weapon tracers,
  screen-space width), `effects-layer.ts` (smoke once per burst),
  `scene-view.ts`.
- `apps/game`: `audio/ShotAudio.ts` (per-weapon outputs, per-round
  scheduling, voice budget, no bolt after automatic fire),
  `ui/hud/WeaponCard.tsx`; locales in `packages/content`.
- `tools/battle-report.ts` and its band test; `docs/assets.md` (the new
  synthesized sounds).
- Historical note: the column's 7 mm machine guns are documented (Macaulay,
  1974, p. 113); the model is not named and the gun's rates stay labelled
  abstracted. No book text is used. The new sounds are original
  (synthesized), CC-BY-4.0, registered in `docs/assets.md`.
- Out of scope: new recordings, a tripod animation, overheating or barrel
  changes, rebalancing the automatic rifle's simulation.
- Base: written against the specs as archived in the main checkout on
  2026-11-09 (pre-battle-roster, fog-of-war). This worktree's branch
  predates that archive; apply after that work is committed.
