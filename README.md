# nia-vault

A CLI application for querying your local notes and files using AI-powered semantic search via [Nia](https://trynia.ai).

## Features

- **Semantic Search**: Query your notes using natural language
- **Multiple Folders**: Search across multiple synced folders
- **Seamless Integration**: Automatically uses credentials from nia-sync
- **Flexible Sync**: Sync folders on-demand or before searches

## Prerequisites

- Node.js >= 18.0.0 or Bun
- [nia-sync](https://github.com/nicholasgriffintn/nia-sync) installed and configured

```bash
# Install nia-sync
pip install nia-sync

# Authenticate with Nia
nia login

# Add folders to sync
nia add ~/Documents/notes
nia start
```

## Installation

```bash
# With Bun (recommended)
bun install -g nia-vault

# With npm
npm install -g nia-vault

# With pnpm
pnpm install -g nia-vault
```

After installation, the `vault` command is available globally.

## Quick Start

```bash
# Initialize nia-vault (select which folders to search)
vault init

# Ask a question
vault ask "What are my notes about project planning?"

# Sync folders before searching
vault ask "meeting notes from last week" --sync
```

## Commands

### `vault init`

Interactive setup wizard that detects your nia-sync configuration and lets you select which folders to include in searches.

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

Found 2 results
```

**Options:**

| Flag                | Description                   |
| ------------------- | ----------------------------- |
| `-f, --folder <id>` | Search specific folder only   |
| `-l, --limit <n>`   | Max results (default: 5)      |
| `-s, --sync`        | Sync folders before searching |

### `vault sync`

Manually trigger a sync of all folders.

```
$ vault sync

Syncing folders with Nia...
✓ Sync complete (3 folders updated)
```

### `vault folders`

List, add, or remove folders from search scope.

```
$ vault folders

Search folders (included in queries):
  ✓ personal-notes    ~/Documents/notes
  ✓ work-wiki         ~/work/wiki

Available folders (synced but not included):
  ○ old-archive       ~/archive

Tip: Use 'vault folders add' or 'vault folders remove' to manage
```

**Subcommands:**

- `vault folders` - List all folders (default)
- `vault folders add` - Add folders to search scope
- `vault folders remove` - Remove folders from search scope

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

### nia-sync Configuration (read-only)

nia-vault reads the API key from `~/.nia-sync/config.json`. This file is managed by nia-sync.

### nia-vault Configuration

**Location:** `~/.config/nia-vault/config.json`

```json
{
  "selectedFolders": ["folder-id-1", "folder-id-2"]
}
```

This file only stores which folders are included in searches. The API key is always read from nia-sync.

## Troubleshooting

| Error                          | Solution                                  |
| ------------------------------ | ----------------------------------------- |
| `nia-sync not configured`      | Run `nia login` to authenticate           |
| `No configuration found`       | Run `vault init` to set up                |
| `Invalid API key`              | Run `nia login` to re-authenticate        |
| `No synced folders found`      | Run `nia add ~/path` to add folders       |
| `No folders selected`          | Run `vault folders add` to select folders |
| `Could not connect to Nia API` | Check your internet connection            |

## Contributing

### Adding a Changeset

When making changes that should be included in a release, please add a changeset:

```bash
bun changeset
```

This will prompt you to describe your changes. Choose the appropriate version bump:

- **patch** (0.0.x): Bug fixes, small improvements, documentation updates
- **minor** (0.x.0): New features, non-breaking changes
- **major** (x.0.0): Breaking changes

The changeset file should be committed with your PR.

### Development Workflow

```bash
# Clone the repository
git clone https://github.com/chenxin-yan/nia-vault.git
cd nia-vault

# Install dependencies
bun install

# Run in development mode
bun run dev

# Build the project
bun run build
```

## License

MIT
