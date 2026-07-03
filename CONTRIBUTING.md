# Contributing

Thanks for helping improve `@goldpulpy/planka-v2-mcp`. This project is a TypeScript MCP server for Planka v2.x, so changes should preserve compatibility with Planka v2 APIs and MCP clients.

## Development Setup

Use Node.js 18 or newer.

```bash
npm ci
npm run build
npm test
```

For local MCP inspection, build first and then run:

```bash
npm run inspector
```

Set the required `PLANKA_*` values in a local `.env` file. Use `.env.example` as the reference and never commit real credentials.

## Quality Checks

Run the full check suite before opening a pull request:

```bash
npm run qc
```

This runs type checking, Biome linting, build, and Jest tests. For targeted work, use `npm run typecheck`, `npm run lint`, `npm run format`, or `npm test`.

## Project Layout

- `index.ts`: MCP server entry point and tool registration.
- `operations/`: Planka API operations grouped by resource.
- `tools/`: composed MCP tool behavior.
- `common/`: shared setup, types, errors, and utilities.
- `tests/`: Jest tests using `*.test.ts` naming.

## Pull Requests

Keep pull requests focused. Include a short description, linked issue when applicable, and the result of `npm run qc`. Add or update tests when behavior changes. Documentation-only changes should still be checked for accuracy against the current scripts and Planka v2 behavior.

## Commit Messages

Use short imperative commit messages. Conventional Commit prefixes used in this repository include `feat:`, `fix:`, `docs:`, `ci:`, and `chore:`.
