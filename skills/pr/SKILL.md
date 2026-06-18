---
name: pr
description: Analyze commits and create a pull request with a Conventional Commits title
allowed-tools: Bash(gh pr create *), Bash(gh repo view *), Bash(git log *), Bash(git branch *), Bash(git rev-parse *), Bash(gh api *)
---

# PR Skill

Analyzes commits on the current branch and creates a pull request with an auto-generated Conventional Commits title.

## Execution Steps

0. Check if `gh` CLI is installed with `command -v gh`. If not found, notify the user to install it and abort.

1. Get the current branch with `git branch --show-current`. If the current branch is the same as the base branch, notify the user and abort.

2. Determine the base branch:
   - If a positional argument is provided before any `--` flags (e.g., `/pr develop ...`), use it as the base branch
   - Otherwise, auto-detect using `gh repo view --json defaultBranchRef --jq '.defaultBranchRef.name'`

3. Parse the `--assignee` flag (if present):
   - `--assignee` must appear after the base branch argument (if any). The token immediately following `--assignee` is always treated as a username list, never as a base branch.
   - If `--assignee <users>` is provided (e.g., `--assignee user1,user2`), store the comma-separated usernames
   - If `--assignee` is provided without a value, proceed to Step 4
   - If the flag is absent entirely, skip Step 4

4. (Only when `--assignee` was provided without a value) Fetch assignable users and present selection:
   - Run `gh api repos/{owner}/{repo}/assignees --jq '.[].login' | head -20`
   - If the fetch fails (403, 404, network error), notify the user and proceed without assignees
   - Present a numbered list of available users
   - The user selects by number(s) or types username(s) directly

5. Get the commit list with `git log <base>..HEAD --oneline`. If there are no commits, notify the user and abort.

6. Analyze the commits and generate a PR title in Conventional Commits format: `<type>(<scope>): <subject>`

7. Show the generated title (and assignees if set) to the user and ask for confirmation:
   ```
   Title: <title>
   Assignees: <assignees or (none)>
   ```
   If the user requests changes, revise accordingly.

8. Run `gh pr create --base <base> --title "<title>" --fill` with additional flags:
   - Split comma-separated usernames into individual `--assignee` flags (e.g., `--assignee user1 --assignee user2`)
   - Display the resulting PR URL.

## Title Generation Rules

### Type

- Count the frequency of each type across all commits
- Select the most frequent type as the representative type
- Exception: if `feat` appears at least once, always use `feat`

### Scope

- If all commits share the same scope, use it as-is
- If scopes differ, use the most frequent one
- If the scope is ambiguous, use `custom`

### Subject

- Summarize the overall changes in Korean
- 50 characters or less
- If there is only one commit, use that commit message as the title directly

## Rules

- Write type and scope in English; write subject in Korean
- Use `--fill` flag to auto-populate the PR body from commit messages (compatible with non-interactive environments)
- Always show the generated title and get user confirmation before creating the PR
- Do not include `🤖 Generated with [Claude Code](https://claude.com/claude-code)` or any similar auto-generated attribution text in the PR body
