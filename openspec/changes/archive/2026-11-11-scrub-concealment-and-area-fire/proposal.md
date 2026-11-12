## Why

Two adjustments the owner asked for after playing the skirmish (2026-11-11):

1. **Scrub hides too much.** Scrub ("Mato") today hides a *standing* man
   from anyone farther than 40 m, and a crouched one beyond 15 m. Every bush,
   hedgerow and tree's shade on an authored map stamps scrub, so a section
   that merely stands among bushes vanishes at most fighting ranges. The
   owner's rule: a man in scrub stays hidden only if he keeps low (crouched
   or prone), and only beyond some distance X; standing, or nearer than X, he
   is seen as in the open.
2. **Nothing to do about a "?".** When the enemy fires unseen, the player
   gets a "?" marker; when a seen enemy drops out of sight, a faded ghost. No
   order can use them: Attack and Suppress need a seen man, and Suppress
   clears the moment its target leaves sight. The owner wants to order a
   section, or one man, to fire into that area: rarely hitting, mostly
   keeping heads down, and costing ammunition.

## What Changes

- **Scrub concealment by stance.** Scrub no longer conceals a standing man
  (like tall grass today). A crouched man in scrub is hidden from observers
  farther than X = 50 m (was 15 m); a prone man beyond 30 m (was 8 m). Nearer
  than that the ordinary vision rules apply. Running still doubles the
  distance. The rule reaches every object that stamps scrub (bush, hedgerow,
  a tree's or cactus's foliage). The owner confirmed the values on
  2026-11-11.
- **Settling in scrub keeps low.** A section that halts in scrub with a
  stance the player has not set takes the crouched stance, so the enemy's
  holding sections (and the player's left to themselves) still use the
  cover the bushes give; a stance the player chose is kept.
- **Area fire ("Fogo na área").** A new fire order. The player arms it and
  clicks a "?" marker or a ghost; the selected section or soldiers fire into
  a disc round that contact for up to 20 s. Each round has at most a 3 %
  chance to hit a man actually inside the disc (about 1 % for a rifle at
  60 m on a man in the open), does half damage, and suppresses every enemy
  in the disc at half a missed aimed round's strength. It fires at the
  weapon's rapid rate, spends ammunition and stops when a man is down to a
  quarter of his load; the shot gives a concealed shooter away as any shot.
  A man who sees an enemy inside the disc switches to aimed fire at him.
- The simulation accepts the order only near a contact its side holds (an
  unseen-fire marker of the last 10 s or a last sighting of the last 7 s),
  so it stays a reply to a real suspicion; with fog of war off it accepts any
  point.
- Not breaking for saves or maps. The determinism goldens move on the maps
  with scrub (the vegetation rule and the auto-crouch); they are re-recorded
  and named in the commit.

Player fantasy and core loop: the player reads the ground. Bushes shelter a
section that keeps its head down, not one that stands about; a shot from the
bushes leaves a "?", and the player can answer it with a burst of fire that
pins whoever is there while his own section closes in or pulls back, paying
for it in cartridges he cannot spare. Historical scope: the Mauser rifleman's
small load and the habit of firing on a suspected position are period
infantry practice; no new historical claim or figure. MVP: the rules in the
simulation on every battle map, the order on the board with PT-BR and EN
strings. Non-goals: the enemy commander does not use area fire in this change;
no area fire on an arbitrary point under fog of war; no change to corn, cane
or tall grass; no new map field; no editor change; no authored map edited.

Multi-perspective: the rules are the same for every side and army; the change
adds no mission and no playable figure.

Legal/ethical note: no book text, art or source material is used; the change
is mechanics and interface strings only.

Localization: the area-fire order's label, tip, pick prompt, rejection reason
and the revised concealment hint ship in PT-BR and EN.

## Capabilities

### New Capabilities

(none)

### Modified Capabilities

- `concealment`: "Concealing vegetation" changes the scrub row (no
  concealment standing, 50 m crouched, 30 m prone) and adds the auto-crouch
  of a section settling in scrub; "Moving through crops" updates the
  concealed hint.
- `orders`: "Order catalogue" gains Area fire in the fire row; a new
  requirement defines the area-fire order on a suspected contact.
- `fog-of-war`: a new requirement that the "?" markers and ghosts can be
  picked as the target of area fire.

## Impact

- `packages/shared/src/maps/concealment.ts`: the scrub row of `VEGETATION`.
- `packages/simulation/src/systems/concealment.ts`: auto-crouch of a section
  settled in scrub (beside `defaultConcealedFire`).
- `packages/shared/src/protocol.ts`: `area_fire` command, `area-fire` unit
  order, `no_suspected_contact` rejection, the shot event's area flag and
  the unit snapshot's area.
- `packages/simulation/src/systems/commands.ts` (validation and setup),
  `combat.ts` (the area-fire round), `vision.ts` (the radius kept with each
  heard marker), `model.ts` (unit state), `snapshot.ts`, state hash.
- `packages/content`: order catalog entry, icon, locale strings in `en.ts`
  and `pt-BR.ts`.
- `apps/game/src/hooks/useOrders.ts` and the HUD: arming the order, picking
  a marker or ghost from the fogged frame.
- `packages/view3d`: the area ring while the order lasts, tracers to the
  round's aim point.
- Tests: simulation tests for the scrub table, auto-crouch and every area
  fire rule; HUD and e2e tests for the order; goldens re-recorded.
