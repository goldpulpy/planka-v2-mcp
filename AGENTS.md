# Repository Guidelines

## Project Structure & Module Organization

This repository implements a TypeScript ESM MCP server for Planka v2.x. `index.ts` is the executable entry point and registers MCP tools. Resource-level HTTP operations live in `operations/` (for example, `cards.ts` and `taskLists.ts`), while higher-level composed behaviors live in `tools/`. Keep shared types, request setup, error handling, and utilities in `common/`. Jest tests and reusable fixtures belong in `tests/`; generated JavaScript is written to `dist/` and must not be edited directly. OpenSpec change artifacts live under `openspec/`.

## Build, Test, and Development Commands

- `npm ci`: install the lockfile-pinned dependencies; Node.js 18 or newer is required.
- `npm run build`: compile TypeScript into `dist/` and make the entry point executable.
- `npm run watch`: recompile continuously during development.
- `npm test`: run unit tests, excluding the live integration suite.
- `npm run test:integration`: exercise a configured Planka v2 instance.
- `npm run inspector`: launch the MCP Inspector against the built server.
- `npm run qc`: run type checking, linting, build, and unit tests; use this before submitting changes.

## Coding Style & Naming Conventions

TypeScript is strict and uses NodeNext module resolution. Include `.js` extensions in relative imports, even in `.ts` files. Biome enforces two-space indentation, double quotes, semicolons, trailing commas, LF endings, and a 100-character line width. Run `npm run lint:fix` and `npm run format:fix` for automated cleanup. Use `camelCase` for functions and variables, `PascalCase` for types, and descriptive resource-based filenames consistent with existing modules.

## Testing Guidelines

Tests use Jest with `ts-jest` in ESM mode. Name files `tests/*.test.ts`, reuse `tests/fixtures.ts`, and isolate API behavior with `jest.unstable_mockModule` where practical. Add regression tests for behavior changes. Run `npm run test:coverage` when assessing coverage; no fixed percentage threshold is configured. Integration tests require a live Planka instance and valid local `PLANKA_*` settings.

## Commit & Pull Request Guidelines

Write short, imperative commit subjects. Prefer the established Conventional Commit prefixes, such as `feat:`, `fix:`, `docs:`, `ci:`, `refactor:`, and `chore:`. Keep pull requests focused; include a concise description, a linked issue when applicable, tests added or updated, and the `npm run qc` result. Report integration-test results for changes to Planka API calls, and include screenshots only for documentation or Inspector-visible changes where they clarify behavior.

## Security & Configuration

Copy `.env.example` for local configuration, but never commit credentials. Use a dedicated Planka agent account. Enable `PLANKA_IGNORE_SSL` only for trusted local or self-signed environments.
