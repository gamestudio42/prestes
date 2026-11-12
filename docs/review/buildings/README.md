# Buildings review (revise-buildings-and-stone 1.2)

`sheet-before.png` shows every catalog building as the battle draws it on
2026-11-12, from the front and the back, at the tactical camera band. The
single pictures are in `before/`. They are rendered by
`tests/e2e/review-buildings.spec.ts` on a throwaway map:

    PRESTES_REVIEW=1 npx playwright test tests/e2e/review-buildings.spec.ts

The same test with `PRESTES_REVIEW_OUT=docs/review/buildings/after` makes
the "after" pictures once the models are in.

Only the farmhouse, the barn and the chapel are models today; the other
fourteen are boxes drawn in code. Doors, windows, upper floors and the
church tower are battle data (`packages/shared/src/maps/openings.ts`) and
do not move; the model is fitted to them.

## Features each building gains (approved by the owner, 2026-11-12)

All of the 1920s interior of Brazil. "Upper" is the battle's upper floor or
loft, which the model must show.

| # | Building | Today | Suggested features |
| --- | --- | --- | --- |
| 1 | farmhouse (casa de sítio) | model | tiled hip roof, a small front alpendre, wooden shutters, whitewash worn over a plinth |
| 2 | barn (paiol) | model | raised on stone piles, board walls, a wide door, a loft hatch |
| 3 | chapel (capela) | model | a bell gable with a cross, whitewash with coloured trim |
| 4 | casa-sede | box; loft | four-water tiled roof, a full-width veranda on posts, loft vents, front steps |
| 5 | colonist-house (casa de colono) | box | wattle and daub, two-water roof of tile or zinc, a lean-to kitchen with a chimney |
| 6 | engenho | box; loft | an open-sided mill shed, a tall brick chimney, the cane-press side |
| 7 | ferry-house (casa da balsa) | box | on short stilts by the bank, a lean-to, a plank landing |
| 8 | terraced-house (casa geminada) | box | a platband façade with a cornice, a door and two windows, shared side walls |
| 9 | terraced-house-wide | box | the same, three windows and plaster mouldings |
| 10 | sobrado | box; storey | two floors, an iron balcony upstairs, a cornice, shop doors below |
| 11 | casa-terrea (casa térrea) | box | hip roof with eaves, framed windows, wall colour variants |
| 12 | venda | box | wide double doors, a porch roof, a painted sign board |
| 13 | armazem (armazém) | box | tall double doors, a loading platform, zinc roof |
| 14 | coreto | box | an octagonal bandstand on a plinth, a railing, a pointed roof |
| 15 | church (igreja matriz) | box; tower | the bell tower, a pediment façade, front steps, tall side windows |
| 16 | factory (fábrica) | box; storey | brick walls, a row of gable roofs, a tall chimney, the upper floor's windows |
| 17 | warehouse (galpão) | box; storey | zinc gable roof, sliding doors, a rail-side platform |
