## Why

After playing the Fazenda (2026-11-05) the user asked to enter buildings and
trenches and leave them: a section inside is drawn as a held position whose
defenders fire from it; it takes casualties but enjoys good cover; the way
to take it is to suppress it and assault it, a close-quarters fight shown
with strength bars, not man by man; and an exit order asks where to deploy.
Today buildings are solid blocks with cover slots at their walls; nobody can
use a house, an engenho or a church as a strongpoint, and the Bairro's
streets cannot be fought house by house.

## What Changes

- **Enterable positions**: buildings (by footprint, with a capacity and
  firing ports on their walls) and fortified works (each trench line as
  drawn with `refine-map-editor`'s trench tool, holding one man per 1.2 m of
  fire step with its slots as ports; communication trenches; the factory
  yard)
  are positions a section can occupy.
- **Ocupar (enter)**: an order on a position; the section walks to its
  entrances and goes in, up to the capacity; the rest stay in slots outside.
  Inside, soldiers are not drawn individually: the position shows a
  garrison marker (side colour, men count, a strength bar) and muzzle
  flashes at its ports when they fire.
- **Fire from inside**: each port has a facing arc; defenders are assigned
  to ports facing the threat and fire with good cover (building 0.6,
  trench 0.5 on top of stance); fire at the position hits a defender at a
  port facing the shooter; suppression applies to the whole garrison and
  lowers its fire.
- **Assaltar (close assault)**: an order for a section within 15 m of an
  entrance of an enemy-held position. It starts a close-quarters fight
  resolved over seconds: both sides lose men each second by a formula of
  numbers, suppression, morale, weapons (revolvers, automatic rifles and
  Winchesters favoured at close range) and a defender's bonus; the view
  shows two opposing bars over the position. The fight ends when one side
  has no fit man inside the fight; the attackers then hold the position, or
  the survivors of the assault fall back.
- **Elevated posts and roofs**: the matriz's tower, the sobrados' upper
  floors, the factory's and armazéns' upper windows and the lofts of the
  casa-sede and the engenho fire from height, over walls, hedges and crops;
  the factory and the station armazéns have flat roofs a section can stand
  on behind a low parapet, seeing far and seen in turn.
- **Sair (exit)**: an order that asks the player to click a deploy point
  within 30 m of the position; the garrison leaves by the nearest entrance
  and takes positions around that point.
- **The enemy commander** garrisons buildings and trench lines on its side
  and on objectives (when `add-map-objectives` exists), suppresses then
  assaults held positions, and leaves positions that are lost causes.
- **Fog of war**: an enemy garrison is known only when its position was
  seen occupied or fired from; the marker shows "?" strength until seen.
- Buttons, labels, tooltips and bars localized in PT-BR and EN.

## Capabilities

### New Capabilities

- `garrison`: enterable positions, entering and leaving, fire from inside,
  casualties and suppression of a garrison, close assault, the view's
  markers and bars, the commander's use of positions.

### Modified Capabilities

None at spec level beyond the new capability: orders and the HUD gain
entries that the new capability specifies.

## Impact

- `packages/shared` (position data per building model and fortification:
  capacity, entrances, ports; protocol: orders `enter`, `exit`, `assault`;
  frame: garrisons and assaults), `packages/simulation` (garrison state,
  port assignment, fire to and from positions, assault resolution,
  commander), `packages/view3d` (garrison markers, port flashes, assault
  bars, the exit placement preview), `apps/game` (three order buttons,
  exit deploy click, cards showing "Dentro: Venda"), `packages/content`
  (labels), tests, goldens, battle report.
- Depends on `add-battle-maps` (archived). Works with `add-map-objectives`
  (garrisoned men hold objectives) and `pre-battle-roster` (weapons'
  close-quarters factors); either may land first; the factors default to
  the Mauser's until weapons exist.
- **Player fantasy**: clearing a street house by house, holding the engenho
  under fire, the shout and scramble of a door rushed after suppression.
- **Core loop**: suppress the position, close in, assault, hold it, move on.
- **Historical scope**: game mechanics; no claim. Period fighting in towns
  and around farm buildings is a historical note for the codex only.
- **Multi-perspective**: unchanged.
- **Legal and ethical note**: close combat is shown as bars and casualties,
  not as gore; no civilians inside buildings.
- **MVP**: positions on all maps' buildings and trench lines, enter, exit
  with deploy, fire from inside, assault with bars, commander use, fog.
- **Non-goals**: interiors drawn room by room, multi-storey floors as
  separate positions, grenades, demolition, setting buildings on fire,
  civilians.
