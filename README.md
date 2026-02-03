# nia-vault

A CLI application for querying your local notes and files using AI-powered semantic search via [Nia](https://trynia.ai).

## Features

- **Semantic Search**: Query your notes using natural language
- **Multiple Folders**: Search across multiple synced folders
- **Seamless Integration**: Automatically uses credentials from nia-sync
- **Flexible Sync**: Sync folders on-demand or before searches

## Prerequisites

- Node.js >= 18.0.0 or Bun
- [nia-sync](https://docs.trynia.ai/local-sync) installed and configured

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

### `vault ask "<question>"`

Query your notes using semantic search.

**Options:**

| Flag                | Description                   |
| ------------------- | ----------------------------- |
| `-f, --folder <id>` | Search specific folder only   |
| `-l, --limit <n>`   | Max results (default: 5)      |
| `-s, --sync`        | Sync folders before searching |

### `vault sync`

Manually trigger a sync of all folders.

### `vault folders`

List, add, or remove folders from search scope.

### `vault config`

View or reset configuration.

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

| Error                          | Solution                              |
| ------------------------------ | ------------------------------------- |
| `nia-sync not configured`      | Run `nia login` to authenticate       |
| `No configuration found`       | Run `vault init` to set up            |
| `Invalid API key`              | Run `nia login` to re-authenticate    |
| `No synced folders found`      | Run `nia add ~/path` to add folders   |
| `No folders selected`          | Run `vault folders` to select folders |
| `Could not connect to Nia API` | Check your internet connection        |

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
