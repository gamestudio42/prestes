## Why

The current HUD is compact, but it still reads as a re-skin of the old panel: the
top bar is a row of icon utilities, the bottom deck is a form-like grid, and the
reference's squad card, seven-action row, weapon/status card, command row and
rounded translucent panels are missing. The reference also expects infoboxes on
hover and a consistent sepia visual language across the game. Combat is silent.

This change finalizes the HUD to the reference and establishes the shared visual
and audio language that the training campaign will reuse.

## What Changes

- Rebuild the HUD composition to match the reference:
  - segmented top rail with brand, tick, camera band selector, path/outcome
    readouts, language, sandbox/codex, pause, speed and post controls;
  - bottom-left squad card with portrait, section name, alive count, health/ammo/
    morale bars and two icon actions (preview, select all);
  - centered seven-slot action row (move, attack, suppress, flank, withdraw,
    hold, clear/cancel);
  - bottom-right weapon/status card with rifle, ammo, morale/cover/cohesion/
    suppression/equipment, and overflow menu;
  - bottom command row with Position, Maneuver, Support, Formation, stance icons
    and objective/star action; collapse chevron.
- Add hover/focus infoboxes to every icon-only control and order action. Copy is
  localized and explains the action and current availability.
- Replace the tactical nine-button grid with three reference-style category
  dropdowns (Position, Maneuver, Support), keeping every existing order and test
  id reachable.
- Apply a shared visual language: sepia translucent panels, 8-10 px rounded
  corners, hairline bronze borders, self-hosted display serif for brand/mission
  headings, Barlow for data, consistent Lucide/custom icon strokes, and a
  restrained in-game HUD/selection/path palette. No new character or environment
  art in this change.
- Add a single original procedural gunshot, played only from simulation `shot`
  events. No other sound effects and no third-party sample redistribution.
- Add an audio mute/volume affordance in the HUD overflow for accessibility while
  keeping gunfire as the only sound.

## Capabilities

### New Capabilities

- `audio`: presentation-only gunshot playback driven by simulation shot events,
  with lazy browser unlock and no effect on deterministic state.

### Modified Capabilities

- `presentation`: HUD composition, tooltip infoboxes, category dropdowns,
  typography/icon tokens, rounded translucent styling and responsive behavior
  change to match the supplied reference.

## Impact

- `apps/game/src/ui/Hud.tsx`, a new tooltip primitive, HUD CSS/tokens and
  responsive tests.
- A new self-hosted display font and icon primitives; asset register/licence
  entries.
- `GameClient`/app audio manager and the original procedural gunshot.
- Playwright screenshot/E2E and unit coverage; no simulation, protocol, save or
  determinism change.
- The training campaign will consume the same tokens and controls after this
  change lands.

