---
"nia-vault": patch
---

Add testing infrastructure with bun test and foundational unit and integration tests

- Configure bunfig.toml to scope test discovery to src/ directory
- Add test scripts: `test`, `test:unit`, and `test:integration`
- Create test fixtures: nia-status.json, nia-search-fast.json, and fake-nia.sh
- Add helper utilities for test setup (setupFakeNia, hasRealNia, createTempConfigDir, loadFixture)
- Add unit tests for output formatting functions (success/error)
- Add unit tests for VaultConfig schema validation
- Add unit tests for NiaSyncConfig schema and NiaSyncError
- Add integration tests for listLocalFolders and runNiaSearch using fake nia CLI
- Update CI workflow to run tests after build
