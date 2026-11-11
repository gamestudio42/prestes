## Why

Playtesting the 3v3 surfaced a set of controls, obstacle and content problems
that make the battle rougher than it should be: orders cannot be planned ahead,
the camera cannot be brought back to the selected section from the HUD, there is
no way out of a battle once it starts, barbed-wire fences stop a soldier like a
wall, and the in-battle codex carries an entry that corrects a claim the game
never makes. This change fixes those in one battle-only slice so the next
playtest judges the game, not the rough edges.

## Scope and pillars

- **Player fantasy:** the player is a section commander reading a 1920s field
  fight: place men, read cover and wire, and give orders that survive contact.
- **Core loop:** select a section, give an order, watch it play out, adjust.
  This change shortens the "give an order" and "look at it" beats; it does not
  add a new system.
- **Historical scope:** the 1922–1927 campaign; the prologue is the 4 July 1922
  beach sortie at Copacabana, commanded on the beach by the historical figure
  present. The change removes a compendium correction entry about the fort; it
  does not retell the prologue.
- **Perspective:** multi-perspective campaign; the prologue's playable commander
  is the figure present on the beach. No mission is added here.
- **MVP:** the existing 3v3 skirmish on authored maps, plus its report and HUD.
- **Non-goals:** a full order-queue UI with drag-reorder, multiplayer,
  reinforcements, a new compendium page replacing the removed entry, or changes
  to the map editor's fence drawing.
- **Legal/ethical note:** original prose only; no book text is copied. The
  removed correction lives on in `docs/history`, where the historical constraint
  stays recorded; the player-facing game simply stops presenting a correction
  for a claim it never made.

## What Changes

- **Queued orders:** holding Shift when giving an order appends it to the
  section's queue instead of replacing the current order; queued orders run in
  order as each finishes. Halt/Escape clears the queue, and the HUD shows the
  queued orders.
- **Camera from the HUD:** a double-click on the Troop Summary centres the
  camera on the selected section; a double-click on a squad card selects and
  centres that section.
- **Leave the battle:** a HUD control leaves the fight for the desk, with a
  short confirmation so a misclick does not end the battle.
- **Barbed wire:** soldiers can cross wire fences, losing a small, fixed amount
  of health once per crossing; the wire neither blocks sight nor stops fire, so
  men can shoot through it. Wire gives no cover.
- **In-battle codex removed:** the codex button and panel are not offered during
  a battle; the menu's compendium book stays.
- **Compendium cleanup:** the `prestes-not-at-fort` correction entry, its notes
  and its link from the prologue's chapter list are removed; the prologue stays
  the Copacabana beach fight. The historical constraints remain in
  `docs/history`.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `orders`: queued (Shift) orders; the order lifecycle and HUD gain a queue
  without changing the one-primary-order rule.
- `presentation`: HUD double-click centring, a leave-battle control, and no
  in-battle codex.
- `terrain`: wire fences become crossable with a small health cost and do not
  block sight or fire.
- `historical-content`: the corrections page no longer lists a correction for
  a claim the game never makes; the other corrections stay, and the prologue
  remains the Copacabana beach combat.

## Impact

- `packages/shared/src/protocol.ts` (queued order command, queue snapshot,
  wire flag on covers), `packages/simulation` (order queue, movement across
  wire, pathfinding), `packages/view3d` (scene focus, cover flags), `apps/game`
  (HUD: summary double-click, leave control, queue chips, codex toggle removed),
  `packages/content` (compendium catalog, notes, chapter links), `docs/history`
  and `docs/campaign/compendium` (removed entry), tests and e2e.
- Determinism: the queue and wire damage enter the hashed state; goldens are
  re-recorded with a reason.
