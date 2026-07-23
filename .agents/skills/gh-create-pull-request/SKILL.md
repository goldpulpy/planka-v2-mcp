---
name: gh-create-pull-request
description: Prepare and create review-ready GitHub pull requests from the current Git branch. Use when the user asks to open, create, submit, or draft a GitHub PR; push a branch and open its PR; turn completed local work into a PR; or generate a PR title and body from the branch diff.
---

# Create GitHub Pull Request

Create a focused pull request from the current branch. Prefer GitHub MCP tools when available; otherwise use the GitHub CLI (`gh`). Use Git for local inspection.

## Workflow

1. Inspect the repository without changing it:
   - Run `git status --short --branch`, `git branch --show-current`, and `git remote -v`.
   - Never reproduce credentials embedded in remote URLs in user-facing output.
   - Stop if the repository is in the middle of a merge, rebase, or cherry-pick, or if HEAD is detached. Explain the condition.

2. Resolve the target repository and base branch:
   - Honor a repository or base branch named by the user.
   - Otherwise derive the GitHub repository from the selected remote, preferring the current branch's configured remote and then `origin`.
   - Query GitHub for the repository's default branch. Do not assume `main` or `master`.
   - Refuse to create a PR from the base branch to itself.

3. Check whether the branch already has an open PR:
   - Search the repository for an open PR whose head owner and branch match the current branch.
   - If one exists, return its URL and current state instead of creating a duplicate. Update it only if the user asked.

4. Establish exactly what the PR will contain:
   - Fetch the base branch when network access is available and permitted.
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
   - Push only the current branch and set its upstream when needed.
   - Never force-push unless the user explicitly requests it and acknowledges the impact.
   - If authentication, permissions, branch protection, or network access blocks the push, report the exact actionable failure and stop.

8. Create the pull request:
   - Prefer the GitHub MCP create-pull-request tool. Supply the resolved owner, repository, head, base, title, body, and draft state.
   - If GitHub MCP is unavailable, use `gh pr create --repo <owner/repo> --head <head> --base <base> --title <title> --body-file <file>` and add `--draft` when requested.
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

Use equivalent GitHub MCP operations for repository metadata, PR lookup, creation, and verification. When falling back to `gh`, first run `gh auth status`; if `gh` is missing or unauthenticated, explain how that blocks creation rather than attempting an unsafe alternative.
