## Context

**Concealment today.** `VEGETATION` in `packages/shared/src/maps/concealment.ts`
gives each vegetation kind a concealment distance per stance;
`concealmentDistance()` reads the kind under a man and returns the distance
inside which he is seen (doubled while he runs), or null when the kind does not
conceal that stance. `packages/simulation/src/systems/concealment.ts` turns it
into `hiddenByVegetation(observer, target)`, which both `vision.ts` (`sees`, the
side's fog-of-war vision, 120 m range, cone or 15 m near sense, line of sight)
and `combat.ts` (`visible`, a shooter's own sight) apply last. Within the
distance nothing about the vegetation applies: the man is seen as in the open.
A shot reveals the shooter for 4 s to observers within 50 m. Scrub is the kind
the editor calls "Mato", and `document.ts` stamps it under every `foliage`
catalog object (bush, cactus, the shade round a tree) and every hedgerow, so it
is by far the most common concealment on the authored maps. Its row is
standing 40 m, crouched 15 m, prone 8 m: a standing man in a bush is invisible
beyond 40 m, most of a rifle fight.

Stances: a man stands by default; he crouches or goes prone when the player
sets the section's stance, under fire (`fire-reaction.ts`, `morale.ts`) or in
cover. `defaultConcealedFire()` already arms fire on contact for a section left
to itself that settles in vegetation, judged by `concealmentDistance(...,
unit.stance)`, so it depends on the stance being one that conceals.

**Suspected contacts today.** Two kinds, both drawn only in the view:

- the "?" marker: `unseenFireMarker()` in `vision.ts` emits an `unseen_fire`
  event (seeded error disc, radius 3 m + 8 % of the distance, halved for
  repeats, floor 2 m) and keeps `{x, y, fromX, fromY, tick}` in
  `vision.heard[side]` (pruned after 10 s); `FogView` in
  `packages/shared/src/fog-view.ts` shows it for 8 s and `marker-layer.ts`
  draws the glyph and its ring;
- the ghost: `FogView` keeps a faded silhouette for 5 s where a seen enemy
  dropped out of sight; the simulation keeps `vision.lastSeen[side]` (true
  position and tick of each enemy's last sighting).

**Fire orders today.** Every fire path in `combat.ts:fire()` needs a
`targetId`: Attack and Suppress name a seen enemy (`commands.ts`), and
Suppress clears when no member of the target's squad is in sight. Rounds come
off `magazine`/`reserve` (a Mauser carries 5 + 15). Hit chance is weapon
accuracy × range factor × moving × (1 − cover) × morale × suppressed ×
suppress (0.7) × wounds × army marksmanship, clamped to [0.05, 0.95];
suppression per round is 20 on a hit, 12 on a miss × weapon suppression ×
(1 − 0.3 cover), half to mates within 4 m. A man is suppressed at 30 and
pinned at 65. The board's orders come from `ORDER_CATALOG` in
`packages/content/src/order-catalog.ts`; `useOrders.ts` arms an order and
turns a click on a unit or the ground into a command.

## Goals / Non-Goals

**Goals:**
- Scrub conceals only a man who keeps low, and only beyond X.
- A player can answer a "?" or a lost contact with fire that pins and rarely
  kills, at a real cost in ammunition.
- Both rules deterministic, symmetric between sides, testable headless.

**Non-Goals:**
- The enemy commander issuing area fire (a later change; the simulation
  accepts the command for both sides already).
- Area fire on an arbitrary point under fog of war (reconnaissance by fire of
  an empty treeline).
- Changing corn, cane or tall grass, the reveal rule, the crop sight cut, or
  any authored map.

## Decisions

### D1. Scrub row: standing none, crouched 50 m, prone 30 m

Change only the scrub row of `VEGETATION`. Standing becomes `null`, as tall
grass already has, which is exactly the owner's "standing he is seen as in
the open". Crouched X = 50 m: about half of the 120 m sight range, so a
crouched section in the bushes is still invisible at ordinary rifle range
but found by an enemy that closes to a short assault distance; it is a bit
more than tall grass's 40 m, matching "scrub must conceal less". Prone 30 m
(about 3/5 of X): lying flat stays the better choice, as in every other row.
Running doubles both (100 m and 60 m), unchanged rule.

Alternatives: one X for crouched and prone (simpler to explain, but prone
would gain nothing over crouched in scrub while it does everywhere else);
X = 30 m (barely a change from the old crouched 15 m in feel at 60–120 m
fights); X = 80 m (concealment almost gone). The value is the owner's call.

### D2. A section settling in scrub crouches unless the player chose a stance

Without it the change silently strips concealment from every AI section that
holds in bushes standing, and from the player's sections left on their default
stance, and `defaultConcealedFire()` stops arming. The rule runs beside
`defaultConcealedFire()`, with the same "settled" test (no man moving, most
fit men inside), and only crouches standing men whose stance the player has
not set (`stanceLocked` false and no stance command for that section).
Crouching, not prone: a crouched man can still fire and move off. Symmetric
for both sides. Alternative: crouch only the enemy commander's sections
(asymmetric, and the player's left-alone sections would behave differently).

### D3. Area fire is a new command and order, not a mode of Suppress

`{ type: 'area_fire'; unitIds: number[]; to: Vec2; queue?: boolean }`, unit
order `'area-fire'`, rejection `'no_suspected_contact'`. Suppress keeps its
target-based meaning (spread over a seen squad, clears when the squad is out of
sight). A separate order keeps the two readable on the board and in the code,
and lets the queue, the order feedback and the snapshot name it.

### D4. The simulation validates against its own memory of contacts

The HUD's markers and ghosts are view state (`FogView`), so the simulation
cannot read them; it checks the command's point against what it already keeps
per side: `vision.heard[side]` entries younger than 10 s (MARKER_TICKS; the
view shows 8 s) and `vision.lastSeen[side]` entries younger than 7 s for an
enemy not in `seen[side]` (the view's ghost lasts 5 s). The 2 s margins cover
the frame lag between the HUD and the worker; the simulation is a superset of
what the HUD can show, so a click the HUD allowed is never rejected for
timing. Pick radius 8 m. The contact used is the nearest one to the point
(ties by tick, then insertion order), which fixes the disc.

The disc radius needs the marker's uncertainty, which `heard` does not keep
today: add `radius` to each `heard` entry (it is already computed for the
event). Sighting: 5 m, the ground a man covers in the ghost's few seconds at a
walk. Clamp [4, 12] m. The disc's centre and radius are stored on each
ordered unit (`areaFire: { x, y, radius, untilTick }`).

With fog of war off (`ctx.fog` false: sandbox, battle lab, tests) any point
is accepted with a 6 m disc, so the rules can be exercised without staging a
contact.

Alternative rejected: trust a radius or contact id sent by the HUD (a client
could fire anywhere; the replay would depend on view state).

### D5. The area-fire round

A branch in `fire()` for units with `areaFire` and no `targetId`, after the
common gates (alive, not pinned or panicked, not reloading, cooldown, gun
ready) but ignoring `holdFire`/`fireOnContact` (explicit order, D7):

1. End checks: `tick >= untilTick` (200 ticks), or rounds left ≤
   ceil(0.25 × (magazine + reserve of the weapon)): Mauser 5 of 20, fuzil
   automático 15 of 60, machine gun 63 of 250, Winchester 7 of 27. Clear
   `areaFire`, order back to hold.
2. Reach: disc centre within `engageRange()`; otherwise he waits
   (`LOOK_AGAIN_TICKS` cooldown) facing the area.
3. Aim point and line: a uniform point in the disc by rejection, two
   `rng.nextFloat()` per attempt, as `unseenFireMarker()` does (no
   trigonometry), kept only if `isLineBlocked` from his eye to it at 1 m
   above ground is false (covers, sight obstacles, buildings, terrain;
   vegetation is not consulted). Up to three points per round
   (`AREA_AIM_TRIES`); with none open he waits (`LOOK_AGAIN_TICKS`). The
   line goes to the aim point, not the centre: a "?" is laid off the true
   shooter, and in the 2026-11-11 browser check its centre sat behind a
   crest while the shooter, and part of the disc, were open, so no man ever
   fired. The burst draw follows the aim point.
4. Candidate: the fit enemy inside the disc nearest the aim point (ties by
   id). Chance = weapon.accuracy × rangeFactor × (1 − cover) × army
   marksmanship × burst hit factor × `AREA_FIRE_ACCURACY` (0.03), clamped to
   [0, 0.03] (no 0.05 floor). One `rng.nextFloat()` roll only when there is a
   candidate. A hit uses the suppress damage (half minimum, half spread) and
   the suppress morale damage.
5. Suppression: every fit enemy within radius + 2 m gains
   `12 × weapon.suppression × (1 − 0.3 cover) × AREA_FIRE_SUPPRESSION (0.5)`
   ÷ his divisor: 6 per Mauser round on a man in the open. Miss morale as an
   aimed miss.
6. Bookkeeping as any shot: `magazine -= 1`, reload, `revealShooter`, the
   `shot` event (`target` the man rolled against or -1, `x2/y2` the aim point
   or his place on a hit, `area: true`), and when
   a candidate exists and his side does not see the shooter, the
   `unseen_fire` marker for the candidate's side. Cooldown: the weapon's
   `fireIntervalTicks` (the rapid rate, 1.2 s for the Mauser); bursts as their
   weapon.

Numbers: a Mauser at 60 m on a standing man in the open: 0.55 × 0.725 × 0.03 ≈
0.012 a round. A section of eight emptying to its floor (about 90–110 rounds in
20 s) on a man in the disc: about one hit, at half damage, rarely a casualty;
on a man in cover (0.5) half that. Meanwhile it adds ~6 suppression a round:
he is pinned within a few seconds. "Hits rare, mostly suppression" as asked.
The RNG draws happen in the fixed unit order of `fire()`, only from
`ctx.rng`, so the run stays deterministic; the new unit state is in the hash.

### D6. Leaving area fire

The man's automatic target selection skips him while `areaFire` is set, so he
does not drift to some far enemy. Two exceptions end it for him: an enemy
inside the disc becomes visible to him (`visible()`), or any enemy within
15 m (NEAR_SENSE, self-defence). Then `areaFire` is cleared and normal
targeting takes over under the section's fire control. Another order clears it
like any order. The section's order ends when its last man stops.

### D7. Fire control is not changed

Area fire is an explicit order, so it fires under Hold fire and Fire on
contact without rewriting the section's `fireControl`, `holdFire` or
`fireOnContact`; when it ends the setting applies again. This avoids a
section that was set to hold fire quietly switching to free fire after an
area burst.

### D8. The HUD and the view

- Order catalog: `{ id: 'area-fire', category: 'fire', activation: 'target' }`
  with a new pixel icon `order-area-fire` (unique, as the icon test checks).
- Arming sets the pick prompt; a click is resolved against the fogged frame's
  `markers` (inside the ring, radius ≥ 3 m for picking) and `ghosts` (within
  1.5 m) and sends `area_fire` with that marker's or ghost's position. A click
  elsewhere does nothing and keeps the order armed. The order button shows
  unavailable with a localized reason when no marker or ghost is shown.
- Snapshot: `UnitSnapshot.areaFire?: { x, y, radius }` for the player's view;
  the view draws a dashed ground ring in the order-marker colour while any of
  the player's units holds one; `FogView` drops it for enemy units.
- Effects: a `shot` with `area: true` draws its tracer and impact at `x2/y2`.
  `FogView` drops an unseen enemy's area round that left no marker (no man
  of the player's in its disc), so it never gives the shooter's place away.
- Line of fire: `isLineBlocked` gains a `throughCrops` flag; area fire passes
  it so corn and cane do not stop the rounds (concealment is not cover).
- Strings (EN source / PT-BR): `hud.orderAreaFire` "Area fire" / "Fogo na
  área"; `hud.tip.areaFire` "Fire into the area of a suspected enemy: rarely
  hits, keeps heads down, spends ammunition." / "Atira na área de um inimigo
  suspeito: raramente acerta, faz baixar a cabeça e gasta munição.";
  `hud.pickAreaFire` "Pick a suspected contact (?)" / "Escolha um contato
  suspeito (?)"; `rejection.no_suspected_contact` (the catalog's rejection
  keys) "No suspected contact there" / "Nenhum contato suspeito ali"; `hud.areaFireUnavailable` "No
  suspected contact on the map." / "Nenhum contato suspeito no mapa.";
  `hud.concealedHint` gains "In scrub and tall grass only a man who keeps low
  is hidden." / "No mato e no capim só fica escondido quem está abaixado.".

### Boundary, determinism, content

Commands and events stay the only boundary: the HUD sends `area_fire` with a
point, the simulation validates it against its own state and answers with
`shot`, `unit_hit`, `unseen_fire` and `command_rejected` events and the unit
snapshot; the view never feeds the simulation. No wall-clock, no DOM in the
simulation; all draws from the seeded RNG in a fixed order; `hashState()`
covers `areaFire` and the heard radius. Content schema: one order catalog
entry, one icon, locale keys; no map format change, no new art beyond the
16 × 16 pixel icon (named placeholder until the owner's art pass).

Historical method: no new claim. The Mauser load (5 + 15) and the practice of
firing on a suspected position follow the existing weapons notes; no figure
added to the roster.

## Risks / Trade-offs

- [Goldens move on every map with scrub] → re-record with `pnpm
  check:determinism --update`, name the reason in the commit.
- [AI sections that stand in scrub after this change are seen from afar] → D2
  crouches them when they settle; check on the authored maps by hand.
- [Area fire at a stale marker hits nothing] → intended ("Empty bushes"); the
  ammunition cost is the player's lesson.
- [Area fire spam drains the section] → the floor of a quarter load keeps the
  last charger for real targets.
- [Scrub prone 30 m worse than tall grass prone 12 m] → accepted: the owner
  asked for scrub to conceal less; tall grass is untouched.

## Migration Plan

No data migration: the scrub row is code, saves hold no vegetation values,
and replays recorded before the change are replaced by the re-recorded
goldens. Rollback: revert the commit.

## Open Questions

None. The owner confirmed the proposed values on 2026-11-11: scrub crouched
X = 50 m and prone 30 m (D1); area fire at ×0.03 of aimed accuracy, capped at
3 % a round, with half a missed round's suppression (D5).
