# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.1.0] - 2026-02-01

### Added

- Initial release of nia-vault CLI
- `vault init` - Interactive setup wizard with folder selection
- `vault ask "<question>"` - Semantic search across your notes
  - `-f, --folder <id>` flag to search specific folder
  - `-l, --limit <n>` flag to limit results (default: 5)
  - `-s, --sync` flag to sync before searching
- `vault sync` - Manual sync trigger (runs `nia once`)
- `vault folders` - List synced folders and their status
- `vault folders add` - Add folders to search scope
- `vault folders remove` - Remove folders from search scope
- `vault config` - View configuration status
- `vault config --reset` - Reset configuration
- Automatic API key detection from `~/.nia-sync/config.json`
- Plain text output formatting for search results
- Friendly error messages with actionable instructions
