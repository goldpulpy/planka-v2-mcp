---
name: gh-create-pull-request
description: Prepare and create review-ready GitHub pull requests from the current Git branch. Use when the user asks to open, create, submit, or draft a GitHub PR; push a branch and open its PR; turn completed local work into a PR; or generate a PR title and body from the branch diff.
---

# Create GitHub Pull Request

Create a focused pull request from the current branch. Use GitHub MCP tools as the primary
interface for GitHub operations. Use Git for local inspection.

## Tool Priority

Give GitHub MCP strict priority over the GitHub CLI (`gh`).

- Use the corresponding GitHub MCP tool whenever it supports the required operation.
- Never choose `gh` instead of an available GitHub MCP tool for convenience, familiarity, or
  simpler arguments.
- Use `gh` only as a fallback when GitHub MCP is unavailable or does not provide the required
  operation. Do not treat MCP and `gh` as equal alternatives.
- If an MCP call fails, diagnose that failure first. Fall back to `gh` only when the failure
  establishes that MCP cannot perform the operation, not merely to retry through another client.

## Absolute Remote URL Rule

Never run any command that prints, returns, or otherwise exposes a Git remote URL. This
prohibition is unconditional, including for debugging, repository discovery, authentication
failures, or when the user asks to see the URL.

- Never run `git remote -v`, `git remote get-url`, `git config --get remote.<name>.url`, or
  any equivalent command.
- Do not read or print remote URL values from `.git/config`, environment variables, command
  output, error output, logs, or credential helpers.
- Git network commands that might mention a remote URL, including `git fetch` and `git push`,
  must run quietly with both stdout and stderr fully suppressed. Check only their exit status;
  never capture, inspect, replay, or summarize their raw output.
- Remote names such as `origin`, GitHub repository identifiers such as `owner/repository`, and
  pull request webpage URLs are safe to use. They are not Git remote URLs.

## Workflow

1. Inspect the repository without changing it:
   - Run `git status --short --branch`, `git branch --show-current`, and `git remote` (without
     `-v`) to list remote names only.
   - Never query, display, or inspect a Git remote URL.
   - Stop if the repository is in the middle of a merge, rebase, or cherry-pick, or if HEAD is detached. Explain the condition.

2. Resolve the target repository and base branch:
   - Honor a repository or base branch named by the user.
   - Otherwise use GitHub MCP repository context. Only when MCP cannot supply that context, use
     `gh repo view --json nameWithOwner,defaultBranchRef` as the fallback. Keep this command's
     selected output fields limited to the repository identifier and default branch.
   - Use `git config --get branch.<branch>.remote` only when a remote name is needed; its result
     is a name such as `origin`, never a URL. Prefer that configured name and then `origin`.
   - If the repository cannot be resolved without reading a remote URL, stop and ask the user
     for the `owner/repository` identifier. Never fall back to inspecting the URL.
   - Query GitHub for the repository's default branch. Do not assume `main` or `master`.
   - Refuse to create a PR from the base branch to itself.

3. Check whether the branch already has an open PR:
   - Search the repository for an open PR whose head owner and branch match the current branch.
   - If one exists, return its URL and current state instead of creating a duplicate. Update it only if the user asked.

4. Establish exactly what the PR will contain:
   - Fetch the base branch when network access is available and permitted. Run the fetch
     quietly with stdout and stderr fully suppressed, and use only its exit status.
   - Inspect `git log --oneline <base>..HEAD`, `git diff --stat <base>...HEAD`, and `git diff <base>...HEAD` using the remote-tracking base when available.
   - Inspect uncommitted and untracked files separately. State that they are excluded from the PR unless the user explicitly asks to commit them.
   - If there are no commits or no effective diff against the base, do not create an empty PR.
   - Check for accidental secrets, generated artifacts, debugging code, or unrelated changes before proceeding. Never include or print secret values.

5. Validate the change:
   - Read repository guidance such as `AGENTS.md`, `CONTRIBUTING.md`, and pull request templates.
   - Run the narrowest relevant tests and checks, widening to the repository's documented pre-PR command when practical.
   - Do not claim checks passed unless they ran successfully. Record skipped or failed checks for the PR body.

6. Prepare the title and body:
   - Use a concise imperative title that describes the user-visible outcome. Follow the repository's commit or PR naming convention when one exists.
   - Summarize the full diff, not only the latest commit message.
   - Use the repository's PR template when present. Otherwise use:

     ```markdown
     ## Summary

     - <specific change>
     - <specific change>

     ## Validation

     - `<command>`
     - Not run: <reason>
     ```

   - Include issue-closing syntax only when an issue is known and the change actually resolves it.
   - Avoid speculative claims, boilerplate, and empty sections.

7. Publish the branch:
   - Push only the current branch and set its upstream when needed. Run the push quietly with
     stdout and stderr fully suppressed, and use only its exit status.
   - Never force-push unless the user explicitly requests it and acknowledges the impact.
   - If the push fails, use safe diagnostics such as `gh auth status` that do not print the Git
     remote URL. Report only diagnostics obtained without inspecting the push's raw output.

8. Create the pull request:
   - Use the GitHub MCP create-pull-request tool whenever it is available. Supply the resolved
     owner, repository, head, base, title, body, and draft state.
   - Use `gh pr create --repo <owner/repo> --head <head> --base <base> --title <title>
--body-file <file>` only when GitHub MCP is unavailable or lacks pull-request creation.
     Add `--draft` when requested.
   - Use a temporary body file to preserve Markdown reliably; remove it after the command completes.
   - Create a draft only when requested or when the change is explicitly not ready for review.

9. Verify and report:
   - Read the created PR back from GitHub when possible.
   - Return the PR URL, number, title, base/head branches, draft status, and validation results.
   - Mention excluded uncommitted changes or remaining blockers briefly.

## Safety Rules

- Treat pushes and PR creation as remote mutations. Follow the active environment's approval policy before executing them.
- Never commit, amend, stage files, change branches, alter remotes, or modify repository content unless the user explicitly asks.
- Never bypass hooks with `--no-verify` unless explicitly requested.
- Do not silently retarget, close, reopen, merge, or mark a PR ready for review.
- Preserve unrelated local changes and work with a dirty worktree safely.

## Tool Fallbacks

Use GitHub MCP first for repository metadata, PR lookup, creation, and verification. Fall back to
`gh` only under the conditions in **Tool Priority**. Before using that fallback, run
`gh auth status`; if `gh` is missing or unauthenticated, explain how that blocks creation rather
than attempting an unsafe alternative.
