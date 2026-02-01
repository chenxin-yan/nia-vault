import { readFile } from 'fs/promises';
import { homedir } from 'os';
import { join } from 'path';
import { spawn } from 'child_process';
import type { NiaSyncConfig } from '../types.js';

// Path to nia-sync config file
const NIA_SYNC_CONFIG_PATH = join(homedir(), '.nia-sync', 'config.json');

/**
 * Read nia-sync configuration from ~/.nia-sync/config.json
 * Returns null if config doesn't exist or is invalid
 */
export async function readNiaSyncConfig(): Promise<NiaSyncConfig | null> {
  try {
    const content = await readFile(NIA_SYNC_CONFIG_PATH, 'utf-8');
    const config = JSON.parse(content) as NiaSyncConfig;

    if (!config.api_key) {
      return null;
    }

    return config;
  } catch {
    return null;
  }
}

/**
 * Get API key from nia-sync config
 * Returns null if not available
 */
export async function getApiKey(): Promise<string | null> {
  const config = await readNiaSyncConfig();
  return config?.api_key ?? null;
}

/**
 * Check if nia-sync is configured
 */
export async function isNiaSyncConfigured(): Promise<boolean> {
  const config = await readNiaSyncConfig();
  return config !== null;
}

/**
 * Run `nia once` command to trigger a one-time sync
 * Returns true if successful, false otherwise
 */
export async function runNiaOnce(): Promise<boolean> {
  return new Promise((resolve) => {
    const process = spawn('nia', ['once'], {
      stdio: 'inherit',
    });

    process.on('close', (code) => {
      resolve(code === 0);
    });

    process.on('error', () => {
      resolve(false);
    });
  });
}

/**
 * Get the path to nia-sync config (for display purposes)
 */
export function getNiaSyncConfigPath(): string {
  return NIA_SYNC_CONFIG_PATH;
}
