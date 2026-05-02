# devjs-devtools

[한국어](README.md) | [English](README.en.md)

A [Claude Code](https://claude.com/claude-code) plugin marketplace that automates everyday development workflows.

## How it works

The `devtools` plugin lets you handle the repetitive tasks that come up while writing code, debugging, recording changes, and sharing them with teammates — all through a single skill invocation. It currently covers Conventional Commits–based git/GitHub workflows (commit, PR, issue, squash) and inserting debug logs, and we plan to gradually add more commonly used development tasks (code analysis, testing, documentation, and so on) inside the same plugin.

A `PreToolUse` hook runs `pre-commit-check.sh` right before any `Bash` tool call to guard against dangerous or unintended commands.

## Installation

Add the marketplace and install the plugin.

```
/plugin marketplace add iai6203/devjs-devtools
/plugin install devtools@devjs-devtools
```

To test locally, you can add it via a directory path.

```
/plugin marketplace add /path/to/devjs-devtools
/plugin install devtools@devjs-devtools
```

## The Basic Workflow

1. **While writing code**, use `/devtools:debug-log` to insert `[DEBUG]`-prefixed log statements when you need to trace something.
2. Use **`/devtools:commit`** to automatically generate a Conventional Commits–formatted message and commit.
3. If your branch history is messy, use **`/devtools:squash`** to bundle commits into meaningful units.
4. Use **`/devtools:pr`** to analyze your commits and create a PR with a Conventional Commits title.
5. If follow-up work is needed, use **`/devtools:issue`** to create a GitHub issue with auto-suggested labels and assignees.

## What's Inside

> The list of skills currently included. We plan to keep adding tools we frequently reach for during development.

### Git

- `/devtools:commit` — Analyzes staged changes, generates a Conventional Commits message, and commits.
- `/devtools:squash` — Squashes commits on the current branch using auto-generated Conventional Commits messages.

### GitHub

- `/devtools:pr` — Analyzes commits and creates a PR with a Conventional Commits title.
- `/devtools:issue` — Creates a GitHub issue with auto-suggested labels, assignees, and template.

### Debugging

- `/devtools:debug-log` — Inserts `[DEBUG]`-prefixed log statements for debugging.

### Hooks

- `PreToolUse` (Bash) — Runs `pre-commit-check.sh` right before any `Bash` tool call.

## Philosophy

- **Automate repetition.** Tasks you used to do by hand should finish in a single skill invocation.
- **Follow standards.** Where possible, follow shared conventions like Conventional Commits so we stay compatible with other tools and automation.
- **Small and independent.** Each skill is responsible for a single task and does not depend on other skills.
- **Automation must be verifiable.** Hooks check before executing, and results are left in a form humans can read.

## Updating

```
/plugin marketplace update devjs-devtools
```
