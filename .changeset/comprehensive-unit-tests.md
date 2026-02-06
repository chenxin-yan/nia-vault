---
"nia-vault": patch
---

Add comprehensive unit tests for find utilities, update check, and command context

- Extract pure functions from find.ts into find-utils.ts: filterByScore(), mapSourcesToFiles(), deduplicateFiles()
- Create unit tests for find-utils covering score filtering, path resolution, and deduplication
- Create unit tests for update-check covering compareVersions() and isCacheExpired() 
- Create unit tests for command-context covering type safety and withContext wrapper
- Total: 67 new tests (113 total)
