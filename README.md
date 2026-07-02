# 📋 Planka Kanban MCP (v2.x)

A specialized Model Context Protocol (MCP) server that enables LLMs (like Claude in Cursor) to interact with **Planka v2.x** kanban boards.

> [!IMPORTANT]
> This MCP server is designed specifically for **Planka v2.x**. It allows an AI agent to manage projects, boards, cards, and the new **Task List** hierarchy on an existing Planka instance.

## ✨ Key Features (Planka v2.x)

- **📂 Task List Management**: Full support for the new Task List entity introduced in Planka v2.0.
- **✅ Granular Task Tracking**: Create and complete tasks within specific Task Lists inside cards.
- **⏱️ Persistent Time Tracking**: Start and stop stopwatches on cards; time is tracked directly in Planka.
- **👥 Unified Membership Management**: Assign users to cards by **Email** or **Username** without needing their ID first.
- **🚀 Project-First Defaults**: New cards are created as **type "project"** by default to ensure subtasks and checklists are immediately visible.
- **🗂️ Consolidated Managers**: Grouped tools (Card Manager, Project Manager, etc.) to optimize LLM interaction and stay under tool limits.
- **📊 Aggregate Summaries**: New tools for comprehensive data retrieval:
  | Tool Name | Parameters | Description |
  |---|---|---|
  | `get_board` | `id` | Get board details. |
  | `update_board` | `id`, `name`, `backgroundType`, etc. | Update board settings. |
  | `delete_board` | `id` | Delete a board. |
  | `get_board_summary` | `boardId`, `includeTaskDetails`, `includeComments` | Get a comprehensive summary of a board including stats. |
  | `get_project_summary` | `id` | Get a summary of all boards in a project. |
- **🏷️ Advanced Labeling**: Full support for v2.x color palettes and label assignment.

## 🚀 Quick Start (Connect to your Planka v2.x)

### 1. Prerequisites

- A functional **Planka v2.x** instance reachable via network.
- An agent user created in Planka with the necessary permissions.

### 2. Configure Your Client (Cursor/Claude/Antigravity)

The easiest way is using **npx**. Add the following to your MCP configuration:

```json
{
  "mcpServers": {
    "planka-mcp": {
      "command": "npx",
      "args": ["-y", "@navyatec/planka-v2-mcp@latest"],
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

#### Alternative: Local Setup

If you have the code locally, pointing to the built file:

```json
{
  "mcpServers": {
    "planka-mcp": {
      "command": "node",
      "args": ["/absolute/path/to/kanban-mcp/dist/index.js"],
      "env": { ... }
    }
  }
}
```

Ask Claude:

- "Groom the Backlog board and break down the top card into tasks."
- "Start tracking time for the 'UI Implementation' card."
- "Assign @jane.doe to the card 'Implement API Authentication'."
- "Create a new 'Database' Task List in the 'System Migration' card."

## 📖 Documentation

- **[Installation Guide](./wiki/Installation-Guide.md)**: Detailed setup for the MCP server.
- **[API Reference](./wiki/API-Reference.md)**: List of available consolidated manager tools.
- **[Usage Guide](./wiki/Usage-Guide.md)**: How to interact with the board via LLM.
- **[Developer Guide](./wiki/Developer-Guide.md)**: Architecture and how to extend the MCP.

## 🏗️ Development

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run in development mode
npm run dev

# Run quality checks
npm run qc

### 🚀 Automated Releases
This project is configured for automated releases via **GitHub Actions**. Pushing a tag in the format `v*` (e.g., `v1.3.5`) will automatically build, test, and publish the package to **NPM** and create a **GitHub Release**.
```

---

_This project focuses exclusively on the MCP interface. For Planka server setup, refer to the [official Planka documentation](https://docs.planka.app)._
_Developed by [NAVYA TECNOLOGÍA 2024, S.L.](https://www.navyatec.es)_
