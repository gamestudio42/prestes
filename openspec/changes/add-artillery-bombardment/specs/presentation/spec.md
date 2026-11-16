## ADDED Requirements

### Requirement: Shell bursts

On a `shell_impact` event the scene SHALL show at the landing point a brief
flash, a column of dust and dark smoke rising and drifting, and debris
thrown outward, tinted by the ground there (earth, sand, stone, grass).
A crater the simulation leaves SHALL be drawn as a dark, low ring on the
ground for the rest of the battle. The camera SHALL shake for a fraction of
a second, strongly for a burst within about 20 m of its focus, fading to
nothing at about 120 m; the shake SHALL never move the camera's resting
position. Bursts SHALL respect fog of war as shots do: a burst out of the
player's sight is still shown and heard (the guns are not hidden by fog),
but men it hits there are not revealed.

#### Scenario: Close burst
- **WHEN** a shell lands 10 m from the camera's focus
- **THEN** the flash, dust, smoke and debris show, and the view shakes briefly then settles where it was

#### Scenario: Far burst
- **WHEN** a shell lands 200 m from the camera's focus
- **THEN** the burst shows and the view does not shake

#### Scenario: Crater stays
- **WHEN** a shell leaves a crater
- **THEN** the crater mark stays on the ground until the battle ends
