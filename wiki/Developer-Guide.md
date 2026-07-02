# 👨‍💻 Developer Guide (MCP Only)

This guide is intended for developers who want to contribute to or modify the **Kanban MCP** project for **Planka v2.0**.

## 🏗️ Project Architecture

The Kanban MCP is a Node.js server that implements the Model Context Protocol (MCP) to communicate with an external Planka instance.

1. **🖥️ MCP Server**: A Node.js server that implements the MCP protocol in `index.ts`.
2. **🔌 Operations Layer**: Specialized modules in `operations/` that handle business logic for each Planka v2.0 entity.
3. **📡 Core Utilities**: Common types and the unified `plankaRequest` client in `common/`.

### 📁 Directory Structure

```
kanban-mcp/
├── common/                 # Common utilities and global types
│   ├── types.ts            # Planka v2.0 Zod schemas and TS types
│   ├── errors.ts           # Unified error handling
│   └── utils.ts            # API client (plankaRequest)
├── operations/             # Business logic for Planka entities
│   ├── projects.ts         # Project operations
│   ├── boards.ts           # Board operations
│   ├── lists.ts            # List operations
│   ├── cards.ts            # Card operations
│   ├── taskLists.ts        # Task List operations (New in v2.0)
│   ├── tasks.ts            # Task operations (Refactored for v2.0)
│   ├── comments.ts         # Comment operations
│   ├── labels.ts           # Label operations
│   └── boardMemberships.ts  # Membership operations
├── index.ts                # Main entry point & MCP tool definitions
├── tools/                  # Aggregated tools (Board/Project summaries, etc.)
├── tests/                  # Integration and unit tests
├── .agent/                 # Agent-specific rules and skills
├── .env                    # Environment variables
├── package.json            # Dependencies and scripts
└── tsconfig.json           # TypeScript configuration
```

## 🚀 Development Setup

### 🛠️ Setting Up the Development Environment

1. **Clone the repository**:

   ```bash
   git clone https://github.com/Navya-Tecnologia/planka-v2-mcp.git
   cd kanban-mcp
   ```

2. **Install dependencies**:

   ```bash
   npm install
   ```

3. **Set up environment variables**:
   Configure these to point to your **external Planka v2.0 instance**:

   ```bash
   PLANKA_BASE_URL=http://your-planka-instance:3333
   PLANKA_AGENT_EMAIL=agent@yourdomain.com
   PLANKA_AGENT_PASSWORD=your-secure-password
   ```

4. **Run the MCP server in development mode**:
   ```bash
   npm run dev
   ```

## ✨ Adding New Features

### 🆕 Adding a New Tool or Action

The MCP tools are consolidated into manager-style tools in `index.ts`.

1. **Define the operation**: Add a new function in `operations/` (e.g., `operations/cards.ts`).
2. **Handle API logic**: Use `plankaRequest` from `common/utils.ts`.
3. **Register the tool/action**: In `index.ts`, update the corresponding `server.tool` definition.
4. **Update types**: If adding new data structures, update `common/types.ts`.

### 📂 Implementing Task Lists (Planka v2.0)

Planka v2.0 introduces **Task Lists** as a parent container for tasks.

- **Operations**: `operations/taskLists.ts` handles the API calls.
- **Task Attachment**: Tasks MUST have a `taskListId`. `operations/tasks.ts` provides backward compatibility for `cardId`.

## 🧪 Testing

```bash
# Run all tests
npm test

# Run a specific test
npx jest tests/integration.test.ts
```

## 📋 Best Practices

1. **JSDoc**: Document all public functions in `operations/` and `common/`.
2. **Consolidation**: Always prefer adding actions to existing manager tools in `index.ts`.
3. **Backward Compatibility**: Ensure that old `cardId`-based calls for tasks still work by redirecting to the new Task List hierarchy.

---

## 🚀 Automated Releases (CI/CD)

The project uses **GitHub Actions** to automate the publishing of new versions to **NPM** and **GitHub Releases**.

### 🛠️ Configuration

To enable automated releases, the following secret must be configured in GitHub (`Settings > Secrets and variables > Actions`):

- `NPM_TOKEN`: A classic or granular automation token from your NPM account.

### 📦 How to Release a New Version

Releases are triggered automatically when a new **Git Tag** starting with `v` (e.g., `v1.3.5`) is pushed to the repository.

1. **Update the version**:
   Update `package.json` and `common/version.ts` to the new version number.
2. **Commit and Push**:
   ```bash
   git add .
   git commit -m "chore: bump version to 1.x.x"
   git push origin main
   ```
3. **Create and Push the Tag**:
   ```bash
   git tag v1.x.x
   git push origin v1.x.x
   ```

### 🎈 What the Workflow Does

Once the tag is pushed, the `publish.yml` workflow will:

1. **Build & Test**: Compile the source and run unit tests.
2. **NPM Pack**: Create the production tarball (`.tgz`).
3. **GitHub Release**: Create a new release in the repository and attach the tarball.
4. **NPM Publish**: Upload the package to the official NPM registry.
