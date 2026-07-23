## 1. Seed Data Model

- [x] 1.1 Add typed seed-definition interfaces and a built-in dataset covering multiple workflow
      lists, card types, descriptions, due-date offsets, labels, task lists, task completion states, and
      comments.
- [x] 1.2 Add deterministic helpers for resource positions and ISO due dates based on one injected
      seed-run clock value.

## 2. Board Seed Orchestration

- [x] 2.1 Resolve an optional explicit project ID or reuse/create the private default seed project,
      then reject an exact duplicate board name before board mutation.
- [x] 2.2 Create the board through the existing board operation, load its lists and labels, and
      validate all seed-definition references with missing-resource errors that include the board ID.
- [x] 2.3 Populate cards and their label associations, task lists, tasks, and comments through the
      existing operation modules while preserving declared order.
- [x] 2.4 Return a typed completion summary with project, board, and resource counts, and wrap
      population failures with the failed stage and partial board ID.

## 3. Command-Line Entry Point

- [x] 3.1 Add a self-contained seed CLI that parses optional `--project-id`, optional `--board-name`,
      and help output, rejects explicitly empty values, and prints safe success or failure output.
- [x] 3.2 Exclude seed sources from the production tool barrel and build, and add a separate ignored
      seed compilation config plus package command using the existing TypeScript compiler.

## 4. Automated Verification

- [x] 4.1 Add mocked unit tests for successful orchestration, exact duplicate-name rejection,
      default-resource validation, relative due dates, resource ordering, associations, and summary
      counts.
- [x] 4.2 Add CLI-focused tests for optional project selection, explicitly empty values, default and
      custom board names, success output, non-zero failures, and safe error context.
- [x] 4.3 Run formatting, type checking, build, and unit tests with `npm run qc`, and resolve any
      regressions.
- [x] 4.4 Add a regression test that ensures cards without due-date offsets omit the due-date
      parameter instead of sending a Planka-invalid null value.

## 5. Documentation

- [x] 5.1 Document prerequisites, command examples, the default board name, label/tag terminology,
      duplicate-name behavior, seeded content, and partial-failure cleanup guidance in the README.
