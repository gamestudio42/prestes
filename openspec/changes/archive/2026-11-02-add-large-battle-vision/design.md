## Context

The field is 240 m but the rifle was 26 m, while the preview cone was 7 m. Idle units kept their last facing and often missed targets outside the cone. Large battles exposed O(n^2/3) target scans and excessive character draw calls.

## Decisions

- Mauser range is 120 m for training and battle scenarios.
- Every unit uses a 65-degree cone, 120 m awareness and LOS.
- Idle/hold units rotate gradually toward the nearest threat at a capped turn rate; acquisition still requires cone + range + LOS.
- Vision is rendered as line outlines. Selected units get full-range cones and target lines; other units get a short direction marker.
- Large character counts use instanced proxy bodies/heads/rings at strategic span; detailed rigs remain for close zoom.
- Target engagement counts are precomputed per tick instead of scanning all allies inside each candidate loop.
- 3v3 uses 66 units, six squads of 11, with BOOTCAMP_COVERS as the obstacle set.

## Risks

- Headless Chromium measured ~41 FPS at 1440x900; real GPU performance must be confirmed on the user machine.
- The 120 m range makes deployment contact immediate; scenario placement must keep armies apart where needed.
- Vision cones at full range are visually dense; selected/other LOD is required.
