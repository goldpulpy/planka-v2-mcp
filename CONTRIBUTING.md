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

After creating an account for the MCP server, log in to the Planka web interface with
that account and accept the terms of service. This first-login step is required for every
new account, including accounts created on the Planka demo.

### Local Planka instance

With Docker and Docker Compose installed, run the bundled development Planka instance
at `http://localhost:3000`:

```bash
npm run planka:up
```

For local use, set `PLANKA_BASE_URL=http://localhost:3000`,
`PLANKA_AGENT_EMAIL=admin@example.com`, and `PLANKA_AGENT_PASSWORD=admin` in `.env`.
Stop the containers while preserving their data with `npm run planka:down`. To stop
the containers and delete the Planka and PostgreSQL volumes, run
`npm run planka:clear`.

## Quality Checks

Run the full check suite before opening a pull request:

```bash
npm run qc
```

This runs type checking, Biome linting, build, and Jest tests. For targeted work, use `npm run typecheck`, `npm run lint`, `npm run format`, or `npm test`.

## Integration Tests

`npm run test:integration` requires a running Planka v2 instance.

1. Start the bundled local instance with `npm run planka:up`, or point to an existing
   test instance.
2. Set the corresponding `PLANKA_*` variables in `.env` (see `.env.example`).
3. Run `npm run test:integration`.

Skip this step for documentation-only or unit-test-only changes — unit tests
(`npm test`) do not require a live Planka instance.

## Project Layout

- `index.ts`: MCP server entry point and tool registration.
- `operations/`: Planka API operations grouped by resource.
- `tools/`: composed MCP tool behavior.
- `common/`: shared setup, types, errors, and utilities.
- `tests/`: Jest tests using `*.test.ts` naming.

## Pull Requests

Keep pull requests focused. Include a short description, linked issue when
applicable, and the result of `npm run qc`. Run `npm run test:integration`
as well if your change touches Planka API calls. Add or update tests when
behavior changes. Documentation-only changes should still be checked for
accuracy against the current scripts and Planka v2 behavior.

## Commit Messages

Use short imperative commit messages. Conventional Commit prefixes used in this repository include `feat:`, `fix:`, `docs:`, `ci:`, and `chore:`.
