## Why

The user's hand check after `low-poly-art-pass` (2026-11-05): movement is fine,
but the fight does not feel like a game. Soldiers fire all at once, the rush
of an attack is too short, an enemy takes too many hits to fall (an assault
reaches the trench and then needs many shots to clear it), and the enemies'
animations look wrong. The user asked for the 3 vs 3 battle to be played and
reworked until it is fluid and polished like a real game.

A headless run of the 3v3 (seed 1922, the player's three sections ordered to
advance) measured it: 65 of 66 soldiers fire on the same tick, 65% of all
shots come in volleys of five or more, each soldier fires every 1.2 s, the
sides start 96 m apart inside the 120 m rifle range, so the first shots go off
at 1.3 s, and after about two minutes the battle stalls with 14 column and 6
legalist soldiers fit and no shot fired for the rest of the run. In the
browser, the enemy sections stand crouched in the open on `aim-crouch`, never
move or take cover, and fall in a heap. A soldier in a trench gets the 75%
cover cap, so a hit lands about once in seven shots and five hits are needed
to put him down: about 30 shots per defender. The 3v3 is only reachable
through the sandbox panel; the user did not find it.

## What Changes

- **Aimed fire, not volleys**: a soldier's aimed fire comes every 3 to 5 s
  (bolt, aim, fire) with a per-soldier seeded jitter, and his first shot at a
  newly seen enemy waits a reaction delay of 0.5 to 1.5 s, so a section's fire
  ripples along the line. Suppressive fire keeps a faster rate. Rifle fire is
  rebalanced so a fight in the open is decided in tens of seconds per section,
  not in two.
- **Lethality: 2 to 3 hits**: a rifle hit takes 35 to 55 of 100 health, so two
  or three hits put a man down (the first may leave a light wound with its
  penalties, as today).
- **Close assault clears cover**: a trench or wall protects strongly against
  fire from range but loses most of its value against a shooter within 10 m,
  and none against a shooter inside the same cover; an assault that reaches the
  trench clears it in a few shots.
- **Longer rushes (the *lanço*)**: in an attack by bounds, each rush
  runs 12 to 20 m in the open (3 to 5 s at a run) or to cover up to 30 m ahead,
  instead of 2 to 8 m and cover within 16 m.
- **A battle that plays out**: the 3v3 starts about 180 m apart, out of rifle
  range; the enemy commander holds a line in cover, then counterattacks or
  withdraws by the state of the fight; soldiers who lose contact move toward
  the last known enemy instead of standing; the battle ends in victory or
  defeat with an end panel (time, casualties, restart).
- **Enemies that read as soldiers**: enemy sections march, run, take cover,
  crouch and lie down, aim and react to fire through the same clip choice as
  the player's, and the clip changes follow their simulation state.
- **3 vs 3 on the start menu**, next to the bootcamp.
- **Playtest gate**: a headless battle report (duration, shots per casualty,
  largest same-tick volley, time without fire) with target bands checked in a
  test, used to tune the numbers above until the battle reads well.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `simulation`: rifle combat gains the aimed fire interval, reaction delay and
  2 to 3 hit lethality; cover gains the close-assault fall-off.
- `formations`: the advance by bounds gains a rush length.
- `battle-lab`: the 3v3 starts out of range from the start menu, the enemy
  commander fights with intent, contact is not lost into a stalemate, the
  battle ends, and a headless report checks its feel.
- `presentation`: enemy soldiers use the full clip set.
- `weapons`: the 3 vs 3 battle issues the training ammunition load to both
  sides (found in apply: 20 rounds last about 80 s of aimed fire).

## Impact

- `packages/shared` (weapon profile, 3v3 deployment, protocol for the end of
  battle), `packages/simulation` (combat, cover, bounding, enemy commander,
  battle end), `packages/view3d` (clip choice for every faction),
  `apps/game` (start menu entry, end panel, locales in PT-BR and EN),
  `tools/` (battle report), tests.
- The determinism golden changes on purpose (fire timing and damage).
- Player fantasy: commanding three sections in a firefight where fire and
  movement decide it: pin with fire, rush by bounds, close and clear.
- Core loop: deploy, advance by bounds under covering fire, assault the enemy
  position, win or fall back.
- Historical scope: none added; the 3v3 stays a fictional training battle
  between column and legalist sections. Rates of fire and rush lengths follow
  general bolt-action infantry practice and are game abstractions, labelled as
  such in the weapon profile.
- Multi-perspective: unchanged; no historical figure is playable here.
- Legal and ethical note: no book text or third-party material; violence stays
  at the current abstraction (no gore beyond the existing blood pool).
- MVP: the four feel fixes, the battle flow and end, the enemy animations, the
  menu entry and the report. Non-goals: new weapons, machine guns, artillery,
  cavalry, campaign missions, multiplayer, new maps.
