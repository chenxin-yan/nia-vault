import { access, mkdir, readFile, unlink, writeFile } from "fs/promises";
import { homedir } from "os";
import { dirname, join } from "path";
import z from "zod";

// nia-vault configuration (stored in ~/.config/nia-vault/config.json)
export const VaultConfig = z.object({
  selectedFolders: z.string().array().default([]),
});
export type VaultConfig = z.infer<typeof VaultConfig>;

// Path to nia-vault config directory and file
export const CONFIG_DIR = join(homedir(), ".config", "nia-vault");
export const CONFIG_PATH = join(CONFIG_DIR, "config.json");

/**
 * Check if vault config exists
 */
export async function configExists() {
  try {
    await access(CONFIG_PATH);
    return true;
  } catch {
    return false;
  }
}

/**
 * Read vault configuration from ~/.config/nia-vault/config.json
 * Returns null if config doesn't exist
 * Throws ZodError if config exists but is invalid
 */
export async function readVaultConfig() {
  const content = await readFile(CONFIG_PATH, "utf-8");
  const json = JSON.parse(content);
  return VaultConfig.parse(json);
}

/**
 * Write vault configuration to ~/.config/nia-vault/config.json
 * Creates the config directory if it doesn't exist
 * Sets file permissions to 0600 (user read/write only)
 */
async function writeVaultConfig(config: VaultConfig) {
  // Ensure config directory exists
  await mkdir(dirname(CONFIG_PATH), { recursive: true });

  // Write config with restrictive permissions (0600)
  const content = JSON.stringify(config, null, 2);
  await writeFile(CONFIG_PATH, content, { mode: 0o600 });
}

/**
 * Update vault configuration by merging with existing config
 * Reads current config, merges with updates, and writes back
 * Uses Zod schema defaults for missing fields
 */
export async function updateVaultConfig(updates: Partial<VaultConfig>) {
  let current: VaultConfig | Record<string, never> = {};
  if (await configExists()) {
    current = await readVaultConfig();
  }
  const updated = VaultConfig.parse({ ...current, ...updates });
  await writeVaultConfig(updated);
}

/**
 * Delete vault configuration file
 * Returns true if deleted, false if didn't exist
 */
export async function deleteVaultConfig() {
  try {
    await unlink(CONFIG_PATH);
    return true;
  } catch {
    return false;
  }
}
