# Nia-Vault MVP Spec

> A CLI tool for semantic search across local note collections using Nia's AI-powered indexing.

## Overview

**nia-vault** is a CLI application that enables users to query their local notes/files (e.g., Obsidian vaults, markdown directories) using AI-powered semantic search via Nia.

### The Problem

Users with large personal knowledge bases (Obsidian vaults, markdown wikis, etc.) struggle to find relevant information using keyword-based search. Traditional tools like grep or Obsidian's built-in search miss semantically similar content—if you ask "What's my vacation policy?" you won't find notes titled "Time Off Guidelines" or "PTO Request Process."

### The Solution

nia-vault bridges this gap by leveraging Nia's semantic search API—trained on your actual notes via nia-sync. Ask natural questions, get results based on meaning, not keywords.

---

## Summary of Decisions

| Decision        | Choice                                                   |
| --------------- | -------------------------------------------------------- |
| Package name    | `nia-vault` (available on npm)                           |
| CLI command     | `vault`                                                  |
| Nia Sync        | Required prerequisite (user installs separately)         |
| API key storage | Reuse from `~/.nia-sync/config.json`, fallback to prompt |
| Error handling  | Friendly messages with actionable instructions           |

---

## Tech Stack

| Component           | Technology                        |
| ------------------- | --------------------------------- |
| Runtime             | Bun                               |
| Language            | TypeScript                        |
| CLI Helpers         | Meow                              |
| Interactive Prompts | @inquirer/prompts                 |
| HTTP Client         | Native fetch (Bun built-in)       |
| Config Storage      | `~/.config/nia-vault/config.json` |
| Distribution        | npm registry                      |

---

## Architecture

```
Prerequisites:
  - User installs nia-sync separately (pip install nia-sync)
  - User has authenticated with Nia (nia login)
  - User has added folders to sync (nia add ~/path)

Credential Flow:
  1. Check ~/.nia-sync/config.json for api_key
  2. If found, reuse it (no prompt needed)
  3. If not found, prompt user for API key

nia-vault Flow:
  User Query → vault CLI → Nia REST API (search) → Format & Display Results
```

---

## Project Structure

```
nia-vault/
├── src/
│   ├── index.ts           # CLI entry (meow)
│   ├── commands/
│   │   ├── init.ts        # Interactive setup with @inquirer/prompts
│   │   ├── ask.ts         # Search query (with optional --sync flag)
│   │   ├── sync.ts        # Manual sync command (runs nia once)
│   │   ├── folders.ts     # List/add/remove folders
│   │   └── config.ts      # View/reset config
│   ├── lib/
│   │   ├── config.ts      # Config file management
│   │   ├── nia-sync.ts    # Read nia-sync credentials + run sync
│   │   ├── nia.ts         # Nia REST API client
│   │   └── output.ts      # Result formatting (plain text + JSON)
│   └── types.ts           # TypeScript types
├── package.json
├── tsconfig.json
└── README.md
```

---

## CLI Commands

### `vault init`

Interactive setup wizard. Automatically detects nia-sync credentials.

```
$ vault init

Welcome to nia-vault!

Checking for nia-sync configuration...
✓ Found API key in ~/.nia-sync/config.json

Fetching synced folders...
✓ Found 3 synced folders

Select folders to include in searches:
  ◉ personal-notes    ~/Documents/notes
  ◉ work-wiki         ~/work/wiki
  ◯ old-archive       ~/archive

✓ Configuration saved to ~/.config/nia-vault/config.json

You're all set! Try: vault ask "your question here"
```

**If nia-sync is not configured:**

```
$ vault init

Welcome to nia-vault!

Checking for nia-sync configuration...
✗ No nia-sync config found at ~/.nia-sync/config.json

Please set up nia-sync first:
  1. pip install nia-sync
  2. nia login
  3. nia add ~/path/to/notes
  4. Run 'vault init' again
```

### `vault ask "<question>"`

Query your notes using semantic search.

```
$ vault ask "What are my notes about project planning?"

Searching 2 folders...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📄 projects/q1-planning.md
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
...quarterly planning meeting. Key decisions:
- Focus on user onboarding improvements
- Allocate 30% time to tech debt...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📄 templates/project-template.md
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
...project planning template with sections
for goals, milestones, and risks...

Found 2 results
```

**Flags:**

- `-f, --folder <id>` - Search specific folder only
- `-s, --sync` - Sync folders before searching (runs `nia once`)

**With sync flag:**

```
$ vault ask "What are my notes about project planning?" --sync

Syncing folders...
✓ Sync complete

Searching 2 folders...
...
```

### `vault sync`

Manually trigger a sync of all folders (runs `nia once`).

```
$ vault sync

Syncing folders with Nia...
✓ Sync complete (3 folders updated)
```

This is useful when you've made changes to your notes and want to ensure they're indexed before querying.

### `vault folders`

List, add, or remove folders from search scope.

#### `vault folders` (list)

```
$ vault folders

Search folders (included in queries):
  ✓ personal-notes    ~/Documents/notes
  ✓ work-wiki         ~/work/wiki

Available folders (synced but not included):
  ○ old-archive       ~/archive
```

### `vault config`

View or reset configuration.

```
$ vault config

Configuration:
  Config file:     ~/.config/nia-vault/config.json
  API key source:  ~/.nia-sync/config.json (nia-sync)
  Search folders:  2 selected

$ vault config --reset
✓ Config file deleted. Run 'vault init' to reconfigure.
```

## Configuration

### nia-sync Config (read-only)

**Location:** `~/.nia-sync/config.json`

```json
{
  "api_key": "nk_xxx..."
}
```

We read this file to get the API key. We never write to it.

### nia-vault Config

**Location:** `~/.config/nia-vault/config.json`

```json
{
  "selectedFolders": ["folder-id-1", "folder-id-2"]
}
```

**Note:** We no longer store the API key in nia-vault config. We always read it from nia-sync.

**Permissions:** Created with mode `0600` (user read/write only)
