# Shell Aliases for Claude Code

Based on the context of your businesses, **EverjoyAi Technology** and **Lave Gallery**, you should update your **`shell-aliases.md`** file to include the specific setup required to automate your new "vibe-coding" and notification workflows.

You should **keep the core aliases** but add a section for your **Telegram integration** and **environment setup**, as these are critical for your automated business audits and "MegaViews" content production.

Here is the updated content for your **`shell-aliases.md`** file:

### shell-aliases.md
**Path:** `./shell-aliases.md`

```bash
# Shell Aliases for EverjoyAi & Lave Gallery Workspace

Two shell aliases streamline launching Claude Code sessions with this workspace, ensuring your AI and Art contexts are always synced.

## Setup

Add these lines to your `~/.zshrc` (or `~/.bashrc`) to enable the workspace commands:

```bash
# Core Claude Code Aliases
alias cs='claude "/prime"'
alias cr='claude --dangerously-skip-permissions "/prime"'

# Skill-Specific Shortcuts
alias notify='python3 scripts/telegram_bot.py'
```

Then reload your shell: `source ~/.zshrc`

---

## The Aliases

### `cs` — Claude Safe
```bash
alias cs='claude "/prime"'
```
Launches Claude Code and runs `/prime` to load the **EverjoyAi, MegaViews, and Lave Gallery** context. Claude will ask for permission before executing scripts or making file changes.

**Use when:** Planning new marketing strategies or reviewing delicate artist contracts for the gallery.

### `cr` — Claude Run
```bash
alias cr='claude --dangerously-skip-permissions "/prime"'
```
Launches Claude Code with permissions disabled. Claude can execute "vibe-coded" scripts and update your current data metrics autonomously.

**Use when:** Running automated business audits for MegaViews or deploying bulk updates to your tech tools.

### `notify` — Manual Telegram Update
```bash
alias notify='python3 scripts/telegram_bot.py'
```
A direct shell shortcut to trigger your Telegram bot script without entering a Claude session.

---

## Environment Configuration
Ensure your `.env` file contains the following keys for these aliases to work with your "Skills":

- `TELEGRAM_BOT_TOKEN`: Issued by @BotFather.
- `TELEGRAM_CHAT_ID`: Your unique ID for direct founder notifications.

## Why Both `cs` and `cr`?
- **`cs`** gives you oversight for high-level strategic decisions involving Lave Gallery or the AI Avatar's brand.
- **`cr`** provides speed for the "vibe-coding" technical iterations of EverjoyAi Technology.

Both ensure Claude starts every session fully oriented to your multi-venture goals through the `/prime` command.
```