## Why

Developers and evaluators currently have to build a representative Planka board by hand before
they can exercise the MCP server. A repeatable seed command will make local demos, integration
testing, and exploratory development faster and more consistent.

## What Changes

- Add a development-only command-line seed script that creates a named board in an optionally
  selected existing project, or reuses/creates a dedicated default seed project.
- Populate the board with representative workflow lists, labels, cards, due dates, task lists,
  tasks, and comments using the repository's existing Planka operations.
- Associate labels with selected cards so the seeded board demonstrates priorities, work types,
  and workflow metadata.
- Validate required configuration and command inputs, report created resource identifiers, and
  fail with actionable errors when seeding cannot complete.
- Add an npm command and documentation for running the seed against a configured Planka instance.
- Add automated tests for seed data orchestration without requiring a live Planka server.

## Capabilities

### New Capabilities

- `board-seeding`: Create and populate a representative Planka board through a repeatable local
  command.

### Modified Capabilities

None.

## Impact

- Adds a source-controlled seed entry point and seed-data definition that are excluded from the
  production TypeScript build and package output.
- Updates `package.json` and user-facing documentation with the seed command and its inputs.
- Reuses the existing board, list, label, card, task-list, task, comment, and card-label operations;
  it does not add or change MCP tools or Planka API contracts.
- Requires access to a running Planka v2 instance, the existing `PLANKA_*` authentication settings,
  and the identifier of an existing target project.
