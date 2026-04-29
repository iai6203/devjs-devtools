---
name: commit
description: Automatically generate commits following the Conventional Commits specification
allowed-tools: Bash(git commit *), Bash(git diff *), Bash(git status *), Bash(git log *), Bash(git show *)
---

# Commit Skill

Analyzes staged changes and automatically generates a commit message following the Conventional Commits specification, then commits.

## Conventional Commits Rules

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type (required)

| type       | purpose                                              |
|------------|------------------------------------------------------|
| `feat`     | Add a new feature                                    |
| `fix`      | Fix a bug                                            |
| `docs`     | Documentation changes                                |
| `style`    | Changes that do not affect code meaning (formatting) |
| `refactor` | Code restructuring without behavior change           |
| `perf`     | Performance improvement                              |
| `test`     | Add or modify tests                                  |
| `build`    | Build system or external dependency changes          |
| `ci`       | CI configuration changes                             |
| `chore`    | Other changes (not affecting src/test)               |

### Scope (required)

A noun indicating the scope of the change. e.g., `auth`, `api`, `ui`. If the scope is unclear, use `custom`.

### Subject (required)

- Start with a lowercase letter
- Use imperative mood: "add" (O), "added" (X), "adds" (X)
- No period at the end
- 50 characters or less

### Body (optional)

- Use bullet-list format with `-` prefix
- Each bullet should explain the motivation or detail of the change
- Include only when the changes are complex or span multiple files

### Footer (optional)

- If there is a breaking change, add `BREAKING CHANGE: <description>`
- If related to an issue, add `Closes #<number>`

## Execution Steps

1. Check staged changes with `git diff --cached`
2. If there are no staged changes, notify the user and abort
3. Analyze the changes to determine the appropriate type
4. Set scope based on the change area (use `custom` if unclear)
5. Write a concise subject summarizing the changes
6. Write a body if the changes are complex or span multiple files
7. Add `BREAKING CHANGE:` in the footer if there is a breaking change
8. Compose the commit message and run `git commit -m`

## Rules

- Write type and scope in English; write subject, body, and footer in Korean
- Each commit should contain only one logical change
- If staged changes contain multiple logical changes, suggest splitting into separate commits
- Do not use the `--no-verify` flag
- Show the generated message to the user and get confirmation before committing
- Do not add Co-authored-by trailers (e.g., for Claude or any AI assistant)
