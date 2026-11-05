## ADDED Requirements

### Requirement: Slots keep a soldier's room

Cover slots offered by overlapping covers (a trench bay and its parapet, a
wall and the trench behind it) SHALL be merged so that no two free slots lie
closer than 1.2 m. A soldier of an ordered section who gets no cover slot
SHALL take a place of his own in the section's formation, never a point
another soldier of the section was given.

#### Scenario: Trench bay and parapet
- **WHEN** a section of 11 defends a line of four trench bays with sandbag parapets
- **THEN** no two of its soldiers stand closer than 1.2 m

#### Scenario: More soldiers than slots
- **WHEN** a section of 11 defends a cover with 8 slots
- **THEN** the 3 without a slot each stand at a different place, at least 1.2 m apart
