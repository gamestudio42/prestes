## Context

See proposal.md - Why. The battle loop already separates a deterministic
simulation (commands in, frames/events out, `hashState` as oracle) from the
React HUD and the Three.js view. The order manager applies one primary order
per unit; movement already pathfinds around cover rectangles and the wire
fence compiles to a `fence` cover that blocks movement; the compendium is a
registry plus localized notes with a chapter link. This design fits the new
behaviour into those boundaries without a new framework.

## Goals / Non-Goals

**Goals:**
- Queued orders that are deterministic, hashed and visible in the HUD.
- A camera focus path from the HUD to the scene without putting view state in
  the simulation.
- Wire fences that are crossable with a small, fixed health cost and no sight
  or fire block.
- A battle HUD without the codex and with an explicit way out.
- A compendium whose corrections page lists only corrections to claims the
  game makes; the history documents keep every correction.
- No new art; the existing wire meshes and pixels are reused.

**Non-Goals:**
- Drag-to-reorder queue UI, unlimited queue depth, or queueing interrupts
  (rescue still preempts).
- Changing the editor's fence drawing or adding new cover kinds beyond the
  wire flag.
- Rewriting the prologue or removing historical notes from `docs/history`.
- A new player-facing replacement page for the removed correction.

## Decisions

### 1. The order queue lives in the simulation

Order-bearing commands gain an optional `queue` flag. When set, the engine
validates the command as today but stores it in a per-section FIFO (three
slots) instead of applying it. A section is idle when its units hold no
primary order; the next queued command is then applied through the normal
command path, so validation, rejection events and order semantics stay in one
place. Halt and Escape clear the queue. The queue is part of `hashState`.

Alternatives: client-side queueing (rejected: frame timing would decide when
an order starts, breaking determinism and replays); a new command type nesting
the queued command (rejected: doubles the command surface for no gain).

### 2. The HUD shows the queue, the simulation owns it

The order board and the section status read the queued orders from the frame
and draw a small localized chip list. Shift+click on an order appends; Shift
with a ground or target order (right-click) does the same. A refused queue
(three already) shows the localized reason. The HUD never decides when an order
runs.

### 3. Camera focus travels as a HUD callback

`GameCanvas` exposes its scene to the app (a scene-ready callback and a small
focus method), and the HUD calls it with a section id. `SceneView.focusOn`
already moves the rig; focusing keeps the current zoom band. The selected
section's centroid comes from the last frame. No simulation state or command
is involved.

### 4. Leaving is presentation only

A top-bar control opens a small confirmation; confirming disposes the client
and returns to the desk through the existing app handler. Cancelling changes
nothing. Leaving emits no simulation event and writes nothing.

### 5. Wire crossing is a movement rule, not a new obstacle

The compiler keeps the wire line as a `fence` cover but marks it `wire`. The
pathfinder treats a wire cover as walkable with a speed penalty and no cover.
Movement tracks the segment from a soldier's previous to new position; when it
crosses a wire cover's rectangle, the soldier takes 3 health (once per cover id
per order), clamped to 1 health, and the engine emits `unit_hit`. Sight and fire
already ignore wire because the cover has `blocksSight: false` and quality 0;
tests lock that in. Health changes feed the hash, so goldens are re-recorded
with a reason.

Alternatives: making wire passable by deleting it from covers (rejected: the
view needs it and it must still slow men); damaging per tick while overlapping
(rejected: a man standing on the wire would bleed indefinitely).

### 6. Codex and compendium

The battle top bar loses its codex button and the app no longer mounts the
codex panel while a battle is active; the desk's compendium book is unchanged.
The compendium catalog drops only the `prestes-not-at-fort` correction entry,
its EN/PT-BR notes, its chapter link and the docs entry; the book keeps its
sections and the other corrections. The corrections stay in `docs/history` and
`SOURCE_POLICY.md`, cited by the historical-content requirements, and the
prologue remains the 1922 beach sortie at Copacabana (dramatized, its playable
commander the figure present).

### 7. Historical method and figure roster

The change is content-neutral: it removes a player-facing correction for a
claim the game never makes. Macaulay remains Tier 0; the prologue's commander
and labels are unchanged. No figure is added or made playable.

## Risks / Trade-offs

- [Queue makes orders feel sluggish] -> It only applies with Shift; a plain
  order still replaces the current one, and Halt/Escape clears everything.
- [Wire damage is invisible on screen] -> The effect is small and the status
  card's health bar already reflects it; a later change may add a crossing
  effect, not in this slice.
- [Focus fights the camera's smoothing] -> Focus only sets the rig target; the
  existing smoothing keeps the motion continuous.
- [Removing the entry loses a historical safeguard] -> The note stays
  in `docs/history`, and the prologue itself is the beach fight; validation
  keeps the historical-content requirements.
- [A queued command that is invalid at activation] -> It is dropped with a
  rejection event and the next runs, so the queue cannot wedge a section.

## Migration Plan

- Determinism goldens are re-recorded once, with the reason naming the wire
  health cost; the queue starts empty, so runs without Shift hash as before
  except for wire crossings in existing scenarios.
- The compendium registry and notes change at the same time; the validation
  test and the compendium e2e are updated, and the docs entry is removed.
- No save data is involved; the setup's saved time limit from the previous
  change is untouched.


## Apply findings

- Shift queues on a click only: a Shift+drag keeps its old meanings (line move,
  facing), so a player who drags still gets the line order.
- The compendium scope was corrected during apply: the request is to drop the
  correction for a claim the game never makes, not the corrections page; the
  other four corrections stay, and the requirement now says the page lists only
  corrections to claims the game makes.
- The paiolzinho determinism golden was recorded against the author's map as it
  stands in the working tree; the map and the golden are deliberately left
  uncommitted together until the map settles.