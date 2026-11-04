## ADDED Requirements

### Requirement: Blender art pipeline

In-game models SHALL be built by Blender Python scripts in `art-src/`, saved as
editable `.blend` sources and exported to glTF; `pnpm art` SHALL rebuild them
and `pnpm models` SHALL prune and deduplicate the exports into the game. The
exported models and textures SHALL be committed so building and testing do not
need Blender. All models and textures SHALL be original and recorded in the
asset register.

#### Scenario: Rebuild from source

- **WHEN** `pnpm art` runs with Blender installed
- **THEN** the `.blend` sources and glTF exports are regenerated and `pnpm
  models` writes them to `apps/game/public/models/`

#### Scenario: Build without Blender

- **WHEN** the game is built on a machine without Blender
- **THEN** it uses the committed models and textures

### Requirement: Pixel-textured low-poly world

Models SHALL use small pixel-art textures (32 to 64 px per surface) in the
sepia palette with nearest filtering and no mipmaps, over the existing toon
shading and pixel post, so the world matches the pixel interface.

#### Scenario: Crisp texels

- **WHEN** a building is seen at tactical span
- **THEN** its texture shows hard-edged texels in palette colours, not blurred
  gradients

### Requirement: Training ground models

The training ground's buildings, fortifications and props SHALL be drawn with
the modelled assets placed from the shared training-ground data: barracks,
chapel, farmhouse, barn, aid tent, flagpole, target frames and butts, trench
sections with sandbag parapets, stone and low walls, crates, barrels, trees,
hedges and fences. Cover models SHALL follow each cover's footprint and
rotation, so what the player sees matches the simulation's cover and slots.

#### Scenario: Cover matches its footprint

- **WHEN** a trench cover of 14 m is drawn
- **THEN** its model spans the same 14 m and its slots sit inside it as before

## MODIFIED Requirements

### Requirement: Character part rig

The tactical-span character SHALL be the Blender-built soldier: one 1.75 m
model with an armature (hips, spine, chest, head, arms, legs and a rifle bone)
and the Mauser as part of the model. Outfits SHALL distinguish the column, the
legalists and the officer through the shared texture atlas. The model SHALL
keep the 1.75 m proportions and the existing strategic-scale readability, and
the selection ring and shadow SHALL stay separate ground marks.

#### Scenario: Parts are visible

- **WHEN** a character is rendered at tactical span
- **THEN** body, head, hat, legs, arms and rifle are present in the model

#### Scenario: Scale stays readable

- **WHEN** the camera zooms to strategic span
- **THEN** the character scales up with the existing unit-scale rule

#### Scenario: Factions are told apart

- **WHEN** a column soldier and a legalist stand side by side
- **THEN** their outfits differ in colour and headgear

### Requirement: Procedural movement

A moving character SHALL play the walk clip (or crouch-walk or crawl for its
stance) at a rate proportional to its ground speed, and a stationary character
SHALL play the idle clip of its stance, cross-fading over about 0.15 s.

#### Scenario: Walking cycle

- **WHEN** a unit moves across the ground
- **THEN** its legs and arms alternate and the body bobs slightly

#### Scenario: Idle

- **WHEN** a unit is stationary
- **THEN** its limbs return toward the idle pose

### Requirement: Crouched and prone poses

The character SHALL visibly crouch and lie down when the unit stance changes,
through the crouch and prone clips. The selection ring and shadow SHALL stay on
the ground and SHALL NOT rotate with the body.

#### Scenario: Crouch

- **WHEN** a unit enters crouched stance
- **THEN** its body lowers, its legs bend and its head drops below the standing height

#### Scenario: Prone

- **WHEN** a unit enters prone stance
- **THEN** its body lies near the ground while the ring and shadow remain flat

#### Scenario: Return to standing

- **WHEN** a unit returns to standing
- **THEN** the body rises back to the standing pose

### Requirement: Combat feedback

The view SHALL show each shot with a muzzle flash and smoke at the shooter, a
short tracer and an impact effect where it lands (dust on ground, splinters or
dust on cover), and SHALL show moving soldiers raising footstep dust and
suppressed soldiers with dirt spurts around them. Dead characters SHALL lie on
the ground in the corpse pose without a selection ring.

#### Scenario: Shot tracer

- **WHEN** a shot event is received
- **THEN** a short-lived line appears from the shooter to the target

#### Scenario: Muzzle and impact

- **WHEN** a shot event is received
- **THEN** a muzzle flash appears at the shooter and an impact effect at the
  target's position, matching what it hit

#### Scenario: Dead unit

- **WHEN** a unit dies
- **THEN** its body lies down and its selection ring is hidden
