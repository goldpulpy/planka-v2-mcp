# Security Policy

## Supported Versions

Security fixes are handled for the current published major version of `@goldpulpy/planka-v2-mcp`.

| Version | Supported |
| ------- | --------- |
| 1.x     | Yes       |

## Reporting a Vulnerability

Do not open a public issue for suspected vulnerabilities. Report security concerns privately through GitHub Security Advisories for this repository, or contact the maintainer listed in `package.json`.

Please include:

- A clear description of the issue and impact.
- Steps to reproduce or a minimal proof of concept.
- Affected versions or commit SHAs, if known.
- Any relevant Planka, Node.js, or MCP client configuration details.

You can expect an initial response as soon as practical. Confirmed vulnerabilities will be fixed in a private branch, released to npm, and then disclosed with appropriate credit unless you request otherwise.

## Credential Handling

This package uses `PLANKA_*` environment variables to connect to Planka. Never commit real Planka credentials, tokens, or production URLs. Set `PLANKA_IGNORE_SSL=true` only for trusted local or self-signed environments.
