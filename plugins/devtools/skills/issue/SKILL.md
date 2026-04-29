---
name: issue
description: Create a GitHub issue with auto-suggested labels, assignees, and template
allowed-tools: Bash(gh issue create *), Bash(gh issue list *), Bash(gh label list *), Bash(gh api *), Bash(gh repo view *), Bash(git rev-parse *)
---

# Issue Skill

Creates a GitHub issue using the `gh` CLI. Auto-detects available labels, assignees, and issue templates from the repository, then suggests appropriate options based on the user's description.

## Execution Steps

0. Check if `gh` CLI is installed with `command -v gh`. If not found, notify the user to install it and abort.

1. Confirm the current directory is a git repository with `git rev-parse --is-inside-work-tree`. If not, notify the user and abort.

2. Accept the user's issue description from the argument (e.g., `/issue 로그인 시 세션 만료 처리가 안 됨`). If no argument is provided, ask the user to describe the issue.

3. Gather repository context in parallel:
   - Labels: `gh label list --limit 100 --json name,description`
   - Issue templates: `gh api repos/{owner}/{repo}/contents/.github/ISSUE_TEMPLATE --jq '.[].name'` (ignore 404 errors if no templates exist)
   - Assignable users: `gh api repos/{owner}/{repo}/assignees --jq '.[].login' | head -20`

4. Analyze the user's description and repository context to generate:
   - **Title**: concise summary in Korean, 50 characters or less
   - **Body**: structured description in Korean using the matched template format if available, otherwise use a simple format with sections: `## 설명`, `## 재현 방법` (if bug), `## 기대 동작`
   - **Labels**: select relevant labels from the repository's available labels (may be empty if none match)
   - **Assignees**: suggest assignees only if the user explicitly mentions someone (default: empty)
   - **Template**: use matching template if the repository has issue templates and one fits

5. Show the complete issue preview to the user:
   ```
   Title: <title>
   Labels: <labels or (none)>
   Assignees: <assignees or (none)>
   Template: <template or (none)>

   <body>
   ```
   Ask for confirmation. If the user requests changes, revise accordingly.

6. Build and run the `gh issue create` command:
   - Always include: `--title "<title>" --body "<body>"`
   - Add `--label "<label1>,<label2>"` only if labels were selected
   - Add `--assignee "<user1>,<user2>"` only if assignees were set
   - Display the resulting issue URL

## Rules

- Write issue title and body in Korean
- Always show the generated issue and get user confirmation before creating
- Do not fabricate labels or assignees that do not exist in the repository
- If fetching labels/templates/assignees fails, proceed without them rather than aborting
- Do not include `🤖 Generated with [Claude Code](https://claude.com/claude-code)` or any similar auto-generated attribution text in the issue body
- Pass the body via a HEREDOC to preserve formatting:
  ```
  gh issue create --title "title" --body "$(cat <<'EOF'
  body content here
  EOF
  )"
  ```
