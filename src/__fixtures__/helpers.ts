/**
 * Test helper utilities for nia-vault tests
 */

import { mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";

// Path to the fake-nia.sh script
const FIXTURES_DIR = dirname(new URL(import.meta.url).pathname);
const FAKE_NIA_PATH = join(FIXTURES_DIR, "fake-nia.sh");

/**
 * Set up the fake nia CLI for testing
 * Prepends a directory with a 'nia' symlink to the PATH
 *
 * @returns Cleanup function to call in afterEach/afterAll
 */
export function setupFakeNia(): { cleanup: () => void; binDir: string } {
  // Create a temporary bin directory with a 'nia' symlink
  const binDir = join(tmpdir(), `fake-nia-bin-${Date.now()}`);

  // Store original PATH
  const originalPath = process.env.PATH;

  // We'll create the symlink synchronously in setup
  const { execSync } = require("node:child_process");
  execSync(`mkdir -p "${binDir}" && ln -sf "${FAKE_NIA_PATH}" "${binDir}/nia"`);

  // Prepend to PATH so our fake nia is found first
  process.env.PATH = `${binDir}:${originalPath}`;

  return {
    binDir,
    cleanup: () => {
      // Restore original PATH
      process.env.PATH = originalPath;
      // Remove temp bin directory (async cleanup is fine)
      rm(binDir, { recursive: true, force: true }).catch(() => {});
    },
  };
}

/**
 * Create a temporary config directory for testing
 * Returns the path to the temp directory and optional config files created
 *
 * @param options.vaultConfig - Optional VaultConfig to write to config.json
 * @param options.niaSyncConfig - Optional NiaSyncConfig to write to nia-sync config
 * @returns Temp directory path and cleanup function
 */
export async function createTempConfigDir(options?: {
  vaultConfig?: { selectedFolders?: string[] };
  niaSyncConfig?: { api_key?: string };
}): Promise<{
  tempDir: string;
  vaultConfigDir: string;
  niaSyncConfigDir: string;
  cleanup: () => Promise<void>;
}> {
  const tempDir = join(
    tmpdir(),
    `nia-vault-test-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  );
  const vaultConfigDir = join(tempDir, "nia-vault");
  const niaSyncConfigDir = join(tempDir, "nia-sync");

  // Create directories
  await mkdir(vaultConfigDir, { recursive: true });
  await mkdir(niaSyncConfigDir, { recursive: true });

  // Write vault config if provided
  if (options?.vaultConfig) {
    const config = {
      selectedFolders: options.vaultConfig.selectedFolders ?? [],
    };
    await writeFile(
      join(vaultConfigDir, "config.json"),
      JSON.stringify(config, null, 2),
    );
  }

  // Write nia-sync config if provided
  if (options?.niaSyncConfig) {
    const config = {
      api_key: options.niaSyncConfig.api_key ?? "test-api-key",
    };
    await writeFile(
      join(niaSyncConfigDir, "config.json"),
      JSON.stringify(config, null, 2),
    );
  }

  return {
    tempDir,
    vaultConfigDir,
    niaSyncConfigDir,
    cleanup: async () => {
      await rm(tempDir, { recursive: true, force: true });
    },
  };
}

/**
 * Load a JSON fixture file
 * @param filename - Name of the fixture file (relative to __fixtures__ directory)
 */
export async function loadFixture<T>(filename: string): Promise<T> {
  const fixturePath = join(FIXTURES_DIR, filename);
  const content = await Bun.file(fixturePath).text();
  return JSON.parse(content) as T;
}
