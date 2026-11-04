## MODIFIED Requirements

### Requirement: Cover-first preview

The preview SHALL show the same cover slots the simulation will assign,
including soldiers entering cover before reaching the formation's ideal slot, and
SHALL mark which slots are free. Defend previews SHALL clamp every destination to
the same 8 m region as the simulation.

#### Scenario: Cover available

- **WHEN** free reachable cover slots are available near the pending destination
- **THEN** the preview path of each soldier ends at its slot and the cone faces
  the threat side

#### Scenario: No cover available

- **WHEN** no free reachable cover slot exists
- **THEN** the preview falls back to the formation slot

#### Scenario: Defend stays inside the region

- **WHEN** a defend order is previewed near the region edge
- **THEN** every previewed destination stays within 8 m of the picked point
