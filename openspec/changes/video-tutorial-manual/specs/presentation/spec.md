## MODIFIED Requirements

### Requirement: Training ground models

The environment's buildings, fortifications and props SHALL be drawn with the
modelled assets placed from shared map data: on the Vila Militar field the
chapel, farmhouse, barn, sandbag and trench sections, stone and low walls,
barrels, crates and trees; on the battle maps the models that exist, the
rest as named placeholders. Cover models SHALL follow each cover's footprint
and rotation, so what the player sees matches the simulation's cover and
slots.

#### Scenario: Cover matches its footprint

- **WHEN** a trench cover of 14 m is drawn
- **THEN** its model spans the same 14 m and its slots sit inside it as before
