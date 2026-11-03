## 1. Shared planning boundary

- [x] 1.1 Extract formation-slot and cover-candidate planning into a pure shared module; verify existing formation tests still pass.
- [x] 1.2 Implement cover-first destination selection for movement/formation orders; verify a unit chooses reachable cover and falls back to its slot when none exists.
- [x] 1.3 Expose a pure `planOrderPreview` from shared types for ground and target orders; verify it does not mutate the frame or hash.

## 2. Preview presentation

- [x] 2.0 Add a Preview toggle that starts off and clears ghost soldiers, paths and cones without cancelling the pending order; verify no preview is visible on load.
- [x] 2.1 Add hover ground/target preview state to the canvas and pending-order flow; verify moving the pointer clears the old plan.
- [x] 2.2 Render ghost paths, destination markers and intended soldier positions; verify the preview matches the committed command destinations.
- [x] 2.3 Add facing/vision cones for selected/preview units; verify cone rotation follows facing and remains distinct from casualty red.
- [x] 2.4 Handle invalid/blocked points and missing targets by hiding the preview; verify no command is sent.

## 3. HUD redesign and hide

- [x] 3.1 Adopt the reference HUD grouping and compact 1280x720 layout; verify the map remains readable and the section list/order/status panels remain usable.
- [x] 3.2 Add Hide HUD button and `H` shortcut with a restore affordance; verify panel state returns unchanged.
- [x] 3.3 Keep the orders panel collapse behavior from the boot camp; verify preview and orders work while expanded.

## 4. Verification

- [x] 4.1 Add unit tests for preview/cover decisions, no-mutation hover, and cone/ring colours.
- [x] 4.2 Add Playwright coverage for hover preview and hide/restore HUD; verify the map stays interactive while hidden.
- [x] 4.3 Update architecture/status and run `pnpm check`, `pnpm build`, `pnpm e2e`, `openspec validate` and two simulation hashes; record results.





