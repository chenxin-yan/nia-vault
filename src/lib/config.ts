import { readFile, writeFile, mkdir, unlink, access } from 'fs/promises';
import { homedir } from 'os';
import { join, dirname } from 'path';
import type { VaultConfig } from '../types.js';

// Path to nia-vault config directory and file
const CONFIG_DIR = join(homedir(), '.config', 'nia-vault');
const CONFIG_PATH = join(CONFIG_DIR, 'config.json');

/**
 * Get the path to vault config (for display purposes)
 */
export function getVaultConfigPath(): string {
  return CONFIG_PATH;
}

/**
 * Check if vault config exists
 */
export async function configExists(): Promise<boolean> {
  try {
    await access(CONFIG_PATH);
    return true;
  } catch {
    return false;
  }
}

/**
 * Read vault configuration from ~/.config/nia-vault/config.json
 * Returns null if config doesn't exist or is invalid
 */
export async function readVaultConfig(): Promise<VaultConfig | null> {
  try {
    const content = await readFile(CONFIG_PATH, 'utf-8');
    const config = JSON.parse(content) as VaultConfig;

    // Validate config structure
    if (!Array.isArray(config.selectedFolders)) {
      return null;
    }

    return config;
  } catch {
    return null;
  }
}

/**
 * Write vault configuration to ~/.config/nia-vault/config.json
 * Creates the config directory if it doesn't exist
 * Sets file permissions to 0600 (user read/write only)
 */
export async function writeVaultConfig(config: VaultConfig): Promise<void> {
  // Ensure config directory exists
  await mkdir(dirname(CONFIG_PATH), { recursive: true });

  // Write config with restrictive permissions (0600)
  const content = JSON.stringify(config, null, 2);
  await writeFile(CONFIG_PATH, content, { mode: 0o600 });
}

/**
 * Get selected folder IDs from config
 * Returns empty array if config doesn't exist
 */
export async function getSelectedFolders(): Promise<string[]> {
  const config = await readVaultConfig();
  return config?.selectedFolders ?? [];
}

/**
 * Save selected folder IDs to config
 */
export async function saveSelectedFolders(folderIds: string[]): Promise<void> {
  const config: VaultConfig = {
    selectedFolders: folderIds,
  };
  await writeVaultConfig(config);
}

/**
 * Add folder IDs to selected folders
 */
export async function addSelectedFolders(folderIds: string[]): Promise<void> {
  const current = await getSelectedFolders();
  const updated = [...new Set([...current, ...folderIds])];
  await saveSelectedFolders(updated);
}

/**
 * Remove folder IDs from selected folders
 */
export async function removeSelectedFolders(folderIds: string[]): Promise<void> {
  const current = await getSelectedFolders();
  const updated = current.filter((id) => !folderIds.includes(id));
  await saveSelectedFolders(updated);
}

/**
 * Delete vault configuration file
 * Returns true if deleted, false if didn't exist
 */
export async function deleteVaultConfig(): Promise<boolean> {
  try {
    await unlink(CONFIG_PATH);
    return true;
  } catch {
    return false;
  }
}
