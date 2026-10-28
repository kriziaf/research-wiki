---
name: eod
description: End-of-day recap of today's activities with token usage tracking
---

# End of Day Recap

When invoked, generate a comprehensive summary of today's work across your entire account.

## What to do

1. **Check token usage** — read `~/.claude/token-log.json` and show today's entries
   - Parse JSON to find entries with today's date
   - Sum input and output tokens per session
   - Show session name, token counts, and daily total
   
2. **Scan git repos** — find all repos in `~/Documents` and list today's commits
   - Search for `.git` directories
   - Run `git log --oneline --since="today" --until="tomorrow"` in each
   - Group commits by repo/project name
   - Skip repos with no activity

3. **Format output** as markdown:
   ```
   ## End of Day Recap — [Today's Date]
   
   **Token usage:**
   - [session name]: [total] tokens (↑input, ↓output)
   - **Total: [X] tokens** (input, output)
   
   **Activity by project:**
   ### [repo-name]
   - [commit-hash] [commit message]
   ```

4. **Optional additions:**
   - Show token budget usage % if `.claude/settings.json` has `eod.tokenTracking.dailyBudget`
   - Compare today's tokens to 7-day average
   - Flag any projects with uncommitted changes (via `git status`)

## Implementation

Use Bash to query git and parse the token log JSON file. Display results in markdown format suitable for pasting into a log or sharing in standup.
