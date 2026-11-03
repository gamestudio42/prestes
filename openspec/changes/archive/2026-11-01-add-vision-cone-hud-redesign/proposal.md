## Why

The previous HUD pass changed the panel colours but left the interface dense and
visually disconnected from the low-poly, 1920s campaign. Vision was also only a
preview decoration: units still acquired and fired at enemies outside the drawn
cone, and the cone rotated against the character in some views. Defend could also
preview one destination and then move soldiers somewhere else.

## What Changes

- Replace the dense four-column HUD with a minimalist sepia command deck: one-line
  top bar, icon-only utilities, compact clipped-corner panels, one-row tactical
  orders and a small status rail.
- Keep the existing Preview and Hide HUD controls, the orders collapse and every
  current order and status readout.
- Make vision a real 65-degree forward cone used by target acquisition and fire.
  Sight-blocking cover interrupts the cone. Idle soldiers keep their last facing;
  a current target or an explicit attack order turns them.
- Share the 8 m defend-region clamp between preview and simulation so the committed
  destinations match the preview.
- Keep deterministic simulation, worker boundary, PT-BR/EN catalogs and the
  existing boot camp, sandbox, casualty and both-sides flows unchanged.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `presentation`: the HUD becomes a compact sepia command deck with icon-only
  utilities and a single-row tactical strip, while retaining every existing
  control and readout.
- `simulation`: visible enemies are limited to the forward vision cone and clear
  line of sight; facing follows target, path or last facing.
- `tactical-preview`: defend destinations are clamped to the same region as the
  simulation, and the preview cone uses the gameplay cone angle.

## Impact

- React HUD markup and CSS in `apps/game`.
- Shared vision and defend-planning helpers in `packages/shared`.
- Simulation target acquisition and facing in `packages/simulation`.
- Unit tests for the cone, preview clamp and reload timing; Playwright preview/HUD
  coverage; screenshots and verification counts.
- No new dependency, no renderer import in simulation, no save/schema change.
