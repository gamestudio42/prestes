# Bootcamp manual checklist

Run after `pnpm check`, `pnpm build` and `pnpm e2e`.

## Entry and troop
- [ ] The game opens into the bootcamp; no skirmish or campaign entry exists.
- [ ] The player troop has 11 soldiers.
- [ ] The officer instructor is visible and cannot be selected.
- [ ] Clicking any of the 11 soldiers selects the whole troop.
- [ ] No select-all button or Ctrl/Cmd+A shortcut exists.
- [ ] No training enemy fires before the player reaches the assembly zone.

## Phase 1 — Formation
- [ ] The panel shows phase 1/3 and the assembly-zone objective.
- [ ] The zone ring is visible on the map.
- [ ] Moving at least five soldiers into the zone completes the phase.
- [ ] The panel advances to phase 2 and the assault instructions.

## Phase 2 — Assault
- [ ] The training troop spawns in the trench and returns non-lethal fire.
- [ ] Training fire can suppress and pin, but cannot wound, incapacitate or kill.
- [ ] The objective list shows suppressed enemies and soldiers holding the trench.
- [ ] Suppression and a flank can take the position.
- [ ] The panel advances to phase 3 after the line is secured.

## Phase 3 — Hold
- [ ] The counter-attack wave spawns from the marked approach.
- [ ] The hold timer counts from 0:00 toward 1:00.
- [ ] The officer-protected objective shows 1/1 while the instructor is safe.
- [ ] The exercise completes after the hold timer with the officer protected.
- [ ] Moving the troop out of the trench for long enough fails the phase.
- [ ] The failure panel shows a localized reason and retry controls.
- [ ] Retry restarts the hold phase with the timer, troop and wave reset.

## Presentation
- [ ] The panel shows phase, objectives, live progress and instructor text.
- [ ] Field drills are collapsible and do not gate progress.
- [ ] The debrief appears after completion with replay and continue.
- [ ] The HUD, panel and markers do not overlap at 1440x900.
- [ ] PT-BR and EN both read correctly.
- [ ] Audio mute/volume still works.

## Sandbox
- [ ] Every placement tool shows a preview.
- [ ] The preview follows the pointer and shows valid/invalid state.
- [ ] Z and X rotate the preview.
- [ ] A valid click places the element; Escape or right-click cancels.
- [ ] Enemy troop inserts 11 soldiers as one troop.
- [ ] Command troop inserts 3 soldiers as one troop.
- [ ] Inserted troops can be selected by clicking any member.
- [ ] Invalid positions cannot be placed.
