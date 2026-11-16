## ADDED Requirements

### Requirement: Release readiness check

The repository SHALL provide `pnpm check:release`, run on the built game in
`apps/game/dist` as a step of the local verification gate.

It SHALL fail and name the file when the build holds any of the following:

- an image whose registered licence is `permission-pending`;
- any file from `art-src/compendium-pending/` or from the review build;
- a source map;
- the development-only map-editing link or its strings.

It SHALL report two sizes, each against a limit in a checked-in budget
file:

- the bytes a first visit downloads before the desk is ready: the page,
  the entry scripts and styles, the fonts and the desk's art;
- the total size of the build.

It SHALL fail when either size is over its limit.

#### Scenario: A pending image is caught

- **WHEN** the build holds the file of an image registered as `permission-pending`
- **THEN** the check fails and names that image and its file

#### Scenario: A clean build passes

- **WHEN** the check runs on a build with no forbidden file and both sizes within their limits
- **THEN** it prints the first-visit and total sizes against their limits and exits zero

### Requirement: Versioned public files

Every file the game requests from its public folder SHALL be requested with
the build's id as a version, for example `models/soldier.glb?v=<build id>`.
This covers models, textures, audio, music, video and map previews. Two
builds of different sources SHALL have different ids. Hashed script and
style chunks SHALL keep their own hashed names. The development server MAY
use a fixed id.

#### Scenario: A new release fetches new models

- **WHEN** a visitor who played the previous release opens the new one
- **THEN** the game requests the public files with the new build id, so no model, sound or texture comes from the old release's cache

### Requirement: Slow-network end-to-end test

The end-to-end suite SHALL include a test that serves the built game under
throttled bandwidth and latency. The throttling SHALL be in the order of a
slow broadband connection, recorded in the test.

The test SHALL check, in order:

1. the opening splash shows before the desk;
2. the desk becomes ready;
3. a battle start shows the battle loading screen with progress that rises
   to all files;
4. the battle opens in deployment with no console error.

#### Scenario: The game loads on a slow connection

- **WHEN** the slow-network test runs
- **THEN** it sees the splash, the desk, the battle loading screen with rising progress, and the battle in deployment, with no console error

### Requirement: Owner-gated release path

The repository SHALL document, in PT-BR, the path from the working branch
to the published game:

1. the GameStudio42 repository named by the owner;
2. adding the remote;
3. bringing `main` up to the release commit;
4. the passing local gate;
5. the push;
6. turning on GitHub Pages in the repository's settings;
7. the checks on the published URL: the splash, a skirmish and the first
   campaign chapter.

No remote SHALL be added, no branch pushed and nothing deployed unless the
owner has given the word for that step.

#### Scenario: The release path is followed

- **WHEN** the owner names the repository and gives the word to publish
- **THEN** the documented steps take the release commit to `main`, the push runs the existing CI, and Pages serves the game at the repository's URL
