## MODIFIED Requirements

### Requirement: Uniforms by army and rank

Each army SHALL have a uniform set: rank and file and officer textures, and
any type the army's catalog marks as dressed differently. A uniform SHALL be
drawn pixel texture (cloth, belts and bandoliers, leg wear, headgear, face),
not flat colour regions, and each set SHALL have at least six variants
that differ in face, skin tone or wear. Each soldier SHALL also carry a
combination of optional gear pieces (at least neckerchief, blanket roll and
canteen) drawn as part of his model. His variant and his gear SHALL come
from his id alone, so they do not change during a battle or between
replays, and SHALL NOT change frames, orders, RNG or state hashes. Armies
SHALL be told apart by silhouette or headgear as well as by colour. A
wounded soldier's uniform SHALL show blood on the side of his wound.

The federal army and the state militias that wore its pattern SHALL be
drawn in khaki with the kepi, not olive (olive drab came with the 1933
uniform plan). The column SHALL be drawn in worn khaki mixed with civilian
jackets, with its red scarf. Cangaceiros and jagunços SHALL each have a
uniform set of their own: the cangaceiro in the leather half-moon hat with
its brim turned up front and back, leather leggings, leather sandals,
cartridge belts, coloured shoulder bags and a coloured neckerchief; the
jagunço in the sertão's leather (leather hat, leather jacket, leather
leggings).

Historical note: uniforms and gear follow `docs/history/FORCES.md` ("Dress
of the forces"); a detail without a source is listed as a placeholder in
`docs/assets.md`.

#### Scenario: Legalists in khaki
- **WHEN** a federal infantry section is drawn
- **THEN** its men wear khaki tunics and the kepi, and no olive

#### Scenario: Cangaceiros and jagunços by their leather
- **WHEN** a cangaceiro section and a jagunço section stand side by side, colour removed
- **THEN** the cangaceiros are told by the half-moon hat and the jagunços by the round leather hat

#### Scenario: Three armies at a glance
- **WHEN** one soldier of each army stands side by side at the tactical camera band
- **THEN** each is told from the others by headgear or silhouette, with colour removed

#### Scenario: A section is not copies
- **WHEN** a section of eleven riflemen is drawn
- **THEN** at least four uniform variants and at least three different gear combinations appear among them

#### Scenario: A soldier keeps his face
- **WHEN** the same battle is replayed
- **THEN** each soldier wears the same variant and the same gear as before

#### Scenario: Gear is presentation only
- **WHEN** a seeded battle runs headless and in the browser
- **THEN** the state hashes match, whatever gear the soldiers wear

## ADDED Requirements

### Requirement: Weapon models

Each weapon kind SHALL have a modelled weapon on the soldier, not a stand-in:
the Mauser bolt-action rifle; a lever-action carbine, shorter, with its lever
and tube magazine; a revolver in the right hand; an automatic rifle with a
bipod under the muzzle; and a water-cooled machine gun on a three-legged
tripod. A soldier SHALL show exactly the weapon his catalog entry names, and a
man with a revolver SHALL carry no long arm. The machine gun SHALL stand on
the ground before its gunner while it is set and SHALL be hidden while it is
carried, as today. Weapons SHALL be drawn at both camera bands.

Historical note: the sources name the column's Mausers as 7 mm and do not
name the models of its automatic rifles, machine guns, Winchesters or
revolvers (Macaulay pp. 54, 113, 152; `docs/history/FORCES.md`), so those
four are generic period types, listed as such in `docs/assets.md`.

#### Scenario: Each kind shows its own weapon
- **WHEN** one soldier of each weapon kind stands at the tactical band
- **THEN** each shows its own weapon model and no other

#### Scenario: Revolver alone
- **WHEN** an officer armed with a revolver is drawn
- **THEN** the revolver is in his right hand and no rifle is shown

#### Scenario: The gun on its tripod
- **WHEN** a machine-gun crew sets its gun
- **THEN** the gun on its tripod stands before the gunner, and it is hidden again when the crew moves

### Requirement: Hands stay on the weapon

Whenever a soldier holds his rifle in both hands (at the ready, in the aim,
firing, running at the port, crouch-walking, prone, raising and lowering
it), each hand SHALL sit on its own point of the rifle, the right on the
wrist of the stock and the left under the forend, within 2 cm on every
frame of the clip, including the frames between keys. While he reloads the
right hand SHALL be on the bolt. In the aim the butt SHALL be at the
shoulder with the sights near eye level, the body turned side-on to the
target. The art build SHALL fail when a held hand is more than 2 cm from
its point.

#### Scenario: The aim holds together
- **WHEN** a standing soldier plays the aim and fire clips
- **THEN** both hands are within 2 cm of their points on the rifle on every frame

#### Scenario: A raise does not drop the rifle
- **WHEN** a soldier raises his rifle from the ready into the aim
- **THEN** on every frame in between both hands stay on the rifle

#### Scenario: Out of reach fails the build
- **WHEN** a pose puts a held hand's point out of the arm's reach
- **THEN** the art build fails and names the clip and the hand

### Requirement: Soldier model detail

The soldier model SHALL have between 1,500 and 3,000 triangles in its near
mesh and SHALL show period gear in its outline: a hat or kepi with a brim,
leg wrappings, cartridge belts, a haversack and a rifle. Elbows, knees, hips
and neck SHALL bend without the parts visibly separating or passing through
each other. The model SHALL also carry a far mesh of at most 600 triangles
with the same outline, headgear and colours. All three armies SHALL use the
same model and rig.

#### Scenario: Triangle counts
- **WHEN** the art build exports the soldier
- **THEN** the near mesh has 1,500 to 3,000 triangles and the far mesh at most 600, and the build fails otherwise

#### Scenario: A kneel holds together
- **WHEN** a soldier plays the crouch and kneel clips
- **THEN** the contact sheet shows no gap at the knee, hip or elbow

#### Scenario: The far mesh keeps the army
- **WHEN** one soldier of each army is drawn with the far mesh, colour removed
- **THEN** each is still told apart by headgear or silhouette

### Requirement: Near and far soldiers

At the tactical camera band the view SHALL draw a soldier with the near mesh
when he is within a fixed distance of the camera's focus and with the far
mesh beyond it; at the strategic band soldiers SHALL keep the instanced
markers they are drawn with today. A soldier SHALL keep his clip, pose,
variant, gear and wound marks when he changes mesh, and the change SHALL NOT
be seen as a jump in his position or pose.

#### Scenario: Far from the focus
- **WHEN** a soldier at the tactical band stands beyond the far distance from the camera's focus
- **THEN** he is drawn with the far mesh, his gear hidden, and keeps the clip he was playing

#### Scenario: Back near the focus
- **WHEN** the camera's focus moves back to him
- **THEN** he is drawn with the near mesh again, in the same pose, with his gear

### Requirement: Clips carry weight

The locomotion, aim, kneel and death clips SHALL show weight: the hips SHALL
rise and fall and shift over the planted foot in walk and run; the head and
rifle SHALL settle after the body stops (follow-through) instead of stopping
on the same frame; a kneel SHALL load onto the front leg; a fall SHALL drop
the body to the ground under its weight rather than tipping as one rigid
piece. Every clip the view asks for SHALL keep its name, and the existing
rules on blends, foot sliding, crouch height and prone height SHALL still
hold.

#### Scenario: The walk shifts weight
- **WHEN** a soldier walks on flat ground
- **THEN** his hips move sideways over each planted foot and up and down within each step

#### Scenario: A halt settles
- **WHEN** a running soldier halts at the ready
- **THEN** his head and rifle keep moving after his feet stop and come to rest within 0.5 s

#### Scenario: No clip goes missing
- **WHEN** the art build exports the new model
- **THEN** every clip the view asks for is present by name, and the build fails otherwise

### Requirement: Animation cost follows view

A soldier outside the camera's view SHALL NOT have his animation advanced
until he is in view again, and a soldier drawn with the far mesh SHALL have
his animation advanced at no more than half the frame rate. When a soldier
comes back into view he SHALL show the clip and pose he would have reached,
not resume from where he left. All of it SHALL be presentation-only and
SHALL NOT change frames, orders, RNG or state hashes.

#### Scenario: Out of view, not animated
- **WHEN** a section is outside the camera's view
- **THEN** none of its soldiers' animations is advanced on that frame

#### Scenario: Back in view in the right pose
- **WHEN** a soldier who was out of view and went prone comes back into view
- **THEN** he is drawn prone, not standing

#### Scenario: Frame time holds
- **WHEN** the frame-time probe draws a full section at the tactical span with the new model
- **THEN** the mean frame time stays within its budget
