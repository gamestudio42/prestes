# soldier-art Specification

## Purpose
How a soldier is drawn: the clip he plays for each state the simulation
reports, how wounds and death are shown, and the uniform he wears by army
and rank.

## Requirements

### Requirement: Wounded soldiers are shown by their wound

The view SHALL show a soldier's wound from the frame: a lightly or
moderately wounded soldier SHALL limp while moving and hold his wound while
halted; an incapacitated soldier SHALL lie on the ground and move in place,
not stand still in a pose; a soldier being carried and the soldier carrying
him SHALL each play a carrying clip that keeps them together; a soldier
being treated SHALL lie while his rescuer kneels beside him. The same rules
SHALL apply to every army. All of it SHALL be presentation-only and SHALL
NOT change frames, orders, RNG or state hashes.

#### Scenario: A limp is seen
- **WHEN** a soldier with a moderate wound is ordered to move
- **THEN** he walks with the limp clip, slower as the simulation moves him, and not with the plain walk

#### Scenario: A man down moves
- **WHEN** a soldier is incapacitated and not yet reached
- **THEN** he lies and plays the lying-wounded clip, which loops

#### Scenario: A rescue is readable
- **WHEN** a rescuer carries a casualty to cover and treats him
- **THEN** the two play the carrying clips on the way and the kneeling and lying clips at the cover

### Requirement: Death by stance and direction

When a soldier dies the view SHALL play a death clip chosen by the stance he
was in (standing, crouched or prone) and by the side the shot came from
(front, back or flank), and SHALL leave him in one of at least four corpse
poses. The clip and the pose SHALL be chosen from the soldier's id and the
tick of his death alone, so replaying a battle draws the same field. A
corpse SHALL keep the rules already in force: muted uniform, a blood pool
and no selection ring.

#### Scenario: Shot from the front, standing
- **WHEN** a standing soldier is killed by a shot from his front
- **THEN** he falls backward and stays in a corpse pose on his back

#### Scenario: Prone soldiers do not stand up to die
- **WHEN** a prone soldier is killed
- **THEN** he plays the prone death clip and never rises above his prone height

#### Scenario: The same battle, the same field
- **WHEN** a battle is replayed with the same seed and commands
- **THEN** every corpse lies in the same pose as before

### Requirement: Crouched movement, aiming and reloading

A crouched soldier who moves SHALL play a crouch-walk with his body below
standing height and his rifle forward. In each stance a soldier SHALL raise
his rifle into the aim before his first shot at a target, show recoil on
each shot, and lower it after he has had no target for a moment. A soldier
reloading SHALL play a reload clip of his stance. A soldier turning his aim
SHALL turn his body, not slide.

#### Scenario: Crouch-walk stays low
- **WHEN** a crouched soldier walks behind a low wall
- **THEN** his head stays below standing height for the whole clip

#### Scenario: Aim is raised, not snapped
- **WHEN** a standing soldier at the ready acquires a target
- **THEN** the raise into the aim is drawn before the first shot's recoil

#### Scenario: Reload in cover
- **WHEN** a prone soldier's magazine is empty and he reloads
- **THEN** he plays the prone reload clip and stays prone

### Requirement: Clips blend and feet hold

A change of clip SHALL cross-fade over a fixed short time (0.1 to 0.25 s),
except a death, which starts at once. At the simulation's walk and run
speeds a moving soldier's planted foot SHALL NOT slide more than 5 cm over
the ground during a step.

#### Scenario: Walk to aim
- **WHEN** a walking soldier halts and aims
- **THEN** no frame shows him in a pose that belongs to neither clip, and the change takes at most 0.25 s

#### Scenario: Feet at a walk
- **WHEN** a soldier walks at the simulation's walk speed on flat ground
- **THEN** the planted foot moves less than 5 cm before it lifts

### Requirement: Uniforms by army and rank

Each army SHALL have a uniform set: rank and file and officer textures, and
any type the army's catalog marks as dressed differently. A uniform SHALL be
drawn pixel texture (cloth, belts and bandoliers, leg wear, headgear, face),
not flat colour regions, and each set SHALL have at least three variants
that differ in face, skin tone or wear; a soldier's variant SHALL come from
his id, so it does not change during a battle or between replays. Armies
SHALL be told apart by silhouette or headgear as well as by colour. A
wounded soldier's uniform SHALL show blood on the side of his wound.

Historical note: uniforms follow `docs/history/FORCES.md`; a detail without
a source is listed as a placeholder in `docs/assets.md`.

#### Scenario: Three armies at a glance
- **WHEN** one soldier of each army stands side by side at the tactical camera band
- **THEN** each is told from the others by headgear or silhouette, with colour removed

#### Scenario: A section is not copies
- **WHEN** a section of eleven riflemen is drawn
- **THEN** at least three uniform variants appear among them

#### Scenario: A soldier keeps his face
- **WHEN** the same battle is replayed
- **THEN** each soldier wears the same variant as before

### Requirement: Art review sheet

The art build SHALL render a contact sheet with every soldier clip at its
key frames and every uniform variant, and the asset register SHALL list the
soldier model, its clips and its textures with their licence.

#### Scenario: Sheet after a build
- **WHEN** the art build runs for the soldier
- **THEN** the sheet shows each clip named and each uniform variant, and the build fails if a clip the view asks for is missing from the model
