## 1. Remove the bootcamp from the app

- [x] 1.1 Start screen: the campaign page shows the "in preparation" text and a link to the skirmish page; no bootcamp actions; strings in PT-BR and EN (verify: locale check; start-screen e2e updated and passing)
- [x] 1.2 App: remove the bootcamp start, continue and restart flows, the exercise director hook, `training/`, `TrainingMissionPanel`, the instructor balloon and the training field scene option; clear saved bootcamp progress on load (verify: typecheck, lint; unit test for the storage clean-up)
- [x] 1.3 Content: remove the bootcamp exercise and its bootcamp-only strings, keeping the Vila Militar compendium entry (verify: `pnpm check:locales`, `pnpm check:content`)

## 2. Tests and close

- [x] 2.1 Remove `training-campaign` e2e and bootcamp unit tests; update smoke, start-screen and visual specs and snapshots to the skirmish entry (verify: `pnpm e2e` passes)
- [x] 2.2 Simulation untouched: determinism goldens unchanged; `pnpm verify`; `openspec validate retire-bootcamp --type change --strict` (verify: gates pass)
