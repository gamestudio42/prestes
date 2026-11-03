## Why

The new defensive map exposes three usability problems: the troop spreads out, a
marquee can miss the full troop, and flank routes can split to both sides or fail.
The player needs one cohesive troop, an explicit select-all path and one commit
flank side.

## What Changes

- Track a cohesion value from squad spacing and officer proximity.
- Low cohesion slows movement and prevents auto-cover from pulling a soldier far
  from the squad centroid.
- Add a Select All button and Ctrl/Cmd+A.
- Make Flank choose one side for the whole manoeuvre group and route every flanker
  to that side.
- Keep the half-suppress/half-flank split.
- **Non-goals:** campaign, rescue, new orders, vehicles and final art.

## Capabilities

### New Capabilities
None.

### Modified Capabilities

- `sandbox`: Select All action and cohesion display.
- `simulation`: cohesion, constrained auto-cover and one-side flank.
- `presentation`: cohesion in the HUD.

## Impact

- `packages/simulation`, `packages/shared`, `apps/game`, locale catalogs and tests.
- No GitHub action.

## Historical scope and legal note

Cohesion is a gameplay abstraction, not a historical claim. No text, art or map is
reproduced.
