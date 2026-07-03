# Planka v2.x MCP

**Give your LLM agent full control over your Planka v2.x kanban boards.**

<p align="center">
  <a href="https://www.npmjs.com/package/@goldpulpy/planka-v2-mcp"><img alt="npm version" src="https://img.shields.io/npm/v/%40goldpulpy%2Fplanka-v2-mcp"></a>
  <a href="https://www.npmjs.com/package/@goldpulpy/planka-v2-mcp"><img alt="npm downloads" src="https://img.shields.io/npm/dm/%40goldpulpy%2Fplanka-v2-mcp"></a>
  <a href="./LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/License-MIT-yellow.svg"></a>
  <a href="https://docs.planka.app"><img alt="Planka v2.x" src="https://img.shields.io/badge/Planka-v2.x-blueviolet"></a>
  <a href="https://modelcontextprotocol.io"><img alt="MCP" src="https://img.shields.io/badge/MCP-compatible-2ea44f"></a>
</p>

> [!IMPORTANT]
> Built specifically for **Planka v2.x**. This MCP is not compatible with Planka v1.x.

### Tools

| Tool Name                 | Actions                                                                                                                                                                                                               | Description                                              |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `project_board_manager`   | `get_projects` · `create_project` · `get_project` · `update_project` · `delete_project` · `get_boards` · `create_board` · `get_board` · `update_board` · `delete_board` · `get_board_summary` · `get_project_summary` | Projects and boards, including aggregate summaries       |
| `list_manager`            | `get_all` · `create` · `get_one` · `update` · `delete`                                                                                                                                                                | Kanban lists within a board                              |
| `card_manager`            | `get_all` · `create` · `get_one` · `update` · `move` · `duplicate` · `delete` · `create_with_tasks` · `get_details`                                                                                                   | Cards, including one-shot creation with a task checklist |
| `stopwatch`               | `start` · `stop` · `get` · `reset`                                                                                                                                                                                    | Time tracking on a card                                  |
| `label_manager`           | `get_all` · `create` · `update` · `delete` · `add_to_card` · `remove_from_card`                                                                                                                                       | Board labels and their assignment to cards               |
| `task_list_manager`       | `get_all` · `create` · `get_one` · `update` · `delete`                                                                                                                                                                | Task Lists inside a card (Planka v2.0 entity)            |
| `task_manager`            | `get_all` · `create` · `batch_create` · `get_one` · `update` · `delete` · `complete_task`                                                                                                                             | Individual tasks, including bulk creation                |
| `comment_manager`         | `get_all` · `create` · `get_one` · `update` · `delete`                                                                                                                                                                | Comments on a card                                       |
| `membership_manager`      | `get_all` · `create` · `get_one` · `update` · `delete`                                                                                                                                                                | Board-level membership and roles (`editor` / `viewer`)   |
| `card_membership_manager` | `get_all` · `get_users` · `create` · `delete`                                                                                                                                                                         | Assign/remove card members by **ID, email, or username** |

## Quick Start

### 1. Prerequisites

- A running **Planka v2.x** instance, reachable over the network
- An "agent" user in Planka with permissions scoped to the boards you want the LLM to touch
- Node.js 18+ if running locally (not required for the `npx` path)

### 2. Configure Your MCP Client

Every MCP-compatible client uses the same underlying command - only the config file location (and occasionally the JSON wrapper) differs. See [Client Configuration Examples](#client-configuration-examples) below for your specific tool.

The core config block is always:

```json
{
  "command": "npx",
  "args": ["-y", "@goldpulpy/planka-v2-mcp@latest"],
  "env": {
    "PLANKA_BASE_URL": "https://your-planka-instance.com",
    "PLANKA_AGENT_EMAIL": "agent@yourdomain.com",
    "PLANKA_AGENT_PASSWORD": "your-secure-password",
    "PLANKA_IGNORE_SSL": "true"
  }
}
```

<details>
<summary><strong>Alternative: run from a local build</strong></summary>

```json
{
  "command": "node",
  "args": ["/absolute/path/to/kanban-mcp/dist/index.js"],
  "env": {
    "PLANKA_BASE_URL": "https://your-planka-instance.com",
    "PLANKA_AGENT_EMAIL": "agent@yourdomain.com",
    "PLANKA_AGENT_PASSWORD": "your-secure-password",
    "PLANKA_IGNORE_SSL": "true"
  }
}
```

Useful when you're contributing to the server itself or need a pinned, offline build.

</details>

> [!TIP]
> Set `PLANKA_IGNORE_SSL` to `"true"` only for self-signed certs in trusted/local environments - leave it unset in production.

### 3. Verify the Connection

Ask your agent something read-only first, e.g. _"List my Planka projects."_ If you get a real response back, you're wired up correctly.

## Client Configuration Examples

Most MCP clients share the exact same `mcpServers` JSON shape - only the config file location differs. Clients with a different format (Codex, Continue, Zed) get their own block below.

<details open>
<summary><strong>Standard <code>mcpServers</code> clients</strong> - Claude Desktop, Claude Code, Cursor, Windsurf, Cline, Antigravity</summary>
<br>

```json
{
  "mcpServers": {
    "planka-mcp": {
      "command": "npx",
      "args": ["-y", "@goldpulpy/planka-v2-mcp@latest"],
      "env": {
        "PLANKA_BASE_URL": "https://your-planka-instance.com",
        "PLANKA_AGENT_EMAIL": "agent@yourdomain.com",
        "PLANKA_AGENT_PASSWORD": "your-secure-password",
        "PLANKA_IGNORE_SSL": "true"
      }
    }
  }
}
```

Drop this block into the relevant config file:

| Client                | Config file                                                                                                                                     |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Claude Desktop**    | macOS: `~/Library/Application Support/Claude/claude_desktop_config.json` · Windows: `%APPDATA%\Claude\claude_desktop_config.json`               |
| **Claude Code (CLI)** | `.mcp.json` in your project root (or `claude mcp add`, see below)                                                                               |
| **Cursor**            | `~/.cursor/mcp.json` (global) or `.cursor/mcp.json` (project)                                                                                   |
| **Windsurf**          | `~/.codeium/windsurf/mcp_config.json`                                                                                                           |
| **Cline** (VS Code)   | `cline_mcp_settings.json`, via **Cline → MCP Servers → Configure MCP Servers** (add `"disabled": false, "autoApprove": []` to the server entry) |
| **Antigravity**       | Via **Settings → MCP Servers → Add Server**, or its config file directly                                                                        |

> [!NOTE]
> Claude Code also supports adding the server via a one-liner instead of hand-editing JSON:
>
> ```bash
> claude mcp add planka-mcp \
>   --env PLANKA_BASE_URL=https://your-planka-instance.com \
>   --env PLANKA_AGENT_EMAIL=agent@yourdomain.com \
>   --env PLANKA_AGENT_PASSWORD=your-secure-password \
>   --env PLANKA_IGNORE_SSL=true \
>   -- npx -y @goldpulpy/planka-v2-mcp@latest
> ```

Restart the client after saving.

</details>

<details>
<summary><strong>Codex CLI</strong></summary>
<br>

Edit `~/.codex/config.toml`:

```toml
[mcp_servers.planka-mcp]
command = "npx"
args = ["-y", "@goldpulpy/planka-v2-mcp@latest"]

[mcp_servers.planka-mcp.env]
PLANKA_BASE_URL = "https://your-planka-instance.com"
PLANKA_AGENT_EMAIL = "agent@yourdomain.com"
PLANKA_AGENT_PASSWORD = "your-secure-password"
PLANKA_IGNORE_SSL = "true"
```

Or add it in one line:

```bash
codex mcp add planka-mcp -- npx -y @goldpulpy/planka-v2-mcp@latest
```

then set the `PLANKA_*` variables in the generated `[mcp_servers.planka-mcp.env]` block.

</details>

<details>
<summary><strong>Continue (VS Code / JetBrains extension)</strong></summary>
<br>

Add to `~/.continue/config.yaml`:

```yaml
mcpServers:
  - name: planka-mcp
    command: npx
    args:
      - -y
      - "@goldpulpy/planka-v2-mcp@latest"
    env:
      PLANKA_BASE_URL: https://your-planka-instance.com
      PLANKA_AGENT_EMAIL: agent@yourdomain.com
      PLANKA_AGENT_PASSWORD: your-secure-password
      PLANKA_IGNORE_SSL: "true"
```

</details>

<details>
<summary><strong>Zed</strong></summary>
<br>

Edit `~/.config/zed/settings.json` (macOS/Linux) or `%APPDATA%\Zed\settings.json` (Windows), or open it via **Cmd+Shift+P → "zed: open settings"**:

```json
{
  "context_servers": {
    "planka-mcp": {
      "source": "custom",
      "command": "npx",
      "args": ["-y", "@goldpulpy/planka-v2-mcp@latest"],
      "env": {
        "PLANKA_BASE_URL": "https://your-planka-instance.com",
        "PLANKA_AGENT_EMAIL": "agent@yourdomain.com",
        "PLANKA_AGENT_PASSWORD": "your-secure-password",
        "PLANKA_IGNORE_SSL": "true"
      }
    }
  }
}
```

`"source": "custom"` is required for manually-added servers (as opposed to ones installed via a Zed extension). Zed reloads the server automatically after saving - no editor restart needed.

</details>

<details>
<summary><strong>Any other MCP-compatible client</strong></summary>
<br>

The server is a standard stdio MCP server - any client that supports the `command` / `args` / `env` shape will work. Point it at:

```bash
npx -y @goldpulpy/planka-v2-mcp@latest
```

with the four `PLANKA_*` environment variables set as shown above.

</details>

## 🔧 Environment Variables

| Variable                | Required | Default | Description                                          |
| ----------------------- | :------: | :-----: | ---------------------------------------------------- |
| `PLANKA_BASE_URL`       |    ✅    |    -    | Full URL of your Planka instance                     |
| `PLANKA_AGENT_EMAIL`    |    ✅    |    -    | Login email for the dedicated agent user             |
| `PLANKA_AGENT_PASSWORD` |    ✅    |    -    | Password for the agent user                          |
| `PLANKA_IGNORE_SSL`     |    ❌    | `false` | Skip SSL verification - self-signed/local certs only |

## Troubleshooting

<details>
<summary><strong>The client can't see any tools / connection fails silently</strong></summary>
<br>

- Confirm `PLANKA_BASE_URL` has no trailing slash and is reachable from the machine running the MCP server (not just your browser).
- Check that the agent user can log in with those exact credentials through Planka's normal web UI first.

</details>

<details>
<summary><strong>SSL / certificate errors</strong></summary>
<br>

- If your instance uses a self-signed certificate, set `"PLANKA_IGNORE_SSL": "true"`. Avoid this in production - prefer a valid certificate instead.

</details>

<details>
<summary><strong>Cards are created but checklists/subtasks aren't showing</strong></summary>
<br>

- Make sure the card type is `"project"` (the default). Cards created as `"story"` type don't expose Task Lists in the same way.

</details>

## Development

```bash
# Install dependencies
npm install

# Configure environment variables
cp .env.example .env

# Build the project
npm run build

# Run in development mode
npm inspector

# Run quality checks (lint, types, format, tests)
npm run qc
```

## Contributing

Contributions are welcome!

1. Fork the repo and create a feature branch
2. Run `npm run qc` before opening a PR - lint, type-checking, and tests must all pass
3. Describe the _why_, not just the _what_, in your PR description

## Acknowledgements

This project is forked from [Navya-Tecnologia/planka-v2-mcp](https://github.com/Navya-Tecnologia/planka-v2-mcp), which builds on [bradrisse/kanban-mcp](https://github.com/bradrisse/kanban-mcp). Thanks to [@virapa](https://github.com/virapa) and [@bradrisse](https://github.com/bradrisse) for the foundation behind this codebase.

## License

MIT - see [LICENSE](./LICENSE) for details.

<p align="center"><em>This project focuses exclusively on the MCP interface. For Planka server setup itself, see the <a href="https://docs.planka.app">official Planka documentation</a>.</em></p>
