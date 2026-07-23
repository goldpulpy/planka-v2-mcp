## ADDED Requirements

### Requirement: Seed command inputs

The system SHALL provide a documented board seed command that accepts optional non-empty project
identifier and board name overrides and uses documented defaults when they are omitted.

#### Scenario: Seed without arguments

- **WHEN** an operator runs the seed command with valid Planka configuration and no arguments
- **THEN** the system starts seeding the default board in a dedicated default seed project

#### Scenario: Seed with a custom board name

- **WHEN** an operator supplies a project identifier and a non-empty custom board name
- **THEN** the system uses that exact name for the new board

#### Scenario: Explicit project identifier

- **WHEN** an operator supplies a non-empty project identifier
- **THEN** the system verifies and uses that existing project instead of the default seed project

#### Scenario: Empty project identifier

- **WHEN** an operator supplies an empty project identifier value
- **THEN** the system exits non-zero with usage guidance before sending a mutation request

### Requirement: Default seed project

When no project identifier is provided, the system SHALL reuse an accessible project named
`Demo Project` or create it as a private project when it does not exist.

#### Scenario: Default seed project exists

- **WHEN** no project identifier is provided and an accessible project named `Demo Project` exists
- **THEN** the system creates the seeded board in that project without creating another project

#### Scenario: Default seed project does not exist

- **WHEN** no project identifier is provided and no accessible project named `Demo Project` exists
- **THEN** the system creates a private `Demo Project` and creates the seeded board in it

### Requirement: Development-only packaging

The seed implementation SHALL remain outside the MCP tool exports, normal production TypeScript
build output, and published package files.

#### Scenario: Production build

- **WHEN** an operator runs the normal build command
- **THEN** the production output contains no seed entry point or board-seed tool module

#### Scenario: Seed command

- **WHEN** an operator runs the seed command
- **THEN** the system compiles the development seed entry point separately and executes it

### Requirement: Existing-board protection

The system SHALL refuse to seed when the target project already contains a board whose name exactly
matches the requested board name.

#### Scenario: Board name is already present

- **WHEN** the target project contains a board with the requested board name
- **THEN** the system exits non-zero without creating or modifying a board and tells the operator to choose another name

#### Scenario: Board name is available

- **WHEN** the target project is reachable and does not contain an exact board-name match
- **THEN** the system creates a new board in that project

### Requirement: Representative board population

The system SHALL populate the new board from a built-in, source-controlled seed definition that
includes cards across multiple workflow lists, card descriptions, card types, relative due dates,
task lists, completed and incomplete tasks, and comments.

#### Scenario: Complete seed population

- **WHEN** the board and all required default resources are created successfully
- **THEN** the system creates every card and nested resource declared by the built-in seed definition in its declared workflow list and order

#### Scenario: Relative due dates

- **WHEN** a seeded card declares a due-date offset
- **THEN** the system assigns an ISO-formatted due date calculated from one clock value captured for the seed run

#### Scenario: Card without a due date

- **WHEN** a seeded card does not declare a due-date offset
- **THEN** the system omits the due-date parameter from the card creation request

### Requirement: Seeded labels

The system SHALL use the board's Planka labels as tags and associate each seeded card with every
label named by that card in the seed definition.

#### Scenario: Assign multiple labels

- **WHEN** a seeded card references multiple labels and all referenced labels exist on the board
- **THEN** the system creates each corresponding card-label association

#### Scenario: Required default resource is missing

- **WHEN** a workflow list or label referenced by the seed definition is absent after board creation
- **THEN** the system stops before creating cards and reports every missing resource name and the new board identifier

### Requirement: Observable command outcome

The system SHALL produce a clear completion summary on success and actionable failure output with a
non-zero exit status on failure.

#### Scenario: Successful seed

- **WHEN** all declared seed resources are created successfully
- **THEN** the command exits successfully and reports the project identifier, board identifier, board name, and created resource counts

#### Scenario: Failure after board creation

- **WHEN** any population operation fails after the board has been created
- **THEN** the command exits non-zero, identifies the failed population stage and board identifier, and leaves the partial board available for inspection

#### Scenario: Connection or authentication failure

- **WHEN** the configured Planka instance cannot be reached or rejects authentication
- **THEN** the command exits non-zero and reports the underlying operation failure without exposing credentials
