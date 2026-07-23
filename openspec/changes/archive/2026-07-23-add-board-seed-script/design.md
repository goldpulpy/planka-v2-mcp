## Context

The server already exposes typed operations for every resource needed to assemble a realistic
board. `createBoard` also creates the standard workflow lists and labels and adds the configured
agent as a board member. What is missing is a repeatable composition layer and a command-line
entry point that turns those operations into useful demo data.

The seed runs against a real Planka v2 instance and therefore depends on the same `PLANKA_*`
settings as the MCP server. Planka does not provide a transaction spanning all of these resource
types, so a failed run can leave the newly created board partially populated.

## Goals / Non-Goals

**Goals:**

- Create one predictably structured demo board inside an explicitly selected existing project.
- Exercise representative Planka v2 features: workflow columns, labels, card types, descriptions,
  due dates, task lists, tasks, comments, and label assignments.
- Keep orchestration testable without connecting to Planka.
- Give operators clear input validation, progress, completion output, and partial-failure context.
- Use the existing operation modules as the only Planka HTTP access layer.

**Non-Goals:**

- Creating projects, users, or memberships beyond the behavior already provided by `createBoard`.
- Adding an MCP tool or a general-purpose fixture import format.
- Making repeated runs update or reconcile an existing board.
- Providing transactional rollback across Planka resources.
- Seeding attachments, notifications, or arbitrary user-supplied fixture files.

## Decisions

### Keep the entire seed outside the production tool surface

Keep the typed dataset, orchestration, and CLI adapter together in `scripts/seed.ts`. Exclude
`scripts/` from the production `tsconfig.json`, do not export seed behavior from `tools/index.ts`,
and compile it only through `tsconfig.seed.json` into an ignored `.seed-dist/` directory when the
seed command runs. The CLI accepts an injected seed runner in tests so merging the layers does not
require process side effects or live API calls.

A reusable `tools/boardSeed.ts` module was considered, but it makes a development fixture appear
to be part of the MCP server's production tool surface and causes it to be shipped in `dist/`.

### Make the project identifier an optional override

The command accepts `--project-id <id>` and `--board-name <name>`, with both optional. An explicit
project ID is verified and used directly. Without one, the script searches the first 100 accessible
projects for the exact name `Demo Project`, reuses it when found, or creates it as a private project.
This makes `npm run seed` deterministic on a fresh Planka instance while preserving precise target
selection when needed. Authentication and server location continue to use `PLANKA_*` settings.

Selecting the first arbitrary project was considered, but adding demo data to an unrelated project
is surprising. Always creating a new project was also considered, but it would create duplicates on
reruns.

### Treat each invocation as creation, with a duplicate-name guard

Before mutation, the orchestrator verifies that the project is reachable and has no board whose
name exactly matches the requested name. If it does, the run exits with guidance to choose another
name. A successful invocation always creates a new board; it never mutates an existing one.

Reconciliation-based idempotency was considered, but matching and updating nested resources adds
substantial complexity and can overwrite a user's edits. A guard provides predictable behavior
while keeping reruns possible with another name.

### Define representative data in source control

Keep a typed, immutable seed definition alongside the orchestrator. It references lists and labels
by their stable names and uses explicit position increments so creation order is deterministic.
Due dates are calculated from a single injected clock at runtime, keeping the demo current while
allowing exact assertions in tests. The dataset spans multiple workflow states and includes cards
with multiple labels, task lists with completed and incomplete tasks, and comments.

Using a JSON fixture was considered, but it would require a second validation/loading path without
providing value for a single built-in dataset. The typed definition receives compiler checks and
can be imported directly by tests.

### Reuse and verify board defaults

After `createBoard`, fetch its lists and labels and build name-to-ID maps. The orchestrator validates
that every name referenced by the seed definition exists before creating cards. This reuses the
current standard board setup and prevents cards from being silently placed or tagged incorrectly.
The term "tags" in user-facing documentation maps to Planka labels.

Creating another set of lists and labels in the seeder was considered, but it would duplicate the
defaults created by `createBoard` and risk drift between two definitions.

### Surface partial failure rather than deleting remotely created data

Create resources sequentially where later resources depend on returned IDs. On failure, report the
failed stage and the new board ID when available, then exit non-zero. Do not automatically delete
the board: the user can inspect it, and cleanup itself could fail or obscure the original error.

Automatic rollback was considered, but Planka offers no cross-resource transaction and deleting
the whole board is a destructive recovery policy that should not be implicit.

### Expose an npm command built by the existing toolchain

Add `seed` to clean and compile only the seed program through `tsconfig.seed.json`, then run it with
dotenv preload. The production build cleans `dist/` and excludes `scripts/`, ensuring stale seed
artifacts cannot be published. Document environment setup, project resolution, defaults, duplicate
behavior, and partial-failure behavior in the README.

## Risks / Trade-offs

- [The default list or label set changes] → Validate all referenced names immediately after board
  creation and report the missing names and board ID.
- [A request fails midway through the run] → Stop immediately, return a non-zero exit status, and
  identify the partially populated board instead of pretending the run succeeded.
- [Two seed processes race with the same name] → The preflight guard reduces accidental duplicates
  but cannot make creation atomic; document that concurrent runs require distinct names.
- [Seed data drifts from supported operations] → Type the fixture, keep orchestration on public
  operation functions, and cover the full creation sequence with mocked unit tests.
- [Sequential requests make seeding slower] → Prefer correctness for dependent resources; only
  parallelize independent child creation if tests prove ordering and error reporting remain clear.
