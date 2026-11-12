# Autonomous inbox watcher: notify + click-to-ingest

**Status: parked.** Blocked on a local Homebrew permissions issue (`/usr/local/Homebrew` and related dirs are owned by a different local macOS account on this machine, not the one running Claude Code) — `brew install fswatch terminal-notifier` can't proceed until that's fixed with `sudo chown`. Nothing below has been built yet; this is the design to pick back up once that's sorted.

## Context

The user wants to know as soon as new articles/docs land in `Obsidian Vault/ant-colony/wiki-site/inbox/`, instead of having to remember to check. Confirmed via an Explore pass that the machine is a clean slate for this: no existing LaunchAgents, cron jobs, hooks, or scripts related to file-watching (`crontab -l` is empty; `~/Library/LaunchAgents/` only has vendor agents; `.claude/settings.local.json` has no hooks block). `fswatch` and `terminal-notifier` are not installed but are available via Homebrew.

This needs to be a **local, OS-level watcher**, not a Claude Code cron job — `CronCreate` jobs are session-only (die when the chat session ends, auto-expire after 7 days) and claude.ai scheduled routines (`RemoteTrigger`) run in the cloud with no access to this Mac's filesystem. A `launchd` agent is the right persistence model: it survives reboots/logins and runs independently of any chat session.

The user chose the richer of two notification options: not just a passive notification, but a **clickable one** that opens a terminal and kicks off `wiki-ingest` immediately — which dovetails with the inbox-default-scan behavior already built into the `wiki-ingest` skill (running `claude "run wiki-ingest"` with no target now auto-scans the inbox).

## Design

**Dependencies** (install via Homebrew): `fswatch` (recursive, FSEvents-backed directory watching — handles new dated subfolders automatically, unlike launchd's own non-recursive `WatchPaths`) and `terminal-notifier` (notifications with a clickable `-execute` action; plain `osascript` notifications can't run a command on click).

**Files to create:**

- `~/.claude/wiki-inbox-watch/watch.sh` — loops on `fswatch -r -l 5 --exclude '/DONE/' --exclude '/drafts/' --exclude '/migrate/' --exclude '\.DS_Store$' --exclude '/\.' "/Users/krizfernux/Obsidian Vault/ant-colony/wiki-site/inbox"` (5s latency batches rapid multi-file drops into one notification; excludes mirror what `wiki-ingest` itself already treats as out-of-scope, so the watcher and the skill agree on what counts as "inbox content"). On each batch, calls `terminal-notifier -title "Wiki inbox" -message "New item(s) added to the wiki inbox" -execute "$HOME/.claude/wiki-inbox-watch/open-ingest.sh"`.
- `~/.claude/wiki-inbox-watch/open-ingest.sh` — `osascript -e 'tell application "Terminal" to do script "cd \"/Users/krizfernux/Documents/Claude-CLI/Research-Wiki\" && claude \"run wiki-ingest\""'`. Opens a new Terminal window already in the right directory and starts Claude Code with the ingest prompt, which (per the skill's default-scan behavior) will inventory the inbox and present a plan.
- `~/Library/LaunchAgents/com.kriziafernando.wiki-inbox-watch.plist` — `RunAtLoad: true`, `KeepAlive: true`, runs `watch.sh`, logs stdout/stderr to `~/Library/Logs/wiki-inbox-watch.log`.

**Activation:** `launchctl load -w ~/Library/LaunchAgents/com.kriziafernando.wiki-inbox-watch.plist` — starts it now and on every future login.

## Verification (once built)

1. `launchctl list | grep wiki-inbox-watch` — confirm it's loaded and running (no repeated-crash exit code).
2. Drop a test `.md` file directly into `inbox/` (not under `DONE/`, `drafts/`, or `migrate/`) and confirm a "Wiki inbox" notification appears within ~5 seconds.
3. Click the notification and confirm a Terminal window opens in the `Research-Wiki` directory and Claude Code starts running the `wiki-ingest` skill against the inbox.
4. Drop a file inside `DONE/` and confirm **no** notification fires (exclusion working).
5. Check `~/Library/Logs/wiki-inbox-watch.log` for fswatch/terminal-notifier errors if anything above doesn't fire.

## Unblocking

```
sudo chown -R krizfernux /usr/local/Homebrew /usr/local/etc/bash_completion.d /usr/local/share/zsh /usr/local/share/zsh/site-functions /usr/local/var/homebrew/locks
```

As of parking, this had not visibly taken effect yet (ownership still showed a different local account, `kriziasantcolony`, after it was reportedly run) — worth re-diagnosing path-by-path before retrying the full `brew install`.
