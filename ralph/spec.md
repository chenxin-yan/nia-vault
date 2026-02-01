# Nia-Vault MVP Spec

## Overview

**nia-vault** is a CLI application that enables users to query their local notes/files (e.g., Obsidian vaults, markdown directories) using AI-powered semantic search via Nia.

## Summary of Decisions

| Decision        | Choice                                                   |
| --------------- | -------------------------------------------------------- |
| Package name    | `nia-vault` (available on npm)                           |
| CLI command     | `vault`                                                  |
| Nia Sync        | Required prerequisite (user installs separately)         |
| API key storage | Reuse from `~/.nia-sync/config.json`, fallback to prompt |
| Output format   | Plain text (MVP)                                         |
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
├── tasks.json             # Task tracking for agentic workflow
├── docs/
│   └── spec.md            # This spec
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
- `-l, --limit <n>` - Max results (default: 5)
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

Tip: Use 'vault folders add' or 'vault folders remove' to manage
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

---

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

---

## Nia API Integration

### Endpoints Used

| Endpoint                                     | Purpose                                        |
| -------------------------------------------- | ---------------------------------------------- |
| `GET /data-sources?source_type=local_folder` | List synced local folders                      |
| `POST /search/query`                         | Semantic search with `local_folders` parameter |

### Base URL

```
https://apigcp.trynia.ai/v2
```

### Authentication

Bearer token in `Authorization` header:

```
Authorization: Bearer <NIA_API_KEY>
```

### API Client Functions

```typescript
// List all synced local folders from Nia
async function listLocalFolders(apiKey: string): Promise<LocalFolder[]>;

// Search across selected folders
async function searchLocalFolders(
  apiKey: string,
  query: string,
  folderIds: string[],
): Promise<SearchResult>;
```

---

## Error Handling

Friendly messages with clear next steps:

| Error                | Message                                                                        |
| -------------------- | ------------------------------------------------------------------------------ |
| No nia-sync config   | `nia-sync not configured. Run 'nia login' first.`                              |
| No vault config      | `No configuration found. Run 'vault init' to get started.`                     |
| Invalid API key      | `Invalid API key. Run 'nia login' to re-authenticate.`                         |
| No folders synced    | `No synced folders found. Run 'nia add ~/path' to add folders.`                |
| No folders selected  | `No folders selected for search. Run 'vault folders add' to select folders.`   |
| Network error        | `Could not connect to Nia API. Check your internet connection.`                |
| Empty search results | `No results found. Try a different query or check if your folders are synced.` |

---

## Build & Distribution

### Runtime Strategy

**Approach:** Compile to Node-compatible JavaScript with `#!/usr/bin/env node` shebang.

This allows the CLI to work with **both Node and Bun** automatically:

- Users who install via `bun install -g nia-vault` → runs with Bun
- Users who install via `npm install -g nia-vault` → runs with Node
- No runtime detection code needed - determined by user's environment

**Requirements:** User must have Node.js (v18+) or Bun installed.

### Build Command

```bash
bun build ./src/index.ts --outdir ./dist --target node --format esm
```

**Important:** The entry file (`src/index.ts`) must include the shebang:

```typescript
#!/usr/bin/env node
// ... rest of the code
```

After building, ensure the shebang is preserved in `dist/index.js`:

```javascript
#!/usr/bin/env node
// bundled code...
```

### package.json Configuration

```json
{
  "name": "nia-vault",
  "version": "0.1.0",
  "type": "module",
  "bin": {
    "vault": "./dist/index.js"
  },
  "files": [
    "dist"
  ],
  "scripts": {
    "build": "bun build ./src/index.ts --outdir ./dist --target node --format esm",
    "dev": "bun run ./src/index.ts"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

### npm Publishing

```bash
# Build first
bun run build

# Publish
npm publish
```

### Installation

Users install via:

```bash
# With npm (runs with Node)
npm install -g nia-vault

# With Bun (runs with Bun)
bun install -g nia-vault

# With pnpm
pnpm install -g nia-vault
```

After installation, the `vault` command is available globally.

---

## Prerequisites for Users

Before using nia-vault, users must:

1. **Install nia-sync**

   ```bash
   pip install nia-sync
   ```

2. **Authenticate with Nia**

   ```bash
   nia login
   ```

3. **Add folders to sync**

   ```bash
   nia add ~/Documents/notes
   nia start
   ```

That's it! No separate API key needed - nia-vault reuses nia-sync credentials.
