## Why

The current boot camp is a five-chapter tutorial with a paused Contact chapter. The
reference is a ten-mission training campaign: an illustrated camp map, numbered
training areas, mission briefings, progression, a legend and dynamic-event
reminders. The first two missions should replace the old ground/field chapters and
keep testing camera, selection, movement, cover and stance mechanics while the
remaining eight are prepared.

## What Changes

- Replace the boot-camp entry with a **Campanha de Treinamento** overview:
  original low-poly sepia camp map, ten numbered areas and paths, legend, mission
  list, briefing, estimated time, reward and dynamic-event reminders.
- Define all ten missions in content:
  1. Bem-vindo, comandante
  2. Movimentação e cobertura
  3. Combate básico
  4. Equipamentos especiais
  5. Flanqueamento e coordenação
  6. Logística e suprimentos
  7. Resgate e primeiros socorros
  8. Defesa de posição
  9. Combate urbano
  10. Objetivo tático final
- Implement **missions 1 and 2** end to end. Missions 3-10 show full briefings and
  objectives but remain locked until their mechanics land.
- Build a new low-poly **campo de treinamento** field for areas 1-2, with original
  camp props (tents, sheds, fences, roads, training yard and cover) around the
  existing deterministic cover volumes. No target boards in missions 1-2.
- Add campaign persistence and unlocking in `prestes.training.v1`: resume, replay,
  completed/unlocked state, and a clear reset.
- Retire the current boot-camp entry; port its existing orders/casualty/
  graduation content into later mission data. Sandbox remains available for
  testing every implemented mechanic in the meantime.
- Reuse the HUD, visual tokens and shot audio from
  `refine-command-hud-visual-audio`.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `boot-camp`: becomes the ten-mission training campaign with an overview map,
  mission catalog, persistence/unlock, and playable missions 1-2 on the new field.
  The old six-chapter entry and paused Contact flow are retired.
- `presentation`: adds the campaign overview screen and mission briefing surface
  using the shared command-HUD visual language.

## Impact

- New training campaign content schema and ten mission definitions.
- New campaign overview React/SVG screen and mission briefing.
- New training-field scene/props for areas 1-2; deterministic world/covers remain
  simulation-owned.
- New mission director/state machine, replacing the boot-camp director while
  preserving command-boundary behavior.
- Start screen, boot-camp tests and localStorage change; save migration from
  `prestes.bootcamp.v1` is documented and reset-safe.
- No new combat simulation in missions 1-2; no target dummies there.

## Scope split

This change covers the campaign framework and missions 1-2. Missions 3-10 are
data/briefing placeholders only; equipment, logistics, urban combat and final
objective mechanics are future changes.
