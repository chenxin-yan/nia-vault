# nia-vault

## 0.1.0

### Minor Changes

- 8f535c8: ready for 0.1

### Patch Changes

- a423015: Add background update check that notifies users when a newer version is available
- de6fc45: Add comprehensive unit tests for find utilities, update check, and command context

  - Extract pure functions from find.ts into find-utils.ts: filterByScore(), mapSourcesToFiles(), deduplicateFiles()
  - Create unit tests for find-utils covering score filtering, path resolution, and deduplication
  - Create unit tests for update-check covering compareVersions() and isCacheExpired()
  - Create unit tests for command-context covering type safety and withContext wrapper
  - Total: 67 new tests (113 total)

- 1256709: Migrate find command to use --raw flag for direct vector search by skipping LLM processing
- 73ec7f0: Add integration tests for command flows with fixture and optional real nia CLI support
- 286e177: Add relevancy score threshold to find command to filter low-quality results. Search results with scores below 0.4 are now excluded, reducing noise from loosely related content.
- 5e2ea06: Add testing infrastructure with bun test and foundational unit and integration tests

  - Configure bunfig.toml to scope test discovery to src/ directory
  - Add test scripts: `test`, `test:unit`, and `test:integration`
  - Create test fixtures: nia-status.json, nia-search-fast.json, and fake-nia.sh
  - Add helper utilities for test setup (setupFakeNia, hasRealNia, createTempConfigDir, loadFixture)
  - Add unit tests for output formatting functions (success/error)
  - Add unit tests for VaultConfig schema validation
  - Add unit tests for NiaSyncConfig schema and NiaSyncError
  - Add integration tests for listLocalFolders and runNiaSearch using fake nia CLI
  - Update CI workflow to run tests after build

## 0.0.4

### Patch Changes

- ef41bbd: fix --no-stream flag parsing
- 077eb2b: migrate fron calling Nia API to use nia-sync cli for search
- 58036f8: add `vault find` to search and open file with semantic search
- 902fe06: remove redundent print when run `vault folders` as it is displayed in the toggle select
- 390d5b1: remove --sources flag

## 0.0.3

### Patch Changes

- d4bf5c6: fix markdown rendering
- 3007e35: add ask response streaming
- 46967ac: remove unused --limit flag

## 0.0.2

### Patch Changes

- 426d132: downgrade marked to fix peer dependencies error
