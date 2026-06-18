---
name: squash
description: Squash commits on the current branch into one or more commits with auto-generated Conventional Commits messages
allowed-tools: Bash(git reset *), Bash(git stash *), Bash(git commit *), Bash(git diff *), Bash(git status *), Bash(git log *), Bash(git branch *), Bash(git rev-parse *), Bash(gh repo view *)
---

# Squash Skill

Squashes commits on the current branch using `git reset --soft`, then creates new commits with auto-generated Conventional Commits messages.

## Arguments

| Argument | Description |
|----------|-------------|
| `<number>` | Number of recent commits to squash (e.g., `/squash 5`) |
| `--base <branch>` | Specify the base branch (e.g., `/squash --base develop`) |
| `--groups <number>` | Split commits into N logical groups (e.g., `/squash --groups 3`) |

Arguments can be combined (e.g., `/squash 10 --groups 2`, `/squash --base develop --groups 3`).

## Execution Steps

1. Determine the base branch:
   - If `--base` is provided, use it
   - Otherwise, auto-detect using `gh repo view --json defaultBranchRef --jq '.defaultBranchRef.name'`

2. Get the current branch with `git branch --show-current`. If the current branch is the same as the base branch, notify the user and abort.

3. Check working tree status with `git status`. If there are uncommitted changes (staged and/or unstaged tracked changes), do not abort. Instead, ask the user how to proceed and record their choice:
   - **Stash and proceed (recommended):** stash the changes, run the squash, then restore them with `git stash pop` once the squash completes
   - **Abort:** stop so the user can clean up the working tree manually
   - **Proceed without stashing:** continue with the changes in place — warn that pre-existing staged changes will be folded into the squash commit; unstaged tracked changes remain unstaged after the reset and are not included

   Notes:
   - Untracked files do not need to be stashed; they are never folded into a commit unless explicitly staged. Use `git stash push` (without `-u`) so untracked files are left in place and only tracked changes are stashed.
   - Do not run the stash yet — only record the decision. The stash is executed in step 8, immediately before the reset, so that aborting at the final confirmation never leaves a dangling stash.

4. Collect target commits:
   - If a number argument is provided, use `git log HEAD~N..HEAD --oneline`
   - Otherwise, use `git log <base>..HEAD --oneline`
   - If there are no commits to squash, notify the user and abort

5. Analyze all target commit messages and generate a Conventional Commits message for the squashed result.

6. If `--groups` is specified:
   - Analyze commits and propose a logical grouping plan
   - Show the grouping plan with generated commit messages for each group
   - Wait for user confirmation before proceeding

7. Show the generated commit message(s) to the user and get confirmation before proceeding.

8. Execute the squash:
   - If the user chose to stash in step 3, run `git stash push` first (tracked changes only, no `-u`).
   - **Single squash (default):** `git reset --soft <target>` → `git commit -m "<message>"`
   - **Group squash:** Starting from the oldest group, for each group: `git reset --soft <group-boundary>` → stage relevant files → `git commit -m "<message>"`, repeat until all groups are committed
   - If a stash was created, restore it with `git stash pop` after all commits are made. If `git stash pop` reports a conflict, notify the user clearly: the squash itself succeeded, the stash is preserved, and the conflicting changes must be resolved manually.

9. Show the result: number of commits before and after the squash.

## Commit Message Generation Rules

Follow the same Conventional Commits rules as the commit skill:

### Format

```
<type>(<scope>): <subject>

<body>
```

### Type

- Count the frequency of each type across all commits being squashed
- Select the most frequent type as the representative type
- Exception: if `feat` appears at least once, always use `feat`

### Scope

- If all commits share the same scope, use it as-is
- If scopes differ, use the most frequent one
- If the scope is ambiguous, use `custom`

### Subject

- Start with a lowercase letter
- Use imperative mood
- No period at the end
- 50 characters or less
- Write in Korean

### Body

- Summarize the key changes in bullet-list format with `-` prefix
- Write in Korean
- Include only when the squashed changes are complex or span multiple areas

## Rules

- Write type and scope in English; write subject and body in Korean
- Do not use the `--no-verify` flag
- Do not add Co-authored-by trailers
- Do not push to remote (squash only)
- If the working tree has uncommitted changes, offer to stash before squashing and pop afterward instead of aborting outright (see Execution Step 3)
- Only stash tracked changes (run `git stash push` without `-u`); restore them with `git stash pop` after the squash completes
- If `git stash pop` conflicts, the squash is already done — preserve the stash and ask the user to resolve the conflict manually
- Always show the plan and get user confirmation before executing
- If the squash would result in no change (e.g., only 1 commit), notify the user and abort
