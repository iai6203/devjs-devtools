# devjs-devtools

[한국어](README.md) | [English](README.en.md)

A [Claude Code](https://claude.com/claude-code) plugin marketplace that automates everyday development workflows. The repository can hold multiple plugins in a single marketplace, each managed as its own directory under `plugins/`.

## How it works

The `devtools` plugin lets you handle the repetitive tasks that come up while writing code, debugging, recording changes, and sharing them with teammates — all through a single skill invocation. It currently covers Conventional Commits–based git/GitHub workflows (commit, PR, issue, squash) and inserting debug logs, and we plan to gradually add more commonly used development tasks (code analysis, testing, documentation, and so on).

`tdd` is an independent plugin for readable, human-approved executable test specifications and TDD phase safeguards. It shares the same skills (`test-list`, `readable-tests`, `green-handoff`, `green-review`) between Claude Code and [Pi Coding Agent](https://pi.dev).

## Structure

```
.claude-plugin/
  marketplace.json      # Marketplace definition (list of plugins)
plugins/
  devtools/             # One directory per plugin
    .claude-plugin/plugin.json
    .codex-plugin/plugin.json
    skills/
  plannotator-tools/    # Claude Code Mod (macOS only)
    .claude-plugin/plugin.json
    hooks/
  tdd/                  # Independent Claude Code + Pi package
    .claude-plugin/plugin.json
    package.json        # Pi manifest (exposes skills only)
    references/tdd-policy.md  # Policy shared by all skills
    skills/
      test-list/SKILL.md
      readable-tests/SKILL.md
      green-handoff/SKILL.md
      green-review/SKILL.md
```

To add a new plugin, create a `plugins/<name>/` directory and add an entry with `"source": "./plugins/<name>"` to the `plugins` array in `.claude-plugin/marketplace.json`.

## Installation

### Claude Code

Add the marketplace and install the plugin.

```
/plugin marketplace add iai6203/devjs-devtools
/plugin install devtools@devjs-devtools
/plugin install plannotator-tools@devjs-devtools
```

> `plannotator-tools` is a Claude Code Mod, so it works only in Claude Code, and only on macOS. It requires the Plannotator CLI (`plannotator`).

To test locally, you can add it via a directory path.

```
/plugin marketplace add /path/to/devjs-devtools
/plugin install devtools@devjs-devtools
```

To install `tdd`, run these Claude CLI commands in your terminal:

```sh
claude plugin marketplace add iai6203/devjs-devtools
claude plugin install tdd@devjs-devtools
```

Invoke `/tdd:test-list`, `/tdd:readable-tests`, `/tdd:green-handoff`, or `/tdd:green-review` in Claude Code.

### Pi Coding Agent (`tdd`)

Clone the repository, then install the `tdd` package directory locally from the repository root:

```sh
git clone https://github.com/iai6203/devjs-devtools.git
cd devjs-devtools
pi install ./plugins/tdd
# Or install via an absolute path:
# pi install /path/to/devjs-devtools/plugins/tdd
```

Invoke `/skill:test-list`, `/skill:readable-tests`, `/skill:green-handoff`, or `/skill:green-review` in Pi. Local installation references the directory without copying files, so keep the cloned directory in place. If another skill with the same name is already present, Pi warns about the name collision and uses the first discovered skill; remove duplicate paths.

The Pi manifest exists only at `plugins/tdd/package.json`. Installing the remote Git repository root directly does not discover `tdd` with this layout; npm publishing is out of scope.

### GitHub Copilot CLI

Add the marketplace and install the plugin.

```
copilot plugin marketplace add iai6203/devjs-devtools
copilot plugin install devtools@devjs-devtools
```

### Codex

Add the marketplace and install the plugin.

```
codex plugin marketplace add iai6203/devjs-devtools
codex plugin add devtools@devjs-devtools
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

### Testing (`tdd`, Claude Code + Pi)

- Claude Code: `/tdd:test-list` / Pi: `/skill:test-list` — Turns requirements into a test list of normal, failure, and boundary cases with open policy questions, and gets it approved before RED tests are written.
- Claude Code: `/tdd:readable-tests` / Pi: `/skill:readable-tests` — Writes and reviews tests as readable executable specifications, with safeguards for TDD RED approval and GREEN implementation.
- Claude Code: `/tdd:green-handoff` / Pi: `/skill:green-handoff` — Writes a self-contained prompt for delegating GREEN implementation to another agent, based on approved RED tests.
- Claude Code: `/tdd:green-review` / Pi: `/skill:green-review` — Reviews a GREEN implementation finished by another agent: approved-test preservation, change scope, rerun checks, and report comparison, ending with a verdict.

The shared skill instructions are in Korean.

### Plannotator (`plannotator-tools`, macOS only)

Adds two buttons above the Claude Code prompt. The output is copied to the clipboard.

- `[Plannotator] Last` — Runs `plannotator last | pbcopy`.
- `[Plannotator] Review` — Runs `plannotator review | pbcopy`.

Pressing a button again while it is running stops the previous plannotator process and starts a new one (close the previous browser tab yourself).

## Philosophy

- **Automate repetition.** Tasks you used to do by hand should finish in a single skill invocation.
- **Follow standards.** Where possible, follow shared conventions like Conventional Commits so we stay compatible with other tools and automation.
- **Small and independent.** Each skill is responsible for a single task and does not depend on other skills.
- **Automation must be verifiable.** Results are left in a form humans can read.

## Updating

Claude Code:

```
/plugin marketplace update devjs-devtools
```

GitHub Copilot CLI:

```
copilot plugin marketplace update devjs-devtools
```

Codex:

```
codex plugin marketplace upgrade devjs-devtools
```
