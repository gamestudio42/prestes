## 1. Recordings and manifest

- [x] 1.1 Add `gramofone/` to `.gitignore`, keep the originals local and add `tools/optimize-gramophone.ts` plus the `optimize:music` script; encode the 17 files to `apps/game/public/music/` at mono 24 kbps, 22.05 kHz, -20 LUFS, tags stripped (verify: `ffprobe` reports mono/22050/24 kbps and the set is under 10 MB)
- [x] 1.2 Add `apps/game/src/audio/gramophone-tracks.ts` with title, composer, performer, year, genre, label, catalog, public-domain year and Discografia Brasileira source for each file, Plangente first (verify: unit test for ids, unique files and source URLs)
- [x] 1.3 Record the recordings, encoding and source links in `docs/assets.md` (verify: asset register review)

## 2. Playback

- [x] 2.1 Add `openAudioContext` and `HtmlGramophoneOutput` with high-pass, low-pass, synthetic room reverb, volume/mute gains, fades, media element and no-AudioContext fallback (verify: unit tests with a fake output; manual menu listen confirmed by the project owner)
- [x] 2.2 Add `Gramophone` transport: first track, next/previous wrap, ended advance, previous restart after three seconds, mute, dispose and injectable output (verify: `tests/audio/gramophone.test.ts`)
- [x] 2.3 Add `useGramophone` persistence, first-gesture autoplay with `data-no-autoplay` exclusion, sound-enable from Play and disposal when the menu unmounts (verify: e2e first-gesture, mute and reload scenarios)

## 3. Menu widget

- [x] 3.1 Add `Gramophone.tsx` with inline pixel SVG, spinning record, transport controls, track line and first-gesture hint (verify: widget visible, accessible labels, reduced motion)
- [x] 3.2 Add the metadata card on track change with title, composer, performer, year, genre, label, catalog, public-domain year and source link (verify: e2e card contents and dismissal)
- [x] 3.3 Add `gramophone.css` with the period palette, hard shadows, responsive layout and reduced-motion rule; place the widget on `StartScreen` (verify: 1440x900 screenshot, narrow viewport check)

## 4. Localization and tests

- [x] 4.1 Add PT-BR and EN labels for the widget, controls, hint, card and source; run `pnpm check:locales` and `pnpm check:content`
- [x] 4.2 Add asset-size and manifest unit tests together with `tests/e2e/gramophone.spec.ts` (verify: `pnpm test`, `pnpm e2e`)
- [x] 4.3 Add a dedicated gramophone visual baseline and hide the widget in the existing full-screen menu baselines (verify: visual tests pass)
- [x] 4.4 Run `pnpm check`, `pnpm build`, `openspec validate add-menu-gramophone --type change --strict`; report what could not be played
