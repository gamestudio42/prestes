## ADDED Requirements

### Requirement: Cover and morale status

The selected section's orders panel SHALL show effective cover, suppression and
the current morale state, using localized labels. The values SHALL come from the
frame and SHALL update as combat changes them.

#### Scenario: Suppressed state is visible

- **WHEN** a section's suppression crosses the threshold
- **THEN** the panel shows the suppressed state

#### Scenario: Routed state is visible

- **WHEN** a unit becomes routed
- **THEN** it is no longer counted as alive and the panel can show the routed state

#### Scenario: Values update

- **WHEN** cover or suppression changes
- **THEN** the panel values update without a reload
