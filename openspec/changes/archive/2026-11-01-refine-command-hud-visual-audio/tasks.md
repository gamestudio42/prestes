## 1. Baseline and design tokens

- [x] 1.1 Capture the current HUD and reference screenshots at 1440x900; list the exact top rail, squad, action, status and command-row regions to implement
- [x] 1.2 Add shared HUD tokens for sepia ink/panel/paper/gold/rust/positive, radii, borders, spacing and font roles; verify the HUD renders with tokens and no hardcoded replacement colors
- [x] 1.3 Add and register a self-hosted OFL display serif for the brand and headings; verify it loads locally with no CDN request

## 2. HUD composition

- [x] 2.1 Rebuild the top rail as segmented groups with brand, tick, camera selector, paths, outcome, language, utilities, pause, speed and post; verify every existing test id and hotkey still works
- [x] 2.2 Build the squad card with portrait, section name, alive count, three bars, preview and select-all icon actions; verify the card follows frame updates
- [x] 2.3 Build the seven-slot action row and define the clear/cancel slot behavior; verify move, attack, suppress, flank, withdraw, hold and clear all expose state
- [x] 2.4 Build the weapon/status card with rifle, ammo and morale/cover/cohesion/suppression/equipment readouts; verify values match the frame
- [x] 2.5 Build the command row with Position, Maneuver, Support, Formation, stance and objective/star actions; verify every tactical order remains reachable
- [x] 2.6 Implement responsive wrapping and accessible overflow; verify desktop 1440x900 and a narrow viewport keep all commands reachable

## 3. Tooltips and control states

- [x] 3.1 Add a reusable hover/focus infobox with localized title and description, viewport collision handling and `aria-describedby`
- [x] 3.2 Apply infoboxes to icon-only utilities, action slots, squad actions and status icons; verify pointer and keyboard paths
- [x] 3.3 Add category listboxes with keyboard navigation, Escape, outside-click close and current selection; verify each `tactical-*` id still dispatches the same command
- [x] 3.4 Add disabled/available reasons to actions and infoboxes; verify unavailable controls do not dispatch commands

## 4. Visual language

- [x] 4.1 Apply rounded translucent panels, hairline borders, paper grain and the sepia palette to the HUD and overlays; verify contrast over terrain and combat
- [x] 4.2 Standardize Lucide/custom icon stroke weights and add the rifle/heart/link/equipment/star primitives; verify no CDN icon or font request
- [x] 4.3 Align cursor, selection box, order ring and path colors with the HUD tokens; verify tactical readability and casualty-ring separation

## 5. Gunshot audio

- [x] 5.1 Replace the non-redistributable Google Actions OGG with an original synthesized gunshot and record the original asset in the asset register
- [x] 5.2 Add the presentation-only audio manager with lazy unlock, preload, shot-event deduplication and bounded concurrency; verify audio never enters the worker
- [x] 5.3 Add the persisted mute/volume control in the overflow; verify mute, unmute and reload
- [x] 5.4 Add unit coverage for event-to-playback, deduplication and missing-asset fallback; verify no simulation hash or event-stream change

## 6. Verification

- [x] 6.1 Run the HUD Playwright suite and capture comparison screenshots for desktop and narrow layouts
- [x] 6.2 Run `pnpm check`, `pnpm build`, `pnpm e2e`, `pnpm sim` twice and `openspec validate --specs`; record counts, bundle size and hash
- [x] 6.3 Update `docs/status.md`, `docs/architecture.md` and the asset register with the new HUD, font, audio source and verification results


