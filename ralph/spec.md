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
